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

# The site dev server the `sites` Playwright project browses.
#
# It looks like pure overhead during a BDD run — a fifth Vite worth ~700MB on
# top of the four the suite starts, contending for the same cores. It is not.
# nginx routes the real dev.<site> hostnames to it, and the `sites` project
# browses those fixed hostnames rather than a per-worker wN origin
# (playwright.config.ts explains why: those specs are about one tenant's pages,
# so they cannot be measured against whichever site a worker happens to serve).
#
# Without it the specs do not skip, they fail: a route whose server is down
# leaves nginx answering 502, and tests/sites/santelyon3-contact-layout fails 11
# times over with "no layout grid — either this site has no contact page of its
# own and is serving the generic fallback", which reads as a broken contact page
# rather than a missing server. Hence ensure_site_server below, which starts it
# when it is absent instead of leaving the run to fail that way.
#
# SITE_CONTEXT names the dev.yml context to serve; its port comes from there
# too. Do NOT reintroduce a hardcoded default port: this file carried
# DEV_SERVER_PORT=3000 long after each site moved to its own port (3010-3019,
# scripts/nginx/dev-site-ports.conf), so every check silently probed a port
# nothing had bound since — the guard above was dead code and the 11 failures it
# describes came back.
SITE_CONTEXT="${SITE_CONTEXT:-lyon3}"
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
# typecheck suite fails on the *count* rising above a baseline rather than on
# any error at all. Lower these as the backlog is paid down.
#
# One baseline per site, because the count is a property of the site and not of
# the parent code. Each context checks out its own skvar branch, and the routes
# under (skvar) are typechecked with everything else — so the same parent commit
# measures 195 on annuaire and 206 on gadagne. A single number cannot describe
# both: set high enough for gadagne it admits eleven new errors on annuaire, and
# set for annuaire it fails gadagne on work nobody did. That second case is what
# happened — a global 197 against gadagne's real 206 reported "error count rose
# above the baseline" on a release that had changed none of it.
#
# Measured, not guessed: a baseline above the real count admits that many new
# errors without failing. Measured 2026-08-20 with `typecheck-baselines.sh`,
# which prints exactly these lines; re-run it when lowering them. The run prints
# each real count beside its baseline on every invocation.
TYPECHECK_BASELINE_annuaire="${TYPECHECK_BASELINE_annuaire:-195}"
TYPECHECK_BASELINE_lyon3="${TYPECHECK_BASELINE_lyon3:-205}"
TYPECHECK_BASELINE_gadagne="${TYPECHECK_BASELINE_gadagne:-206}"
TYPECHECK_BASELINE_ipa="${TYPECHECK_BASELINE_ipa:-195}"
TYPECHECK_BASELINE_sandbox="${TYPECHECK_BASELINE_sandbox:-195}"

# The fallback for a context with no line above — a new site added to dev.yml
# reaches this rather than silently typechecking against zero. Deliberately the
# highest of the measured numbers: a new site fails on being worse than the
# worst known, not on inheriting a stricter site's budget.
TYPECHECK_BASELINE_DEFAULT="${TYPECHECK_BASELINE_DEFAULT:-206}"

# Per-site baseline lookup, with the old global name still honoured: anyone who
# exports TYPECHECK_BASELINE means "this number, for whatever I am running".
typecheck_baseline() {
    local ctx="$1" var val
    if [[ -n "${TYPECHECK_BASELINE:-}" ]]; then
        printf '%s\n' "$TYPECHECK_BASELINE"; return
    fi
    var="TYPECHECK_BASELINE_${ctx}"
    val="${!var:-}"
    printf '%s\n' "${val:-$TYPECHECK_BASELINE_DEFAULT}"
}

ALL_SUITES=(typecheck unit backend bdd)

# --- One run at a time -------------------------------------------------------
# The suite owns shared, machine-wide state while it runs: the four worker dev
# servers, the site dev server, the skvar checkout and the .env symlink. Two
# runs at once do not merely queue — the second stops servers the first is
# mid-scenario against, and moves the checkout under it, so both fail in ways
# that look like product bugs and neither is reproducible.
#
# Held for the whole run and released when the process exits, however it exits.
# Non-blocking on purpose: waiting would leave somebody staring at a silent
# terminal for seven minutes, so a second run says what is already running and
# stops. TEST_ALL_LOCK=0 opts out for the rare case of deliberately running two
# disjoint suites at once.
LOCK_FILE="${TEST_ALL_LOCK_FILE:-${TMPDIR:-/tmp}/test-all.$(id -u).lock}"

# --help and --list run nothing and touch nothing, so they must never be
# refused: being unable to read the help because a run is in progress — or
# because a lock leaked — leaves you with an error and no way to learn the
# option that clears it.
case " $* " in
    *" -h "*|*" --help "*|*" --list "*) TEST_ALL_LOCK=0 ;;
esac

