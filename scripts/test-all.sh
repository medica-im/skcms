#!/usr/bin/env bash
#
# Run every test suite (frontend + backend) on a development machine.
#
# All paths, hosts and container names come from variables below, each
# overridable from the environment or a .env.test-all file, so moving the repo
# or switching laptop only means changing those values — not this script.
#
# Usage:
#   ./scripts/test-all.sh                 # everything
#   ./scripts/test-all.sh unit bdd        # only the named suites
#   ./scripts/test-all.sh --list          # show suites
#   SKIP_BACKEND=1 ./scripts/test-all.sh  # skip the slow backend suite
#
set -uo pipefail

# --- Configuration -----------------------------------------------------------
# Frontend repo root: derived from this script's own location, so it follows the
# repo wherever it lives.
FRONTEND_DIR="${FRONTEND_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# Optional machine-local overrides (git-ignored).
# shellcheck source=/dev/null
[[ -f "$FRONTEND_DIR/.env.test-all" ]] && source "$FRONTEND_DIR/.env.test-all"

BACKEND_DIR="${BACKEND_DIR:-$(cd "$FRONTEND_DIR/../backend" 2>/dev/null && pwd || echo "$FRONTEND_DIR/../backend")}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose-development.yml}"
COMPOSE_CMD="${COMPOSE_CMD:-docker compose}"

# Container/service that owns the Python test run and the Django shell.
BACKEND_TEST_SERVICE="${BACKEND_TEST_SERVICE:-fastapi}"
BACKEND_SHELL_SERVICE="${BACKEND_SHELL_SERVICE:-django}"
BACKEND_WORKDIR="${BACKEND_WORKDIR:-/app}"
NEO4J_SERVICE="${NEO4J_SERVICE:-neo4j}"
NEO4J_CONTAINER="${NEO4J_CONTAINER:-backend-neo4j-1}"

# Frontend dev servers used by the Playwright/BDD suite: one per worker, each
# serving its own site over https through nginx (scripts/e2e-workers.sh).
#
# Deliberately not a single localhost:3000 server. Auth.js derives the session
# cookie's name *and* its encryption salt from whether the request looks secure,
# and the backend's fastapi_nextauth_jwt derives the same salt independently, so
# a plain-http origin 401s every authenticated scenario. playwright.config.ts
# carries no webServer entry for the same reason — nothing starts these but the
# helper below.
E2E_WORKERS="${E2E_WORKERS:-4}"
# Left running after the suite by default: a cold Vite boot per worker costs
# more than the whole BDD run, and the next invocation reuses them.
E2E_STOP_AFTER="${E2E_STOP_AFTER:-0}"

# The `pnpm dev` server on :3000. Off by default: do not stop it.
#
# It looks like pure overhead during a BDD run — a fifth Vite worth ~700MB on
# top of the four the suite starts, contending for the same cores. It is not.
# nginx routes the real dev.<site> hostnames to it, and the `sites` Playwright
# project browses those fixed hostnames rather than a per-worker wN origin
# (playwright.config.ts explains why: those specs are about one tenant's pages,
# so they cannot be measured against whichever site a worker happens to serve).
#
# Stopping it therefore does not cost memory, it costs coverage, and silently:
# a route whose server is down falls back to src/routes/(common)/[fallback],
# which answers 200 with a different page. tests/sites/santelyon3-contact-layout
# spec fails 11 times over with "no layout grid — either this site has no
# contact page of its own and is serving the generic fallback", which reads as a
# broken contact page rather than a missing server.
#
# Set to 1 to stop it for the run and start it again afterwards (genuinely
# terminated, not SIGSTOPped: a stopped-but-resident process keeps every page of
# its RSS). Only worth it when running the bdd project alone, never with
# `sites`. STOP stops it without restarting.
DEV_SERVER_PORT="${DEV_SERVER_PORT:-3000}"
E2E_STOP_DEV_SERVER="${E2E_STOP_DEV_SERVER:-0}"
PKG_MANAGER="${PKG_MANAGER:-pnpm}"

# Neo4j is slow to become healthy; `compose up --wait` alone gives up too early.
NEO4J_HEALTH_TIMEOUT="${NEO4J_HEALTH_TIMEOUT:-180}"
STACK_WAIT_TIMEOUT="${STACK_WAIT_TIMEOUT:-300}"

