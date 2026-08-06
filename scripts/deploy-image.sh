#!/usr/bin/env bash
#
# Pull a prebuilt image on its server and restart the container.
#
# Deliberately never builds: build-image.sh builds and pushes from your
# laptop, this only pulls that exact tag. Staging and production therefore
# run the same artefact you tested, not a rebuild that could drift.
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
IMAGES_FILE="${IMAGES_FILE:-$REPO_ROOT/images.yml}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose-production.yml}"

usage() {
    echo "Usage: $0 <name> [<name> ...]"
    echo "       $0 --list"
    echo
    echo "Pulls the image described by <name> in $IMAGES_FILE on its host and"
    echo "restarts the container. Never builds on the server."
    echo
    echo "  --list       print deployable names and their targets"
    echo "  --dry-run    print what would run, without touching the server"
    echo
    echo "Environment:"
    echo "  COMPOSE_FILE   fallback compose file on the server (default:"
    echo "                 $COMPOSE_FILE). An image's own"
    echo "                 compose_file: in $(basename "$IMAGES_FILE") wins over this."
}

if ! command -v yq >/dev/null 2>&1; then
    echo "error: yq (mikefarah/yq) is required" >&2
    exit 1
fi

DRY_RUN=0
NAMES=()
for arg in "$@"; do
    case "$arg" in
        -h|--help) usage; exit 0 ;;
        --list)
            printf '%-32s %-12s %s\n' NAME HOST DIR
            yq -r '.images[] | [.name, (.host // "-"), (.dir // "-")] | @tsv' "$IMAGES_FILE" |
                while IFS=$'\t' read -r n h d; do printf '%-32s %-12s %s\n' "$n" "$h" "$d"; done
            exit 0 ;;
        --dry-run) DRY_RUN=1 ;;
        -*) echo "error: unknown option $arg" >&2; usage >&2; exit 1 ;;
        *) NAMES+=("$arg") ;;
    esac
done

if [[ ${#NAMES[@]} -eq 0 ]]; then
    usage >&2
    exit 1
fi

# Resolve every entry before deploying any of them, so a typo fails fast
# instead of half-way through a multi-site deploy.
for NAME in "${NAMES[@]}"; do
    ENTRY=$(yq -o=json -r ".images[] | select(.name == \"$NAME\")" "$IMAGES_FILE")
    if [[ -z "$ENTRY" || "$ENTRY" == "null" ]]; then
        echo "error: no image named '$NAME' in $IMAGES_FILE" >&2
        echo "available names:" >&2
        yq -r '.images[].name' "$IMAGES_FILE" >&2
        exit 1
    fi

    HOST=$(jq -r '.host // empty' <<<"$ENTRY")
    DIR=$(jq -r '.dir // empty' <<<"$ENTRY")
    if [[ -z "$HOST" || -z "$DIR" ]]; then
        echo "error: '$NAME' has no host/dir in $IMAGES_FILE — not deployable yet" >&2
        exit 1
    fi
done

SECONDS=0

for NAME in "${NAMES[@]}"; do
    ENTRY=$(yq -o=json -r ".images[] | select(.name == \"$NAME\")" "$IMAGES_FILE")
    HOST=$(jq -r '.host' <<<"$ENTRY")
    DIR=$(jq -r '.dir' <<<"$ENTRY")
    TAG=$(jq -r '.tag' <<<"$ENTRY")
    # Per-image, because it is a property of the deployment and not of the run:
    # a staging target defines its own service name and port
    # (nodeserver_staging, NODE_PORT_EXTERNAL_STAGING) and adds a healthcheck,
    # so deploying it with the production file starts the wrong service.
    ENTRY_COMPOSE_FILE=$(jq -r '.compose_file // empty' <<<"$ENTRY")
    ENTRY_COMPOSE_FILE="${ENTRY_COMPOSE_FILE:-$COMPOSE_FILE}"

    echo "==> [$NAME] $TAG -> $HOST:$DIR ($ENTRY_COMPOSE_FILE)"

    if [[ $DRY_RUN -eq 1 ]]; then
        echo "    (dry run) ssh $HOST: cd $DIR && docker compose -f $ENTRY_COMPOSE_FILE pull && up -d"
        continue
    fi

    ssh "$HOST" bash -s <<EOF
set -euo pipefail
cd "$DIR"

# DOCKER_IMAGE_NAME is what the compose files interpolate into image:.
export DOCKER_IMAGE_NAME="$TAG"

echo "    pulling $TAG"
# --quiet: stdout here is a pipe, not a terminal, so Docker's progress bars
# degrade to one line per frame — thousands of "Extracting 47.19MB" lines for
# a single layer. Errors are still reported.
docker compose -f "$ENTRY_COMPOSE_FILE" pull --quiet

echo "    restarting"
docker compose -f "$ENTRY_COMPOSE_FILE" up -d --remove-orphans --quiet-pull

echo "    running:"
docker compose -f "$ENTRY_COMPOSE_FILE" ps --format '      {{.Service}}  {{.Status}}'

# Untagged layers from previous deploys add up on small servers.
docker image prune -f >/dev/null
EOF

    echo "==> [$NAME] done"
done

duration=$SECONDS
echo "==> deployed ${#NAMES[@]} image(s) in $((duration / 60))m $((duration % 60))s"
