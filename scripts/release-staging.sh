#!/usr/bin/env bash
#
# Build, push and deploy every staging site.
#
# Orchestration only: the work is done by build-image.sh and deploy-image.sh,
# which are left alone. This decides what to run them on, in what order, and
# what to do when one of them fails.
#
# A site is deployed only if its own build succeeded — the whole point of
# running them together. deploy-image.sh pulls a tag rather than building one,
# so deploying after a failed build would silently redeploy whatever that tag
# pointed at before, which looks like a successful release of stale code.
#
# Usage:
#   ./scripts/release-staging.sh                  # every staging site
#   ./scripts/release-staging.sh staging.ipa.medica.im [...]
#   ./scripts/release-staging.sh --list           # what would be released
#   ./scripts/release-staging.sh --dry-run        # print, touch nothing
#   ./scripts/release-staging.sh --build-only     # build and push, no deploy
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
IMAGES_FILE="${IMAGES_FILE:-$REPO_ROOT/images.yml}"
SUBMODULE_PATH="src/routes/(skvar)"
BUILD="$REPO_ROOT/scripts/build-image.sh"
DEPLOY="$REPO_ROOT/scripts/deploy-image.sh"

# Which names count as staging. Production sites are deliberately not reachable
# from this script at all: releasing every site at once is a staging habit, and
# production wants deploy-image.sh named site by site.
STAGING_PREFIX="${STAGING_PREFIX:-staging.}"

usage() {
    cat <<EOF
Usage: $(basename "$0") [options] [<name> ...]

Builds, pushes and deploys the staging sites listed in $(basename "$IMAGES_FILE").
With no names, every image whose name begins with "$STAGING_PREFIX".

Options:
  --list         print the sites this would release, and exit
  --dry-run      print what would run, without building or deploying
  --build-only   build and push, skip the deploy
  --no-linkcheck do not crawl the deployed site for broken links
  -h, --help     this help

A site whose build fails is not deployed; the others carry on. The exit status
is non-zero if any site failed.
EOF
}

# --- Output ------------------------------------------------------------------
if [[ -t 1 ]]; then
    BOLD=$'\e[1m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; DIM=$'\e[2m'; NC=$'\e[0m'
else
    BOLD=''; RED=''; GREEN=''; YELLOW=''; DIM=''; NC=''
fi
step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$NC"; }
info() { printf '%s    %s%s\n' "$DIM" "$1" "$NC"; }
warn() { printf '%s    %s%s\n' "$YELLOW" "$1" "$NC"; }

# --- Arguments ---------------------------------------------------------------
DRY_RUN=0
BUILD_ONLY=0
LIST=0
SKIP_LINKCHECK=0
NAMES=()
for arg in "$@"; do
    case "$arg" in
        -h|--help) usage; exit 0 ;;
        --list) LIST=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --build-only) BUILD_ONLY=1 ;;
        --no-linkcheck) SKIP_LINKCHECK=1 ;;
        -*) echo "error: unknown option $arg" >&2; usage >&2; exit 1 ;;
        *) NAMES+=("$arg") ;;
    esac
done

if ! command -v yq >/dev/null 2>&1; then
    echo "error: yq (mikefarah/yq) is required" >&2
    exit 1
fi

# --- SSH agent ---------------------------------------------------------------
# There is no key on this machine: git and the deploys reach GitHub and the
# server through an agent forwarded from the laptop. Two things then go wrong
# over a release long enough to outlive a login.
#
# ~/.ssh/agent.sock is a symlink that every new login re-points at its own
# socket. A release that kept reading the symlink would follow it to another
# session's agent mid-run, and start failing the moment that session ended —
# which is how a release built the first site and then lost authentication for
# the remaining three. Resolve it once here and hold the real path.
#
# An inherited SSH_AUTH_SOCK that already works is left alone: it is either a
# real agent or a deliberate override, and both outrank the symlink.
if ! ssh-add -l >/dev/null 2>&1 && [[ -L "$HOME/.ssh/agent.sock" ]]; then
    resolved="$(readlink -f "$HOME/.ssh/agent.sock" 2>/dev/null || true)"
    [[ -S "$resolved" ]] && export SSH_AUTH_SOCK="$resolved"
    unset resolved