if [[ "${TEST_ALL_LOCK:-1}" == "1" ]]; then
    # Opened >> rather than >: `>` truncates on open, which happens *before*
    # flock decides who wins — so the losing run would wipe the holder's pid and
    # then read the empty file it had just emptied, and could never name who to
    # wait for.
    exec {LOCK_FD}>>"$LOCK_FILE" || true
    if [[ -n "${LOCK_FD:-}" ]] && ! flock -n "$LOCK_FD"; then
        holder="$(head -1 "$LOCK_FILE" 2>/dev/null)"
        # A pid is only worth printing if it is still there: a stale file from a
        # run killed mid-flight would otherwise send somebody chasing a pid that
        # belongs to something else entirely by now.
        [[ -n "$holder" ]] && ! kill -0 "$holder" 2>/dev/null && holder=""

        echo "error: the test lock is held." >&2
        if [[ -n "$holder" ]]; then
            echo "       A run is in progress (pid $holder):" >&2
            echo "         $(ps -o cmd= -p "$holder" 2>/dev/null | cut -c1-70)" >&2
            echo "       Wait for it, or stop it with:  kill $holder" >&2
        else
            # No live holder, yet the lock is taken: something inherited the file
            # descriptor. The worker dev servers are the usual culprits — they are
            # started by a run and deliberately outlive it, so without O_CLOEXEC
            # they hold the lock for as long as they are up, which is forever.
            echo "       No run is active, so a stopped one leaked it — usually the" >&2
            echo "       worker dev servers, which outlive the run that started them." >&2
            echo "       Free it with:" >&2
            echo "         ./scripts/e2e-workers.sh stop && rm -f '$LOCK_FILE'" >&2
        fi
        echo "       Or bypass the lock entirely:  TEST_ALL_LOCK=0 $0 $*" >&2
        exit 1
    fi
    # Won the lock: replace the file's contents with this run's pid. Truncated
    # here, under the lock, where no other run can be reading it.
    if [[ -n "${LOCK_FD:-}" ]]; then
        : >"$LOCK_FILE"
        printf '%s\n' "$$" >"$LOCK_FILE"
    fi
fi

