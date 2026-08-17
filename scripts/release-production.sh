#!/usr/bin/env bash
#
# Build, push and deploy the production sites.
#
# Orchestration only: the work is done by build-image.sh and deploy-image.sh,
# which are left alone. This decides what to run them on, asks before touching
# anything live, and reports what happened.
#
# A site is deployed only if its own build succeeded. deploy-image.sh pulls a
# tag rather than building one, so deploying after a failed build would
# redeploy whatever that tag pointed at before — a successful looking release
# of stale code.
#
# Which sites count as production is read from their compose file, not from
# their name or their host, because neither of those separates the two sets:
# annuaire.medica.im is a production site that runs on the *staging* machine
# and has no "production" anywhere in its name. A rule about naming would have
# quietly left it out of every release; a rule about hosts would have swept in
# four staging sites beside it.
#
# Usage:
#   ./scripts/release-production.sh                  # every production site
#   ./scripts/release-production.sh santelyon3.fr    # one site
#   ./scripts/release-production.sh --list           # what would be released
#   ./scripts/release-production.sh --dry-run        # print, touch nothing
#   ./scripts/release-production.sh --build-only     # build and push, no deploy
#   ./scripts/release-production.sh --yes            # skip the confirmation
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
IMAGES_FILE="${IMAGES_FILE:-$REPO_ROOT/images.yml}"
SUBMODULE_PATH="src/routes/(skvar)"
BUILD="$REPO_ROOT/scripts/build-image.sh"
DEPLOY="$REPO_ROOT/scripts/deploy-image.sh"

# The compose file a production deployment runs under, and so the thing that
# marks an entry as production.
PRODUCTION_COMPOSE="${PRODUCTION_COMPOSE:-docker-compose-production.yml}"

usage() {
    cat <<EOF
Usage: $(basename "$0") [options] [<name> ...]

Builds, pushes and deploys production sites listed in $(basename "$IMAGES_FILE").
With no names, every image whose compose_file is $PRODUCTION_COMPOSE.

Options:
  --list         print the sites this would release, and exit
  --dry-run      print what would run, without building or deploying
  --build-only   build and push, skip the deploy
  -y, --yes      do not ask for confirmation
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
ASSUME_YES=0
NAMES=()
for arg in "$@"; do
    case "$arg" in
        -h|--help) usage; exit 0 ;;
        --list) LIST=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --build-only) BUILD_ONLY=1 ;;
        -y|--yes) ASSUME_YES=1 ;;
        -*) echo "error: unknown option $arg" >&2; usage >&2; exit 1 ;;
        *) NAMES+=("$arg") ;;
    esac
done

if ! command -v yq >/dev/null 2>&1; then
    echo "error: yq (mikefarah/yq) is required" >&2
    exit 1
fi

# --- SSH agent ---------------------------------------------------------------
# Verbatim from release-staging.sh, where it was written after a release built
# the first site and lost authentication for the rest. It matters more here:
# these are live sites, and a partial release leaves some of them on new code
# and some on old.
#
# There is no key on this machine: git and the deploys reach GitHub and the
# servers through an agent forwarded from the laptop. Two things then go wrong
# over a release long enough to outlive a login.
#
# ~/.ssh/agent.sock is a symlink that every new login re-points at its own
# socket. A release that kept reading the symlink would follow it to another
# session's agent mid-run, and start failing the moment that session ended.
# Resolve it once here and hold the real path.
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

# Every production entry, in the order images.yml lists them.
PRODUCTION_NAMES=()
while IFS= read -r name; do
    [[ -n "$name" ]] && PRODUCTION_NAMES+=("$name")
done < <(yq -r ".images[] | select((.compose_file // \"\") == \"$PRODUCTION_COMPOSE\") | .name" "$IMAGES_FILE")