fi

# And check it holds a key before building anything. Without this the run finds
# out site by site, after a full image build each time: ten minutes to learn
# what one call answers now. The message says what to do, because "Permission
# denied (publickey)" reads as a wrong key rather than a dropped agent.
if ! ssh-add -l >/dev/null 2>&1; then
    echo "error: no SSH agent with a usable key (SSH_AUTH_SOCK=${SSH_AUTH_SOCK:-unset})." >&2
    echo "       This machine has no key of its own; the laptop forwards one." >&2
    echo "       Reconnect with agent forwarding (ssh dev) and run this again." >&2
    exit 1
fi

# Default to every staging entry, in the order images.yml lists them.
if [[ ${#NAMES[@]} -eq 0 ]]; then
    while IFS= read -r name; do
        [[ "$name" == "$STAGING_PREFIX"* ]] && NAMES+=("$name")
    done < <(yq -r '.images[].name' "$IMAGES_FILE")
fi

if [[ ${#NAMES[@]} -eq 0 ]]; then
    echo "error: no image in $IMAGES_FILE starts with '$STAGING_PREFIX'" >&2
    exit 1
fi

# A name given explicitly is still checked: this script only ever releases
# staging, so a production name here is a mistake worth stopping for rather
# than quietly obeying.
for name in "${NAMES[@]}"; do
    if [[ "$name" != "$STAGING_PREFIX"* ]]; then
        echo "error: '$name' is not a staging site (expected a '$STAGING_PREFIX' prefix)." >&2
        echo "       Deploy production one site at a time with scripts/deploy-image.sh." >&2
        exit 1
    fi
done

if [[ $LIST -eq 1 ]]; then
    printf '%s\n' "${NAMES[@]}"
    exit 0
fi

# --- Leave the submodule where it was found ----------------------------------
# build-image.sh checks out each entry's skvar_branch and pulls it, so a loop
# ends on whichever site ran last — once on another site's *production* branch,
# where committing the pointer would have made that skvar the repository's
# default.
#
# The commit is recorded, not just the branch: a pull advances the branch, so
# putting the same branch back can still land on a newer commit than the parent
# repository records, and `git status` goes on reporting "(new commits)".
ORIGINAL_SKVAR_COMMIT="$(git -C "$SUBMODULE_PATH" rev-parse HEAD 2>/dev/null || true)"
ORIGINAL_SKVAR_BRANCH="$(git -C "$SUBMODULE_PATH" symbolic-ref -q --short HEAD || true)"
restore_skvar() {
    [[ -n "$ORIGINAL_SKVAR_COMMIT" ]] || return 0
    "$REPO_ROOT/scripts/skvar-restore.sh" \
        "$SUBMODULE_PATH" "$ORIGINAL_SKVAR_COMMIT" "$ORIGINAL_SKVAR_BRANCH" || true
}
# Also on Ctrl-C: an interrupted release should not leave the tree elsewhere.
trap restore_skvar EXIT

# --- Backend -----------------------------------------------------------------
# Every staging site talks to one backend, on the same host. Both steps below
# assume it answers: the compose healthcheck fetches a page through nginx, and
# the link check crawls the rendered site. With the backend down the site 500s,
# so the healthcheck fails eighteen times with an empty Output and the release
# stalls ~150s before reporting the *frontend* container unhealthy — nothing in
# that output points at the backend. Hence checking here, where the failure can
# be named.
#
# Started rather than reported: a backend that is merely down is not a decision
# worth interrupting a release for.
BACKEND_HOST="${BACKEND_HOST:-staging}"
# /opt/backend on the staging server since the 2026-08 move. The old path was
# /opt/dev.medica.im/backend, named after a host that had not been called that
# for years; the new server flattens every deploy directory to /opt/<what it
# is>.
BACKEND_DIR="${BACKEND_DIR:-/opt/backend}"
BACKEND_COMPOSE="${BACKEND_COMPOSE:-docker-compose-production.yml}"
# How long to wait for `up -d` to bring every service to healthy. The chain is
# serialised by depends_on (database and neo4j, then django, then fastapi and
# celery), so this is the sum of several start_periods, not one.
BACKEND_TIMEOUT="${BACKEND_TIMEOUT:-300}"

# Prints the services that are not both running and healthy, one per line.
# A service with no healthcheck is judged on running alone; "starting" is not
# healthy yet, so a backend mid-boot is waited for rather than released against.
#
# Compared against `config --services` rather than reported alone: with nothing
# up, `ps -a` returns no rows at all, and a bare scan of them finds nothing
# wrong with a backend that is entirely dead — which is the exact state this
# check exists to catch.
backend_unhealthy() {
    ssh "$BACKEND_HOST" bash -s <<EOF 2>/dev/null
cd '$BACKEND_DIR' || exit 1
docker compose -f '$BACKEND_COMPOSE' config --services | sort > /tmp/.rs-declared
docker compose -f '$BACKEND_COMPOSE' ps -a \
    --format '{{.Service}}\t{{.State}}\t{{.Health}}' |
    awk -F'\t' '\$2 == "running" && (\$3 == "healthy" || \$3 == "") { print \$1 }' |
    sort > /tmp/.rs-ok
comm -23 /tmp/.rs-declared /tmp/.rs-ok
rm -f /tmp/.rs-declared /tmp/.rs-ok
EOF
}

ensure_backend() {
    local down
    down="$(backend_unhealthy)"
    if [[ -z "$down" ]]; then
        info "backend: all services healthy"
        return 0
    fi

    warn "backend: not ready ($(tr '\n' ' ' <<<"$down"))"
    info "starting $BACKEND_HOST:$BACKEND_DIR"
    if ! ssh "$BACKEND_HOST" \
            "cd '$BACKEND_DIR' && docker compose -f '$BACKEND_COMPOSE' up -d --wait \
             --wait-timeout $BACKEND_TIMEOUT" >/dev/null 2>&1; then
        # --wait already waited; a failure here means something is wrong with
        # the backend itself, and no amount of retrying from a frontend release
        # will fix it.
        echo "error: the staging backend did not come up healthy." >&2
        down="$(backend_unhealthy)"
        [[ -n "$down" ]] && echo "       not healthy: $(tr '\n' ' ' <<<"$down")" >&2
        echo "       ssh $BACKEND_HOST 'cd $BACKEND_DIR && docker compose -f $BACKEND_COMPOSE logs --tail 50'" >&2
        return 1
    fi
    info "backend: started, all services healthy"
}

# --- Link check --------------------------------------------------------------
# muffet crawls the deployed site; scripts/linkcheck-classify.sh decides which
# findings are ours. Run through Docker so the release needs no muffet on the
# host, and from here rather than on the server so the output lands in the
# release log where it will be read.
LINKCHECK_IMAGE="${LINKCHECK_IMAGE:-raviqqe/muffet:latest}"

linkcheck_site() {
    local name="$1" origin
    origin="$(yq -r ".images[] | select(.name == \"$name\") | .origin // \"\"" "$IMAGES_FILE")"
    # Not in images.yml yet: fall back to the name, which is the hostname for
    # every entry there today.
    [[ -z "$origin" ]] && origin="https://$name"

    if ! command -v docker >/dev/null 2>&1; then
        warn "docker not available; skipping the link check"
        return 0
    fi

    # Each site crawls with its own flags, kept in its .env file next to
    # everything else that varies per site.
    local -a flags=()
    readarray -t flags < <("$REPO_ROOT/scripts/linkcheck-flags.sh" "$name")

    local json
    if ! json="$(docker run --rm "$LINKCHECK_IMAGE" \
            "${flags[@]}" "$origin/" 2>/dev/null)"; then
        # muffet exits non-zero whenever it found anything, which is not by
        # itself a failure — the classifier decides. An empty result is handled
        # there too.
        :
    fi

    "$REPO_ROOT/scripts/linkcheck-classify.sh" "$origin" <<<"$json"
}

# --- Release -----------------------------------------------------------------
declare -a OK_NAMES=() FAILED_NAMES=() FAILED_AT=()
SECONDS=0

printf '%sReleasing %d staging site(s)%s\n' "$BOLD" "${#NAMES[@]}" "$NC"
for n in "${NAMES[@]}"; do info "$n"; done

# Once, before anything is built: every site shares the one backend, and a
# build that cannot be deployed is wasted. Skipped for --build-only and
# --dry-run, which never reach the site.
if [[ $BUILD_ONLY -eq 0 && $DRY_RUN -eq 0 ]]; then
    step "backend"
    if ! ensure_backend; then
        exit 1
    fi
fi

for NAME in "${NAMES[@]}"; do
    step "$NAME: build"
    # --keep-skvar: build-image.sh would otherwise put the submodule back after
    # every site, only for the next one to check its own branch out again. The
    # trap above restores once, at the end.
    if [[ $DRY_RUN -eq 1 ]]; then
        info "(dry run) $BUILD --keep-skvar $NAME"
    elif ! "$BUILD" --keep-skvar "$NAME"; then
        FAILED_NAMES+=("$NAME"); FAILED_AT+=("build")
        warn "build failed — not deploying $NAME"
        continue
    fi

    if [[ $BUILD_ONLY -eq 1 ]]; then
        OK_NAMES+=("$NAME")
        continue
    fi

    step "$NAME: deploy"
    if [[ $DRY_RUN -eq 1 ]]; then
        info "(dry run) $DEPLOY $NAME"
    elif ! "$DEPLOY" "$NAME"; then
        FAILED_NAMES+=("$NAME"); FAILED_AT+=("deploy")
        warn "deploy failed for $NAME"
        continue
    fi

    # Crawl what was just deployed. The site has to be up to be crawled, so
    # this can only run here — and running it here is the point: a page that
    # answers 404 is found at release time rather than by somebody browsing to
    # it later, which is how a contact page whose facility slug did not resolve
    # sat broken on staging.
    #
    # Only our own broken links fail the release. Somebody else's site going
    # down is not a reason to stop deploying, and a check that cries wolf over
    # openstreetmap rate-limiting a crawler stops being read.
    if [[ $SKIP_LINKCHECK -eq 0 ]]; then
        step "$NAME: link check"
        if [[ $DRY_RUN -eq 1 ]]; then
            info "(dry run) crawl $NAME and classify the findings"
        elif ! linkcheck_site "$NAME"; then
            FAILED_NAMES+=("$NAME"); FAILED_AT+=("linkcheck")
            warn "broken links on $NAME"
            continue
        fi
    fi

    OK_NAMES+=("$NAME")
done

# --- Summary -----------------------------------------------------------------
printf '\n%s==> Summary%s\n' "$BOLD" "$NC"
for n in "${OK_NAMES[@]:-}"; do
    [[ -n "$n" ]] && printf '  %sOK%s    %s\n' "$GREEN" "$NC" "$n"
done
for i in "${!FAILED_NAMES[@]}"; do
    printf '  %sFAIL%s  %s (%s)\n' "$RED" "$NC" "${FAILED_NAMES[$i]}" "${FAILED_AT[$i]}"
done
printf '  %s%d ok, %d failed in %dm %ds%s\n' \
    "$DIM" "${#OK_NAMES[@]}" "${#FAILED_NAMES[@]}" "$((SECONDS / 60))" "$((SECONDS % 60))" "$NC"

[[ ${#FAILED_NAMES[@]} -eq 0 ]]
