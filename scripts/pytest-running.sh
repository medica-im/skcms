#!/usr/bin/env bash
#
# Whether a pytest session is already running in a compose service's container.
#
# Usage: pytest-running.sh <service>
#   COMPOSE  the compose command, scoped to the stack (test-all passes its own)
#
# Prints each session found, as "<pid> <command line>".
# Exit status: 0 a session is running, 1 none, 2 the container could not be
# asked. 2 is not 1: a run that could not look must not read as "nothing is
# running", nor print the error as if it were a session.
#
# The container is searched through /proc: the image has no pgrep or ps, and
# asking for one fails with `executable file not found`.
set -uo pipefail

service="${1:?usage: $(basename "$0") <service>}"
COMPOSE="${COMPOSE:?COMPOSE is the compose command to ask}"

# `py` is a variable so that this script's own command line, which sh reads
# from `sh -c`, does not contain what it searches for.
probe='
py=python
for p in /proc/[0-9]*; do
    pid=${p#/proc/}
    [ "$pid" = "$$" ] && continue
    cmd=$(tr "\0" " " < "$p/cmdline" 2>/dev/null) || continue
    case "$cmd" in *"$py -m pytest"*) printf "%s %s\n" "$pid" "$cmd" ;; esac
done'

# shellcheck disable=SC2086
if ! found="$($COMPOSE exec -T "$service" sh -c "$probe")"; then
    echo "could not look for a pytest session in the $service container" >&2
    exit 2
fi
[[ -z "$found" ]] && exit 1
printf '%s\n' "$found"