# --- Output helpers ----------------------------------------------------------
if [[ -t 1 ]]; then
    BOLD=$'\e[1m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; DIM=$'\e[2m'; NC=$'\e[0m'
else
    BOLD=''; RED=''; GREEN=''; YELLOW=''; DIM=''; NC=''
fi

# Runs a command with the lock file descriptor closed.
#
# Anything started here that outlives the run — the worker dev servers most of
# all, which are deliberately left up so the next run reuses them — would
# otherwise inherit the descriptor and hold the lock after this process exits.
# The lock then belongs to a pid that is long gone, and every later invocation
# is refused by a run that is not happening.
without_lock() {
    if [[ -n "${LOCK_FD:-}" ]]; then
        eval "\"\$@\" ${LOCK_FD}>&-"
    else
        "$@"
    fi
}

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
Usage: $(basename "$0") [suite ...] [site ...]

Suites: ${ALL_SUITES[*]}
  typecheck  svelte-check on the frontend
  unit       vitest unit tests (src/)
  backend    pytest inside the $BACKEND_TEST_SERVICE container
  bdd        Playwright + Gherkin end-to-end tests

Sites: $(all_contexts | tr '\n' ' ')
  Named by their dev.yml name (lyon3) or the host they serve
  (dev.santelyon3.fr). With none named, the stages that depend on which
  tenant is checked out — unit and bdd — run once per site, because a page
  or a spec belonging to one tenant is skipped on the others. typecheck and
  backend run once: the backend has no tenant, and svelte-check is judged
  against a single error baseline.

  Each site is switched to with dev.sh, which moves the skvar branch and the
  .env symlink together, so the checkout is left on whichever site ran last.

Options:
  --list     list suites and sites, and exit
  -h|--help  this help

Key variables (override via env or $FRONTEND_DIR/.env.test-all):
  FRONTEND_DIR=$FRONTEND_DIR
  BACKEND_DIR=$BACKEND_DIR
  COMPOSE_FILE=$COMPOSE_FILE
  BACKEND_TEST_SERVICE=$BACKEND_TEST_SERVICE
  E2E_WORKERS=$E2E_WORKERS  E2E_STOP_AFTER=$E2E_STOP_AFTER
  SITE_CONTEXT=$SITE_CONTEXT  (dev.yml context serving dev.<site> for the sites project; started if absent)
  E2E_STOP_DEV_SERVER=$E2E_STOP_DEV_SERVER  (0 keep the site server up; 1 stop it for the run; STOP leave it stopped)
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

# The port and hostname SITE_CONTEXT is served on, read from dev.yml so this
# script cannot drift from the map dev.sh and nginx already agree on.
site_field() {
    "${YQ:-yq}" -r ".contexts[] | select(.name == \"$SITE_CONTEXT\") | $1" \
        "$FRONTEND_DIR/dev.yml" 2>/dev/null | head -1
}

site_port() { site_field '.port'; }

# The hostname is the env_file's suffix — .env.dev.santelyon3.fr serves
# dev.santelyon3.fr — which is also how dev.sh derives it.
site_host() { site_field '.env_file' | sed 's/^\.env\.//'; }

site_server_pid() {
    local port="$1"
    # Matched on the vite.js child rather than the npx wrapper that may have
    # spawned it: killing the wrapper orphans the child, which keeps the port
    # bound (the same trap e2e-workers.sh documents in stop()).
    pgrep -f "vite\.js .*--port $port( |$)" 2>/dev/null | head -1
}

# Set when this script stopped the site server, so only a server we paused is
# ever restarted — never one the user started after we looked.
DEV_SERVER_WAS_RUNNING=0

stop_dev_server() {
    [[ "$E2E_STOP_DEV_SERVER" == "0" ]] && return 0
    local port; port="$(site_port)"
    [[ -z "$port" ]] && return 0
    local pid; pid="$(site_server_pid "$port")"
    [[ -z "$pid" ]] && return 0

    # A worker must never be the thing we stop. They are :3100+ and the sites
    # are :3010-3019, but both are overridable and a mistake here would take
    # down the suite it is meant to help.
    local i
    for ((i = 0; i < E2E_WORKERS; i++)); do
        if [[ "$port" == "$((${E2E_BASE_PORT:-3100} + i))" ]]; then
            warn "$SITE_CONTEXT is on worker w$i's port ($port); not touching it"
            return 0
        fi
    done

    info "stopping the $SITE_CONTEXT dev server on :$port (pid $pid) to free memory for the browsers"
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
    ensure_site_server
}

# Bring up the site server the `sites` project needs, if it is not already
# answering through nginx.
#
# Checked through nginx rather than on 127.0.0.1:<port>, for the same reason as
# the workers: Vite can be bound while nginx still answers 502, and that pairing
# is exactly what makes the specs fail on a page the app never rendered.
ensure_site_server() {
    local port host origin
    port="$(site_port)"; host="$(site_host)"
    if [[ -z "$port" || -z "$host" ]]; then
        warn "no dev.yml entry for SITE_CONTEXT=$SITE_CONTEXT; the sites specs may fail"
        return 0
    fi
    origin="https://$host"

    if curl -skf -o /dev/null --max-time 10 "$origin/"; then
        info "$host is answering (:$port)"
        return 0
    fi

    info "starting the $SITE_CONTEXT dev server for $host (:$port)..."
    mkdir -p "$FRONTEND_DIR/.e2e-workers"
    # Through dev.sh rather than a bare `pnpm dev`: it also points the .env
    # symlink and the skvar submodule at this context, and a server started
    # without those renders a different tenant — which is the failure this is
    # here to prevent, one layer down.
    (cd "$FRONTEND_DIR" && without_lock nohup ./scripts/dev.sh --restart "$SITE_CONTEXT" \
        > "$FRONTEND_DIR/.e2e-workers/site-$SITE_CONTEXT.log" 2>&1 &)

    local waited=0
    while (( waited < 90 )); do
        sleep 5; waited=$((waited + 5))
        curl -skf -o /dev/null --max-time 10 "$origin/" && {
            ok "$host answering through nginx (${waited}s)"; return 0
        }
    done
    warn "$host did not answer in ${waited}s; the sites specs will fail"
    return 0
}

# Every tenant the `sites` project browses, from the specs themselves.
#
# Read rather than listed, so a spec added for a new site is served without
# anyone remembering to update this script — the alternative is a spec that
# skips silently, which is a test that did not run wearing the colour of one
# that passed.
sites_project_hosts() {
    local names
    names="$(grep -rhoE "originFor\('[^']+'\)" "$FRONTEND_DIR/tests/sites" 2>/dev/null |
        sed -E "s/originFor\('([^']+)'\)/\1/" | sort -u)"
    # santelyon3-contact-layout resolves its site through a SITE constant.
    names+=$'\n'"$(grep -rhoE "^const SITE = '[^']+'" "$FRONTEND_DIR/tests/sites" 2>/dev/null |
        sed -E "s/^const SITE = '([^']+)'/\1/")"
    printf '%s\n' "$names" | grep -v '^$' | sort -u
}

# Map a site name as the specs write it (santelyon3.fr) to its dev.yml context.
context_for_site() {
    "${YQ:-yq}" -r \
        ".contexts[] | select(.env_file == \".env.dev.$1\") | .name" \
        "$FRONTEND_DIR/dev.yml" 2>/dev/null | head -1
}

