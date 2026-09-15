#!/usr/bin/env bash
#
# Bring up one dev server per Playwright worker, each serving its own site.
#
# Why one server per worker
# -------------------------
# The app resolves its API origin at *build* time: src/lib/utils/origin.ts uses
# PUBLIC_ORIGIN from $env/static/public for every server-side fetch, so one Vite
# instance can only ever render one site. Pointing four workers at one server
# made all four render whichever site .env named, no matter which hostname the
# browser used — the API answered per-host correctly, but the pages did not.
#
# Rather than make the app host-aware (a production code path, changed for a
# test-only benefit), each worker gets its own dev server with its own .env.
# nginx already routes wN.dev.medica.im; this points each of those at its own
# port, so a worker is independent end to end: its own Site, Directory,
# entries, and now its own rendering process.
#
# Usage
#   scripts/e2e-workers.sh start [N]   # default 4
#   scripts/e2e-workers.sh stop
#   scripts/e2e-workers.sh status
#
# The generated .env.test.wN files are derived from a template context, never
# hand-edited: only the origin-bearing keys differ, so a change to the real
# dev env (a new feature flag, a TTL) reaches the test envs on the next start.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

WORKERS="${2:-${E2E_WORKERS:-8}}"
BASE_PORT="${E2E_BASE_PORT:-3100}"
# The default is assigned separately rather than inline as
# ${E2E_WORKER_DOMAIN:-w{i}.dev.medica.im}: bash reads the '}' of '{i}' as the
# end of the parameter expansion, so that form yields "w{i.dev.medica.im}" —
# which every worker then baked into its .env as its own origin.
DOMAIN_TEMPLATE="w{i}.dev.medica.im"
[[ -n "${E2E_WORKER_DOMAIN:-}" ]] && DOMAIN_TEMPLATE="$E2E_WORKER_DOMAIN"
# The context whose feature flags and TTLs the worker sites inherit. Its own
# origin is replaced below; everything else is copied as-is.
TEMPLATE_ENV="${E2E_TEMPLATE_ENV:-.env.dev.sante-gadagne.fr}"
RUN_DIR=".e2e-workers"

# The worker pool is split in half: the LOWER half is served at its root, the
# UPPER half under a base path.
#
# Both shapes have to be exercised by EVERY scenario, not by whichever ones
# happened to land on a particular worker. A site proxied under a subdirectory
# of a host whose root belongs to something else (unipa at /annuaire behind
# WordPress) is the hardest shape we ship: a URL the app builds without the
# prefix reaches that other thing rather than the app, so those bugs appear
# there and nowhere else. /web/entries rendering "Aucune entrée" on a directory
# of 59 was found by hand on 14 Sep 2026, because every worker was then served
# at its root and no scenario could see it.
#
# playwright.config.ts pairs this with two projects -- chromium-root and
# chromium-base-path -- which run the same scenarios twice, each pinned to the
# half that has its shape. So the split here and the projects there must agree:
# E2E_WORKERS is the TOTAL, and half of it is the pool each project draws from.
#
# An odd count gives the extra worker to the baseless half, so a run with
# E2E_WORKERS=1 still starts something rather than nothing.
BASE_PATH_VALUE="${E2E_WORKER_BASE_PATH-/annuaire}"
ROOT_WORKERS=$(( (WORKERS + 1) / 2 ))

# The base path this worker is served under, empty for the lower half. The suite
# reads the same answer from the worker's own .env file (basePathForHost in
# tests/fixtures/session.ts), so the two cannot drift.
worker_base_path() {
    (( $1 >= ROOT_WORKERS )) && printf '%s' "$BASE_PATH_VALUE" || printf ''
}

# sed rather than bash substitution: ${var/{i}/$n} does not expand the braces
# reliably here and silently produced "w{i.dev.medica.im}", which every worker
# then baked into its .env as its own origin.
worker_domain() { printf '%s' "$DOMAIN_TEMPLATE" | sed "s/{i}/$1/"; }
worker_port() { echo $((BASE_PORT + $1)); }

