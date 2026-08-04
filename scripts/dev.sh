#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DEV_FILE="${DEV_FILE:-$REPO_ROOT/dev.yml}"
SUBMODULE_PATH="src/routes/(skvar)"
BACKEND_DIR="${BACKEND_DIR:-$REPO_ROOT/../backend}"
BACKEND_COMPOSE_FILE="${BACKEND_COMPOSE_FILE:-docker-compose-development.yml}"

usage() {
    echo "Usage: $0 <name>"
    echo "       $0 --list"
    echo
    echo "Switches to the dev context described by <name> in $DEV_FILE:"
    echo "checks out the entry's development_skvar_branch in $SUBMODULE_PATH,"
    echo "warns if production_skvar_branch is ahead of it, ensures the"
    echo "backend's dev docker compose services are running and healthy"
    echo "(starting them if needed), symlinks its env_file to .env, then"
    echo "runs 'pnpm run dev'."
    echo
    echo "  --list    print the available context names and exit"
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
        yq -r '.contexts[].name' "$DEV_FILE"
        exit 0
        ;;
    -h|--help) usage; exit 0 ;;
esac

NAME="$1"

ENTRY=$(yq -o=json -r ".contexts[] | select(.name == \"$NAME\")" "$DEV_FILE")
if [[ -z "$ENTRY" || "$ENTRY" == "null" ]]; then
    echo "error: no entry named '$NAME' in $DEV_FILE" >&2
    echo "Available names:" >&2
    yq -r '.contexts[].name' "$DEV_FILE" >&2
    exit 1
fi

DEV_BRANCH=$(jq -r '.development_skvar_branch' <<<"$ENTRY")
PROD_BRANCH=$(jq -r '.production_skvar_branch' <<<"$ENTRY")
ENV_FILE=$(jq -r '.env_file' <<<"$ENTRY")

ORANGE='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

backend_services_healthy() {
    local total up
    total=$(docker compose -f "$BACKEND_COMPOSE_FILE" config --services 2>/dev/null | wc -l)
    up=$(docker compose -f "$BACKEND_COMPOSE_FILE" ps --format json 2>/dev/null \
        | jq -s '[.[] | select(.State == "running" and (.Health == "healthy" or .Health == ""))] | length')
    [[ "$total" -gt 0 && "$up" -eq "$total" ]]
}

echo "==> [$NAME] Checking backend services in $BACKEND_DIR"
(
    cd "$BACKEND_DIR"
    if backend_services_healthy; then
        echo -e "${GREEN}==> Backend services are already running and healthy${NC}"
    else
        echo "==> Starting backend services (this may take a while)..."
        # --build because some services (the non-root postgres) are built from a
        # local Dockerfile rather than pulled: without it a machine that has
        # never built them tries to pull a name that exists on no registry.
        # USER_ID/GROUP_ID are the build args that keep the database files owned
        # by the invoking user instead of root.
        USER_ID="${USER_ID:-$(id -u)}" GROUP_ID="${GROUP_ID:-$(id -g)}" \
            docker compose -f "$BACKEND_COMPOSE_FILE" up -d --build --wait
        echo -e "${GREEN}==> Backend services are running and healthy${NC}"
    fi
)

cd "$REPO_ROOT"

echo "==> [$NAME] Checking out skvar branch: $DEV_BRANCH"
git -C "$SUBMODULE_PATH" fetch origin "$DEV_BRANCH"
git -C "$SUBMODULE_PATH" checkout "$DEV_BRANCH"
git -C "$SUBMODULE_PATH" pull origin "$DEV_BRANCH"

echo "==> [$NAME] Checking $PROD_BRANCH against $DEV_BRANCH"
git -C "$SUBMODULE_PATH" fetch origin "$PROD_BRANCH"
AHEAD=$(git -C "$SUBMODULE_PATH" rev-list --count "$DEV_BRANCH..origin/$PROD_BRANCH")
if [[ "$AHEAD" -gt 0 ]]; then
    echo -e "${ORANGE}==> [$NAME] warning: $PROD_BRANCH is $AHEAD commit(s) ahead of $DEV_BRANCH${NC}"
else
    echo -e "${GREEN}==> [$NAME] $PROD_BRANCH and $DEV_BRANCH are in sync${NC}"
fi

echo "==> [$NAME] Linking $ENV_FILE -> .env"
ln -sf "$ENV_FILE" .env

echo "==> [$NAME] Starting dev server"
exec pnpm run dev
