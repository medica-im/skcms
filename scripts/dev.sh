#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
DEV_FILE="${DEV_FILE:-$REPO_ROOT/dev.yml}"
SUBMODULE_PATH="src/routes/(skvar)"
SKVAR_DIR="${SKVAR_DIR:-$REPO_ROOT/$SUBMODULE_PATH}"
ENV_LINK="${ENV_LINK:-$REPO_ROOT/.env}"
# The test servers the status names: scripts/e2e-workers.sh's, one per worker
# from 3100, and test-all's site servers on each site's dev port + 200.
E2E_PORTS="${E2E_PORTS:-3100-3131}"
TEST_ALL_PORT_OFFSET="${TEST_ALL_PORT_OFFSET:-200}"
BACKEND_DIR="${BACKEND_DIR:-$REPO_ROOT/../backend}"
BACKEND_COMPOSE_FILE="${BACKEND_COMPOSE_FILE:-docker-compose-development.yml}"
# Each context declares its own port in dev.yml (see the note there); DEV_PORT
# overrides it for a one-off.
DEV_PORT="${DEV_PORT:-}"
# The hostname -> port map nginx uses. Checked against dev.yml below, since a
# disagreement makes the site unreachable rather than merely misconfigured.
NGINX_PORT_MAP="${NGINX_PORT_MAP:-$REPO_ROOT/scripts/nginx/dev-site-ports.conf}"

usage() {
    echo "Usage: $0 <name>"
    echo "       $0 --list"
    echo "       $0"
    echo
    echo "With no name: which dev server is running, the .env and skvar branch"
    echo "in place (warning when they are not that server's), and the test"
    echo "servers left running."
    echo
    echo "Switches to the dev context described by <name> in $DEV_FILE:"
    echo "checks out the entry's development_skvar_branch in $SUBMODULE_PATH,"
    echo "warns if production_skvar_branch is ahead of it, ensures the"
    echo "backend's dev docker compose services are running and healthy"
    echo "(starting them if needed), symlinks its env_file to .env, then runs"
    echo "vite on that context's own port from dev.yml."
    echo
    echo "One site runs at a time. Any dev server already up — this context's"
    echo "or another's — is stopped first, and named as it is: left running it"
    echo "would serve the route manifest of the branch it booted with, which"
    echo "renders fine and then dies on hydration."
    echo
    echo "  --list     print the contexts and their ports, marking the one running"
    echo "  --restart  accepted for older callers; restarting is the default"
}

if ! command -v yq >/dev/null 2>&1; then
    echo "error: yq (mikefarah/yq) is required" >&2
    exit 1
fi

ORANGE='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# --- What is running ---------------------------------------------------------
# Every listening TCP port and the pid holding it, read once. "?" when the
# holder belongs to another user: ss shows no pid then.
declare -A LISTENERS=()
read_listeners() {
    local local_addr users port pid
    while read -r _ _ _ local_addr _ users; do
        port="${local_addr##*:}"
        pid=$(grep -oP 'pid=\K[0-9]+' <<<"$users" | head -1 || true)
        [[ -z "${LISTENERS[$port]:-}" || "${LISTENERS[$port]}" == "?" ]] && LISTENERS[$port]="${pid:-?}"
    done < <(ss -ltnpH 2>/dev/null || true)
}

# A port is a dev server's only if Vite holds it: anything else is "busy".
vite_pid() {
    local pid="${LISTENERS[$1]:-}"
    [[ -n "$pid" && "$pid" != "?" ]] && ps -o args= -p "$pid" 2>/dev/null | grep -q vite && echo "$pid"
    return 0
}

uptime_of() { ps -o etime= -p "$1" 2>/dev/null | tr -d ' '; }

port_state() {
    local pid="${LISTENERS[$1]:-}" vite
    [[ -z "$pid" ]] && return 0
    vite=$(vite_pid "$1")
    if [[ -n "$vite" ]]; then
        echo "● running (pid $vite, up $(uptime_of "$vite"))"
    elif [[ "$pid" == "?" ]]; then
        echo "busy (another user's process)"
    else
        echo "busy (pid $pid: $(ps -o comm= -p "$pid" 2>/dev/null))"
    fi
}

