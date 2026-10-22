# The files an image is built from, and what follows from them: the last
# commit that changed them, whether one of them is edited, and the commits
# between two versions that changed them. Sourced by image-tag.sh,
# build-image.sh and versions.sh.
#
# Only these count. A commit to a release script, a test or a feature file
# leaves the image byte for byte the same; counting it marked dev dirty and put
# it ahead of staging and production, and hid the commits that matter.
#
# A repository that keeps scripts/image-inputs lists its inputs there, one git
# pathspec per line (the backend: its Dockerfile copies a few named folders).
# Otherwise the inputs are the repository minus its .dockerignore -- the build
# context Docker sees (skcms).

# One pathspec per line.
image_pathspec() {
    local repo="$1" line
    if [[ -f "$repo/scripts/image-inputs" ]]; then
        grep -Ev '^[[:space:]]*(#|$)' "$repo/scripts/image-inputs"
        return 0
    fi
    printf '.\n'
    [[ -f "$repo/.dockerignore" ]] || return 0
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line#"${line%%[![:space:]]*}"}"
        line="${line%"${line##*[![:space:]]}"}"
        [[ -z "$line" || "$line" == \#* || "$line" == \!* ]] && continue
        line="${line#/}"
        printf ':(exclude,glob)%s\n:(exclude,glob)%s/**\n' "$line" "$line"
    done <"$repo/.dockerignore"
}

# The full sha of the last commit, at or before <rev>, that changed the image.
code_commit() {
    local repo="$1" rev="${2:-HEAD}" sha spec
    mapfile -t spec < <(image_pathspec "$repo")
    sha="$(git -C "$repo" rev-list -1 "$rev" -- "${spec[@]}" 2>/dev/null)"
    [[ -n "$sha" ]] || sha="$(git -C "$repo" rev-parse "$rev" 2>/dev/null)"
    printf '%s\n' "$sha"
}

# 1 when a file the image is built from has uncommitted changes, else 0.
# Further arguments go to git status (--ignore-submodules=all).
code_dirty() {
    local repo="$1" spec
    shift
    mapfile -t spec < <(image_pathspec "$repo")
    if [[ -n "$(git -C "$repo" status --porcelain "$@" -- "${spec[@]}" 2>/dev/null)" ]]; then
        printf '1\n'
    else
        printf '0\n'
    fi
}

# How many commits in <from>..<to> changed the image; "?" when git cannot say.
code_behind() {
    local repo="$1" from="$2" to="$3" spec
    mapfile -t spec < <(image_pathspec "$repo")
    git -C "$repo" rev-list --count "$from..$to" -- "${spec[@]}" 2>/dev/null || printf '?\n'
}

# The commits in <from>..<to> that changed the image, newest first:
# "<full sha><TAB><subject>" per line.
code_log() {
    local repo="$1" from="$2" to="$3" spec
    mapfile -t spec < <(image_pathspec "$repo")
    git -C "$repo" log --format='%H%x09%s' "$from..$to" -- "${spec[@]}" 2>/dev/null
}
