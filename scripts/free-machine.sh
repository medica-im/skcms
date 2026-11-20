#!/usr/bin/env bash
#
# Frees memory on this machine by stopping what the job about to run does not
# need. Staging and the development stack share one box, about 6 GB each, and
# each job needs the other's half least:
#
#   a release (release-staging.sh)  needs staging,  not the test servers
#   a test run (test-all.sh)        needs the tests, not staging
#
# Usage:
#   ./scripts/free-machine.sh report                 # memory, load, what is up
#   ./scripts/free-machine.sh stop test [--yes|--no]     # e2e workers, site servers, dev backend
#   ./scripts/free-machine.sh stop staging [--yes|--no] # staging sites and backend
#   ./scripts/free-machine.sh start staging          # what `stop staging` stopped
#
# Without --yes or --no a stop asks on a terminal, and does nothing without one.
# Stopping is `docker compose stop`, never `down`: containers and volumes stay.
#
# `stop test` refuses while a test-all run holds the lock, and names its pid.
# The developer's own dev servers (:3000, 3010-3016) are listed and never stopped.
#
# release-staging.sh and check-staging.sh call the test side themselves;
# test-all.sh calls `stop staging` at the start and `start staging` when it ends.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/output.sh
source "$REPO_ROOT/scripts/lib/output.sh"
# shellcheck source=lib/test-servers.sh
source "$REPO_ROOT/scripts/lib/test-servers.sh"

usage() { sed -n '2,/^set /p' "$0" | sed '$d; s/^# \{0,1\}//'; }

command="${1:-}"
side="${2:-}"
mode=ask
for arg in "${@:3}"; do
    case "$arg" in
        --yes) mode=yes ;;
        --no) mode=no ;;
        *) echo "error: unknown option $arg" >&2; usage >&2; exit 1 ;;
    esac
done

case "$command $side" in
    "report ")
        machine_preflight 1 no
        free_staging no
        ;;
    "stop test")
        # machine_preflight's own word for stopping both halves of the test side.
        machine_preflight 1 "$([[ $mode == yes ]] && echo all || echo "$mode")"
        ;;
    "stop staging")
        step "staging"
        free_staging "$mode"
        ;;
    "start staging")
        restore_staging
        ;;
    "-h "|"--help "|" ")
        usage
        ;;
    *)
        echo "error: unknown command '$command $side'" >&2
        usage >&2
        exit 1
        ;;
esac
