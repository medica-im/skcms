#!/usr/bin/env bash
#
# Measure the svelte-check error count for every site, and print the baseline
# lines test-all.sh expects.
#
#   ./scripts/typecheck-baselines.sh            # every context in dev.yml
#   ./scripts/typecheck-baselines.sh gadagne    # just one
#
# Why per site: the routes under src/routes/(skvar) are a submodule with one
# branch per tenant, and svelte-check reads them along with everything else. The
# same parent commit therefore measures a different number on each site — 195 on
# annuaire against 206 on gadagne when this was written. A single global
# baseline cannot describe both, and the failure is silent in the direction that
# matters: set for the worst site, it admits eleven new errors on the best.
#
# The output is meant to be pasted into test-all.sh. It is not written there
# automatically on purpose — a baseline that rewrites itself records whatever
# the tree happened to contain, including regressions it was supposed to catch.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULE_PATH="$REPO_ROOT/src/routes/(skvar)"
YQ="${YQ:-yq}"

cd "$REPO_ROOT"

contexts() {
    if [[ $# -gt 0 ]]; then printf '%s\n' "$@"; else
        "$YQ" -r '.contexts[].name' dev.yml
    fi
}

# Put the tree back exactly as it was found, whatever happens: this switches the
# skvar branch and the .env symlink, and leaving someone's checkout on another
# tenant is the bug this whole file exists to describe.
ORIG_BRANCH="$(git -C "$SUBMODULE_PATH" symbolic-ref -q --short HEAD || git -C "$SUBMODULE_PATH" rev-parse HEAD)"
ORIG_ENV="$(readlink .env || true)"
restore() {
    git -C "$SUBMODULE_PATH" checkout -q "$ORIG_BRANCH" 2>/dev/null || true
    [[ -n "$ORIG_ENV" ]] && ln -sfn "$ORIG_ENV" .env
}
trap restore EXIT

measure() {
    local ctx="$1" branch env_file out count
    branch="$("$YQ" -r ".contexts[] | select(.name == \"$ctx\") | .development_skvar_branch" dev.yml)"
    env_file="$("$YQ" -r ".contexts[] | select(.name == \"$ctx\") | .env_file" dev.yml)"
    if [[ -z "$branch" || "$branch" == "null" ]]; then
        echo "  $ctx: no dev.yml entry, skipped" >&2
        return 1
    fi
    git -C "$SUBMODULE_PATH" checkout -q "$branch" 2>/dev/null || {
        echo "  $ctx: could not check out $branch" >&2
        return 1
    }
    ln -sfn "$env_file" .env
    npx svelte-kit sync >/dev/null 2>&1
    out="$(npx svelte-check --output machine --threshold error 2>&1)"
    count="$(sed -nE 's/.*COMPLETED [0-9]+ FILES ([0-9]+) ERRORS.*/\1/p' <<<"$out" | tail -1)"
    [[ -z "$count" ]] && { echo "  $ctx: could not parse svelte-check output" >&2; return 1; }
    printf '%s\n' "$count"
}

echo "# Measured $(date +%Y-%m-%d) by scripts/typecheck-baselines.sh" >&2
declare -a lines=()
while read -r ctx; do
    [[ -z "$ctx" ]] && continue
    printf '  %-10s ' "$ctx" >&2
    if count="$(measure "$ctx")"; then
        printf '%s errors\n' "$count" >&2
        lines+=("TYPECHECK_BASELINE_${ctx}=\"\${TYPECHECK_BASELINE_${ctx}:-${count}}\"")
    fi
done < <(contexts "$@")

echo >&2
echo "# Paste into scripts/test-all.sh:" >&2
printf '%s\n' "${lines[@]}"
