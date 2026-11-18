#!/usr/bin/env bash
#
# Prints the health of a compose service's own container: healthy, starting,
# unhealthy, or missing when the service has no container.
#
# Usage: neo4j-health.sh <service>
#   COMPOSE  the compose command, scoped to the stack to ask about (test-all
#            passes its own: the dev file, run from the backend directory)
#   DOCKER   the docker command (default: docker)
#
# The container is found by asking compose, never by name. A name belongs to
# one compose project, and the box also runs staging's backend under the
# project `backend` (backend-neo4j-1): asked by name, a run waits on that
# container, or on an exited one of the same name, instead of the dev stack's.
# Compose answers only for the project it is scoped to.
set -uo pipefail

service="${1:?usage: $(basename "$0") <service>}"
COMPOSE="${COMPOSE:?COMPOSE is the compose command to ask}"
DOCKER="${DOCKER:-docker}"

# shellcheck disable=SC2086
id="$($COMPOSE ps -q "$service" 2>/dev/null | head -n 1)"
if [[ -z "$id" ]]; then
    echo missing
    exit 0
fi
$DOCKER inspect "$id" --format '{{.State.Health.Status}}' 2>/dev/null || echo missing