write_env() {
    local i="$1" domain port env_file
    domain="$(worker_domain "$i")"
    port="$(worker_port "$i")"
    env_file=".env.test.w${i}"

    # Every origin-bearing key points at this worker's own hostname, over
    # https: Auth.js derives the session-cookie name *and* its encryption salt
    # from whether the request looks secure, and the backend's
    # fastapi_nextauth_jwt derives the same salt independently — an http origin
    # here 401s every authenticated scenario even though nginx serves TLS.
    #
    # ORIGIN too, not just PUBLIC_ORIGIN: SvelteKit checks it on form actions,
    # and a mismatch with the browsing origin is rejected as cross-site.
    #
    # PUBLIC_APP_URL / PUBLIC_SSR_API_URL are the current names (see
    # src/lib/utils/appUrl.ts); PUBLIC_ORIGIN is kept for any template still
    # carrying it. Missing the SSR one is not a quiet degradation: it leaves
    # every worker fetching the template's site server-side, so w3 renders w0's
    # data and a fixture named after its own worker 404s.
    local base_path
    base_path="$(worker_base_path "$i")"

    # BASE_PATH is consumed at BUILD time by svelte.config.js to set kit.paths
    # .base, so it has to be in the env file Vite loads -- exporting it here
    # would not reach the config.
    sed -E \
        -e "s|^PUBLIC_APP_URL=.*|PUBLIC_APP_URL=\"https://${domain}\"|" \
        -e "s|^PUBLIC_SSR_API_URL=.*|PUBLIC_SSR_API_URL=\"https://${domain}\"|" \
        -e "s|^PUBLIC_ORIGIN=.*|PUBLIC_ORIGIN=\"https://${domain}\"|" \
        -e "s|^ORIGIN=.*|ORIGIN=\"https://${domain}\"|" \
        -e "s|^VITE_BASE_URI=.*|VITE_BASE_URI=\"https://${domain}\"|" \
        -e "s|^VITE_BASE_URI_DEV=.*|VITE_BASE_URI_DEV=\"https://${domain}\"|" \
        -e "s|^VITE_BASE_URI_PROD=.*|VITE_BASE_URI_PROD=\"https://${domain}\"|" \
        "$TEMPLATE_ENV" > "$env_file"

    # Appended rather than substituted: the template has no BASE_PATH line, so
    # a `sed s|^BASE_PATH=.*|...|` would match nothing and silently leave the
    # base-path worker served at its root -- the exact blindness this exists to
    # remove. Any inherited line is stripped first so the value written here is
    # the only one, whichever way the template changes.
    sed -i -E '/^BASE_PATH=/d' "$env_file"
    printf 'BASE_PATH="%s"\n' "$base_path" >> "$env_file"

    # AUTH_URL, for a worker served under a prefix.
    #
    # Auth.js derives its own route base from the request when this is unset,
    # and gets the host's ROOT -- so on a prefixed site it looks for /auth/...
    # while the routes are actually at {base}/auth/... . The session then never
    # resolves, and the damage is silent rather than loud: every canEdit()
    # server load returns false on a failed fetch, so the edit controls simply
    # do not render. 46 scenarios in the 15 Sep run waited on buttons
    # ("Modifier l'établissement", "ajouter une photo") that were never going to
    # appear, and read as missing features rather than a missing session.
    sed -i -E '/^AUTH_URL=/d' "$env_file"
    if [[ -n "$base_path" ]]; then
        printf 'AUTH_URL="https://%s%s/auth"\n' "$domain" "$base_path" >> "$env_file"
    fi

    echo "$env_file"
}

