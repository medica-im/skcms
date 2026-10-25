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
#
# release-staging.sh runs it on the sites it deployed.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/staging-sites.sh
source "$REPO_ROOT/scripts/lib/staging-sites.sh"
# shellcheck source=lib/output.sh
source "$REPO_ROOT/scripts/lib/output.sh"

usage() { sed -n '2,/^set /p' "$0" | sed '$d; s/^# \{0,1\}//'; }

LIST=0 DRY_RUN=0 LINKS=1 BROWSER=1
NAMES=()
for arg in "$@"; do
    case "$arg" in
        -h|--help) usage; exit 0 ;;
        --list) LIST=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --no-links) LINKS=0 ;;
        --no-browser) BROWSER=0 ;;
        -*) echo "error: unknown option $arg" >&2; usage >&2; exit 1 ;;
        *) NAMES+=("$arg") ;;
    esac
done

mapfile -t STAGING_NAMES < <(staging_names)
[[ ${#NAMES[@]} -eq 0 ]] && NAMES=("${STAGING_NAMES[@]}")

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
for name in "${NAMES[@]}"; do
    if [[ $LINKS -eq 1 ]]; then
        step "links: $name"
        if [[ $DRY_RUN -eq 1 ]]; then
            info "(dry run) crawl $(site_origin "$name")/ and classify the findings"
        elif ! linkcheck_site "$name"; then
            fail "$name" links
        fi
    fi
    # One site at a time: the staging nginx rate-limits per address (30 r/s,
    # shared by every vhost), and two crawls at once would trip it.
    if [[ $BROWSER -eq 1 ]]; then
        step "browser: $name"
        if [[ $DRY_RUN -eq 1 ]]; then
            info "(dry run) load every page of $(site_origin "$name") cold (tests/staging)"
        elif ! (cd "$REPO_ROOT" && STAGING_CHECK_ORIGIN="$(site_origin "$name")" \
                npx playwright test --project=staging --reporter=line); then
            fail "$name" browser
        fi
    fi
done

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
