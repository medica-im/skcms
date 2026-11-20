# The servers a test run leaves behind, and what to do about them before
# something heavy starts. Sourced by test-all.sh (which stops its own site
# servers), check-staging.sh and release-staging.sh (which look at the machine
# before loading it with a browser per site).
#
# Needs lib/output.sh (step, info, warn and the colours) from its callers, for
# everything but stop_site_servers.

TEST_SERVERS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=staging-sites.sh
source "$TEST_SERVERS_ROOT/scripts/lib/staging-sites.sh"
# What free_staging stopped, one "host<TAB>dir<TAB>compose file" per line, so
# restore_staging starts exactly that and nothing that was already down.
TS_STAGING_STATE="${TS_STAGING_STATE:-${TMPDIR:-/tmp}/free-machine-staging.$(id -u)}"
# Not BACKEND_DIR: release-staging.sh uses that name for the staging host's
# directory, and test-all.sh for this one, so a shared name would mean one of
# them reading the other's.
TEST_BACKEND_DIR="${TEST_BACKEND_DIR:-$TEST_SERVERS_ROOT/../backend}"
TEST_BACKEND_COMPOSE_FILE="${TEST_BACKEND_COMPOSE_FILE:-docker-compose-development.yml}"
TEST_BACKEND_PROJECT="${TEST_BACKEND_PROJECT:-backend-dev}"
# One Chromium plus one muffet per staging site checked at once.
TEST_SERVERS_MB_PER_JOB="${TEST_SERVERS_MB_PER_JOB:-1500}"

