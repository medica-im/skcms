#!/usr/bin/env bash
#
# Which commit runs where: the backend and every frontend, on dev, staging and
# production.
#
#   scripts/versions.sh          a table per environment
#   scripts/versions.sh --tsv    one line per component, for scripts and tests
#
# Hosts and environments come from images.yml: a host serving staging.* sites
# is staging, any other is production. Each host is asked once, over ssh, in
# parallel, for its running containers; a host that does not answer is
# reported without hiding the others.
#
# A server knows its images only as :latest. The commit is recovered by
# matching the running image's registry digest against the immutable tags of
# the images built on this machine — `<sha>` for the backend,
# `<sha>-<skvar sha>[-dirty]` for a frontend (scripts/image-tag.sh). A frontend
# image also carries git.sha / git.submodule.sha labels, used when no local tag
# is left; the backend has no label, so without a tag it is unknown, not
# guessed.
#
# "behind" counts the commits from the deployed one to the local tip that
# change an image -- not a release script, a test or a feature file
# (lib/image-inputs.sh) -- and each environment lists them under "to deploy".
# The tips: main for skcms, the site's own branch for skvar, production for
# the backend. Nothing is fetched, so they are as fresh as the last fetch or
# pull.
set -uo pipefail
export LC_ALL=C.UTF-8

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGES_FILE="${IMAGES_FILE:-$REPO_ROOT/images.yml}"
FRONTEND_DIR="${FRONTEND_DIR:-$REPO_ROOT}"
SKVAR_DIR="${SKVAR_DIR:-$FRONTEND_DIR/src/routes/(skvar)}"
BACKEND_DIR="${BACKEND_DIR:-$(cd "$REPO_ROOT/.." && pwd)/backend}"
FRONTEND_TIP="${FRONTEND_TIP:-main}"
BACKEND_TIP="${BACKEND_TIP:-production}"
BACKEND_IMAGE="${BACKEND_IMAGE:-ghcr.io/medica-im/clinic-cms-backend}"
VERSIONS_SSH="${VERSIONS_SSH:-ssh -o BatchMode=yes -o ConnectTimeout=8}"
VERSIONS_LOCAL_IMAGES="${VERSIONS_LOCAL_IMAGES:-}"
# Only commits that change an image count: the last of them is a working
# tree's commit, and they are the ones "behind" counts and lists.
# shellcheck source=lib/image-inputs.sh
source "$REPO_ROOT/scripts/lib/image-inputs.sh"

case "${1:-}" in
    --tsv) TSV=1 ;;
    "") TSV=0 ;;
    -h|--help) sed -n '2,/^set /p' "$0" | sed '$d; s/^# \{0,1\}//'; exit 0 ;;
    *) echo "usage: $(basename "$0") [--tsv]" >&2; exit 2 ;;
esac

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# --- What is deployed where ---------------------------------------------------

# name, host, skvar branch, image repository, where it answers
yq -r '.images[] | select(.host) | [.name, .host, .skvar_branch, .tag, (.origin // "https://" + .name)] | @tsv' "$IMAGES_FILE" |
    while IFS=$'\t' read -r name host branch tag url; do
        printf '%s\t%s\t%s\t%s\t%s\n' "$name" "$host" "$branch" "${tag%:*}" "$url"
    done >"$work/entries"

# One line per running container: image, repo digests, git.sha, git.submodule.sha, created.
read -r -d '' REMOTE <<'EOF'
for c in $(docker ps -q); do
    docker inspect -f '{{.Config.Image}}{{"\x1f"}}{{.Image}}{{"\x1f"}}{{index .Config.Labels "git.sha"}}{{"\x1f"}}{{index .Config.Labels "git.submodule.sha"}}{{"\x1f"}}{{.Created}}' "$c"
done | while IFS=$'\x1f' read -r image id sha sub created; do
    printf '%s\t%s\t%s\t%s\t%s\n' "$image" \
        "$(docker image inspect -f '{{join .RepoDigests ","}}' "$id" 2>/dev/null)" \
        "$sha" "$sub" "$created"
done
EOF

mapfile -t HOSTS < <(cut -f2 "$work/entries" | awk '!seen[$0]++')
for h in "${HOSTS[@]}"; do
    # shellcheck disable=SC2086  # VERSIONS_SSH is a command line, split on purpose
    ( $VERSIONS_SSH "$h" bash -s <<<"$REMOTE" >"$work/host.$h" 2>/dev/null || touch "$work/down.$h" ) &
