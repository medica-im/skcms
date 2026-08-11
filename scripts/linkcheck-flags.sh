#!/usr/bin/env bash
#
# Print the muffet flags to crawl one site with, one per line.
#
#   readarray -t flags < <(scripts/linkcheck-flags.sh staging.santelyon3.fr)
#   muffet "${flags[@]}" https://staging.santelyon3.fr/
#
# The flags belong to the site, not to this script. Each .env.staging.<site>
# carries its own LINKCHECK_FLAGS: a bigger read buffer for the sites whose
# response headers are enormous, excludes for the third parties that answer a
# crawler with 403 or 429, and an openstreetmap exclude narrow enough to skip
# the map links while still crawling everything else. Hardcoding a second set
# here would drift from those, and a link excluded in one place would surprise
# whoever reads the other.
#
# Which env file belongs to which site is already recorded in images.yml, so
# neither the caller nor this script has to guess the name.
#
# A site that configures nothing still gets crawled: the default below is a
# sane crawl, not an empty one. Silently checking nothing is worse than
# checking imperfectly, since it looks the same as a clean run.
set -uo pipefail

NAME="${1:-}"
if [[ -z "$NAME" ]]; then
    echo "usage: $(basename "$0") <image-name>" >&2
    exit 2
fi

REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
IMAGES_FILE="${IMAGES_FILE:-$REPO_ROOT/images.yml}"

# What to crawl with when the site says nothing. Deliberately conservative:
# these have to be safe for a site nobody has tuned yet.
DEFAULT_FLAGS=(
    --timeout=20 --max-connections=16 --max-connections-per-host=8
    --max-redirections=5
    --exclude='^mailto:' --exclude='^tel:'
    # Rate-limits crawlers rather than being broken.
    --exclude='openstreetmap\.org'
    # Signing in and out are not pages to crawl.
    --exclude='/signin' --exclude='/signout' --exclude='[?&]origin='
)

# --- The site's own flags ----------------------------------------------------
# Missing yq, missing images.yml, an unknown name, a missing env file: all the
# same answer. This resolves flags for a link check — it is not the place to
# fail a release over a lookup, and the default crawl is still a real crawl.
env_file=''
if command -v yq >/dev/null 2>&1 && [[ -f "$IMAGES_FILE" ]]; then
    env_file="$(yq -r ".images[] | select(.name == \"$NAME\") | .env_file // \"\"" \
        "$IMAGES_FILE" 2>/dev/null || true)"
    [[ "$env_file" == "null" ]] && env_file=''
fi
# images.yml names env files relative to the repository root.
if [[ -n "$env_file" && "$env_file" != /* ]]; then
    env_file="$REPO_ROOT/$env_file"
fi

site_flags=''
if [[ -n "$env_file" && -f "$env_file" ]]; then
    # Sourced rather than grepped: the value is already a shell-quoted string,
    # and the shell unquotes it correctly. The patterns are the reason —
    # [?&]origin= and openstreetmap\.org/.*# would be mangled by any
    # hand-rolled splitting, and glob at the wrong moment.
    #
    # In a subshell, so nothing the env file sets leaks into this one.
    site_flags="$(
        set +u
        # shellcheck disable=SC1090
        . "$env_file" >/dev/null 2>&1
        printf '%s' "${LINKCHECK_FLAGS:-}"
    )"
fi

# --- Emit --------------------------------------------------------------------
declare -a FLAGS=()
if [[ -n "${site_flags// /}" ]]; then
    # Split on whitespace only. Not eval: sourcing already unquoted the value,
    # so what is left is plain text, and re-reading it as shell syntax chokes
    # on the metacharacters the patterns are made of — [?&]origin= ends a
    # command at the &. Nothing here globs either, since no expansion runs.
    #
    # The cost is that a single flag cannot contain a space. None does, and a
    # muffet --exclude is a regex where a space would be written \s anyway.
    read -ra FLAGS <<<"$site_flags"
else
    FLAGS=("${DEFAULT_FLAGS[@]}")
fi

# The classifier reads muffet's JSON. A site whose flags forgot --format=json,
# or asked for something else, would produce output nothing downstream can
# parse — so this is not the site's choice to make.
has_json=0
for f in "${FLAGS[@]}"; do
    [[ "$f" == --format=json ]] && has_json=1
done
[[ $has_json -eq 1 ]] || FLAGS=(--format=json "${FLAGS[@]}")

# One per line: the only separator that survives a flag containing spaces.
printf '%s\n' "${FLAGS[@]}"
