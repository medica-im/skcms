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
