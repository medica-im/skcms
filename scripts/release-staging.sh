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
