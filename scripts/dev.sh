#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DEV_FILE="${DEV_FILE:-$REPO_ROOT/dev.yml}"
SUBMODULE_PATH="src/routes/(skvar)"
BACKEND_DIR="${BACKEND_DIR:-$REPO_ROOT/../backend}"
BACKEND_COMPOSE_FILE="${BACKEND_COMPOSE_FILE:-docker-compose-development.yml}"
# Each context declares its own port in dev.yml (see the note there); DEV_PORT
# overrides it for a one-off.
DEV_PORT="${DEV_PORT:-}"
# The hostname -> port map nginx uses. Checked against dev.yml below, since a
# disagreement makes the site unreachable rather than merely misconfigured.
NGINX_PORT_MAP="${NGINX_PORT_MAP:-$REPO_ROOT/scripts/nginx/dev-site-ports.conf}"

RESTART=0

usage() {
    echo "Usage: $0 [--restart] <name>"
    echo "       $0 --list"
    echo
    echo "Switches to the dev context described by <name> in $DEV_FILE:"
    echo "checks out the entry's development_skvar_branch in $SUBMODULE_PATH,"
    echo "warns if production_skvar_branch is ahead of it, ensures the"
    echo "backend's dev docker compose services are running and healthy"
    echo "(starting them if needed), symlinks its env_file to .env, then runs"
    echo "vite on that context's own port from dev.yml."
    echo
    echo "One site runs at a time. If any dev server is already up — this"
    echo "context's or another's — the script stops rather than leave a server"
    echo "serving the route manifest of the branch it booted with, which"
    echo "renders fine and then dies on hydration."
    echo
    echo "  --list     print the available context names and exit"
    echo "  --restart  stop whichever dev server is running first"
}

if ! command -v yq >/dev/null 2>&1; then
    echo "error: yq (mikefarah/yq) is required" >&2
    exit 1
fi

if [[ $# -lt 1 ]]; then
    usage
    exit 1
fi

ARGS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --list)
            yq -r '.contexts[].name' "$DEV_FILE"
            exit 0
            ;;
        --restart) RESTART=1; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) echo "error: unknown option '$1'" >&2; usage >&2; exit 1 ;;
        *) ARGS+=("$1"); shift ;;
    esac
done

