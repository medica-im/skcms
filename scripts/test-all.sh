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

# Frontend dev server used by the Playwright/BDD suite.
DEV_SERVER_URL="${DEV_SERVER_URL:-http://localhost:3000}"
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
TYPECHECK_BASELINE="${TYPECHECK_BASELINE:-206}"

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
  DEV_SERVER_URL=$DEV_SERVER_URL
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
    if curl -sf -o /dev/null --max-time 5 "$DEV_SERVER_URL"; then
        info "reusing dev server at $DEV_SERVER_URL"
    else
        info "no dev server at $DEV_SERVER_URL; Playwright will start one"
    fi
    (cd "$FRONTEND_DIR" && npx playwright test)
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