# Stop every site server a checkout's test run started, found by their stamps.
#
# The stamp names the pid that ended up on the port (the vite child, not the
# npx launcher), so a developer's own dev server on the dev port is never
# touched: this run's servers are on the dev port + SITE_TEST_PORT_OFFSET.
stop_site_servers() {
    local checkout="$1" stamp pid waited
    for stamp in "$checkout"/.e2e-workers/site-*.started; do
        [[ -f "$stamp" ]] || continue
        pid="$(sed -n '2p' "$stamp")"
        rm -f "$stamp"
        [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null || continue
        kill "$pid" 2>/dev/null || continue
        waited=0
        while (( waited < 10 )) && kill -0 "$pid" 2>/dev/null; do
            sleep 1; waited=$((waited + 1))
        done
        kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null
    done
    return 0
}

# Prints the pid of a test-all run holding the lock and returns 0; returns 1
# when nobody holds it. Same lock file as test-all.sh.
#
# The pid is read from the file test-all writes into it, and looked for among
# the open descriptors when that is missing or stale: a lock can be held by a
# process that inherited the descriptor, and a file naming a dead pid must not
# send anybody chasing it. "unknown" if the lock is held and nobody can be named.
test_all_running() {
    local lock="${TEST_ALL_LOCK_FILE:-${TMPDIR:-/tmp}/test-all.$(id -u).lock}"
    local holder fd
    [[ -e "$lock" ]] || return 1
    flock -n "$lock" true 2>/dev/null && return 1
    holder="$(head -1 "$lock" 2>/dev/null)"
    if [[ -z "$holder" ]] || ! kill -0 "$holder" 2>/dev/null; then
        holder=""
        for fd in /proc/[0-9]*/fd/*; do
            [[ "$(readlink "$fd" 2>/dev/null)" == "$lock" ]] || continue
            holder="${fd#/proc/}"; holder="${holder%%/*}"
            break
        done
    fi
    printf '%s\n' "${holder:-unknown}"
}

_ts_pid_on_port() { ss -ltnpH "sport = :$1" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true; }
_ts_rss_mb() { awk '/^VmRSS:/ { print int($2 / 1024) }' "/proc/$1/status" 2>/dev/null; }
_ts_cwd() { readlink "/proc/$1/cwd" 2>/dev/null; }

# Counts what the report found, for the stop prompt and for the warnings.
TS_FRONTEND_UP=0
TS_BACKEND_UP=0

# What is up, one line each. The developer's own dev servers are listed so
# their weight is visible, and are never offered for stopping.
_ts_report() {
    local checkout stamp pid i port ctx ids stats mem
    TS_FRONTEND_UP=0
    TS_BACKEND_UP=0

    for ((i = 0; i < ${E2E_WORKERS:-8}; i++)); do
        port=$((${E2E_BASE_PORT:-3300} + i))
        pid="$(_ts_pid_on_port "$port")"
        [[ -n "$pid" ]] || continue
        info "e2e worker :$port  pid $pid  $(_ts_rss_mb "$pid") MB  $(_ts_cwd "$pid")"
        TS_FRONTEND_UP=$((TS_FRONTEND_UP + 1))
    done

    for checkout in "$TEST_SERVERS_ROOT" "$TEST_SERVERS_ROOT/../skcms-test"; do
        for stamp in "$checkout"/.e2e-workers/site-*.started; do
            [[ -f "$stamp" ]] || continue
            pid="$(sed -n '2p' "$stamp")"
            [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null || continue
            ctx="$(basename "$stamp" .started)"
            info "site server ${ctx#site-}  pid $pid  $(_ts_rss_mb "$pid") MB  $(cd "$checkout" && pwd)"
            TS_FRONTEND_UP=$((TS_FRONTEND_UP + 1))
        done
    done

    if command -v docker >/dev/null 2>&1; then
        ids="$(docker ps -q --filter "label=com.docker.compose.project=$TEST_BACKEND_PROJECT" 2>/dev/null)"
        if [[ -n "$ids" ]]; then
            TS_BACKEND_UP="$(wc -l <<<"$ids")"
            # "123.4MiB / 31GiB": the part before the slash, summed in MiB.
            stats="$(docker stats --no-stream --format '{{.MemUsage}}' $ids 2>/dev/null |
                awk -F' / ' '{
                    v = $1; u = v; gsub(/[0-9.]/, "", u); sub(/[A-Za-z]+$/, "", v)
                    if (u == "GiB") v *= 1024; else if (u == "KiB" || u == "kB") v /= 1024; else if (u == "B") v = 0
                    t += v
                } END { printf "%d", t }')"
            mem="${stats:+, $stats MB}"
            info "backend test stack ($TEST_BACKEND_PROJECT): $TS_BACKEND_UP container(s)$mem"
        fi
    fi

    for port in 3000 3010 3011 3012 3013 3014 3015 3016; do
        pid="$(_ts_pid_on_port "$port")"
        [[ -n "$pid" ]] && info "dev server :$port  pid $pid  $(_ts_rss_mb "$pid") MB  (yours, never stopped)"
    done
    return 0
}

_ts_stop_frontend() {
    local checkout
    for checkout in "$TEST_SERVERS_ROOT" "$TEST_SERVERS_ROOT/../skcms-test"; do
        [[ -x "$checkout/scripts/e2e-workers.sh" ]] || continue
        info "stopping the e2e workers and site servers of $(cd "$checkout" && pwd)"
        "$checkout/scripts/e2e-workers.sh" stop 2>&1 | sed 's/^/    /'
        stop_site_servers "$checkout"
    done
}

# `stop`, never `down`: the containers and their volumes stay, and the next
# test-all's `compose up --wait` brings the stack back as it was.
_ts_stop_backend() {
    if [[ ! -f "$TEST_BACKEND_DIR/$TEST_BACKEND_COMPOSE_FILE" ]]; then
        warn "no $TEST_BACKEND_COMPOSE_FILE in $TEST_BACKEND_DIR; backend left running"
        return 0
    fi
    info "stopping the backend test stack ($TEST_BACKEND_PROJECT)"
    (cd "$TEST_BACKEND_DIR" && docker compose -f "$TEST_BACKEND_COMPOSE_FILE" stop 2>&1 | sed 's/^/    /')
}

# Looks at the machine before heavy work and, if asked, frees it.
#
#   machine_preflight <jobs> <stop-mode> [dry]
#
# jobs       how many browser checks will run at once, to size the memory
# stop-mode  frontend | backend | all | ask | no. ask prompts on a terminal,
#            and only if something is up; with no terminal it is no.
# dry        report what would be stopped, stop nothing
#
# Never fails: a machine that looks tight is a warning, not a reason to refuse.
machine_preflight() {
    local jobs="${1:-1}" mode="${2:-no}" dry="${3:-}"
    local avail_mb need_mb load cores holder answer

    step "this machine"
    avail_mb="$(awk '/^MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo)"
    need_mb=$((jobs * TEST_SERVERS_MB_PER_JOB))
    load="$(cut -d' ' -f1 /proc/loadavg)"
    cores="$(nproc)"
    info "memory: $avail_mb MB available, about $need_mb MB wanted for $jobs job(s)"
    info "load: $load over $cores cores"

    _ts_report

    if (( avail_mb < need_mb )); then
        warn "memory is short for $jobs job(s): stop the test servers, or use --jobs=N with a smaller N"
    fi
    if awk -v l="$load" -v n="$cores" 'BEGIN { exit !(l > n * 0.75) }'; then
        warn "the machine is busy (load $load over $cores cores): the checks will be slower, and may time out"
    fi

    case "$mode" in
        frontend|backend|all|ask|no) ;;
        *) warn "unknown --stop-test-servers value '$mode'; stopping nothing"; mode=no ;;
    esac
    [[ "$mode" == no ]] && return 0

    # A run's servers are what its scenarios are in the middle of using:
    # stopping them makes those fail like product bugs.
    if holder="$(test_all_running)"; then
        warn "a test-all run holds the lock (pid $holder); not stopping its servers"
        return 0
    fi

    if [[ "$mode" == ask ]]; then
        (( TS_FRONTEND_UP + TS_BACKEND_UP )) || return 0
        [[ -z "$dry" ]] || return 0
        # A terminal of our own, not stdin: the output is teed and the caller
        # may be piped, and with none there is nobody to ask.
        if ! ( : </dev/tty ) 2>/dev/null; then
            info "no terminal to ask on; leaving the test servers alone"
            return 0
        fi
        (( TS_BACKEND_UP )) && warn "stopping the backend leaves your dev servers without a backend until the next test-all run or a 'docker compose up' in backend/"
        read -r -p "    Stop the test servers? [f]rontend, [b]ackend, [a]ll, [N]o " answer </dev/tty
        case "${answer,,}" in
            f|frontend) mode=frontend ;;
            b|backend) mode=backend ;;
            a|all) mode=all ;;
            *) return 0 ;;
        esac
    fi

    if [[ -n "$dry" ]]; then
        info "(dry run) would stop the test servers: $mode"
        return 0
    fi
    [[ "$mode" == frontend || "$mode" == all ]] && _ts_stop_frontend
    [[ "$mode" == backend || "$mode" == all ]] && _ts_stop_backend
    return 0
}

# --- Staging on this machine ---------------------------------------------------
# The staging backend and sites run in Docker on the box the tests run on, about
# 6 GB between them, and a test run has no use for any of it. The development
# stack is the mirror image for a release, which is machine_preflight's side.

# Every staging deployment, "host<TAB>dir<TAB>compose file" per line: the sites in
# images.yml order, the backend last, which is the order to stop them in.
#
# Selected by compose file, as staging_names does: annuaire.medica.im is a
# production site that runs on this box, and is never stopped from here.
_ts_staging_stacks() {
    yq -r ".images[] | select((.compose_file // \"\") == \"$STAGING_COMPOSE\") | [.host, .dir, .compose_file] | @tsv" "$IMAGES_FILE"
    printf '%s\t%s\t%s\n' "$STAGING_BACKEND_HOST" "$STAGING_BACKEND_DIR" "$STAGING_BACKEND_COMPOSE"
}

# How many containers of one deployment are running.
_ts_stack_running() {
    # -n: called inside a `while read` over the list of stacks, whose stdin ssh
    # would otherwise drain.
    ssh -n -o BatchMode=yes "$1" "cd '$2' && docker compose -f '$3' ps -q --status running 2>/dev/null | wc -l" 2>/dev/null || echo 0
}

# Stops the staging containers that are running, and records which.
#
#   free_staging yes|no|ask
#
# `stop`, not `down`: containers and volumes stay, and restore_staging starts the
# same ones. ask prompts on a terminal and does nothing without one.
free_staging() {
    local mode="${1:-ask}" host dir file n answer stack
    local -a running=()

    while IFS=$'\t' read -r host dir file; do
        n="$(_ts_stack_running "$host" "$dir" "$file")"
        (( n > 0 )) || continue
        running+=("$host"$'\t'"$dir"$'\t'"$file")
        info "staging $dir: $n container(s) running"
    done < <(_ts_staging_stacks)
    if (( ${#running[@]} == 0 )); then
        info "staging: nothing is running"
        return 0
    fi

    [[ "$mode" == no ]] && return 0
    if [[ "$mode" == ask ]]; then
        if ! ( : </dev/tty ) 2>/dev/null; then
            info "no terminal to ask on; leaving staging alone"
            return 0
        fi
        warn "stopping staging takes every staging site down until it is started again"
        read -r -p "    Stop the staging servers? They are started again when the run ends. [y/N] " answer </dev/tty
        [[ "${answer,,}" == y || "${answer,,}" == yes ]] || return 0
    fi

    for stack in "${running[@]}"; do
        IFS=$'\t' read -r host dir file <<<"$stack"
        info "stopping staging $dir"
        if ssh -o BatchMode=yes "$host" "cd '$dir' && docker compose -f '$file' stop" >/dev/null 2>&1; then
            printf '%s\n' "$stack" >>"$TS_STAGING_STATE"
        else
            warn "could not stop staging $dir"
        fi
    done
}

# Starts what free_staging stopped, backend first, and forgets it. Nothing to do
# when nothing was stopped.
restore_staging() {
    [[ -s "$TS_STAGING_STATE" ]] || return 0
    local -a stopped=()
    local i host dir file
    mapfile -t stopped <"$TS_STAGING_STATE"
    step "staging: starting what was stopped"
    for ((i = ${#stopped[@]} - 1; i >= 0; i--)); do
        IFS=$'\t' read -r host dir file <<<"${stopped[i]}"
        info "starting staging $dir"
        ssh -o BatchMode=yes "$host" "cd '$dir' && docker compose -f '$file' start" >/dev/null 2>&1 ||
            warn "could not start staging $dir; start it with: ssh $host \"cd $dir && docker compose -f $file start\""
    done
    rm -f "$TS_STAGING_STATE"
}
