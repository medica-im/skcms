#!/usr/bin/env bash
# How fast a site answers: time to first byte of its pages and of the API
# calls every page depends on.
#
#   scripts/latency.sh [-n N] [-c C] <site> [<site> ...]
#   scripts/latency.sh production        # the production sites
#   scripts/latency.sh staging           # their staging counterparts
#
# A <site> is the app's root URL, base path included: https://santelyon3.fr,
# https://unipa.fr/annuaire. The API is reached at the origin's /api/v2, which
# is where the front proxies send it on every site.
#
# Each URL is requested N times in a row (default 6), one at a time, and the
# first request is reported apart from the rest: a slow first and fast rest is
# a cold cache; slow throughout is the server. One visitor's worth of load —
# safe on production.
#
# -c C sends C requests at a time instead (N*C per URL), and reports how many
# the server answered per second in place of "first". One at a time cannot
# show what several workers or a busy moment change: a second worker makes no
# single request faster, it lets two be served together. C visitors' worth of
# load — keep C small on production.
#
# CURL_OPTS is passed to every curl: CURL_OPTS=-4 from a server whose IPv4
# address nginx exempts from rate limiting, when its name also has an IPv6
# address (curl prefers it, and that one is not exempt).
#
# Written on 2026-10-03, when santelyon3.fr and unipa.fr took 4 to 17 seconds
# per page and their /api/v2/organization up to 8 seconds, against 0.03-0.09s
# for the same code on staging.
set -euo pipefail

n=6
c=1
CURL_OPTS="${CURL_OPTS:-}"
while [[ "${1:-}" == -[nc] ]]; do
    case "$1" in
        -n) n="$2" ;;
        -c) c="$2" ;;
    esac
    shift 2
done

case "${1:-}" in
    production) set -- https://santelyon3.fr https://unipa.fr/annuaire https://sante-gadagne.fr https://annuaire.medica.im ;;
    staging) set -- https://staging.santelyon3.fr https://staging.unipa.fr/annuaire https://staging.sante-gadagne.fr https://staging.annuaire.medica.im ;;
    ""|-h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
esac

PAGES=(/ /sites)
API=(/api/v2/organization /api/v2/entries /api/v2/public/facilities /api/v2/effector-type-labels /api/v2/situations)

# "status first median max" for one URL, times in seconds.
measure() {
    local url="$1" times=() status="" i out
    for ((i = 0; i < n; i++)); do
        out="$(curl $CURL_OPTS -s -o /dev/null --max-time 60 -w '%{http_code} %{time_starttransfer}' "$url" || echo "000 60")"
        status="${out% *}"
        times+=("${out#* }")
    done
    printf '%s\n' "${times[@]:1}" | sort -n | awk -v first="${times[0]}" -v status="$status" '
        { t[NR] = $1 }
        END {
            median = (NR % 2) ? t[(NR + 1) / 2] : (t[NR / 2] + t[NR / 2 + 1]) / 2
            printf "%s %.2f %.2f %.2f\n", status, first, median, t[NR]
        }'
}

# N*C requests, C at a time: "status req/s median max". Every status seen is
# reported (200+429): over nginx's per-address rate limit (30 r/s on our
# servers) a concurrent run measures the limit, not the server.
measure_concurrent() {
    local url="$1" start end
    start="$(date +%s.%N)"
    seq $((n * c)) | xargs -P "$c" -I{} curl $CURL_OPTS -s -o /dev/null --max-time 60 \
        -w '%{http_code} %{time_starttransfer}\n' "$url" > "$work"
    end="$(date +%s.%N)"
    # Sorted by time before awk: mawk, the awk here, has no asort().
    sort -k2,2n "$work" | awk -v total=$((n * c)) -v start="$start" -v end="$end" '
        { if (!($1 in seen)) { seen[$1]; status = status (status == "" ? "" : "+") $1 }
          t[NR] = $2 }
        END {
            wall = end - start
            median = (NR % 2) ? t[(NR + 1) / 2] : (t[NR / 2] + t[NR / 2 + 1]) / 2
            printf "%s %.1f %.2f %.2f\n", status, total / wall, median, t[NR]
        }'
}
work="$(mktemp)"
trap 'rm -f "$work"' EXIT

if (( c > 1 )); then
    run=measure_concurrent unit=""
    printf '%-52s %6s %7s %8s %6s\n' "URL ($((n * c)) requests, $c at a time)" status "req/s" median max
else
    run=measure unit="s"
    printf '%-52s %6s %7s %8s %6s\n' "URL ($n requests each)" status first median max
fi
for site in "$@"; do
    site="${site%/}"
    origin="$(printf '%s' "$site" | grep -oE '^https?://[^/]+')"
    for path in "${PAGES[@]}"; do
        read -r status first median max < <($run "$site$path")
        printf '%-52s %6s %7s %7ss %5ss\n' "$site$path" "$status" "$first$unit" "$median" "$max"
    done
    for path in "${API[@]}"; do
        read -r status first median max < <($run "$origin$path")
        printf '%-52s %6s %7s %7ss %5ss\n' "  $origin$path" "$status" "$first$unit" "$median" "$max"
    done
done
