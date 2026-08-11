#!/usr/bin/env bash
#
# Sort muffet's findings into our broken links and other people's.
#
#   muffet --format=json <site> | scripts/linkcheck-classify.sh <origin>
#
# Exits non-zero only when one of our own pages is broken. A dead link to
# somebody else's site is printed and forgiven: it breaks on its own schedule,
# and failing releases over it is how a check stops being read. A crawl of
# dev.santelyon3.fr found a 403 from helloasso and a run of 429s from
# openstreetmap rate-limiting the crawler — nothing to do with us, and enough
# to fail every release if treated alike.
#
# Reads muffet's JSON rather than its coloured output: a URL either starts with
# our origin or it does not, which beats matching patterns against a terminal.
set -uo pipefail

ORIGIN="${1:-}"
if [[ -z "$ORIGIN" ]]; then
    echo "usage: $(basename "$0") <origin>   # muffet --format=json … | $(basename "$0") https://site" >&2
    exit 2
fi
# Trailing slash removed so the prefix test below cannot be defeated by one.
ORIGIN="${ORIGIN%/}"

if ! command -v jq >/dev/null 2>&1; then
    echo "error: jq is required to read muffet's JSON" >&2
    exit 2
fi

INPUT="$(cat)"

# Nothing to read: a crawl that never started. Reported, but not treated as a
# clean run by pretending we checked something.
if [[ -z "${INPUT// /}" ]]; then
    echo "    link check produced no output — was the site reachable?" >&2
    exit 0
fi

if ! jq -e . >/dev/null 2>&1 <<<"$INPUT"; then
    echo "    link check output was not JSON; passing it through:" >&2
    printf '%s\n' "$INPUT" >&2
    exit 0
fi

# "Ours" is a link on our own origin. The boundary matters: a host that merely
# *starts* with our name (staging.santelyon3.fr.evil.example) is not us, so the
# next character has to be a path, a query, a fragment, or nothing at all.
readonly FILTER='
  [ .[] | . as $page | (.links // [])[]
    | select(.error != null)
    | { page: $page.url, url: .url, error: .error,
        ours: (.url | startswith($origin + "/") or . == $origin
                     or startswith($origin + "?") or startswith($origin + "#")) }
  ]'

FINDINGS="$(jq -c --arg origin "$ORIGIN" "$FILTER" <<<"$INPUT")"

ours_count="$(jq 'map(select(.ours)) | length' <<<"$FINDINGS")"
theirs_count="$(jq 'map(select(.ours | not)) | length' <<<"$FINDINGS")"

if [[ "$theirs_count" -gt 0 ]]; then
    echo "    $theirs_count broken link(s) on other sites (not failing the release):"
    jq -r 'map(select(.ours | not)) | .[] | "      \(.error)  \(.url)"' <<<"$FINDINGS" |
        sort -u | head -20
    [[ "$theirs_count" -gt 20 ]] && echo "      … and $((theirs_count - 20)) more"
fi

if [[ "$ours_count" -gt 0 ]]; then
    echo "    $ours_count broken link(s) on this site:"
    # The page each was found on, because a 404 is easier to fix when you know
    # what links to it.
    jq -r 'map(select(.ours)) | .[] | "      \(.error)  \(.url)\n            linked from \(.page)"' \
        <<<"$FINDINGS" | head -40
    exit 1
fi

echo "    no broken links on this site"
exit 0
