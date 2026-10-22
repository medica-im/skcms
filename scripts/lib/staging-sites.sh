# Which sites are staging, where each is served, and its link check. Sourced
# by release-staging.sh and check-staging.sh, so the two agree on all three: a
# site released but left out of the check, or crawled at the wrong address, is
# what this prevents.

STAGING_SITES_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGES_FILE="${IMAGES_FILE:-$STAGING_SITES_ROOT/images.yml}"
STAGING_COMPOSE="${STAGING_COMPOSE:-docker-compose-staging.yml}"
LINKCHECK_IMAGE="${LINKCHECK_IMAGE:-raviqqe/muffet:latest}"

# Every staging site, in the order images.yml lists them.
#
# By compose file, not by name: annuaire.medica.im is a *production* site that
# runs on the staging machine and carries neither "staging" nor "production"
# in its name. The compose file is what actually differs, and images.yml
# already records it -- the same rule release-production.sh uses.
staging_names() {
    yq -r ".images[] | select((.compose_file // \"\") == \"$STAGING_COMPOSE\") | .name" "$IMAGES_FILE"
}

# Where a site is served, which is its name for every site but those served
# under another site's path (images.yml `origin`). The one reader of that
# field, so the cache clear, the link check and the browser check cannot
# disagree about where a site lives.
site_origin() {
    local name="$1" origin
    origin="$(yq -r ".images[] | select(.name == \"$name\") | .origin // \"\"" "$IMAGES_FILE")"
    [[ -z "$origin" ]] && origin="https://$name"
    printf '%s\n' "$origin"
}

# muffet crawls the deployed site; scripts/linkcheck-classify.sh decides which
# findings are ours. Run through Docker so no muffet is needed on the host,
# and from this machine rather than on the server so the output lands where it
# will be read.
linkcheck_site() {
    local name="$1" origin
    origin="$(site_origin "$name")"

    if ! command -v docker >/dev/null 2>&1; then
        echo "    docker not available; skipping the link check" >&2
        return 0
    fi

    # Each site crawls with its own flags, kept in its .env file next to
    # everything else that varies per site.
    local -a flags=()
    readarray -t flags < <("$STAGING_SITES_ROOT/scripts/linkcheck-flags.sh" "$name")

    local json
    if ! json="$(docker run --rm "$LINKCHECK_IMAGE" \
            "${flags[@]}" "$origin/" 2>/dev/null)"; then
        # muffet exits non-zero whenever it found anything, which is not by
        # itself a failure -- the classifier decides. An empty result is
        # handled there too.
        :
    fi

    "$STAGING_SITES_ROOT/scripts/linkcheck-classify.sh" "$origin" <<<"$json"
}
