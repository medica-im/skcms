#!/usr/bin/env bash
# The slowest scenarios of the last BDD run, and how far each is from typical.
#
# Exists because a timeout is a bad slowness detector: it reports only at 120s,
# and only as a failure. A scenario that should take 5s and takes 60s passes
# today, silently, and the first sign is a timeout months later when it finally
# crosses the line. This makes the distribution visible instead.
#
#   ./scripts/slow-scenarios.sh            # the 20 slowest
#   ./scripts/slow-scenarios.sh 5          # anything over 5x the median
#
# Reads test-results/results.json, written by the json reporter in
# playwright.config.ts. Run a suite first; the file is per-run, not cumulative.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

RESULTS="test-results/results.json"
[[ -f "$RESULTS" ]] || { echo "no $RESULTS — run a suite first" >&2; exit 1; }

FACTOR="${1:-}"

python3 - "$RESULTS" "$FACTOR" <<'PY'
import json, sys, statistics

results, factor = sys.argv[1], sys.argv[2]
with open(results) as fh:
    data = json.load(fh)

rows = []
def walk(suite):
    for spec in suite.get("specs", []):
        for test in spec.get("tests", []):
            for r in test.get("results", []):
                ms = r.get("duration") or 0
                if ms:
                    rows.append((ms / 1000, spec.get("title", "?"), r.get("status")))
    for child in suite.get("suites", []):
        walk(child)

for suite in data.get("suites", []):
    walk(suite)

if not rows:
    print("no timed scenarios in the report")
    raise SystemExit(0)

secs = sorted(s for s, _, _ in rows)
median = statistics.median(secs)
p90 = secs[int(len(secs) * 0.9) - 1]
print(f"{len(rows)} scenarios   median={median:.1f}s  p90={p90:.1f}s  max={secs[-1]:.1f}s\n")

rows.sort(reverse=True)
if factor:
    threshold = median * float(factor)
    picked = [r for r in rows if r[0] > threshold]
    print(f"over {factor}x the median ({threshold:.1f}s): {len(picked)}\n")
else:
    picked = rows[:20]
    print("the 20 slowest:\n")

for secs_, title, status in picked:
    mark = "ok  " if status == "passed" else "FAIL"
    print(f"  {secs_:6.1f}s  {mark}  {round(secs_ / median)}x median  {title[:64]}")
PY