done

if [[ -n "$VERSIONS_LOCAL_IMAGES" ]]; then
    cat "$VERSIONS_LOCAL_IMAGES"
else
    docker images --digests --no-trunc --format '{{.Repository}}:{{.Tag}}{{"\t"}}{{.ID}}{{"\t"}}{{.Digest}}'
fi >"$work/local" 2>/dev/null
wait

# The immutable tag this machine gave the image a host runs, from its digests.
local_tag() {
    local repo="$1" digests="$2" d ref id dg tag
    IFS=, read -ra ds <<<"$digests"
    for d in "${ds[@]}"; do
        [[ "${d%@*}" == "$repo" ]] || continue
        while IFS=$'\t' read -r ref id dg; do
            [[ "${ref%:*}" == "$repo" ]] || continue
            [[ "$id" == "${d#*@}" || "$dg" == "${d#*@}" ]] || continue
            tag="${ref##*:}"
            [[ "$tag" =~ ^[0-9a-f]{7}(-|$) ]] && { printf '%s\n' "$tag"; return; }
        done <"$work/local"
    done
}

# Fields are joined with US, not tab: read collapses runs of a whitespace IFS,
# so an image without labels would shift its creation date into their place.
US=$'\x1f'

# The running container of a repository on a host: digests, sha, sub, created.
container_of() {
    local host="$1" repo="$2" line image digests sha sub created
    [[ -f "$work/host.$host" ]] || return 1
    while IFS= read -r line; do
        IFS="$US" read -r image digests sha sub created <<<"${line//$'\t'/$US}"
        [[ "${image%:*}" == "$repo" ]] || continue
        printf '%s\n' "$digests$US$sha$US$sub$US$created"
        return 0
    done <"$work/host.$host"
    return 1
}

# --- Commits ------------------------------------------------------------------

tip_of() {
    local dir="$1" branch="$2"
    if git -C "$dir" rev-parse -q --verify "refs/heads/$branch" >/dev/null; then
        printf '%s\n' "$branch"
    else
        printf 'origin/%s\n' "$branch"
    fi
}

behind() { code_behind "$@"; }

when() { git -C "$1" log -1 --format=%ct "$2" 2>/dev/null || printf '0\n'; }
subject() { git -C "$1" log -1 --format=%s "$2" 2>/dev/null; }

deployed_at() {
    [[ -n "$1" ]] || { printf -- '-\n'; return; }
    date -d "$1" '+%Y-%m-%d %H:%M' 2>/dev/null || printf '%s\n' "$1"
}

state_of() { # dirty behind skvar_behind
    if [[ "$1" == 1 ]]; then echo dirty
    elif [[ "$2" == '?' || "$3" == '?' ]]; then echo unknown
    elif [[ "$2" != 0 || "$3" != 0 ]]; then echo behind
    else echo current
    fi
}

row() { # env component host commit skvar dirty behind skvar_behind state deployed subject
    local IFS=$'\t'
    printf '%s\n' "$*" >>"$work/rows"
}

down_row() { row "$1" "$2" "$3" - - 0 - - "$4" - ''; }

backend_row() { # env host commit deployed
    local env="$1" host="$2" commit="$3" deployed="$4" dirty="${5:-0}" b
    if [[ -z "$commit" ]]; then
        row "$env" backend "$host" - - 0 - - unknown "$deployed" ''
        return
    fi
    b="$(behind "$BACKEND_DIR" "$commit" "$BACKEND_TIP")"
    row "$env" backend "$host" "${commit:0:7}" - "$dirty" "$b" 0 \
        "$(state_of "$dirty" "$b" 0)" "$deployed" "$(subject "$BACKEND_DIR" "$commit")"
}

frontend_row() { # env component host branch commit skvar dirty deployed
    local env="$1" comp="$2" host="$3" branch="$4" fe="$5" sv="$6" dirty="$7" deployed="$8"
    local b sb subj
    if [[ -z "$fe" ]]; then
        row "$env" "$comp" "$host" - - 0 - - unknown "$deployed" ''
        return
    fi
    b="$(behind "$FRONTEND_DIR" "$fe" "$FRONTEND_TIP")"
    sb="$(behind "$SKVAR_DIR" "$sv" "$(tip_of "$SKVAR_DIR" "$branch")")"
    if (( $(when "$SKVAR_DIR" "$sv") > $(when "$FRONTEND_DIR" "$fe") )); then
        subj="skvar: $(subject "$SKVAR_DIR" "$sv")"
    else
        subj="$(subject "$FRONTEND_DIR" "$fe")"
    fi
    row "$env" "$comp" "$host" "${fe:0:7}" "${sv:0:7}" "$dirty" "$b" "$sb" \
        "$(state_of "$dirty" "$b" "$sb")" "$deployed" "$subj"
}

