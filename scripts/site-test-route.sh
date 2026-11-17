#!/usr/bin/env bash
#
# Whether test-all's own route to dev.<site> answers on a test address.
#
#   scripts/site-test-route.sh dev.santelyon3.fr 127.0.0.2
#
# Asked, not looked up: the vhosts' own wildcard :443 answers on the test
# address too, so a listening socket proves nothing. Only dev-site-test.conf
# marks its responses (X-Dev-Site-Test) — whatever the status, a 502 from a
# server not yet started included.
#
# Exits 0 when the route answers, 1 when an answer comes back unmarked (the
# route is not installed), 2 when nothing answers at all. The last two say on
# stderr what came back.
set -uo pipefail

HOST="${1:-}" VIA="${2:-}"
if [[ -z "$HOST" || -z "$VIA" ]]; then
    echo "usage: $(basename "$0") <host> <address>" >&2
    exit 2
fi

# Read whole before matching: curl writes header by header, and a grep -q that
# stops at the marker fails curl's next write, which pipefail then reports as
# the pipeline's status.
rc=0
headers="$("${CURL:-curl}" --connect-to "::$VIA:" -sk -o /dev/null -D - --max-time 10 \
    "https://$HOST/" 2>/dev/null)" || rc=$?

grep -qi '^x-dev-site-test: 1' <<<"$headers" && exit 0

status="$(head -1 <<<"$headers" | tr -d '\r')"
if (( rc )) && [[ -z "$headers" ]]; then
    echo "https://$HOST/ on $VIA: no answer (curl exit $rc)" >&2
    exit 2
fi
echo "https://$HOST/ on $VIA: \"${status:-no status line}\" without X-Dev-Site-Test (curl exit $rc)" >&2
exit 1
