#!/usr/bin/env bash
#
# Bring the worktree a test-all run runs in to a snapshot.
#
#   scripts/test-worktree.sh <dir> <snapshot> [<skvar snapshot>]
#
# <snapshot> and <skvar snapshot> come from snapshot-tree.sh. The worktree is
# created beside the checkout the first time and refreshed after that, so its
# node_modules and caches — ignored, so left alone — make the next run fast.
#
# skvar is a worktree of the checkout's own submodule, detached: a branch can
# be checked out in one worktree only, and the developer's submodule already
# has one.
#
# Git leaves out the ignored inputs a run reads (dev.yml, images.yml, the site
# env files, .env.test-all), so they are linked back to the checkout rather
# than copied: no second copy of a secret, nothing to drift. Left to the
# worktree: `.env`, which the per-site stages switch, the files a run generates
# (.env.test.wN, .env.site.*) and backups.
set -euo pipefail

if [[ $# -lt 2 ]]; then
    echo "usage: $(basename "$0") <dir> <snapshot> [<skvar snapshot>]" >&2
    exit 2
fi
ROOT="$(git rev-parse --show-toplevel)"
WT="$(realpath -m "$1")"
SNAP="$2"
SKVAR_SNAP="${3:-}"
SKVAR_PATH="${SKVAR_PATH:-src/routes/(skvar)}"
[[ "$WT" == "$ROOT" ]] && { echo "$(basename "$0"): refusing to use the checkout itself" >&2; exit 2; }

# is_worktree <repo> <dir>: whether <dir> is one of <repo>'s worktrees.
is_worktree() { git -C "$1" worktree list --porcelain | grep -qxF "worktree $2"; }

# checkout_at <repo> <dir> <commit>: <dir> as a detached worktree of <repo> at
# <commit>, with no file the commit does not hold, ignored ones excepted.
checkout_at() {
    local repo="$1" dir="$2" commit="$3"
    if is_worktree "$repo" "$dir"; then
        git -C "$dir" checkout -q --force --detach "$commit"
        git -C "$dir" clean -q -fd
    else
        # An empty directory is what the parent's checkout leaves at a
        # submodule's path; anything else there is not ours to keep.
        rm -rf "$dir"
        git -C "$repo" worktree prune
        git -C "$repo" worktree add -q --detach "$dir" "$commit"
    fi
}

checkout_at "$ROOT" "$WT" "$SNAP"
[[ -n "$SKVAR_SNAP" ]] && checkout_at "$ROOT/$SKVAR_PATH" "$WT/$SKVAR_PATH" "$SKVAR_SNAP"

for input in "$ROOT"/dev.yml "$ROOT"/images.yml "$ROOT"/.env.test-all \
             "$ROOT"/.env.dev.* "$ROOT"/.env.staging.* "$ROOT"/.env.production.*; do
    name="$(basename "$input")"
    [[ -f "$input" && "$name" != *.bak* ]] || continue
    [[ "$(readlink "$WT/$name" 2>/dev/null)" == "$input" ]] || ln -sfn "$input" "$WT/$name"
done
# Links to inputs since removed from the checkout.
find "$WT" -maxdepth 1 -type l -xtype l -delete

if [[ "${TEST_WORKTREE_INSTALL:-1}" != "0" ]]; then
    (cd "$WT" && pnpm install --frozen-lockfile --prefer-offline) >&2
fi