# --- dev: the working trees ---------------------------------------------------

: >"$work/rows"

dev_skvar_branch="$(git -C "$SKVAR_DIR" branch --show-current 2>/dev/null)"
dev_skvar_branch="${dev_skvar_branch:-$(git -C "$SKVAR_DIR" rev-parse --short HEAD 2>/dev/null)}"
dev_fe_dirty=0
[[ "$(code_dirty "$FRONTEND_DIR" --ignore-submodules=all)" == 1 || "$(code_dirty "$SKVAR_DIR")" == 1 ]] && dev_fe_dirty=1
backend_row dev "$(hostname -s)" "$(code_commit "$BACKEND_DIR")" 'working tree' \
    "$(code_dirty "$BACKEND_DIR")"
frontend_row dev "frontend ($dev_skvar_branch)" "$(hostname -s)" "$dev_skvar_branch" \
    "$(code_commit "$FRONTEND_DIR")" "$(code_commit "$SKVAR_DIR")" \
    "$dev_fe_dirty" 'working tree'

# --- staging and production: what each host runs -----------------------------

env_of_host() {
    cut -f1,2 "$work/entries" | awk -F'\t' -v h="$1" '$2 == h && $1 ~ /^staging\./ { s = 1 } END { print (s ? "staging" : "production") }'
}

for env in staging production; do
    for h in "${HOSTS[@]}"; do
        [[ "$(env_of_host "$h")" == "$env" ]] || continue

        if [[ -f "$work/down.$h" ]]; then
            down_row "$env" backend "$h" unreachable
        elif c="$(container_of "$h" "$BACKEND_IMAGE")"; then
            IFS="$US" read -r digests sha _ created <<<"$c"
            tag="$(local_tag "$BACKEND_IMAGE" "$digests")"
            backend_row "$env" "$h" "${tag:-$sha}" "$(deployed_at "$created")"
        fi

        while IFS=$'\t' read -r name host branch repo _; do
            [[ "$host" == "$h" ]] || continue
            if [[ -f "$work/down.$h" ]]; then
                down_row "$env" "$name" "$h" unreachable
                continue
            fi
            if ! c="$(container_of "$h" "$repo")"; then
                down_row "$env" "$name" "$h" not-running
                continue
            fi
            IFS="$US" read -r digests sha sub created <<<"$c"
            tag="$(local_tag "$repo" "$digests")"
            dirty=0
            if [[ "$tag" =~ ^([0-9a-f]{7})-([0-9a-f]{7})(-dirty)?$ ]]; then
                sha="${BASH_REMATCH[1]}" sub="${BASH_REMATCH[2]}"
                [[ -n "${BASH_REMATCH[3]}" ]] && dirty=1
            fi
            frontend_row "$env" "$name" "$h" "$branch" "$sha" "$sub" "$dirty" "$(deployed_at "$created")"
        done <"$work/entries"
    done
done

if (( TSV )); then
    cat "$work/rows"
    exit 0
fi

# --- The display --------------------------------------------------------------

# T marks a commit at its tip: the tips' own colour, reused on every sha that
# matches one, so what is up to date reads at a glance down the columns.
if [[ -n "${FORCE_COLOR:-}" || ( -t 1 && -z "${NO_COLOR:-}" ) ]]; then
    B=$'\e[1m' D=$'\e[2m' R=$'\e[31m' G=$'\e[32m' Y=$'\e[33m' T=$'\e[1;32m' X=$'\e[0m'
else
    B='' D='' R='' G='' Y='' T='' X=''
fi
COLS="${COLUMNS:-$(tput cols 2>/dev/null || echo 120)}"

