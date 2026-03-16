#!/usr/bin/env bash
set -euo pipefail

HOST="dev"
BASE_DIR="${BASE_DIR:-/opt/dev.medica.im}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose-production.yml}"
SUBMODULE_PATH="${SUBMODULE_PATH:-src/routes/(skvar)}"
GIT_BRANCH="${GIT_BRANCH:-dev}"

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <project-folder>"
    echo "Example: $0 dev.ipa.medica.im"
    exit 1
fi

PROJECT_NAME="$1"
PROJECT_DIR="$BASE_DIR/$PROJECT_NAME"

SECONDS=0

ssh "$HOST" bash -s <<EOF
set -euo pipefail
cd "$PROJECT_DIR"

echo "==> Pulling main repo ($GIT_BRANCH)..."
git pull origin "$GIT_BRANCH"

echo "==> Pulling submodule $SUBMODULE_PATH..."
cd "$SUBMODULE_PATH"
git pull
cd "$PROJECT_DIR"

echo "==> Building and restarting..."
docker compose -f "$COMPOSE_FILE" build --parallel
docker compose -f "$COMPOSE_FILE" up -d
EOF

duration=$SECONDS
echo "==> $PROJECT_NAME deployed in $((duration / 60))m $((duration % 60))s"
