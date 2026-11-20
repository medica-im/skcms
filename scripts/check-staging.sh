#!/usr/bin/env bash
#
# Is staging working, now that new code is up? One check, after a frontend or
# a backend release, rather than monitors on staging that would page about a
# machine meant for trying things.
#
# For each staging site:
#   1. what its host runs (scripts/versions.sh): the commit, and whether its
#      container answers at all;
#   2. its links (muffet, scripts/lib/staging-sites.sh): our own broken links
#      fail, somebody else's are printed and forgiven;
#   3. its pages in a browser (tests/staging): every page loaded cold, failing
#      on an error status, an exception -- hydration errors land there -- or a
#      console error. A page that answers 200 and dies on hydration passes the
#      link check and fails here.
#
# Usage:
#   ./scripts/check-staging.sh                          # every staging site
#   ./scripts/check-staging.sh staging.santelyon3.fr    # one or more
#   ./scripts/check-staging.sh --list                   # which sites, and exit
#   ./scripts/check-staging.sh --dry-run                # the plan, nothing run
#   ./scripts/check-staging.sh --no-links | --no-browser
#   ./scripts/check-staging.sh --jobs=N                 # N sites at once (default: all)
#   ./scripts/check-staging.sh --stop-test-servers[=frontend|backend|all]
#   ./scripts/check-staging.sh --no-preflight           # skip the look at this machine
#
# Sites are checked side by side, each one's output kept together and printed
# when it finishes; --jobs=1 is one at a time. CHECK_STAGING_JOBS sets the
# default for --jobs.
#
# First it looks at this machine (memory, load, and the test servers a test-all
# run left up) and warns if the checks will not fit. --stop-test-servers stops
# them: frontend is the e2e workers and site servers, backend is the backend
# test stack (`docker compose stop`, kept for the next test-all run, but your dev
# servers have no backend meanwhile), a bare flag means all. On a terminal and
# without the flag it asks, if anything is up. It never stops your own dev
# servers, and never anything while a test-all run is in progress.
#
# release-staging.sh runs it on the sites it deployed.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/staging-sites.sh
source "$REPO_ROOT/scripts/lib/staging-sites.sh"
# shellcheck source=lib/output.sh
source "$REPO_ROOT/scripts/lib/output.sh"
# shellcheck source=lib/test-servers.sh
source "$REPO_ROOT/scripts/lib/test-servers.sh"

usage() { sed -n '2,/^set /p' "$0" | sed '$d; s/^# \{0,1\}//'; }

LIST=0 DRY_RUN=0 LINKS=1 BROWSER=1 PREFLIGHT=1
JOBS="${CHECK_STAGING_JOBS:-}"
STOP_MODE=""
NAMES=()
for arg in "$@"; do
    case "$arg" in
        -h|--help) usage; exit 0 ;;
        --list) LIST=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --no-links) LINKS=0 ;;
        --no-browser) BROWSER=0 ;;
        --no-preflight) PREFLIGHT=0 ;;
        --jobs=*) JOBS="${arg#--jobs=}" ;;
        --stop-test-servers) STOP_MODE=all ;;
        --stop-test-servers=*) STOP_MODE="${arg#--stop-test-servers=}" ;;
        -*) echo "error: unknown option $arg" >&2; usage >&2; exit 1 ;;
        *) NAMES+=("$arg") ;;
    esac
done

if [[ -n "$JOBS" && ! "$JOBS" =~ ^[1-9][0-9]*$ ]]; then
    echo "error: --jobs wants a positive number, got '$JOBS'" >&2
    exit 1
fi
case "$STOP_MODE" in
    ''|frontend|backend|all) ;;
    *) echo "error: --stop-test-servers wants frontend, backend or all, got '$STOP_MODE'" >&2; exit 1 ;;
esac

