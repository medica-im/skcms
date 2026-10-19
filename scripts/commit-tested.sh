#!/usr/bin/env bash
#
# Commit what the last green test-all run tested — not what the tree holds now.
#
#   scripts/commit-tested.sh -m "Message"                 # everything tested
#   scripts/commit-tested.sh -m "Theme A" -- src/lib/x/   # a theme at a time
#   scripts/commit-tested.sh -F msg.txt -- a.ts b.ts
#   scripts/commit-tested.sh --dry-run                    # what is left to commit
#
# test-all runs on a snapshot of the working tree (refs/test-all/last) so the
# tree is free for other work meanwhile, and records a green run as
# refs/test-all/passed. This takes the tested contents from the snapshot
# itself, through the index only: the files on disk, newer edits included, are
# never touched, and are left as unstaged changes on top of the new commit.
# Called once per theme, it says what tested content is left; after the last,
# HEAD's tree is the tested tree.
#
# Refused, because each would make "tested" untrue:
#   * no green run, or a latest run that did not pass (or is still going);
#   * a partial run (some suites or sites only), unless --allow-partial;
#   * something already staged — this stages tested content only;
#   * a HEAD that has gained, since the run, a change it did not test.
#
# skvar's pointer is never committed: the snapshot's points at an unsigned
# scaffold commit. When skvar had tested edits, run this inside skvar too —
# test-all records its runs there the same way.
#
# A normal `git commit` makes the commit, so signing and hooks apply. Pushing
# is left to you.
set -euo pipefail

usage() { sed -n '3,9p' "$0" | sed 's/^# \{0,1\}//'; }
die() { echo "$(basename "$0"): $*" >&2; exit 1; }

MSG=()
DRY=0
PARTIAL=0
PATHS=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        -m|-F) [[ $# -ge 2 ]] || die "$1 needs a value"; MSG+=("$1" "$2"); shift 2 ;;
        --dry-run) DRY=1; shift ;;
        --allow-partial) PARTIAL=1; shift ;;
        -h|--help) usage; exit 0 ;;
        --) shift; PATHS=("$@"); break ;;
        *) die "unknown argument '$1' (paths go after --)" ;;
    esac
done

ROOT="$(git rev-parse --show-toplevel)"
SKVAR_PATH="${SKVAR_PATH:-src/routes/(skvar)}"
g() { git -C "$ROOT" "$@"; }
short() { g rev-parse --short "$1"; }

passed="$(g rev-parse -q --verify refs/test-all/passed)" \
    || die "no green test-all run to commit: run scripts/test-all.sh first"
last="$(g rev-parse -q --verify refs/test-all/last || true)"
[[ "$passed" == "$last" ]] \
    || die "the latest test-all run ($(short "$last")) did not pass, or is still running; the last green one tested $(short "$passed")"

note="$(g reflog show -n1 --format=%gs refs/test-all/passed 2>/dev/null || true)"
if [[ "$note" != *"(full)"* && "$PARTIAL" != "1" ]]; then
    die "the green run was not a full one — ${note:-no record of what it covered}. --allow-partial commits it anyway"
fi

# What the run started from: the snapshot's parent, or the commit itself when
# the tree had nothing uncommitted to snapshot.
if [[ "$(g log -1 --format=%s "$passed")" == "test-all snapshot "* ]]; then
    base="$(g rev-parse "$passed^")"
else
    base="$passed"
fi
g merge-base --is-ancestor "$base" HEAD \
    || die "HEAD is not built on $(short "$base"), the commit the run started from"

# Since then, HEAD may only have taken tested content: earlier themes.
while IFS= read -r f; do
    [[ -z "$f" || "$f" == "$SKVAR_PATH" ]] && continue
    g --literal-pathspecs diff --quiet HEAD "$passed" -- "$f" \
        || die "HEAD changed $f since the run, to something the run did not test"
done < <(g diff --name-only --no-renames "$base" HEAD)

g diff --cached --quiet --ignore-submodules=all \
    || die "something is staged already; commit or unstage it first — this stages tested content only"

# Tested content not yet in HEAD, narrowed to the paths given.
pending() {
    g diff --name-only --no-renames HEAD "$passed" -- "$@" | grep -vxF -- "$SKVAR_PATH" || true
}

skvar_note() {
    [[ -e "$ROOT/$SKVAR_PATH/.git" ]] || return 0
    local link
    link="$(g rev-parse -q --verify "$passed:$SKVAR_PATH" 2>/dev/null)" || return 0
    if [[ "$(git -C "$ROOT/$SKVAR_PATH" log -1 --format=%s "$link" 2>/dev/null)" == "test-all snapshot "* ]]; then
        echo "skvar: the run tested uncommitted edits there too. Commit them in skvar, from $SKVAR_PATH:"
        echo "    $ROOT/scripts/commit-tested.sh -m \"...\""
    fi
}

mapfile -t chosen < <(pending "${PATHS[@]}")
if (( ${#chosen[@]} == 0 )); then
    if [[ -z "$(pending)" ]]; then
        echo "the tested state ($(short "$passed")) is already committed"
        skvar_note
        exit 0
    fi
    die "none of the tested changes match: ${PATHS[*]}"
fi

if [[ "$DRY" == "1" ]]; then
    echo "tested by $(short "$passed") (${note:-no record}), not yet committed:"
    printf '    %s\n' "${chosen[@]}"
    exit 0
fi
(( ${#MSG[@]} )) || die "a message is needed: -m or -F"

for f in "${chosen[@]}"; do
    entry="$(g --literal-pathspecs ls-tree --format='%(objectmode),%(objectname)' "$passed" -- "$f")"
    if [[ -n "$entry" ]]; then
        g update-index --add --cacheinfo "$entry,$f"
    else
        g --literal-pathspecs update-index --force-remove -- "$f"
    fi
done

# The index was HEAD's before this script staged anything, so on failure
# resetting it to HEAD puts it back exactly; the files on disk are untouched.
if ! g commit -q "${MSG[@]}"; then
    g reset -q
    die "the commit failed; nothing was committed and the index is as it was"
fi

mapfile -t left < <(pending)
if (( ${#left[@]} )); then
    echo "committed $(short HEAD); tested content still to commit:"
    printf '    %s\n' "${left[@]}"
else
    echo "committed $(short HEAD); HEAD now holds exactly what was tested ($(short "$passed"))"
fi
skvar_note