# Bring up *every* site the sites project needs, not only SITE_CONTEXT.
#
# Two specs currently name two different tenants, and only one of them was ever
# served — so the other skipped, every run, and its coverage silently did not
# exist. They can coexist: each context has its own port and its own hostname
# (dev.yml, scripts/nginx/dev-site-ports.conf), and Vite is pointed at the right
# tenant per server with --mode, exactly as the e2e workers already do for four
# servers at once.
ensure_all_site_servers() {
    local site ctx started=0
    while read -r site; do
        [[ -z "$site" ]] && continue
        ctx="$(context_for_site "$site")"
        if [[ -z "$ctx" ]]; then
            warn "no dev.yml context serves '$site'; its specs will fail"
            continue
        fi
        SITE_CONTEXT="$ctx" ensure_site_server_for "$ctx" && started=$((started + 1))
    done < <(sites_project_hosts)
    (( started )) || warn "no site servers started; the sites specs will fail"
}

# ensure_site_server for a named context, leaving any other site server up.
#
# dev.sh refuses to start while another site server is running — a server
# outlives a branch switch and would then serve the route manifest of the branch
# it booted with. That is the right rule for a person switching contexts by
# hand, and the wrong one here: these servers are started for the length of a
# run, against tenants whose branches are not being switched under them.
# The pid listening on a TCP port, or empty. Same implementation as dev.sh's;
# duplicated rather than sourced because dev.sh runs `exec vite` at the end and
# sourcing it would take this script with it.
pid_on_port() { ss -ltnpH "sport = :$1" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true; }

# Where a running site server records what it was started for.
#
# A Vite process cannot be asked which tenant it serves: PUBLIC_ORIGIN is baked
# in at boot and nothing exposes it. So the starter writes it down, and this is
# the only way to tell "the right server" from "a server" without a request.
site_stamp() { printf '%s/.e2e-workers/site-%s.started\n' "$FRONTEND_DIR" "$1"; }

# Is the server on this port the one *this context* started, for *this* origin?
#
# The stamp is the fix for the failure that motivated it: a server started at
# one moment, and a .env symlink pointed somewhere else a quarter of an hour
# later, leaves a process whose allowedHosts no longer contains its own
# hostname. It answers 403 to the host nginx forwards and keeps doing so until
# it is restarted — and nothing about the process itself says so.
#
# Stale means: no stamp (started outside this script), a stamp naming a
# different origin, or a stamp whose pid is no longer the one on the port.
site_server_is_ours() {
    local ctx="$1" port="$2" origin="$3" stamp pid_now stamped_origin stamped_pid
    stamp="$(site_stamp "$ctx")"
    [[ -f "$stamp" ]] || return 1
    # shellcheck source=/dev/null
    stamped_origin="$(sed -n '1p' "$stamp")"
    stamped_pid="$(sed -n '2p' "$stamp")"
    [[ "$stamped_origin" == "$origin" ]] || return 1
    pid_now="$(pid_on_port "$port")"
    [[ -n "$pid_now" && "$pid_now" == "$stamped_pid" ]]
}

# What the site actually says it is, over the API the app itself uses.
#
# The status code cannot answer this on its own. A 200 only proves *something*
# answered: nginx routes each dev.<site> to a fixed port, so a server on the
# right port serving the wrong tenant passes a status check while every spec
# measured against it is measuring another site. /api/v1/directory/ names the
# directory, so it distinguishes the two.
#
# Empty when the endpoint cannot be reached or parsed, which the caller treats
# as "cannot confirm" rather than as a mismatch — the endpoint is proxied to the
# backend, so it can be up while the page server is not.
site_reports_slug() {
    local origin="$1"
    curl -skfL --max-time 15 "$origin/api/v1/directory/" 2>/dev/null |
        "${JQ:-jq}" -r '.slug // empty' 2>/dev/null
}