contexts_tsv() { yq -r '.contexts[] | [.name, (.port // ""), .env_file, .development_skvar_branch] | @tsv' "$DEV_FILE"; }

list_contexts() {
    read_listeners
    local name port
    while IFS=$'\t' read -r name port _ _; do
        printf '%-10s %-6s %s\n' "$name" "$port" "$(port_state "$port")" | sed 's/ *$//'
    done < <(contexts_tsv)
}

show_status() {
    read_listeners
    local name port env_file branch pid
    local running="" running_port="" running_branch="" env_name="" skvar_name="" tests=()
    local env_target skvar_branch
    env_target=$(readlink "$ENV_LINK" 2>/dev/null || true)
    skvar_branch=$(git -C "$SKVAR_DIR" branch --show-current 2>/dev/null || true)

    while IFS=$'\t' read -r name port env_file branch; do
        [[ "$env_file" == "${env_target##*/}" ]] && env_name="$name"
        [[ "$branch" == "$skvar_branch" && -z "$skvar_name" ]] && skvar_name="$name"
        [[ -z "$port" ]] && continue
        pid=$(vite_pid "$port")
        if [[ -n "$pid" && -z "$running" ]]; then
            running="$name"; running_port="$port"; running_branch="$branch"
            echo "running:  $name on :$port (pid $pid, up $(uptime_of "$pid"))"
        fi
        pid=$(vite_pid "$((port + TEST_ALL_PORT_OFFSET))")
        [[ -n "$pid" ]] && tests+=(":$((port + TEST_ALL_PORT_OFFSET)) (test-all $name)")
    done < <(contexts_tsv)
    [[ -z "$running" ]] && echo "running:  none"

    echo ".env   -> ${env_target:-(none)}${env_name:+ ($env_name)}"
    echo "skvar  :  ${skvar_branch:-(detached)}${skvar_name:+ ($skvar_name)}"

    for port in $(seq "${E2E_PORTS%-*}" "${E2E_PORTS#*-}"); do
        [[ -n "$(vite_pid "$port")" ]] && tests=(":$port (e2e worker)" "${tests[@]}")
    done
    if [[ ${#tests[@]} -gt 0 ]]; then
        local joined
        joined=$(printf ', %s' "${tests[@]}")
        echo "test   :  ${joined:2}"
    fi

    # Vite reads .env when it starts, and the routes come from the skvar
    # checkout: a server that disagrees with either renders one site with the
    # other's settings or routes, then dies on hydration.
    if [[ -n "$running" ]]; then
        [[ "$env_name" != "$running" ]] &&
            echo -e "${ORANGE}warning: .env is ${env_name:-${env_target:-missing}}'s, the server on :$running_port is $running — run ./scripts/dev.sh $running to restart it with its own${NC}"
        [[ "$skvar_branch" != "$running_branch" ]] &&
            echo -e "${ORANGE}warning: skvar is on ${skvar_branch:-a detached HEAD}, $running develops on $running_branch — run ./scripts/dev.sh $running${NC}"
    fi
    return 0
}

if [[ $# -lt 1 ]]; then
    show_status
    echo
    usage
    exit 0
fi

ARGS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        --list)
            list_contexts
            exit 0
            ;;
        --restart) shift ;;
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
git -C "$SKVAR_DIR" fetch origin "$DEV_BRANCH"
git -C "$SKVAR_DIR" checkout "$DEV_BRANCH"

# --ff-only rather than a bare pull: switching sites takes what the remote
# holds and should never merge. A bare `git pull` asks git to reconcile, and
# git refuses outright when neither pull.rebase nor pull.ff is configured —
# "Need to specify how to reconcile divergent branches" — which is a confusing
# way to fail at what is meant to be a one-word site switch.
if ! git -C "$SKVAR_DIR" merge --ff-only "origin/$DEV_BRANCH"; then
    echo "error: skvar $DEV_BRANCH cannot fast-forward to origin/$DEV_BRANCH." >&2
    echo "       The local branch has commits the remote does not — push them," >&2
    echo "       or reset if they are not wanted, then run this again." >&2
    exit 1
fi

echo "==> [$NAME] Checking $PROD_BRANCH against $DEV_BRANCH"
git -C "$SKVAR_DIR" fetch origin "$PROD_BRANCH"
AHEAD=$(git -C "$SKVAR_DIR" rev-list --count "$DEV_BRANCH..origin/$PROD_BRANCH")
if [[ "$AHEAD" -gt 0 ]]; then
    echo -e "${ORANGE}==> [$NAME] warning: $PROD_BRANCH is $AHEAD commit(s) ahead of $DEV_BRANCH${NC}"
else
    echo -e "${GREEN}==> [$NAME] $PROD_BRANCH and $DEV_BRANCH are in sync${NC}"
fi

echo "==> [$NAME] Linking $ENV_FILE -> .env"
ln -sf "$ENV_FILE" "$ENV_LINK"

# Vite prebundles dependencies that ship raw .svelte source, and does not
# reliably invalidate them when the Svelte version changes. It then serves
# chunks compiled by the *old* compiler against the *new* runtime. The calling
# convention between the two changes across minor versions — 5.51.5 -> 5.57.0
# turned rest_props' `exclude` argument from an Array into a Set — so the
# cached chunks throw during hydration:
#
#     TypeError: target.exclude.has is not a function
#
# The page still server-renders 200 and only *then* dies, so nothing anywhere
# becomes interactive and every feature fails at once with "element not found",
# blaming whichever component the stack happened to name. Deleting the caches
# is the fix; restarting alone is not enough.
#
# Vite's own _metadata.json records no Svelte version, so keep a stamp beside
# the caches and compare it against what is installed.
SVELTE_VERSION=$(node -p "require('./node_modules/svelte/package.json').version" 2>/dev/null || true)
VITE_STAMP="node_modules/.vite-svelte-version"
if [[ -n "$SVELTE_VERSION" ]]; then
    STAMPED=$(cat "$VITE_STAMP" 2>/dev/null || true)
    if [[ "$STAMPED" != "$SVELTE_VERSION" ]]; then
        if [[ -n "$STAMPED" ]]; then
            echo -e "${ORANGE}==> [$NAME] svelte $STAMPED -> $SVELTE_VERSION, clearing Vite prebundles${NC}"
        else
            echo "==> [$NAME] Recording svelte $SVELTE_VERSION, clearing Vite prebundles"
        fi
        rm -rf .vite-w[0-9] .vite-w[0-9][0-9] node_modules/.vite node_modules/.vite-temp
        mkdir -p node_modules
        printf '%s' "$SVELTE_VERSION" > "$VITE_STAMP"
    fi
fi

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

# Only one site runs at a time: any *other* context's server is stopped here,
# and named as it is, since it may be serving another terminal's browser.
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

    echo -e "${ORANGE}==> [$NAME] stopping '$other_name' on port $other_port (pid $other_pid)${NC}"
    stop_server "$other_pid" "$other_port" || exit 1
done < <(yq -r '.contexts[] | select(.port) | [.name, .port] | @tsv' "$DEV_FILE")

# This context's own port. Same treatment: a server already here is serving the
# manifest it booted with, not the checkout above.
if OWN_PID=$(pid_on_port "$DEV_PORT") && [[ -n "$OWN_PID" ]]; then
    echo -e "${ORANGE}==> [$NAME] stopping dev server on port $DEV_PORT (pid $OWN_PID)${NC}"
    stop_server "$OWN_PID" "$DEV_PORT" || exit 1
fi

echo "==> [$NAME] Starting dev server on port $DEV_PORT"
# `pnpm exec vite`, not `pnpm run dev -- …`: with the latter, pnpm passes the
# flags after `--` as positional arguments, so vite kept its own --port and
# walked to the next free one — the exact drift --strictPort is here to stop.
#
# --strictPort so a busy port fails loudly instead of silently serving this
# context from a port nginx does not route.
exec pnpm exec vite --port "$DEV_PORT" --strictPort