start() {
    [[ -f "$TEMPLATE_ENV" ]] || { echo "error: template env $TEMPLATE_ENV not found" >&2; exit 1; }
    mkdir -p "$RUN_DIR"


    for ((i = 0; i < WORKERS; i++)); do
        local domain port env_file
        domain="$(worker_domain "$i")"
        port="$(worker_port "$i")"
        env_file="$(write_env "$i")"

        if [[ -f "$RUN_DIR/w$i.pid" ]] && kill -0 "$(cat "$RUN_DIR/w$i.pid")" 2>/dev/null; then
            echo "  w$i already running on :$port (pid $(cat "$RUN_DIR/w$i.pid"))"
            continue
        fi

        # --mode picks the env file: Vite loads .env.test.wN for mode test.wN.
        #
        # SVELTEKIT_OUT_DIR gives each instance its own .svelte-kit: they share
        # this checkout, and SvelteKit regenerates types and its manifest in
        # that directory on every restart, so a shared one has four processes
        # deleting each other's files (every request 500s, ENOENT on
        # proxy+layout.server.ts).
        # --strictPort: without it Vite silently walks to the next free port
        # when one is busy, so a leftover process from an earlier run sends this
        # worker to a port nginx does not route — the suite then browses a site
        # that is not the one this .env configured.
        # PARAGLIDE_OUT_DIR alongside it, for the same reason: the paraglide
        # plugin *clears* its outdir before writing, so a shared one has four
        # servers deleting each other's compiled messages and every page 500s
        # with "Cannot find module '$msgs'".
        # VITE_CACHE_DIR completes the set: dependency pre-bundling defaults to
        # the shared node_modules/.vite, and four servers optimizing deps into
        # one directory invalidate each other's module graph mid-flight. The
        # loser's SSR fetchModule never resolves, so every request dies after
        # 60s with "transport invoke timed out ... /src/app.postcss". It lands
        # on +layout.svelte, so *every* route 500s, and the SvelteKit error page
        # shows only "Internal Error" — the cause is visible solely in
        # .e2e-workers/wN.log. The first server to boot wins the cache and
        # behaves, which is what made this look like "w0 works, the rest are
        # broken" rather than a shared-resource race.
        #
        # An env var read by vite.config.ts, not a --cacheDir flag: Vite 7 has
        # no such CLI option and exits with "Unknown option `--cacheDir`".
        SVELTEKIT_OUT_DIR=".svelte-kit-w$i" \
        PARAGLIDE_OUT_DIR="./src/paraglide-w$i" \
        VITE_CACHE_DIR=".vite-w$i" \
        nohup npx vite --port "$port" --strictPort --mode "test.w$i" \
            > "$RUN_DIR/w$i.log" 2>&1 &
        echo $! > "$RUN_DIR/w$i.pid"
        echo "  w$i -> https://$domain (vite :$port, pid $!, env $env_file)"
        # Staggered so four cold Vite boots do not contend for the same cores.
        # This is a courtesy now, not the thing keeping the servers correct:
        # the out dirs and the dep cache above are per-worker, so a lockstep
        # start is merely slower rather than racy. It used to be load-bearing
        # for the dep cache, and was not sufficient — three of four servers
        # still lost the race and served 500s for a whole run.
        sleep 3
    done

    echo "waiting for servers to answer..."
    for ((i = 0; i < WORKERS; i++)); do
        local port; port="$(worker_port "$i")"
        for _ in $(seq 1 60); do
            if curl -sf -o /dev/null "http://127.0.0.1:$port/" 2>/dev/null; then
                echo "  w$i ready"
                break
            fi
            sleep 1
        done
    done
}

stop() {
    [[ -d "$RUN_DIR" ]] || { echo "nothing to stop"; return; }
    for pidfile in "$RUN_DIR"/w*.pid; do
        [[ -f "$pidfile" ]] || continue
        local pid w port; pid="$(cat "$pidfile")"
        w="$(basename "$pidfile" .pid)"
        port="$(worker_port "${w#w}")"
        if kill -0 "$pid" 2>/dev/null; then
            pkill -P "$pid" 2>/dev/null || true
            kill "$pid" 2>/dev/null || true
            echo "  stopped $w (pid $pid)"
        fi
        # The recorded pid is the npx wrapper, and killing it orphans the
        # vite.js child rather than stopping it — the port stays bound, the next
        # start finds it busy, and (without --strictPort) that worker silently
        # moves to a port nginx does not route. Match on the port so the actual
        # server dies, whatever its parent was.
        pkill -f "vite.js --port $port" 2>/dev/null || true
        rm -f "$pidfile"
    done
}

status() {
    for ((i = 0; i < WORKERS; i++)); do
        local port pidfile state; port="$(worker_port "$i")"; pidfile="$RUN_DIR/w$i.pid"
        state="down"
        if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
            state="up (pid $(cat "$pidfile"))"
        fi
        printf '  w%-2s :%s  %-20s %s\n' "$i" "$port" "$state" \
            "$(curl -sf -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/" 2>/dev/null || echo '---')"
    done
}

case "${1:-}" in
    start) start ;;
    stop) stop ;;
    status) status ;;
    restart) stop; start ;;
    *) echo "usage: $0 {start|stop|status|restart} [workers]" >&2; exit 1 ;;
esac
