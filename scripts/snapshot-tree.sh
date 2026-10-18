#!/usr/bin/env bash
#
# Capture the working tree as commits, for test-all to run on.
#
#   eval "$(scripts/snapshot-tree.sh)"
#   # SNAPSHOT=<commit> SKVAR_SNAPSHOT=<commit> SKVAR_BRANCH=<branch>
#
# Every file as it is on disk — modified, new or deleted, staged or not, but
# not ignored — committed on top of HEAD. skvar, a submodule with uncommitted
# edits of its own, gets the same treatment, and the parent's gitlink points at
# its snapshot. A tree with nothing changed is its HEAD itself.
#
# Through a scratch index, so the developer's index, files and branches are
# never touched: the point of a snapshot is that the working tree is free for
# other work while a run tests the code as it was. No ref is written either;
# keeping the commits alive is the caller's business.
#
# Unsigned on purpose: these are scaffolding for a test run, never pushed.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
SKVAR_PATH="${SKVAR_PATH:-src/routes/(skvar)}"
SKVAR="$ROOT/$SKVAR_PATH"

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

# snap <repo> <name> [gitlink commit]: prints a commit holding <repo>'s working
# tree, or HEAD when that tree is HEAD's. Starts from the real index, copied, so
# `add -A` reuses its stat cache rather than hashing every file again.
snap() {
    local repo="$1" index="$SCRATCH/index.$2" gitlink="${3:-}" head tree
    head="$(git -C "$repo" rev-parse HEAD)"
    local real
    real="$(git -C "$repo" rev-parse --path-format=absolute --git-path index)"
    if [[ -f "$real" ]]; then cp "$real" "$index"; else GIT_INDEX_FILE="$index" git -C "$repo" read-tree HEAD; fi

    GIT_INDEX_FILE="$index" git -C "$repo" add -A
    [[ -n "$gitlink" ]] && GIT_INDEX_FILE="$index" git -C "$repo" update-index --cacheinfo "160000,$gitlink,$SKVAR_PATH"
    tree="$(GIT_INDEX_FILE="$index" git -C "$repo" write-tree)"

    if [[ "$tree" == "$(git -C "$repo" rev-parse "HEAD^{tree}")" ]]; then
        printf '%s\n' "$head"
    else
        git -C "$repo" commit-tree --no-gpg-sign "$tree" -p "$head" \
            -m "test-all snapshot of $(git -C "$repo" rev-parse --abbrev-ref HEAD) at $(date -Iseconds)"
    fi
}

skvar_snapshot=""
skvar_branch=""
if [[ -e "$SKVAR/.git" ]]; then
    skvar_snapshot="$(snap "$SKVAR" skvar)"
    skvar_branch="$(git -C "$SKVAR" branch --show-current)"
fi
snapshot="$(snap "$ROOT" main "$skvar_snapshot")"

printf 'SNAPSHOT=%s\nSKVAR_SNAPSHOT=%s\nSKVAR_BRANCH=%s\n' "$snapshot" "$skvar_snapshot" "$skvar_branch"