if [[ ${#PRODUCTION_NAMES[@]} -eq 0 ]]; then
    echo "error: no image in $IMAGES_FILE uses $PRODUCTION_COMPOSE" >&2
    exit 1
fi

is_production() {
    local candidate="$1" n
    for n in "${PRODUCTION_NAMES[@]}"; do
        [[ "$n" == "$candidate" ]] && return 0
    done
    return 1
}

if [[ ${#NAMES[@]} -eq 0 ]]; then
    NAMES=("${PRODUCTION_NAMES[@]}")
else
    # A name given explicitly is still checked. This script only ever releases
    # production, so a staging name here is a mistake worth stopping for rather
    # than quietly obeying — the mirror of release-staging.sh's own refusal.
    for name in "${NAMES[@]}"; do
        if ! is_production "$name"; then
            echo "error: '$name' is not a production site." >&2
            echo "       Production sites are:" >&2
            printf '         %s\n' "${PRODUCTION_NAMES[@]}" >&2
            echo "       Staging is released with scripts/release-staging.sh." >&2
            exit 1
        fi
    done
fi

if [[ $LIST -eq 1 ]]; then
    printf '%s\n' "${NAMES[@]}"
    exit 0
fi

# --- Confirm -----------------------------------------------------------------
# These are live sites. One confirmation for the whole run rather than one per
# site: the list is right there to read, and a prompt answered four times in a
# row stops being read at all.
if [[ $ASSUME_YES -eq 0 && $DRY_RUN -eq 0 ]]; then
    printf '\n%sAbout to release %d PRODUCTION site(s):%s\n' "$BOLD" "${#NAMES[@]}" "$NC"
    for n in "${NAMES[@]}"; do
        host=$(yq -r ".images[] | select(.name == \"$n\") | .host // \"-\"" "$IMAGES_FILE")
        printf '    %-28s -> %s\n' "$n" "$host"
    done
    printf '\n'
    if [[ ! -t 0 ]]; then
        echo "error: no terminal to confirm on; pass --yes to release unattended." >&2
        exit 1
    fi
    read -r -p "Release to production? [y/N] " reply
    case "$reply" in
        [yY]|[yY][eE][sS]) ;;
        *) echo "Aborted."; exit 1 ;;
    esac
fi

# --- Cached API payloads ------------------------------------------------------
# Dropped once, before the first image is built.
#
# The cache outlives the containers, so a release that changes the *shape* of a
# serialised payload leaves redis holding pickles written by the old code and
# read back by the new. Nothing reconciles the two: the endpoint validates what
# it read, fails, and the site 500s while every container looks healthy and the
# image is minutes old.
#
# That is not hypothetical. "Send a role as its name rather than as an object"
# (backend 3d90ddf) turned each role from {id, name, description} into its name;
# the cached payloads still held objects, so staging answered 500 on three of
# four sites with thousands of pydantic enum errors over a field the frontend
# had never read. The image was correct; the cache was not.
#
# The order of a release is what makes the timing what it is:
#
#   backend deployed   ->  the API already answers in the new shape
#   old frontends up   ->  they keep working *because* the cache still holds
#                          payloads in the old shape
#   cache cleared      ->  here: the cutover begins
#   images built, deployed
#
# So this is the start of the cutover, not cleanup after one. It cannot be
# deferred any later: the images cannot be built until the new backend is up,
# and once the builds begin the release is committed to the cutover anyway.
#
# Production spans more than one machine — annuaire.medica.im is a production
# site that runs on the *staging* box (see the header) — so the hosts are read
# from images.yml rather than assumed, and each one's cache is cleared once.
#
# Scoped to the v2 payload keys, never FLUSHDB: CACHES and
# CELERY_RESULT_BACKEND share redis db 0 (backend/settings.py), so a blunt flush
# would discard the results of tasks still in flight. Matched as '*v2:*' rather
# than 'v2:*' because Django prefixes every key with its cache version
# (":1:v2:entries:…") — the anchored form silently matches nothing, the same
# trap steps/seed.ts documents.
CLEAR_CACHE="${CLEAR_CACHE:-1}"
BACKEND_COMPOSE="${BACKEND_COMPOSE:-docker-compose-production.yml}"

# Where each host keeps its backend. Overridable per host from the environment,
# since these paths are historical and differ between the two machines.
backend_dir_for() {
    case "$1" in
        production)  echo "${BACKEND_DIR_PRODUCTION:-/opt/annuaire.medica.im/backend}" ;;
        old-staging) echo "${BACKEND_DIR_OLD_STAGING:-/opt/dev.medica.im/backend}" ;;
        *)           echo "${BACKEND_DIR_DEFAULT:-/opt/backend}" ;;
    esac
}


# Drop one site's cached payloads, on the host that serves it.
#
# Per site rather than all at once, because the cache keys carry the site's
# domain (":1:v2:entries:santelyon3.fr:santelyon3:anonymous") and so can be
# selected one site at a time. Clearing the lot up front would break every site
# from the first build until its own deploy — for the sites released last, the
# whole run. Clearing only the site about to be rebuilt keeps each outage to
# that site's own build.
clear_site_cache() {
    local name="$1" host dir n
    [[ "$CLEAR_CACHE" == "1" ]] || { info "cache: left alone (CLEAR_CACHE=$CLEAR_CACHE)"; return 0; }

    host="$(yq -r ".images[] | select(.name == \"$name\") | .host // \"\"" "$IMAGES_FILE")"
    [[ -z "$host" ]] && { warn "cache: no host for $name in $(basename "$IMAGES_FILE")"; return 0; }
    dir="$(backend_dir_for "$host")"

    # Matched on the site's own name: the key is prefixed by Django's cache
    # version (":1:") and the endpoint, and suffixed by directory and role, so
    # the domain sits in the middle and only a doubly-wildcarded pattern finds
    # it.
    n="$(ssh "$host" \
        "cd '$dir' && docker compose -f '$BACKEND_COMPOSE' exec -T redis sh -c \
         \"redis-cli --scan --pattern '*v2:*$name*' | xargs -r redis-cli DEL\"" 2>/dev/null | tail -1)"

    # Never fatal: the cache is a performance layer, and the worst case is the
    # stale-payload 500 this exists to prevent — which the link check would
    # surface anyway, on a site that is still serving.
    if [[ -z "$n" ]]; then
        warn "cache: could not clear $name on $host (is redis up at $dir?)"
    else
        info "cache: dropped $n payload(s) for $name on $host"
    fi
}

