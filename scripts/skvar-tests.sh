#!/usr/bin/env bash
#
# List the unit and component tests a tenant's skvar branch carries.
#
#   scripts/skvar-tests.sh [skvar dir]    # default: src/routes/(skvar)
#
# One path per line, prefixed with the skvar dir as given, so run from the
# repository root they can be handed to `vitest run` as they are. Nothing, and
# success, for a branch without tests.
#
# test-all runs the whole unit suite on its first tenant and, on every other,
# only what this lists: those tests exist on that branch alone. The patterns
# are vitest's (vite.config.ts) — *.{test,spec}.{js,ts}, which *.svelte.test.ts
# component tests also match — minus the branch's tests/ directory, which holds
# its Playwright specs. The working tree rather than git, so a test not yet
# committed is found too.
set -euo pipefail

SKVAR_DIR="${1:-src/routes/(skvar)}"

find "$SKVAR_DIR" -path "$SKVAR_DIR/tests" -prune -o -type f \
    \( -name '*.test.ts' -o -name '*.test.js' -o -name '*.spec.ts' -o -name '*.spec.js' \) \
    -print | sort