ensure_site_server_for() {
    local ctx="$1" port host origin env_file branch
    port="$(SITE_CONTEXT="$ctx" site_port)"
    host="$(SITE_CONTEXT="$ctx" site_host)"
    [[ -z "$port" || -z "$host" ]] && { warn "no dev.yml entry for $ctx"; return 1; }
    origin="$(site_origin "$host")"

    # Answering *and* answering as the right tenant, and started by this script
    # for this origin. Any one of the three alone lets a wrong server through:
    #
    #   * a status check passes for a server on the right port serving another
    #     site, which is what nginx's fixed host->port map makes possible;
    #   * the stamp alone cannot see a server that has since gone wrong;
    #   * the slug alone cannot see a server started before a .env switch, whose
    #     403 the status check catches but whose cause it cannot name.
    if curl -skfL -o /dev/null --max-time 10 "$origin/"; then
        local serving
        serving="$(site_reports_slug "$origin")"
        if [[ -z "$serving" ]]; then
            # The API is proxied to the backend, so it can be unreachable while
            # the page server is fine. Not enough to condemn a server that is
            # answering, so the status check stands.
            info "$host is answering (:$port; could not confirm which directory)"
            return 0
        fi
        if site_server_is_ours "$ctx" "$port" "$origin"; then
            info "$host is answering (:$port, directory '$serving')"
            return 0
        fi
        # Answering as something, but not a server this run started for this
        # origin. Restarted below rather than trusted: the specs about to run
        # would otherwise measure whichever tenant it happens to serve.
        warn "$host answers on :$port but was not started by this run for $origin"
        warn "  (it reports directory '$serving'; restarting it so the tenant is known)"
    fi

    env_file="$("${YQ:-yq}" -r ".contexts[] | select(.name == \"$ctx\") | .env_file" \
        "$FRONTEND_DIR/dev.yml" 2>/dev/null)"
    branch="$("${YQ:-yq}" -r ".contexts[] | select(.name == \"$ctx\") | .development_skvar_branch" \
        "$FRONTEND_DIR/dev.yml" 2>/dev/null)"
    [[ -z "$env_file" ]] && { warn "no env_file for $ctx"; return 1; }

    # A server already on this port that did not answer the check above is a
    # *foreign* one: same port, different tenant. Vite bakes PUBLIC_ORIGIN in at
    # startup and derives allowedHosts from it, so one started while the .env
    # symlink pointed elsewhere refuses this hostname with 403 and keeps
    # refusing until it is restarted. Starting over it cannot work either —
    # --strictPort makes the new process exit with "Port N is already in use"
    # within a second, after which this function would wait the full 90s for a
    # server that is already dead, then let the specs run against the 403.
    #
    # Named and stopped here rather than reported, because the run cannot
    # proceed without the port and the stale process is by definition not
    # serving anyone correctly.
    local squatter
    squatter="$(pid_on_port "$port" 2>/dev/null)"
    if [[ -n "$squatter" ]]; then
        warn ":$port is held by pid $squatter, which is not this run's $ctx server"
        warn "  (a server started for another tenant refuses this Host with 403)"
        info "stopping it so $ctx can have its own port"
        kill "$squatter" 2>/dev/null
        # Waited on the *port*, not the pid: --strictPort fails if the kernel has
        # not released it yet, which happens a moment after the process is gone.
        # 20s because a Vite mid-boot finishes what it is doing before it exits.
        local freed=0
        for _ in $(seq 200); do
            if ! ss -ltnH "sport = :$port" 2>/dev/null | grep -q .; then freed=1; break; fi
            sleep 0.1
        done
        if (( ! freed )); then
            fail "pid $squatter still holds :$port; stop it and re-run"
            return 1
        fi
    fi

    info "starting the $ctx dev server for $host (:$port)..."
    mkdir -p "$FRONTEND_DIR/.e2e-workers"
    # --mode <ctx> makes Vite load .env.<ctx> instead of the .env symlink, so
    # this server serves its own tenant no matter which one the symlink points
    # at. That is what lets several site servers run at once; without it the
    # second would serve the first one's site on a different port.
    local mode_env="$FRONTEND_DIR/.env.site.$ctx"
    cp "$FRONTEND_DIR/$env_file" "$mode_env" 2>/dev/null || return 1
    rm -f "$(site_stamp "$ctx")"
    (cd "$FRONTEND_DIR" && without_lock nohup npx vite \
        --port "$port" --strictPort --mode "site.$ctx" \
        > "$FRONTEND_DIR/.e2e-workers/site-$ctx.log" 2>&1 &)

    local waited=0
    while (( waited < 90 )); do
        sleep 5; waited=$((waited + 5))
        curl -skfL -o /dev/null --max-time 10 "$origin/" && {
            # Stamped only once it actually answers, and with the pid that ended
            # up on the port rather than the one the subshell forked: `nohup npx
            # vite` is a launcher, and the server is its child.
            printf '%s\n%s\n' "$origin" "$(pid_on_port "$port")" > "$(site_stamp "$ctx")"
            ok "$host answering through nginx (${waited}s)"
            return 0
        }
    done
    # The log rather than a pointer to it: a server that failed to boot says why
    # in its first few lines, and "see this file" is a step nobody takes while
    # reading a summary that already blames the wrong thing.
    warn "$host did not answer in ${waited}s:"
    tail -5 "$FRONTEND_DIR/.e2e-workers/site-$ctx.log" 2>/dev/null | sed 's/^/      /' >&2
    return 1
}

# Interrupting the run must not cost the user their dev server.
trap 'start_dev_server' EXIT INT TERM

