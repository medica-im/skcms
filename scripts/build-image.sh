#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
IMAGES_FILE="${IMAGES_FILE:-$REPO_ROOT/images.yml}"
SUBMODULE_PATH="src/routes/(skvar)"

usage() {
    echo "Usage: $0 <name>"
    echo "       $0 --list"
    echo
    echo "Builds and pushes the frontend Docker image described by <name> in $IMAGES_FILE."
    echo "Checks out the entry's skvar_branch in $SUBMODULE_PATH before building."
    echo
    echo "  --list    print the available image names and exit"
}

if ! command -v yq >/dev/null 2>&1; then
    echo "error: yq (mikefarah/yq) is required" >&2
    exit 1
fi

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

case "$1" in
    --list)
        yq -r '.images[].name' "$IMAGES_FILE"
        exit 0
        ;;
    -h|--help) usage; exit 0 ;;
esac

NAME="$1"

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

echo "==> [$NAME] Checking out skvar branch: $SKVAR_BRANCH"
git -C "$SUBMODULE_PATH" fetch origin "$SKVAR_BRANCH"
git -C "$SUBMODULE_PATH" checkout "$SKVAR_BRANCH"
git -C "$SUBMODULE_PATH" pull origin "$SKVAR_BRANCH"

GIT_SHA=$(git rev-parse HEAD)
SUBMODULE_SHA=$(git -C "$SUBMODULE_PATH" rev-parse HEAD)

echo "==> [$NAME] Building target=$TARGET env_file=$ENV_FILE tag=$TAG"
docker build \
    --target "$TARGET" \
    --build-arg ENV_FILE="$ENV_FILE" \
    --build-arg GIT_SHA="$GIT_SHA" \
    --build-arg SUBMODULE_SHA="$SUBMODULE_SHA" \
    -t "$TAG" \
    .

echo "==> [$NAME] Pushing $TAG"
docker push "$TAG"

echo "==> [$NAME] Done: $TAG"
