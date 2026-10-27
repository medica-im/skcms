#!/usr/bin/env bash
#
# CVE and version inventory for every image and dependency tree this
# workspace runs: skcms and console (Node/pnpm), the backend's three images
# (Python/pip + apt), and the upstream Neo4j/Postgres/Redis/RabbitMQ images
# pinned in backend/docker-compose-production.yml.
#
#   scripts/scan.sh              table of HIGH/CRITICAL findings per image
#   scripts/scan.sh -a           include LOW/MEDIUM too
#   scripts/scan.sh -c           CRITICAL only
#   scripts/scan.sh --outdated   pnpm outdated + pip list --outdated instead
#                                 (current vs. latest, with no CVE involved)
#
# Images scanned are whatever is already present locally (docker images),
# not rebuilt or pulled — this is a point-in-time check of what you have,
# not a release gate. Pull/build first if you want a fresher answer.
#
# Trivy is not an apt package here: installed by hand from the project's
# signed GitHub release into ~/.local/bin (release v0.76.1, sha256
# c7cbe3137fb8a48a17574bede3dd6beb16742d1e9772929940fc90082c39d9c0 for
# trivy_0.76.1_Linux-64bit.tar.gz) rather than piping the upstream install
# script into a shell. Re-run that by hand to upgrade; this script only
# calls the binary.
#
# JSON of the same findings goes to skcms/logs/scan-<date>.json
# (logs/ is already git-ignored) for later diffing; the table above is
# the terminal-facing summary.
set -uo pipefail
export LC_ALL=C.UTF-8

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$(cd "$REPO_ROOT/.." && pwd)/backend}"
CONSOLE_DIR="${CONSOLE_DIR:-$(cd "$REPO_ROOT/.." && pwd)/console}"
TRIVY="${TRIVY:-$HOME/.local/bin/trivy}"
LOG_DIR="$REPO_ROOT/logs"
STAMP="$(date +%Y%m%d-%H%M%S)"

usage() {
    sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
}

SEVERITY="HIGH,CRITICAL"
MODE="scan"
for arg in "${1:-}"; do
    case "$arg" in
        -a|--severity-all) SEVERITY="" ;;
        -c|--critical-only) SEVERITY="CRITICAL" ;;
        --outdated) MODE="outdated" ;;
        -h|--help) usage; exit 0 ;;
        "") ;;
        *) echo "usage: $(basename "$0") [-a|--severity-all] [-c|--critical-only] [--outdated]" >&2; exit 2 ;;
    esac
done

if [[ ! -x "$TRIVY" ]]; then
    echo "error: trivy not found at $TRIVY (see this script's header for how it was installed)" >&2
    exit 1
fi

run_outdated() {
    echo "=== pnpm outdated (skcms) ==="
    ( cd "$REPO_ROOT" && pnpm outdated ) || true
    echo
    if [[ -d "$CONSOLE_DIR" ]]; then
        echo "=== pnpm outdated (console) ==="
        ( cd "$CONSOLE_DIR" && pnpm outdated ) || true
        echo
    fi
    echo "=== pip list --outdated (backend, inside backend-fastapi-1) ==="
    docker exec backend-fastapi-1 pip list --outdated 2>/dev/null \
        || echo "backend-fastapi-1 is not running — start the backend compose stack first"
}

run_scan() {
    mkdir -p "$LOG_DIR"
    local sev_args=()
    [[ -n "$SEVERITY" ]] && sev_args=(--severity "$SEVERITY")

    # name -> image reference, only scanning what is already pulled/built
    # locally (docker images -q short-circuits a target that isn't present,
    # so a missing one is skipped with a note rather than triggering a pull).
    local -A targets=(
        # skcms itself is never pulled/tagged standalone -- each site in
        # images.yml is built from the same Dockerfile and pnpm-lock.yaml, so
        # any one of them stands in for skcms's Node base and dependency tree.
        [skcms-santelyon3]="ghcr.io/medica-im/santelyon3.fr:latest"
        [backend-django]="backend-django:latest"
        [backend-fastapi]="backend-fastapi:latest"
        [backend-celery]="backend-celery:latest"
        [neo4j]="neo4j:4.4-enterprise"
        [postgres]="ghcr.io/medica-im/postgres-non-root:14"
        [redis]="redis:latest"
        [rabbitmq]="rabbitmq:4-management-alpine"
    )

    local json_out="$LOG_DIR/scan-$STAMP.json"
    echo "[]" > "$json_out"

    for name in "${!targets[@]}"; do
        local image="${targets[$name]}"
        if [[ -z "$(docker images -q "$image" 2>/dev/null)" ]]; then
            echo "-- $name ($image): not present locally, skipped --"
            continue
        fi
        echo "=== $name ($image) ==="
        "$TRIVY" image --quiet "${sev_args[@]}" --format table "$image"
        "$TRIVY" image --quiet "${sev_args[@]}" --format json "$image" \
            > "$LOG_DIR/.scan-$name-$STAMP.json" 2>/dev/null
        echo
    done

    # Merge the per-image JSON files into one array for anything that wants
    # to diff across a run, rather than grepping N files.
    if command -v jq >/dev/null 2>&1; then
        jq -s '.' "$LOG_DIR"/.scan-*-"$STAMP".json > "$json_out" 2>/dev/null
        rm -f "$LOG_DIR"/.scan-*-"$STAMP".json
    fi

    echo "=== filesystem scan: skcms pnpm-lock.yaml ==="
    "$TRIVY" fs --quiet "${sev_args[@]}" --scanners vuln --format table "$REPO_ROOT"

    if [[ -d "$BACKEND_DIR/requirements" ]]; then
        echo "=== filesystem scan: backend requirements/*.txt ==="
        "$TRIVY" fs --quiet "${sev_args[@]}" --scanners vuln --format table "$BACKEND_DIR/requirements"
    fi

    echo "JSON written to $json_out"
}

if [[ "$MODE" == "outdated" ]]; then
    run_outdated
else
    run_scan
fi