ensure_e2e_workers() {
    if e2e_workers_ready; then
        info "reusing $E2E_WORKERS worker dev server(s)"
        return 0
    fi
    info "starting $E2E_WORKERS worker dev server(s) (cold Vite boots take ~30s)..."
    without_lock "$FRONTEND_DIR/scripts/e2e-workers.sh" start "$E2E_WORKERS" || {
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
    local ctx="${1:-$SITE_CONTEXT}" out count baseline
    baseline="$(typecheck_baseline "$ctx")"
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
    info "svelte-check errors: $count (baseline $baseline for $ctx)"
    if (( count > baseline )); then
        # Only the errors in files this site owns are worth printing: the
        # backlog is long, and the new ones are what the reader needs.
        printf '%s\n' "$out" | grep -E 'ERROR' | head -20
        warn "error count rose above the baseline for $ctx"
        return 1
    fi
    (( count < baseline )) && \
        info "below baseline — consider lowering TYPECHECK_BASELINE_$ctx to $count"
    return 0
}

# BASE_PATH= for the browser project's sake, not the unit project's.
#
# vitest's browser runner connects to the server root while kit serves the app
# under paths.base, so on a context whose env file sets BASE_PATH (today only
# unipa) every .svelte.test.ts file dies on "Failed to connect to the browser
# session within the timeout". The run then *passes*: the unit files are green
# and the browser files are simply absent from the totals — 22 of 27 collected,
# with nothing in the summary saying which five went missing.
#
# Emptying it costs the unit project nothing: its tests import `base` and assert
# the relationship rather than a literal, so they hold at either value, and
# scripts/typecheck-baselines.sh still exercises the real one per site.
suite_unit() { (cd "$FRONTEND_DIR" && BASE_PATH= npx vitest run); }

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
    # The `sites` project browses the real dev.<site> hostname, not a worker
    # origin, so the worker servers above do not cover it. Started after them
    # because dev.sh refuses to run while another *site* server is up, and
    # before Playwright because a 502 here reads as a broken page.
    # Every tenant the sites project names, not just one: with a single server
    # the specs for the other site skipped, so a "full" run quietly omitted them.
    [[ "$E2E_STOP_DEV_SERVER" == "0" ]] && ensure_all_site_servers
    # The specs under .features-gen are generated from features/*.feature and are
    # not in git, so a fresh checkout has none and Playwright reports "No tests
    # found". Regenerating is also what picks up edits to the feature files.
    (cd "$FRONTEND_DIR" && npx bddgen) || return 1
    local rc=0
    # Under xvfb when it is available, because the firefox-cropper project needs
    # a display to get WebGL at all.
    #
    # Headless Chromium ships its own software renderer; headless Firefox does
    # not, and without one MapLibre throws while the entry page hydrates. The
    # page then renders but never becomes interactive — the edit-mode switch
    # stays aria-checked="false" — so every scenario fails on a missing control
    # rather than on anything it was written to check. Chromium is unaffected by
    # running under a display, so this is applied to the whole run rather than
    # to one project.
    local runner=(npx playwright test)
    if command -v xvfb-run >/dev/null 2>&1; then
        runner=(xvfb-run -a npx playwright test)
    else
        warn "xvfb-run not found; Firefox scenarios will fail without a display"
        info "install it with: sudo apt-get install xvfb"
    fi
    (cd "$FRONTEND_DIR" && "${runner[@]}") || rc=$?
    if [[ "$E2E_STOP_AFTER" == "1" ]]; then
        info "stopping worker dev servers"
        "$FRONTEND_DIR/scripts/e2e-workers.sh" stop >/dev/null 2>&1 || true
    fi
    start_dev_server
    return "$rc"
}

# --- Sites -------------------------------------------------------------------
# Every dev.yml context, in the order that file lists them.
all_contexts() { "${YQ:-yq}" -r '.contexts[].name' "$FRONTEND_DIR/dev.yml" 2>/dev/null; }

# The context a name refers to, by its dev.yml name ("lyon3") or by the hostname
# it serves ("dev.santelyon3.fr"). Both are how people refer to a site — the
# short name is what dev.sh takes, the hostname is what you type in a browser —
# and requiring the one the config happens to key on is a rule nobody remembers.
# Prints the context name, or nothing if it matches neither.
resolve_context() {
    "${YQ:-yq}" -r \
        ".contexts[] | select(.name == \"$1\" or .env_file == \".env.$1\") | .name" \
        "$FRONTEND_DIR/dev.yml" 2>/dev/null | head -1
}

# --- Argument parsing --------------------------------------------------------
# An argument is a suite (typecheck, unit, …) or a site (lyon3,
# dev.santelyon3.fr). Naming sites narrows which tenants the site-dependent
# stages run against; naming none means all of them, because a script called
# test-all that quietly covers one tenant is not testing all.
SUITES=()
CONTEXTS=()
for arg in "$@"; do
    case "$arg" in
        --list)
            printf 'suites: %s\n' "${ALL_SUITES[*]}"
            printf 'sites:  %s\n' "$(all_contexts | tr '\n' ' ')"
            exit 0
            ;;
        -h|--help) usage; exit 0 ;;
        -*) usage; exit 1 ;;
        *)
            resolved="$(resolve_context "$arg")"
            if [[ -n "$resolved" ]]; then
                CONTEXTS+=("$resolved")
            else
                SUITES+=("$arg")
            fi
            ;;
    esac