pad() { # text width — pads or cuts to exactly width characters
    local s="$1" w="$2"
    if (( ${#s} > w )); then s="${s:0:w-1}…"; fi
    printf '%s%*s' "$s" $(( w - ${#s} )) ''
}
rule() { local n="$1" s; printf -v s '%*s' "$n" ''; printf '%s' "${s// /─}"; }

# A site is shown as the whole URL where it answers: a terminal opens a plain
# https:// URL, while OSC 8 hyperlinks are ignored by many (QTerminal among
# them). The column is as wide as the longest, since a cut URL opens elsewhere.
label_of() {
    local url
    url="$(awk -F'\t' -v n="$1" '$1 == n { print $5; exit }' "$work/entries")"
    printf '%s' "${url:-$1}"
}
name_cell() { pad "$(label_of "$1")" "$W_COMP"; }

state_text() { # state dirty behind skvar_behind
    local parts=()
    case "$1" in
        current) printf '%s' "✓ current" ; return ;;
        unknown) printf '%s' "? unknown" ; return ;;
        unreachable) printf '%s' "✗ unreachable" ; return ;;
        not-running) printf '%s' "– not running" ; return ;;
    esac
    [[ "$2" == 1 ]] && parts+=(dirty)
    [[ "$3" != 0 ]] && parts+=("$3 behind")
    [[ "$4" != 0 ]] && parts+=("skvar $4")
    local text="" p
    for p in "${parts[@]}"; do text+="${text:+, }$p"; done
    printf '%s' "$text"
}
state_color() {
    case "$1" in current) printf '%s' "$G" ;; behind) printf '%s' "$Y" ;; not-running) printf '%s' "$D" ;; *) printf '%s' "$R" ;; esac
}