mapfile -t STAGING_NAMES < <(staging_names)
[[ ${#NAMES[@]} -eq 0 ]] && NAMES=("${STAGING_NAMES[@]}")
[[ -z "$JOBS" ]] && JOBS="${#NAMES[@]}"

for name in "${NAMES[@]}"; do
    if ! printf '%s\n' "${STAGING_NAMES[@]}" | grep -qxF "$name"; then
        echo "error: '$name' is not a staging site. Staging sites are:" >&2
        printf '  %s\n' "${STAGING_NAMES[@]}" >&2
        exit 1
    fi
done

if [[ $LIST -eq 1 ]]; then
    printf '%s\n' "${NAMES[@]}"
    exit 0
fi

# --- Run log -----------------------------------------------------------------
# Every check is written to a file as it is printed, as test-all's runs are: a
# post-release failure is read hours later, after the terminal that ran it is
# gone. The file is logs/check-staging-DATE.log, with check-staging-latest.log
# pointing at the newest and the last 20 kept. TEE_LOG=path picks the file;
# TEE_LOG= (empty) turns logging off. Colour stays on screen and is stripped
# from the file, so a grep over it works.
RUN_LOG="${TEE_LOG-${CHECK_STAGING_LOG_DIR:-$REPO_ROOT/logs}/check-staging-$(date +%Y%m%d-%H%M%S).log}"
if [[ -n "$RUN_LOG" ]]; then
    RUN_LOG_DIR="$(dirname "$RUN_LOG")"
    mkdir -p "$RUN_LOG_DIR"
    if [[ -z "${TEE_LOG+set}" ]]; then
        ls -1t "$RUN_LOG_DIR"/check-staging-2*.log 2>/dev/null | tail -n +20 | xargs -r rm -f --
        ln -sfn "$(basename "$RUN_LOG")" "$RUN_LOG_DIR/check-staging-latest.log"
    fi
    exec > >(tee >(sed -u -E 's/\x1b\[[0-9;?]*[A-Za-z]//g' > "$RUN_LOG")) 2>&1
    RUN_LOG_PID=$!
    info "logging this check to $RUN_LOG"
    # tee runs beside the script: without waiting for it, the prompt could come
    # back above the summary's last lines.
    finish_run_log() {
        exec >&- 2>&-
        local _
        for _ in {1..50}; do
            kill -0 "$RUN_LOG_PID" 2>/dev/null || return 0
            sleep 0.1
        done
    }
    trap finish_run_log EXIT
fi

declare -A FAILED=()
fail() { FAILED[$1]="${FAILED[$1]:+${FAILED[$1]}, }$2"; }

# Each site's output and failures wait here until it is printed: a background
# subshell can neither share the screen with the others nor update FAILED.
# Removed before the log is closed, and the sites still running are stopped, so
# Ctrl-C leaves neither files nor crawls behind.
WORK="$(mktemp -d)"
cleanup() {
    local jobs_left
    jobs_left="$(jobs -p)"
    [[ -n "$jobs_left" ]] && kill $jobs_left 2>/dev/null
    rm -rf "$WORK"
    declare -F finish_run_log >/dev/null && finish_run_log
    return 0
}
trap cleanup EXIT

# --- 0. This machine ---------------------------------------------------------
if [[ $PREFLIGHT -eq 1 ]]; then
    if [[ $DRY_RUN -eq 1 ]]; then
        machine_preflight "$JOBS" "${STOP_MODE:-no}" dry
    else
        machine_preflight "$JOBS" "${STOP_MODE:-ask}"
    fi
fi

# --- 1. What runs ------------------------------------------------------------
step "what runs on staging"
if [[ $DRY_RUN -eq 1 ]]; then
    info "(dry run) scripts/versions.sh --tsv, staging rows"
else
    while IFS=$'\t' read -r env component host commit skvar _ behind _ state deployed subject; do
        [[ "$env" == staging ]] || continue
        if [[ "$component" != backend ]] && ! printf '%s\n' "${NAMES[@]}" | grep -qxF "$component"; then
            continue
        fi
        line="$(printf '%-28s %-8s %-8s %-12s %s' "$component" "$commit" "$skvar" "$state" "$deployed")"
        case "$state" in
            current) info "$line" ;;
            behind) warn "$line ($behind commit(s) behind main)" ;;
            *)
                warn "$line"
                [[ "$component" != backend ]] && fail "$component" "$state"
                ;;
        esac
    done < <("$REPO_ROOT/scripts/versions.sh" --tsv)
