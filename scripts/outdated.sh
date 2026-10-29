#!/usr/bin/env bash
#
# What the projects' dependencies are behind on: pnpm outdated for skcms and
# console, pip list --outdated in the local backend container. Current against
# latest, with no CVE involved.
#
# Known vulnerabilities in what the servers run are infra's
# scripts/scan-servers.sh: it scans the servers' running images by digest,
# where the vulnerable code would actually be, not the lockfiles here, which
# also list dev dependencies that never ship.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONSOLE_DIR="${CONSOLE_DIR:-$(cd "$REPO_ROOT/.." && pwd)/console}"
# The dev stack's, compose project backend-dev on the workbench (infra's
# docs/workbench.md). backend-fastapi-1 there is staging's own backend.
BACKEND_CONTAINER="${BACKEND_CONTAINER:-backend-dev-fastapi-1}"

case "${1:-}" in
    -h|--help) sed -n '2,/^set /p' "$0" | sed '$d; s/^# \{0,1\}//'; exit 0 ;;
    "") ;;
    *) echo "usage: $(basename "$0")" >&2; exit 2 ;;
esac

echo "=== pnpm outdated (skcms) ==="
( cd "$REPO_ROOT" && pnpm outdated ) || true
echo
if [[ -d "$CONSOLE_DIR" ]]; then
    echo "=== pnpm outdated (console) ==="
    ( cd "$CONSOLE_DIR" && pnpm outdated ) || true
    echo
fi
echo "=== pip list --outdated (backend, inside $BACKEND_CONTAINER) ==="
docker exec "$BACKEND_CONTAINER" pip list --outdated 2>/dev/null \
    || echo "$BACKEND_CONTAINER is not running — start the backend's development stack first"