# --- Leave the submodule where it was found ----------------------------------
# build-image.sh restores after each site on its own, but it is told not to
# below so the loop does not check the branch back and forth between sites. The
# commit is recorded, not just the branch: a build pulls, so putting the same
# branch back can still land on a newer commit than this repository records.
ORIGINAL_SKVAR_COMMIT="$(git -C "$SUBMODULE_PATH" rev-parse HEAD 2>/dev/null || true)"
ORIGINAL_SKVAR_BRANCH="$(git -C "$SUBMODULE_PATH" symbolic-ref -q --short HEAD || true)"
restore_skvar() {
    [[ -n "$ORIGINAL_SKVAR_COMMIT" ]] || return 0
    "$REPO_ROOT/scripts/skvar-restore.sh" \
        "$SUBMODULE_PATH" "$ORIGINAL_SKVAR_COMMIT" "$ORIGINAL_SKVAR_BRANCH" || true
}
trap restore_skvar EXIT

# --- Release -----------------------------------------------------------------
declare -a OK_NAMES=() FAILED_NAMES=() FAILED_AT=()
SECONDS=0

printf '%sReleasing %d production site(s)%s\n' "$BOLD" "${#NAMES[@]}" "$NC"
for n in "${NAMES[@]}"; do info "$n"; done

# The run stops at the first failure, which is where production differs from
# staging. Staging carries on because one broken env file should not cost the
# other three and nobody is watching those sites. A production build or deploy
# that fails is a reason to find out why before pushing the same change to four
# more live sites — and carrying on would bury the failure among the output of
# everything after it, so it gets read after the damage rather than before.
STOPPED_AFTER=""

for NAME in "${NAMES[@]}"; do
    # Immediately before this site's build, not before the whole run.
    #
    # By the time a frontend release runs, the backend has already been deployed
    # and answers in the new shape; the old frontend container keeps working
    # only because the cache still holds payloads in the shape it understands.
    # Clearing therefore begins this site's cutover, and the site is degraded
    # from here until its own deploy finishes — its build, not everybody's.
    #
    # It cannot be deferred past the build: the images cannot be built until the
    # new backend is up, and once this site's build starts it is committed to
    # the cutover regardless.
    if [[ $DRY_RUN -eq 0 && $BUILD_ONLY -eq 0 ]]; then
        step "$NAME: cache"
        clear_site_cache "$NAME"
    fi

    step "$NAME: build"
    if [[ $DRY_RUN -eq 1 ]]; then
        info "(dry run) $BUILD --keep-skvar $NAME"
    elif ! "$BUILD" --keep-skvar "$NAME"; then
        FAILED_NAMES+=("$NAME"); FAILED_AT+=("build")
        warn "build failed — not deploying $NAME"
        STOPPED_AFTER="$NAME"
        break
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
        STOPPED_AFTER="$NAME"
        break
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

# Everything after the failure was never attempted. Saying so is the difference
# between "the release is done, one site is broken" and "the release stopped
# half way" — which are very different things to walk away from.
if [[ -n "$STOPPED_AFTER" ]]; then
    skipped=0
    reached=0
    for n in "${NAMES[@]}"; do
        if [[ $reached -eq 1 ]]; then
            printf '  %sSKIP%s  %s (not attempted)\n' "$YELLOW" "$NC" "$n"
            skipped=$((skipped + 1))
        fi
        [[ "$n" == "$STOPPED_AFTER" ]] && reached=1
    done
    printf '\n  %sStopped at %s. %d site(s) not attempted.%s\n' \
        "$YELLOW" "$STOPPED_AFTER" "$skipped" "$NC"
    printf '  %sFix it, then re-run — sites already released are rebuilt and%s\n' "$DIM" "$NC"
    printf '  %sredeployed unchanged, or name the remaining ones directly.%s\n' "$DIM" "$NC"
fi

printf '  %s%d ok, %d failed in %dm %ds%s\n' \
    "$DIM" "${#OK_NAMES[@]}" "${#FAILED_NAMES[@]}" "$((SECONDS / 60))" "$((SECONDS % 60))" "$NC"

[[ ${#FAILED_NAMES[@]} -eq 0 ]]