W_COMP=9
while IFS=$'\t' read -r _ comp _; do
    label="$(label_of "$comp")"
    (( ${#label} > W_COMP )) && W_COMP=${#label}
done <"$work/rows"
W_SHA=7 W_STATE=18 W_WHEN=16
fixed=$(( 2 + W_COMP + 1 + W_SHA + 1 + W_SHA + 2 + W_STATE + 1 + W_WHEN + 1 ))
W_SUBJ=$(( COLS - fixed )); (( W_SUBJ < 20 )) && W_SUBJ=20

fe_label="skcms $FRONTEND_TIP" be_label="backend $BACKEND_TIP"
W_TIP=$(( ${#fe_label} > ${#be_label} ? ${#fe_label} : ${#be_label} ))
tip_line() { # heading label repo ref
    local room=$(( COLS - 1 - 4 - 2 - W_TIP - 1 - 7 - 2 )) code
    (( room < 20 )) && room=20
    code="$(code_commit "$3" "$4")"
    printf ' %s%s%s  %s %s%s%s  %s\n' "$D" "$(pad "$1" 4)" "$X" "$(pad "$2" "$W_TIP")" \
        "$T" "${code:0:7}" "$X" "$(pad "$(subject "$3" "$code")" "$room")"
}
echo
tip_line tips "$fe_label" "$FRONTEND_DIR" "$FRONTEND_TIP"
tip_line '' "$be_label" "$BACKEND_DIR" "$BACKEND_TIP"

# The code commits a box's hosts do not run yet: for each repository, from the
# component furthest behind. "<label><TAB><sha><TAB><subject>" per line, newest
# first, at most PENDING_MAX per repository and then a count of the rest.
PENDING_MAX="${PENDING_MAX:-10}"
pending_repo() { # label repo from to
    local label="$1" n=0 sha subj total
    total="$(code_behind "$2" "$3" "$4")"
    while IFS=$'\t' read -r sha subj; do
        (( n++ < PENDING_MAX )) || break
        printf '%s\t%s\t%s\n' "$label" "${sha:0:7}" "$subj"
    done < <(code_log "$2" "$3" "$4")
    [[ "$total" =~ ^[0-9]+$ ]] && (( total > PENDING_MAX )) &&
        printf '%s\t\t… and %s more\n' "$label" $(( total - PENDING_MAX ))
    return 0
}

pending() { # env box
    local env="$1" box="$2" e comp host commit skvar dirty b sb branch
    local fe_from="" fe_most=0 be_from="" be_most=0
    declare -A sv_from=() sv_most=()
    while IFS=$'\t' read -r e comp host commit skvar dirty b sb _; do
        [[ "$e" == "$env" && ( -z "$box" || "$host" == "$box" ) && "$commit" != - ]] || continue
        if [[ "$comp" == backend ]]; then
            [[ "$b" =~ ^[0-9]+$ ]] && (( b > be_most )) && { be_most=$b; be_from=$commit; }
            continue
        fi
        [[ "$b" =~ ^[0-9]+$ ]] && (( b > fe_most )) && { fe_most=$b; fe_from=$commit; }
        branch="$(awk -F'\t' -v n="$comp" '$1 == n { print $3; exit }' "$work/entries")"
        if [[ -n "$branch" && "$sb" =~ ^[0-9]+$ ]] && (( sb > ${sv_most[$branch]:-0} )); then
            sv_most[$branch]=$sb sv_from[$branch]=$skvar
        fi
    done <"$work/rows"
    (( fe_most > 0 )) && pending_repo skcms "$FRONTEND_DIR" "$fe_from" "$FRONTEND_TIP"
    for branch in $(printf '%s\n' "${!sv_from[@]}" | sort); do
        pending_repo "skvar $branch" "$SKVAR_DIR" "${sv_from[$branch]}" "$(tip_of "$SKVAR_DIR" "$branch")"
    done
    (( be_most > 0 )) && pending_repo backend "$BACKEND_DIR" "$be_from" "$BACKEND_TIP"
    return 0
}

pending_block() { # env box
    pending "$1" "$2" >"$work/pending"
    [[ -s "$work/pending" ]] || return 0
    local w=0 label sha subj
    while IFS=$'\t' read -r label _; do (( ${#label} > w )) && w=${#label}; done <"$work/pending"
    printf ' %s│%s %sto deploy%s\n' "$D" "$X" "$Y" "$X"
    while IFS=$'\t' read -r label sha subj; do
        printf ' %s│%s   %s %s%s%s  %s\n' "$D" "$X" "$(pad "$label" "$w")" \
            "$B" "$(pad "$sha" 7)" "$X" "$(pad "$subj" $(( COLS - w - 16 )))"
    done <"$work/pending"
}

# One box per host, so two machines of one environment are never mistaken for
# one: dev, then each environment's hosts, the one named like it first.
boxes() {
    local env
    printf 'dev\t\n'
    for env in staging production; do
        awk -F'\t' -v e="$env" '$1 == e && !seen[$3]++ { split($3, p, "."); print (p[1] == e ? 0 : 1) "\t" NR "\t" $3 }' \
            "$work/rows" | sort -t$'\t' -k1,1n -k2,2n | cut -f3 | sed "s/^/$env\t/"
    done
}

while IFS=$'\t' read -r env box; do
    title="$env"
    [[ -n "$box" && "${box%%.*}" != "$env" ]] && title="$env · ${box%%.*}"
    printf '\n %s╭─ %s%s%s %s%s\n' "$D" "$X$B" "$title" "$X$D" "$(rule $(( COLS - 6 - ${#title} )))" "$X"
    printf ' %s│%s %s%s %s %s  %s %s %s%s\n' "$D" "$X" "$D" \
        "$(pad component $W_COMP)" "$(pad commit $W_SHA)" "$(pad skvar $W_SHA)" \
        "$(pad state $W_STATE)" "$(pad deployed $W_WHEN)" "subject" "$X"
    while IFS=$'\t' read -r e comp host commit skvar dirty b sb state deployed subj; do
        [[ "$e" == "$env" && ( -z "$box" || "$host" == "$box" ) ]] || continue
        [[ "$skvar" == - ]] && skvar=''
        [[ "$commit" == - ]] && commit=''
        ccol='' scol=''
        [[ "$b" == 0 ]] && ccol="$T"
        [[ "$sb" == 0 && -n "$skvar" ]] && scol="$T"
        printf ' %s│%s %s%s%s %s%s%s %s%s%s  %s%s%s %s%s%s %s\n' "$D" "$X" \
            "$B" "$(name_cell "$comp")" "$X" \
            "$ccol" "$(pad "$commit" $W_SHA)" "$X" \
            "$scol" "$(pad "$skvar" $W_SHA)" "$X" \
            "$(state_color "$state")" "$(pad "$(state_text "$state" "$dirty" "$b" "$sb")" $W_STATE)" "$X" \
            "$D" "$(pad "$deployed" $W_WHEN)" "$X" \
            "$(pad "$subj" "$W_SUBJ")"
    done <"$work/rows"
    [[ "$env" != dev ]] && pending_block "$env" "$box"
    printf ' %s╰%s%s\n' "$D" "$(rule $(( COLS - 3 )))" "$X"
done < <(boxes)
echo