fi

# --- 2. Links, 3. pages in a browser -----------------------------------------
# One site: its links, then its pages. Run in the background, its failures
# written to $WORK/<name>.fail, one per line.
#
# Sites run side by side because a crawl mostly waits on the network and on
# SSR, so the wall time is the slowest site's rather than the sum. The staging
# nginx rate-limits each address (30 r/s sustained, shared by every vhost; burst
# 200 for HTML, 100 for the API) and exempts this machine by its IPv4 address
# only (infra rate_limit_exempt_ips). muffet leaves from the IPv4-only Docker
# bridge and is exempt. Chrome reaches the hostnames over IPv6, which is not
# listed, and is limited: tests/sites/reloadEveryPage.ts retries on 429 for that
# reason. Until infra lists the IPv6 address too, a 429 on one of our own hosts
# is that limit and not a broken page.
check_site() {
    local name="$1"
    if [[ $LINKS -eq 1 ]]; then
        step "links: $name"
        if [[ $DRY_RUN -eq 1 ]]; then
            info "(dry run) crawl $(site_origin "$name")/ and classify the findings"
        elif ! linkcheck_site "$name"; then
            echo links >>"$WORK/$name.fail"
        fi
    fi
    if [[ $BROWSER -eq 1 ]]; then
        step "browser: $name"
        if [[ $DRY_RUN -eq 1 ]]; then
            info "(dry run) load every page of $(site_origin "$name") cold (tests/staging)"
        # A Playwright output folder per site: it empties its folder when a run
        # starts, and runs side by side would clear each other's.
        elif ! (cd "$REPO_ROOT" && STAGING_CHECK_ORIGIN="$(site_origin "$name")" \
                npx playwright test --project=staging --reporter=line \
                --output="test-results/staging/$name"); then
            echo browser >>"$WORK/$name.fail"
        fi
    fi
}

declare -A SITE_OF_PID=() STARTED_AT=()
RUNNING=0

# Waits for one site to finish and prints its block: heading, then everything
# it wrote, so two sites' lines never interleave.
print_next_finished() {
    local pid name what secs
    wait -n -p pid
    name="${SITE_OF_PID[$pid]:-}"
    RUNNING=$((RUNNING - 1))
    [[ -n "$name" ]] || return 0
    secs=$((SECONDS - ${STARTED_AT[$name]}))
    step "$(printf '%s  (%dm %02ds)' "$name" "$((secs / 60))" "$((secs % 60))")"
    cat "$WORK/$name.out"
    if [[ -s "$WORK/$name.fail" ]]; then
        while read -r what; do fail "$name" "$what"; done <"$WORK/$name.fail"
    fi
}

for name in "${NAMES[@]}"; do
    (( RUNNING >= JOBS )) && print_next_finished
    check_site "$name" >"$WORK/$name.out" 2>&1 &
    SITE_OF_PID[$!]="$name"
    STARTED_AT[$name]=$SECONDS
    RUNNING=$((RUNNING + 1))
done
while (( RUNNING > 0 )); do print_next_finished; done

[[ $DRY_RUN -eq 1 ]] && exit 0

# --- Summary -----------------------------------------------------------------
printf '\n%s==> Summary%s\n' "$BOLD" "$NC"
for name in "${NAMES[@]}"; do
    if [[ -n "${FAILED[$name]:-}" ]]; then
        printf '  %sFAIL%s  %s (%s)\n' "$RED" "$NC" "$name" "${FAILED[$name]}"
    else
        printf '  %sOK%s    %s\n' "$GREEN" "$NC" "$name"
    fi
done
[[ ${#FAILED[@]} -eq 0 ]]
