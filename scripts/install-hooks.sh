#!/usr/bin/env bash
#
# Point git at scripts/hooks, so the hooks are versioned with the repo.
#
#   ./scripts/install-hooks.sh
#
# core.hooksPath rather than copying into .git/hooks: a copy goes stale the
# moment someone edits the original, and nothing tells you it has.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
git -C "$REPO_ROOT" config core.hooksPath scripts/hooks
echo "hooks installed: $(git -C "$REPO_ROOT" config core.hooksPath)"
echo "disable with: git config --unset core.hooksPath"