if [[ ${#ARGS[@]} -ne 1 ]]; then
    usage >&2
    exit 1
fi

NAME="${ARGS[0]}"

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
if [[ -z "$DEV_PORT" ]]; then
    DEV_PORT=$(jq -r '.port // empty' <<<"$ENTRY")
fi
HOST="${ENV_FILE#.env.}"
if [[ -z "$DEV_PORT" ]]; then
    echo "error: context '$NAME' declares no port in $DEV_FILE" >&2
    echo "Add a 'port:' to it, matching $NGINX_PORT_MAP." >&2
    exit 1
fi

ORANGE='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# dev.yml says which port to start on; the nginx map says where dev.<site>
# sends the browser. When they disagree the site is simply unreachable — nginx
# proxies to a port nothing listens on — so say so here rather than let it look
# like the app is down.
if [[ -f "$NGINX_PORT_MAP" ]]; then
    MAPPED_PORT=$(awk -v h="$HOST" '$1 == h { gsub(/;/, "", $2); print $2; exit }' "$NGINX_PORT_MAP")
    if [[ -n "$MAPPED_PORT" && "$MAPPED_PORT" != "$DEV_PORT" ]]; then
        echo -e "${ORANGE}==> [$NAME] warning: $DEV_FILE says port $DEV_PORT, $NGINX_PORT_MAP maps $HOST to $MAPPED_PORT${NC}" >&2
        echo "https://$HOST will not reach this server until they agree." >&2
    elif [[ -z "$MAPPED_PORT" ]]; then
        echo -e "${ORANGE}==> [$NAME] warning: $NGINX_PORT_MAP has no row for $HOST${NC}" >&2
        echo "https://$HOST will hit the map's default port and 502." >&2
    fi
fi

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

# --ff-only rather than a bare pull: switching sites takes what the remote
# holds and should never merge. A bare `git pull` asks git to reconcile, and
# git refuses outright when neither pull.rebase nor pull.ff is configured —
# "Need to specify how to reconcile divergent branches" — which is a confusing
# way to fail at what is meant to be a one-word site switch.
if ! git -C "$SUBMODULE_PATH" merge --ff-only "origin/$DEV_BRANCH"; then
    echo "error: skvar $DEV_BRANCH cannot fast-forward to origin/$DEV_BRANCH." >&2
    echo "       The local branch has commits the remote does not — push them," >&2
    echo "       or reset if they are not wanted, then run this again." >&2
    exit 1
fi

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

# Prints the pid listening on a port, or nothing. Always succeeds: an empty
# result is a normal answer ("nothing is listening"), and under `set -e` a
# non-zero grep here would abort the script instead.
pid_on_port() { ss -ltnpH "sport = :$1" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true; }

port_free() { ! ss -ltnH "sport = :$1" 2>/dev/null | grep -q .; }

# Stop a dev server and wait for the port to come back, so the exec below does
# not race the kernel releasing it and die on --strictPort.
stop_server() {
    local pid="$1" port="$2"
    kill "$pid" 2>/dev/null || true
    for _ in $(seq 100); do
        port_free "$port" && return 0
        sleep 0.1
    done
    echo "error: pid $pid still holds port $port" >&2
    return 1
}

# Only one site runs at a time, by choice: five Vite servers plus a Dockerised
# backend do not fit the box's 15GB comfortably. So any *other* context's server
# is stopped here — but never silently, because that server may be the one
# serving a Playwright run or another terminal's browser.
#
# The submodule checkout above already moved the skvar branch under any running
# server's feet, and a Vite process holds the route manifest it booted with.
# Leaving one up would have it serve routes that no longer match the checkout:
# the page server-renders, then dies on hydration with "loader is not a
# function" because the node id SSR asks for is past the end of its stale nodes
# array.
while read -r other_name other_port; do
    [[ "$other_port" == "$DEV_PORT" ]] && continue
    other_pid=$(pid_on_port "$other_port")
    [[ -z "$other_pid" ]] && continue

    if [[ "$RESTART" != "1" ]]; then
        echo -e "${ORANGE}==> [$NAME] '$other_name' is running on port $other_port (pid $other_pid)${NC}" >&2
        echo "Only one dev site runs at a time, and the skvar checkout this script" >&2
        echo "just did has already invalidated that server's route manifest." >&2
        echo >&2
        echo "Re-run with --restart to stop it, or stop it yourself:" >&2
        echo "    kill $other_pid" >&2
        exit 1
    fi

    echo -e "${ORANGE}==> [$NAME] stopping '$other_name' on port $other_port (pid $other_pid)${NC}"
    stop_server "$other_pid" "$other_port" || exit 1
done < <(yq -r '.contexts[] | select(.port) | [.name, .port] | @tsv' "$DEV_FILE")

# This context's own port. Same treatment: a server already here is serving the
# manifest it booted with, not the checkout above.
if OWN_PID=$(pid_on_port "$DEV_PORT") && [[ -n "$OWN_PID" ]]; then
    if [[ "$RESTART" == "1" ]]; then
        echo -e "${ORANGE}==> [$NAME] stopping dev server on port $DEV_PORT (pid $OWN_PID)${NC}"
        stop_server "$OWN_PID" "$DEV_PORT" || exit 1
    else
        echo -e "${ORANGE}==> [$NAME] port $DEV_PORT is already held by pid $OWN_PID${NC}" >&2
        echo "That server is serving the route manifest of whichever skvar branch it" >&2
        echo "started with — not necessarily $DEV_BRANCH." >&2
        echo >&2
        echo "Re-run with --restart to replace it, or stop it yourself:" >&2
        echo "    kill $OWN_PID" >&2
        exit 1
    fi
fi

echo "==> [$NAME] Starting dev server on port $DEV_PORT"
# `pnpm exec vite`, not `pnpm run dev -- …`: with the latter, pnpm passes the
# flags after `--` as positional arguments, so vite kept its own --port and
# walked to the next free one — the exact drift --strictPort is here to stop.
#
# --strictPort so a busy port fails loudly instead of silently serving this
# context from a port nginx does not route.
exec pnpm exec vite --port "$DEV_PORT" --strictPort