# Toggles
SKIP_BACKEND="${SKIP_BACKEND:-0}"
SKIP_FRONTEND="${SKIP_FRONTEND:-0}"
SEED_BDD_USERS="${SEED_BDD_USERS:-1}"

# The codebase carries a backlog of pre-existing svelte-check errors, so the
# typecheck suite fails on the *count* rising above this baseline rather than on
# any error at all. Lower it as the backlog is paid down.
#
# Measured, not guessed: a baseline above the real count admits that many new
# errors without failing. 197 as of 2026-08-12, and it had been 195 here while
# a git-ignored .env.test-all quietly overrode it with 203 — six errors of slack
# nobody could see in a diff. Keep the number here and re-measure when lowering
# it; the run prints the real count beside the baseline on every invocation.
TYPECHECK_BASELINE="${TYPECHECK_BASELINE:-197}"

ALL_SUITES=(typecheck unit backend bdd)

# --- Output helpers ----------------------------------------------------------
if [[ -t 1 ]]; then
    BOLD=$'\e[1m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; DIM=$'\e[2m'; NC=$'\e[0m'
else
    BOLD=''; RED=''; GREEN=''; YELLOW=''; DIM=''; NC=''
fi

step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$NC"; }
info() { printf '%s    %s%s\n' "$DIM" "$1" "$NC"; }
ok()   { printf '%s    ok: %s%s\n' "$GREEN" "$1" "$NC"; }
warn() { printf '%s    warning: %s%s\n' "$YELLOW" "$1" "$NC"; }
fail() { printf '%s    failed: %s%s\n' "$RED" "$1" "$NC"; }

declare -a RESULT_NAMES=() RESULT_STATES=() RESULT_TIMES=()

record() { RESULT_NAMES+=("$1"); RESULT_STATES+=("$2"); RESULT_TIMES+=("$3"); }

# Runs a suite, timing it and recording pass/fail without aborting the run.
run_suite() {
    local name="$1"; shift
    step "$name"
    local start=$SECONDS
    if "$@"; then
        local d=$((SECONDS - start)); ok "$name (${d}s)"; record "$name" pass "$d"
    else
        local d=$((SECONDS - start)); fail "$name (${d}s)"; record "$name" fail "$d"
    fi
}

usage() {
    cat <<EOF
Usage: $(basename "$0") [suite ...]

Suites: ${ALL_SUITES[*]}
  typecheck  svelte-check on the frontend
  unit       vitest unit tests (src/)
  backend    pytest inside the $BACKEND_TEST_SERVICE container
  bdd        Playwright + Gherkin end-to-end tests

Options:
  --list     list suites and exit
  -h|--help  this help

Key variables (override via env or $FRONTEND_DIR/.env.test-all):
  FRONTEND_DIR=$FRONTEND_DIR
  BACKEND_DIR=$BACKEND_DIR
  COMPOSE_FILE=$COMPOSE_FILE
  BACKEND_TEST_SERVICE=$BACKEND_TEST_SERVICE
  E2E_WORKERS=$E2E_WORKERS  E2E_STOP_AFTER=$E2E_STOP_AFTER
  DEV_SERVER_PORT=$DEV_SERVER_PORT  E2E_STOP_DEV_SERVER=$E2E_STOP_DEV_SERVER  (0 leave it alone — it serves dev.<site> for the sites project)
  SKIP_BACKEND=$SKIP_BACKEND  SKIP_FRONTEND=$SKIP_FRONTEND  SEED_BDD_USERS=$SEED_BDD_USERS
EOF
}

# --- Backend stack -----------------------------------------------------------
compose() { (cd "$BACKEND_DIR" && $COMPOSE_CMD -f "$COMPOSE_FILE" "$@"); }

stack_healthy() {
    local total up
    total=$(compose config --services 2>/dev/null | wc -l)
    up=$(compose ps --format json 2>/dev/null \
        | jq -s '[.[] | select(.State == "running" and (.Health == "healthy" or .Health == ""))] | length' 2>/dev/null)
    [[ -n "$total" && "$total" -gt 0 && "${up:-0}" -eq "$total" ]]
}

wait_for_neo4j() {
    local waited=0
    while (( waited < NEO4J_HEALTH_TIMEOUT )); do
        local s
        s=$(docker inspect "$NEO4J_CONTAINER" --format '{{.State.Health.Status}}' 2>/dev/null || echo missing)
        [[ "$s" == "healthy" ]] && return 0
        info "neo4j: $s (${waited}s)"
        sleep 10; waited=$((waited + 10))
    done
    return 1
}

ensure_stack() {
    local missing=()
    for tool in docker jq curl; do
        command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
    done
    if (( ${#missing[@]} )); then
        fail "missing required tool(s): ${missing[*]}"; return 1
    fi
    if ! docker info >/dev/null 2>&1; then
        fail "the docker daemon is not reachable"; return 1
    fi
    if [[ ! -f "$BACKEND_DIR/$COMPOSE_FILE" ]]; then
        fail "compose file not found: $BACKEND_DIR/$COMPOSE_FILE (set BACKEND_DIR/COMPOSE_FILE)"
        return 1
    fi
    if stack_healthy; then
        info "backend stack already healthy"; return 0
    fi
    info "starting backend services (neo4j takes ~40s to become healthy)..."
    # Start neo4j on its own first: it is slow, and `up --wait` would otherwise
    # abort its dependents with "dependency failed to start".
    compose up -d "$NEO4J_SERVICE" || true
    wait_for_neo4j || { fail "neo4j did not become healthy in ${NEO4J_HEALTH_TIMEOUT}s"; return 1; }
    # Now the rest, which depend on a healthy neo4j.
    compose up -d --wait --wait-timeout "$STACK_WAIT_TIMEOUT" || true
    stack_healthy || { fail "backend stack is not fully healthy"; compose ps; return 1; }
    ok "backend stack healthy"
}

# --- Frontend dev servers for the BDD suite ----------------------------------
# The hostname each worker is browsed at, mirroring worker_domain() in
# e2e-workers.sh. Overridable together with E2E_WORKER_DOMAIN, which that script
# already honours.
#
# The default is assigned separately rather than inline as
# ${E2E_WORKER_DOMAIN:-w{i}.dev.medica.im}: bash reads the '}' of '{i}' as the
# end of the parameter expansion, so that form yields "w{i.dev.medica.im}" and
# every worker is probed at a hostname that does not resolve. The same trap is
# documented in e2e-workers.sh, which solves it the same way.
E2E_WORKER_DOMAIN_TEMPLATE="w{i}.dev.medica.im"
[[ -n "${E2E_WORKER_DOMAIN:-}" ]] && E2E_WORKER_DOMAIN_TEMPLATE="$E2E_WORKER_DOMAIN"

e2e_worker_origin() {
    printf 'https://%s' "$(printf '%s' "$E2E_WORKER_DOMAIN_TEMPLATE" | sed "s/{i}/$1/")"
}

# Checked through nginx rather than on 127.0.0.1:<port>: a Vite process can be
# up and bound while nginx still answers 502, and that combination is what makes
# every scenario fail on a page the app never rendered. The suite browses these
# origins, so these are what must answer.
e2e_workers_ready() {
    local i origin
    for ((i = 0; i < E2E_WORKERS; i++)); do
        origin="$(e2e_worker_origin "$i")"
        curl -skf -o /dev/null --max-time 10 "$origin/" || return 1
    done
}

# Set when this script stopped the dev server, so only a server we paused is
# ever restarted — never one the user started after we looked.
DEV_SERVER_WAS_RUNNING=0

dev_server_pid() {
    # Matched on the vite.js child rather than the npx wrapper that may have
    # spawned it: killing the wrapper orphans the child, which keeps the port
    # bound (the same trap e2e-workers.sh documents in stop()).
    pgrep -f "vite\.js .*--port $DEV_SERVER_PORT( |$)" 2>/dev/null | head -1
}

stop_dev_server() {
    [[ "$E2E_STOP_DEV_SERVER" == "0" ]] && return 0
    local pid; pid="$(dev_server_pid)"
    [[ -z "$pid" ]] && return 0

    # A worker must never be the thing we stop. They are :3100+ and this is
    # :3000 by default, but DEV_SERVER_PORT is overridable and a mistake here
    # would take down the suite it is meant to help.
    local i
    for ((i = 0; i < E2E_WORKERS; i++)); do
        if [[ "$DEV_SERVER_PORT" == "$((${E2E_BASE_PORT:-3100} + i))" ]]; then
            warn "DEV_SERVER_PORT=$DEV_SERVER_PORT is worker w$i's port; not touching it"
            return 0
        fi
    done

    info "stopping the dev server on :$DEV_SERVER_PORT (pid $pid) to free memory for the browsers"
    kill "$pid" 2>/dev/null || return 0
    DEV_SERVER_WAS_RUNNING=1
    local waited=0
    while (( waited < 10 )) && kill -0 "$pid" 2>/dev/null; do
        sleep 1; waited=$((waited + 1))
    done
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
    return 0
}

start_dev_server() {
    (( DEV_SERVER_WAS_RUNNING )) || return 0
    DEV_SERVER_WAS_RUNNING=0
    [[ "$E2E_STOP_DEV_SERVER" == "STOP" ]] && { info "leaving the dev server stopped"; return 0; }
    if [[ -n "$(dev_server_pid)" ]]; then
        info "a dev server is on :$DEV_SERVER_PORT again; leaving it"
        return 0
    fi
    info "restarting the dev server on :$DEV_SERVER_PORT"
    (cd "$FRONTEND_DIR" && nohup "$PKG_MANAGER" dev --port "$DEV_SERVER_PORT" \
        > "$FRONTEND_DIR/.e2e-workers/devserver.log" 2>&1 &) || \
        warn "could not restart the dev server; start it yourself with '$PKG_MANAGER dev'"
}

# Interrupting the run must not cost the user their dev server.
trap 'start_dev_server' EXIT INT TERM

ensure_e2e_workers() {
    if e2e_workers_ready; then
        info "reusing $E2E_WORKERS worker dev server(s)"
        return 0
    fi
    info "starting $E2E_WORKERS worker dev server(s) (cold Vite boots take ~30s)..."
    "$FRONTEND_DIR/scripts/e2e-workers.sh" start "$E2E_WORKERS" || {
        fail "could not start the worker dev servers"; return 1
    }
    # e2e-workers.sh waits on 127.0.0.1:<port>; nginx needs a moment longer to
    # route to a server that has only just begun answering.
    local waited=0
    while (( waited < 60 )); do
        e2e_workers_ready && { ok "worker dev servers answering through nginx"; return 0; }
        sleep 5; waited=$((waited + 5))
    done
    fail "worker dev servers did not answer through nginx in ${waited}s"
    "$FRONTEND_DIR/scripts/e2e-workers.sh" status || true
    return 1
}

# --- Suites ------------------------------------------------------------------
suite_typecheck() {
    local out count
    (cd "$FRONTEND_DIR" && npx svelte-kit sync >/dev/null 2>&1)
    # --output machine keeps the summary line stable; svelte-check otherwise
    # switches to a human summary ("found N errors") when attached to a TTY.
    out=$(cd "$FRONTEND_DIR" && npx svelte-check --output machine --threshold error 2>&1)

    # Machine format: "... COMPLETED <n> FILES <n> ERRORS <n> WARNINGS ..."
    count=$(printf '%s\n' "$out" | sed -nE 's/.*COMPLETED [0-9]+ FILES ([0-9]+) ERRORS.*/\1/p' | tail -1)
    # Human fallback: "svelte-check found N errors and M warnings in K files"
    [[ -z "$count" ]] && count=$(printf '%s\n' "$out" \
        | sed -nE 's/.*found ([0-9]+) error.*/\1/p' | tail -1)
    # No errors at all still needs a number.
    [[ -z "$count" ]] && printf '%s\n' "$out" | grep -qiE 'found no errors|0 errors' && count=0

    if [[ -z "$count" ]]; then
        printf '%s\n' "$out" | tail -8
        fail "could not parse svelte-check output"; return 1
    fi
    info "svelte-check errors: $count (baseline $TYPECHECK_BASELINE)"
    if (( count > TYPECHECK_BASELINE )); then
        printf '%s\n' "$out" | grep -E 'ERROR' | head -20
        warn "error count rose above the baseline"
        return 1
    fi
    (( count < TYPECHECK_BASELINE )) && \
        info "below baseline — consider lowering TYPECHECK_BASELINE to $count"
    return 0
}

suite_unit() { (cd "$FRONTEND_DIR" && npx vitest run); }

suite_backend() {
    ensure_stack || return 1
    # PYTEST_ARGS lets you narrow the run, e.g. PYTEST_ARGS='-m "not integration"'
    # shellcheck disable=SC2086
    compose exec -T -w "$BACKEND_WORKDIR" "$BACKEND_TEST_SERVICE" \
        python -m pytest -q -p no:warnings ${PYTEST_ARGS:-}
}

suite_bdd() {
    ensure_stack || return 1
    if [[ "$SEED_BDD_USERS" == "1" ]]; then
        info "seeding per-role test users"
        if ! compose exec -T "$BACKEND_SHELL_SERVICE" python manage.py shell \
                < "$FRONTEND_DIR/tests/fixtures/seed_test_users.py" >/dev/null 2>&1; then
            warn "could not seed test users; role-based scenarios may fail"
        fi
    fi
    stop_dev_server
    ensure_e2e_workers || { start_dev_server; return 1; }
    # The specs under .features-gen are generated from features/*.feature and are
    # not in git, so a fresh checkout has none and Playwright reports "No tests
    # found". Regenerating is also what picks up edits to the feature files.
    (cd "$FRONTEND_DIR" && npx bddgen) || return 1
    local rc=0
    (cd "$FRONTEND_DIR" && npx playwright test) || rc=$?
    if [[ "$E2E_STOP_AFTER" == "1" ]]; then
        info "stopping worker dev servers"
        "$FRONTEND_DIR/scripts/e2e-workers.sh" stop >/dev/null 2>&1 || true
    fi
    start_dev_server
    return "$rc"
}

# --- Argument parsing --------------------------------------------------------
SUITES=()
for arg in "$@"; do
    case "$arg" in
        --list) printf '%s\n' "${ALL_SUITES[@]}"; exit 0 ;;
        -h|--help) usage; exit 0 ;;
        -*) usage; exit 1 ;;
        *) SUITES+=("$arg") ;;
    esac
done
[[ ${#SUITES[@]} -eq 0 ]] && SUITES=("${ALL_SUITES[@]}")

# --- Run ---------------------------------------------------------------------
TOTAL_START=$SECONDS
printf '%sRunning tests%s\n' "$BOLD" "$NC"
info "frontend: $FRONTEND_DIR"
info "backend:  $BACKEND_DIR"

for suite in "${SUITES[@]}"; do
    case "$suite" in
        typecheck) [[ "$SKIP_FRONTEND" == "1" ]] || run_suite typecheck suite_typecheck ;;
        unit)      [[ "$SKIP_FRONTEND" == "1" ]] || run_suite unit suite_unit ;;
        backend)   [[ "$SKIP_BACKEND"  == "1" ]] || run_suite backend suite_backend ;;
        bdd)       [[ "$SKIP_FRONTEND" == "1" ]] || run_suite bdd suite_bdd ;;
        *) fail "unknown suite: $suite (see --list)"; exit 1 ;;
    esac
done

# --- Summary -----------------------------------------------------------------
printf '\n%s==> Summary%s\n' "$BOLD" "$NC"
exit_code=0
for i in "${!RESULT_NAMES[@]}"; do
    if [[ "${RESULT_STATES[$i]}" == "pass" ]]; then
        printf '  %sPASS%s  %-10s %ss\n' "$GREEN" "$NC" "${RESULT_NAMES[$i]}" "${RESULT_TIMES[$i]}"
    else
        printf '  %sFAIL%s  %-10s %ss\n' "$RED" "$NC" "${RESULT_NAMES[$i]}" "${RESULT_TIMES[$i]}"
        exit_code=1
    fi
done
printf '  %stotal %ss%s\n' "$DIM" "$((SECONDS - TOTAL_START))" "$NC"
exit "$exit_code"
