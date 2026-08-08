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
NAMES=()
for arg in "$@"; do
    case "$arg" in
        -h|--help) usage; exit 0 ;;
        --list) LIST=1 ;;
        --dry-run) DRY_RUN=1 ;;
        --build-only) BUILD_ONLY=1 ;;
        -*) echo "error: unknown option $arg" >&2; usage >&2; exit 1 ;;
        *) NAMES+=("$arg") ;;
    esac
done

if ! command -v yq >/dev/null 2>&1; then
    echo "error: yq (mikefarah/yq) is required" >&2
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
# build-image.sh checks out each entry's skvar_branch, so a loop ends on
# whichever site ran last and the next dev session silently starts there.
ORIGINAL_SKVAR_BRANCH="$(git -C "$SUBMODULE_PATH" symbolic-ref -q --short HEAD || true)"
restore_skvar() {
    [[ -n "$ORIGINAL_SKVAR_BRANCH" ]] || return 0
    local current
    current="$(git -C "$SUBMODULE_PATH" symbolic-ref -q --short HEAD || true)"
    [[ "$current" == "$ORIGINAL_SKVAR_BRANCH" ]] && return 0
    info "restoring $SUBMODULE_PATH to $ORIGINAL_SKVAR_BRANCH"
    git -C "$SUBMODULE_PATH" checkout --quiet "$ORIGINAL_SKVAR_BRANCH" || \
        warn "could not restore $SUBMODULE_PATH to $ORIGINAL_SKVAR_BRANCH"
}
# Also on Ctrl-C: an interrupted release should not leave the tree elsewhere.
trap restore_skvar EXIT

# --- Release -----------------------------------------------------------------
declare -a OK_NAMES=() FAILED_NAMES=() FAILED_AT=()
SECONDS=0

printf '%sReleasing %d staging site(s)%s\n' "$BOLD" "${#NAMES[@]}" "$NC"
for n in "${NAMES[@]}"; do info "$n"; done

for NAME in "${NAMES[@]}"; do
    step "$NAME: build"
    if [[ $DRY_RUN -eq 1 ]]; then
        info "(dry run) $BUILD $NAME"
    elif ! "$BUILD" "$NAME"; then
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