done
[[ ${#SUITES[@]} -eq 0 ]] && SUITES=("${ALL_SUITES[@]}")
# No site named: every tenant. Each has its own skvar branch, and a test that
# imports a page only one tenant carries is skipped on the others — so a run
# that visits one context has genuinely not run those tests.
if [[ ${#CONTEXTS[@]} -eq 0 ]]; then
    mapfile -t CONTEXTS < <(all_contexts)
fi
[[ ${#CONTEXTS[@]} -eq 0 ]] && { fail "no contexts found in dev.yml"; exit 1; }

# --- Run ---------------------------------------------------------------------
TOTAL_START=$SECONDS
printf '%sRunning tests%s\n' "$BOLD" "$NC"
info "frontend: $FRONTEND_DIR"
info "backend:  $BACKEND_DIR"

info "sites:    ${CONTEXTS[*]}"

# Which stages depend on the tenant that is checked out.
#
# Only `unit`. src/lib/santelyon3-contact-load.test.ts imports a page from the
# skvar submodule, which is one branch per tenant; on a tenant whose branch
# lacks that page the suite skips, so running unit once covers those tests on
# one tenant and silently not on the others. Vitest reads the .env symlink, so
# moving the checkout is all it takes — no server, nothing to wait for.
#
# `bdd` is deliberately *not* per-tenant, though it looks like it should be:
#
#   * its scenarios browse the per-worker origins w0-w3.dev.medica.im, whose
#     servers are built from a fixed template (E2E_TEMPLATE_ENV in
#     e2e-workers.sh) into their own .env.test.wN files. Those do not follow
#     the checkout, so looping would rerun identical scenarios five times.
#   * its `sites` project names the tenant each spec is about
#     (tests/sites/sites.ts) and skips when that site is not being served, so
#     it already covers what a loop would have covered.
#
# Looping it therefore bought nothing and cost a dev-server restart per tenant
# — and, worse, tore down the site server the `sites` specs were mid-way
# through using. typecheck and backend are single-pass too: the backend has no
# tenant, and svelte-check is judged against one error baseline that cannot
# mean anything across five submodule branches at once.
# typecheck is per-site for the same reason unit is: each context checks out its
# own skvar branch, so a single run measures one tenant's routes and says
# nothing about the others.
suite_is_per_site() { [[ "$1" == "unit" || "$1" == "typecheck" ]]; }

# Point the checkout at a context: dev.sh switches the skvar branch and the .env
# symlink together, which is what makes the per-tenant stages test that tenant
# rather than the last one someone happened to leave checked out.
#
# --restart because it also brings that site's dev server up, which the `sites`
# specs need; ensure_site_server below is then a no-op for the context already
# running.
#
# `with_server` decides how much of dev.sh's work is needed. Only the bdd stage
# browses the site; unit merely imports files, so it needs the checkout moved
# and nothing listening. That distinction matters: dev.sh refuses to start while
# another site server is up (it would serve the route manifest of the branch it
# booted with), so starting one per tenant in a loop means stopping and starting
# five servers to run five vitest passes that never make a request.
switch_context() {
    local ctx="$1" with_server="${2:-0}" host waited=0
    host="$(SITE_CONTEXT="$ctx" site_host)"

    if [[ "$with_server" == "0" ]]; then
        # Checkout only: move the skvar branch and the .env symlink, leaving any
        # running server alone. `dev.sh --checkout` would be the natural home
        # for this, but it has no such flag, so the two moves are done here —
        # deliberately the same two dev.sh makes, and no more.
        local branch env_file
        branch="$("${YQ:-yq}" -r ".contexts[] | select(.name == \"$ctx\") | .development_skvar_branch" \
            "$FRONTEND_DIR/dev.yml" 2>/dev/null)"
        env_file="$("${YQ:-yq}" -r ".contexts[] | select(.name == \"$ctx\") | .env_file" \
            "$FRONTEND_DIR/dev.yml" 2>/dev/null)"
        [[ -z "$branch" || -z "$env_file" ]] && { warn "no dev.yml entry for $ctx"; return 1; }

        if ! git -C "$FRONTEND_DIR/src/routes/(skvar)" checkout -q "$branch" 2>/dev/null; then
            warn "could not check out $branch in the skvar submodule"
            return 1
        fi
        ln -sfn "$env_file" "$FRONTEND_DIR/.env"
        info "checked out $ctx ($branch)"

        # A site dev server left running is not inert while this loop moves the
        # checkout under it: Vite watches .env, sees it change, restarts, and
        # dev.sh's own restore puts *its* branch and symlink back — so the run
        # silently tests that tenant several times over and finishes with the
        # checkout on a site nobody asked for. That is worse than a failure,
        # because every pass is green and the summary names five tenants that
        # were never actually tested.
        #
        # Settling first, then verifying, is what makes that detectable: the
        # revert takes a moment, so an immediate check would read the value this
        # function just wrote and confirm its own work.
        sleep 2
        local now_host
        now_host="$(current_env_host)"
        if [[ "$now_host" != "$host" ]]; then
            local stray
            stray="$(pgrep -f "vite\.js .*--port 301[0-9]( |$)" 2>/dev/null | head -1)"
            warn "the checkout moved back to ${now_host:-unknown} while switching to $ctx"
            [[ -n "$stray" ]] && \
                warn "a site dev server (pid $stray) is watching .env; stop it: kill $stray"
            return 1
        fi
        return 0
    fi

    [[ "$host" == "$(current_env_host)" ]] \
        && curl -skfL -o /dev/null --max-time 5 "$(site_origin "$host")/" 2>/dev/null \
        && { info "already serving $ctx"; return 0; }

    info "starting the $ctx dev server"
    mkdir -p "$FRONTEND_DIR/.e2e-workers"
    # Backgrounded, and waited for by polling. dev.sh ends in `exec vite`, so it
    # *becomes* the dev server and never returns — calling it synchronously
    # hangs the run forever, with the site up and healthy and nothing to show
    # for it.
    (cd "$FRONTEND_DIR" && without_lock nohup ./scripts/dev.sh --restart "$ctx" \
        > "$FRONTEND_DIR/.e2e-workers/site-$ctx.log" 2>&1 &)

    while (( waited < 120 )); do
        sleep 3; waited=$((waited + 3))
        if [[ "$(current_env_host)" == "$host" ]] \
           && curl -skfL -o /dev/null --max-time 5 "$(site_origin "$host")/" 2>/dev/null; then
            ok "$ctx ready (${waited}s)"
            return 0
        fi
    done
    warn "$ctx did not come up in ${waited}s; see .e2e-workers/site-$ctx.log"
    return 1
}

# A site's origin, scheme included, from its own .env: dev.santelyon3.fr is
# https and dev.annuaire.medica.im is http, so a hardcoded scheme polls an
# origin that will never answer and times out on half the tenants.
site_origin() {
    local origin
    origin="$(sed -n 's/^PUBLIC_ORIGIN="\?\([^"]*\)"\?/\1/p' \
        "$FRONTEND_DIR/.env.$1" 2>/dev/null | head -1)"
    printf '%s' "${origin:-https://$1}"
}

# The hostname the .env symlink currently points at, i.e. which tenant is
# checked out right now.
current_env_host() {
    local target
    target="$(readlink -f "$FRONTEND_DIR/.env" 2>/dev/null)"
    [[ -n "$target" ]] && basename "$target" | sed 's/^\.env\.//'
}

for suite in "${SUITES[@]}"; do
    case "$suite" in
        typecheck|unit|backend|bdd) ;;
        *) fail "unknown suite: $suite (see --list)"; exit 1 ;;
    esac
done

# Which site the `sites` specs are served from, fixed before the per-tenant loop
# runs. That loop used to assign SITE_CONTEXT per iteration, which left it
# pointing at whichever tenant happened to be last — so bdd then started
# *sandbox* and every spec that browses lyon3 or annuaire failed on a 502, two
# minutes at a time. The loop only needs the checkout moved; it has no business
# deciding which site gets a server.
SITES_CONTEXT="$SITE_CONTEXT"

for suite in "${SUITES[@]}"; do
    if suite_is_per_site "$suite"; then
        for ctx in "${CONTEXTS[@]}"; do
            # Checkout only (second arg 0): unit imports files, it does not
            # browse, so no server is started and none is torn down.
            switch_context "$ctx" 0 \
                || { record "$suite ($ctx)" fail 0; continue; }
            case "$suite" in
                unit) [[ "$SKIP_FRONTEND" == "1" ]] || run_suite "unit ($ctx)" suite_unit ;;
                typecheck) [[ "$SKIP_FRONTEND" == "1" ]] || run_suite "typecheck ($ctx)" suite_typecheck "$ctx" ;;
                *) fail "no per-site handler for suite: $suite"; record "$suite ($ctx)" fail 0 ;;
            esac
        done
        # Put the checkout back where the sites specs expect it, so a bdd stage
        # after unit is not left on the last tenant of the loop.
        SITE_CONTEXT="$SITES_CONTEXT"
        switch_context "$SITES_CONTEXT" 0 || true
    else
        case "$suite" in
            backend)   [[ "$SKIP_BACKEND"  == "1" ]] || run_suite backend suite_backend ;;
            bdd)       [[ "$SKIP_FRONTEND" == "1" ]] || run_suite bdd suite_bdd ;;
            # Every suite must be handled here or in the per-site branch above.
            # A name that falls through matches nothing, runs nothing, and
            # reports nothing — the summary simply omits it, which reads as a
            # suite that passed rather than one that never ran.
            *) fail "no handler for suite: $suite"; record "$suite" fail 0 ;;
        esac
    fi
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
