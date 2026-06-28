#!/bin/sh
set -u

RED='\033[1;31m'
RESET='\033[0m'

: > "$LINKCHECK_ERROR_FILE"

muffet $LINKCHECK_FLAGS "$LINKCHECK_TARGET_URL" 2>&1 | while IFS= read -r line; do
    if echo "$line" | grep -qE '^\s+[45][0-9]{2}\s|failed to fetch'; then
        printf "${RED}%s${RESET}\n" "$line"
        echo "$line" >> "$LINKCHECK_ERROR_FILE"
    else
        printf '%s\n' "$line"
    fi
done

if [ -s "$LINKCHECK_ERROR_FILE" ]; then
    printf "\n${RED}=== ERRORS SUMMARY ===${RESET}\n"
    while IFS= read -r line; do
        printf "${RED}%s${RESET}\n" "$line"
    done < "$LINKCHECK_ERROR_FILE"
    exit 1
fi

exit 0
