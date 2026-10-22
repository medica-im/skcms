# The release and check scripts' output: a step heading, an aside, a warning.
# Colour on a terminal only, so a log keeps no escape codes.
if [[ -t 1 ]]; then
    BOLD=$'\e[1m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; DIM=$'\e[2m'; NC=$'\e[0m'
else
    BOLD=''; RED=''; GREEN=''; YELLOW=''; DIM=''; NC=''
fi
step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$NC"; }
info() { printf '%s    %s%s\n' "$DIM" "$1" "$NC"; }
warn() { printf '%s    %s%s\n' "$YELLOW" "$1" "$NC"; }
