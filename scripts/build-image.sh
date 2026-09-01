#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
IMAGES_FILE="${IMAGES_FILE:-$REPO_ROOT/images.yml}"
SUBMODULE_PATH="src/routes/(skvar)"

usage() {
    echo "Usage: $0 [--keep-skvar] <name>"
    echo "       $0 --list"
    echo
    echo "Builds and pushes the frontend Docker image described by <name> in $IMAGES_FILE."
    echo "Checks out the entry's skvar_branch in $SUBMODULE_PATH before building,"
    echo "and puts the submodule back where it found it afterwards."
    echo
    echo "  --list         print the available image names and exit"
    echo "  --keep-skvar   leave the submodule on the branch that was built."
    echo "                 For a caller building several sites in a row that"
    echo "                 restores once at the end itself."
}

if ! command -v yq >/dev/null 2>&1; then
    echo "error: yq (mikefarah/yq) is required" >&2
    exit 1
fi

KEEP_SKVAR=0
NAME=""
for arg in "$@"; do
    case "$arg" in
        --list)
            yq -r '.images[].name' "$IMAGES_FILE"
            exit 0
            ;;
        -h|--help) usage; exit 0 ;;
        --keep-skvar) KEEP_SKVAR=1 ;;
        -*) echo "error: unknown option $arg" >&2; usage >&2; exit 1 ;;
        *)
            if [[ -n "$NAME" ]]; then
                echo "error: build one image at a time (got '$NAME' and '$arg')" >&2
                exit 1
            fi
            NAME="$arg"
            ;;
    esac
done

if [[ -z "$NAME" ]]; then
    usage >&2
    exit 1
fi

ENTRY=$(yq -o=json -r ".images[] | select(.name == \"$NAME\")" "$IMAGES_FILE")
if [[ -z "$ENTRY" || "$ENTRY" == "null" ]]; then
    echo "error: no entry named '$NAME' in $IMAGES_FILE" >&2
    echo "Available names:" >&2
    yq -r '.images[].name' "$IMAGES_FILE" >&2
    exit 1
fi

TARGET=$(jq -r '.target' <<<"$ENTRY")
SKVAR_BRANCH=$(jq -r '.skvar_branch' <<<"$ENTRY")
ENV_FILE=$(jq -r '.env_file' <<<"$ENTRY")
TAG=$(jq -r '.tag' <<<"$ENTRY")

cd "$REPO_ROOT"

# Where the submodule was before this build moved it.
#
# Recorded as a commit, not just a branch name: the pull below advances the
# branch, so putting the same branch back can still land on a newer commit than
# the parent repository records — and `git status` goes on reporting
# "(new commits)" against a tree nobody edited. Committing that pointer would
# change which skvar the whole repository builds from; it once left the tree on
# another site's production branch.
#
# From a trap, so an interrupted or failed build cleans up too.
if [[ $KEEP_SKVAR -eq 0 ]]; then
    ORIGINAL_SKVAR_COMMIT="$(git -C "$SUBMODULE_PATH" rev-parse HEAD 2>/dev/null || true)"
    ORIGINAL_SKVAR_BRANCH="$(git -C "$SUBMODULE_PATH" symbolic-ref -q --short HEAD || true)"
    restore_skvar() {
        [[ -n "${ORIGINAL_SKVAR_COMMIT:-}" ]] || return 0
        "$REPO_ROOT/scripts/skvar-restore.sh" \
            "$SUBMODULE_PATH" "$ORIGINAL_SKVAR_COMMIT" "$ORIGINAL_SKVAR_BRANCH" || true
    }
    trap restore_skvar EXIT
fi

echo "==> [$NAME] Checking out skvar branch: $SKVAR_BRANCH"
git -C "$SUBMODULE_PATH" fetch origin "$SKVAR_BRANCH"
git -C "$SUBMODULE_PATH" checkout "$SKVAR_BRANCH"

# --ff-only, not a bare pull. A build takes what the remote holds; it has no
# business merging, and no way to resolve a conflict if it tried. A bare `git
# pull` asks git to reconcile, and git refuses outright when no pull.rebase or
# pull.ff is configured — which stopped a five-site release on its first site
# with "Need to specify how to reconcile divergent branches", after an earlier
# build in the same run had left the submodule on another branch.
#
# If this cannot fast-forward, the local branch has commits the remote does not:
# say so and stop, rather than inventing a merge inside a release.
if ! git -C "$SUBMODULE_PATH" merge --ff-only "origin/$SKVAR_BRANCH"; then
    echo "error: skvar $SKVAR_BRANCH cannot fast-forward to origin/$SKVAR_BRANCH." >&2
    echo "       The local branch has commits the remote does not. Push or reset" >&2
    echo "       it, then run this again — a release will not merge for you." >&2
    exit 1
fi

GIT_SHA=$(git rev-parse HEAD)
SUBMODULE_SHA=$(git -C "$SUBMODULE_PATH" rev-parse HEAD)

# The moving tag from images.yml, plus one that never moves.
#
# :latest alone left nothing to roll back to — pushing moves that single
# pointer, and deploy-image.sh prunes the image it displaced. The commit was
# recorded as a label, but a label cannot be used to ask a registry for an
# image; only a tag can. Both are pushed, so nothing downstream changes and a
# bad deploy is now recoverable:
#
#   scripts/deploy-image.sh <name> --tag <previous-sha-tag>
IMMUTABLE_TAG="${TAG%:*}:$("$REPO_ROOT/scripts/image-tag.sh")"

case "$IMMUTABLE_TAG" in
    *-dirty)
        echo "==> [$NAME] WARNING: building with uncommitted changes." >&2
        echo "    $IMMUTABLE_TAG is tagged -dirty: its sha names a commit that" >&2
        echo "    does not contain what is in this image." >&2
        ;;
esac

echo "==> [$NAME] Building target=$TARGET env_file=$ENV_FILE"
echo "    tags: $TAG"
echo "          $IMMUTABLE_TAG"
docker build \
    --target "$TARGET" \
    --build-arg ENV_FILE="$ENV_FILE" \
    --build-arg GIT_SHA="$GIT_SHA" \
    --build-arg SUBMODULE_SHA="$SUBMODULE_SHA" \
    -t "$TAG" \
    -t "$IMMUTABLE_TAG" \
    .

echo "==> [$NAME] Pushing $TAG"
docker push "$TAG"
echo "==> [$NAME] Pushing $IMMUTABLE_TAG"
docker push "$IMMUTABLE_TAG"

echo "==> [$NAME] Done: $TAG ($IMMUTABLE_TAG)"
