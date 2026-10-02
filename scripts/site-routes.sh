#!/usr/bin/env bash
# A tenant's own routes for a test site server.
#
#   scripts/site-routes.sh <context>     # a dev.yml context: annuaire, unipa, ...
#
# Prints ROUTES_DIR=... SKVAR_DIR=... for the server's environment (read by
# svelte.config.js).
#
# Why: the site specs run one dev server per tenant at once, and they all
# rendered src/routes/(skvar) — one submodule, one branch. On 2026-10-02 the
# run had checked out lyon3's branch, so dev.unipa.fr/annuaire/contact served
# Lyon 3's contact page, and the unipa reload spec failed on Lyon 3's Google
# Street View iframe. Every tenant's own pages (home, contact) were measured
# against another tenant's routes.
#
# What it builds, under e2e-sites/<context>/ — not under .e2e-workers/ with the
# rest of a run's files: the browser loads skvar modules from here, and Vite
# refuses paths through a dot-directory (403, or 404 under a base path), so no
# page hydrated.
#   skvar/   a worktree of the skvar submodule, detached at the tenant's
#            development_skvar_branch — unless that branch is the one checked
#            out in the submodule, in which case the submodule itself is used,
#            so uncommitted skvar edits are what gets tested;
#   routes/  one symlink per entry of src/routes, with (skvar) pointing at the
#            checkout above. Everything outside skvar is this working tree's
#            own, uncommitted changes included.
set -euo pipefail

ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
ctx="${1:?usage: site-routes.sh <dev.yml context>}"

branch="$("${YQ:-yq}" -r ".contexts[] | select(.name == \"$ctx\") | .development_skvar_branch" "$ROOT/dev.yml")"
if [[ -z "$branch" || "$branch" == "null" ]]; then
    echo "site-routes.sh: no development_skvar_branch for '$ctx' in dev.yml" >&2
    exit 1
fi

SKVAR="$ROOT/src/routes/(skvar)"
DIR="$ROOT/e2e-sites/$ctx"
mkdir -p "$DIR"

if [[ "$(git -C "$SKVAR" branch --show-current)" == "$branch" ]]; then
    skvar_dir="$SKVAR"
else
    skvar_dir="$DIR/skvar"
    if git -C "$SKVAR" worktree list --porcelain | grep -qxF "worktree $skvar_dir"; then
        # Refreshed to the branch's tip: the branch may have moved since.
        git -C "$skvar_dir" checkout -q --force --detach "$branch"
    else
        rm -rf "$skvar_dir"
        git -C "$SKVAR" worktree prune
        git -C "$SKVAR" worktree add -q --detach "$skvar_dir" "$branch"
    fi
fi

# Only what differs is touched: a server may be running on this directory, and
# deleting and recreating unchanged links is change enough for its watcher to
# reload.
routes="$DIR/routes"
mkdir -p "$routes"
link() {
    [[ "$(readlink "$2" 2>/dev/null)" == "$1" ]] || ln -sfn "$1" "$2"
}
for entry in "$ROOT/src/routes"/*; do
    name="$(basename "$entry")"
    [[ "$name" == "(skvar)" ]] && continue
    link "$entry" "$routes/$name"
done
link "$skvar_dir" "$routes/(skvar)"
# Entries since removed from src/routes.
for stale in "$routes"/*; do
    name="$(basename "$stale")"
    [[ "$name" == "(skvar)" || -e "$ROOT/src/routes/$name" ]] || rm -f "$stale"
done

printf 'ROUTES_DIR=%q SKVAR_DIR=%q\n' "$routes" "$skvar_dir"
