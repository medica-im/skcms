#!/usr/bin/env bash
#
# Print the svelte-check error baseline one site is held to.
#
#   scripts/typecheck-baseline-of.sh lyon3
#
# The numbers are in scripts/typecheck-baselines.conf. test-all.sh and the
# pre-push hook both ask here, so they cannot read the file differently.
#
# First match wins:
#   TYPECHECK_BASELINE             "this number, for whatever I am running"
#   TYPECHECK_BASELINE_<site>      one site, from the environment
#   the site's line in the file
#   TYPECHECK_BASELINE_DEFAULT     a site with no line yet
set -uo pipefail

SITE="${1:-}"
if [[ ! "$SITE" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "usage: $(basename "$0") <site>   (a dev.yml context name)" >&2
    exit 2
fi

FILE="${TYPECHECK_BASELINES_FILE:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/typecheck-baselines.conf}"
var="TYPECHECK_BASELINE_${SITE}"

if [[ -n "${TYPECHECK_BASELINE:-}" ]]; then
    printf '%s\n' "$TYPECHECK_BASELINE"; exit 0
fi
if [[ -n "${!var:-}" ]]; then
    printf '%s\n' "${!var}"; exit 0
fi

# shellcheck source=typecheck-baselines.conf
source "$FILE" || { echo "$(basename "$0"): cannot read $FILE" >&2; exit 1; }
value="${!var:-${TYPECHECK_BASELINE_DEFAULT:-}}"
if [[ -z "$value" ]]; then
    echo "$(basename "$0"): no baseline for $SITE and no TYPECHECK_BASELINE_DEFAULT in $FILE" >&2
    exit 1
fi
printf '%s\n' "$value"
