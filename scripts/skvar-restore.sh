#!/usr/bin/env bash
#
# Put the skvar submodule back where a release found it.
#
#   scripts/skvar-restore.sh <submodule-path> <commit> [branch]
#
# The commit is what matters and what is restored first. The parent repository
# records one skvar commit, and `git status` compares against that: leave the
# submodule anywhere else and it reports "(new commits)", which invites
# committing a pointer to whatever a build happened to leave behind. That
# happened once with another site's *production* branch, where committing it
# would have made that skvar the default for the whole repository.
#
# Restoring the branch name alone is not enough, and was the original bug:
# build-image.sh checks out each site's skvar_branch and then *pulls* it, so
#
#   * a pull can advance the branch, and checking the same branch out again
#     lands on a newer commit than the one recorded;
#   * a release started on the branch a build then pulled looks unchanged by
#     name while sitting on a different commit.
#
# The branch is put back on top afterwards, when it still points at that exact
# commit — working on a detached HEAD is unpleasant, but a wrong commit is
# worse, so the branch is the part that gets skipped when the two disagree.
set -euo pipefail

SUBMODULE_PATH="${1:-}"
COMMIT="${2:-}"
BRANCH="${3:-}"

if [[ -z "$SUBMODULE_PATH" || -z "$COMMIT" ]]; then
    echo "usage: $(basename "$0") <submodule-path> <commit> [branch]" >&2
    exit 1
fi

current="$(git -C "$SUBMODULE_PATH" rev-parse HEAD 2>/dev/null || true)"
current_branch="$(git -C "$SUBMODULE_PATH" symbolic-ref -q --short HEAD || true)"

# Already exactly as it was: same commit, same branch (or both detached).
if [[ "$current" == "$COMMIT" && "$current_branch" == "$BRANCH" ]]; then
    exit 0
fi

if [[ "$current" != "$COMMIT" ]]; then
    echo "    restoring $SUBMODULE_PATH to ${COMMIT:0:7}"
fi

# The branch first, when it still points at the recorded commit: that arrives at
# the right commit *and* on a branch in one move. Otherwise the branch has moved
# on and only the commit can be honoured.
if [[ -n "$BRANCH" ]] &&
   [[ "$(git -C "$SUBMODULE_PATH" rev-parse --verify --quiet "$BRANCH" || true)" == "$COMMIT" ]]; then
    git -C "$SUBMODULE_PATH" checkout --quiet "$BRANCH" || {
        echo "    warning: could not check out $BRANCH in $SUBMODULE_PATH" >&2
        git -C "$SUBMODULE_PATH" checkout --quiet --detach "$COMMIT"
    }
    exit 0
fi

git -C "$SUBMODULE_PATH" checkout --quiet --detach "$COMMIT" || {
    echo "    warning: could not restore $SUBMODULE_PATH to $COMMIT" >&2
    exit 1
}

if [[ -n "$BRANCH" ]]; then
    echo "    note: $SUBMODULE_PATH left detached at ${COMMIT:0:7};" >&2
    echo "          $BRANCH has moved on and no longer points there." >&2
fi
