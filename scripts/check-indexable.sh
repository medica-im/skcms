#!/usr/bin/env bash
# Refuse a build whose env file disagrees with images.yml about search engines.
#
#   scripts/check-indexable.sh <env_file> <true|false>
#
# The second argument is the entry's `indexable` field. Exits 0 when the env
# file's VITE_NOINDEX says the same thing, 1 with a message when it does not.
#
# Why a build-time check: VITE_NOINDEX is read through import.meta.env, so it is
# baked into the image. Nothing at runtime can change it, and every dev and
# staging env file sets it to true. A production image built from the wrong
# file ships <meta name="robots" content="noindex"> on every page and robots.txt
# says Disallow — and the site looks perfectly normal while it leaves Google.
# unipa.fr/annuaire did exactly that.
#
# Strict on purpose:
#   - the flag must be present. The layout tests `== "true"`, so a missing flag
#     means indexable; that is right for production and silently wrong for
#     staging, and the file should say which it means.
#   - the value must be exactly true or false. "1", "yes" or "TRUE" all read as
#     indexable to the app, whatever the author meant.
set -euo pipefail

if [[ $# -ne 2 ]]; then
    echo "usage: $0 <env_file> <true|false>" >&2
    exit 2
fi
ENV_FILE="$1"
INDEXABLE="$2"

case "$INDEXABLE" in
    true|false) ;;
    *)
        echo "error: indexable must be true or false in images.yml, got '$INDEXABLE'." >&2
        echo "       Every entry declares it: whether search engines may index" >&2
        echo "       the site is not something to leave to a default." >&2
        exit 1
        ;;
esac

if [[ ! -f "$ENV_FILE" ]]; then
    echo "error: env file $ENV_FILE not found" >&2
    exit 1
fi

# Read the way Vite reads it, which is dotenv's line syntax: every line dotenv
# would accept as an assignment must be seen here, or a later one this parser
# skipped could override the one it checked. The last assignment wins. Allowed:
# `export`, spaces around `=`, `KEY: value`, "..." '...' or `...` quoting, a
# trailing comment, CRLF endings.
KEY_RE='^[[:space:]]*(export[[:space:]]+)?VITE_NOINDEX([[:space:]]*=|:[[:space:]])'
LINE=$(tr -d '\r' < "$ENV_FILE" | grep -E "$KEY_RE" | tail -n 1 || true)
if [[ -z "$LINE" ]]; then
    echo "error: $ENV_FILE does not set VITE_NOINDEX." >&2
    echo "       Set VITE_NOINDEX=$([[ $INDEXABLE == true ]] && echo false || echo true) to match indexable: $INDEXABLE." >&2
    exit 1
fi
[[ "$LINE" =~ $KEY_RE(.*)$ ]]
VALUE="${BASH_REMATCH[3]}"
VALUE="${VALUE#"${VALUE%%[![:space:]]*}"}"
if [[ "$VALUE" =~ ^\"([^\"]*)\" || "$VALUE" =~ ^\'([^\']*)\' || "$VALUE" =~ ^\`([^\`]*)\` ]]; then
    VALUE="${BASH_REMATCH[1]}"
else
    VALUE="${VALUE%%#*}"
    VALUE="${VALUE%"${VALUE##*[![:space:]]}"}"
fi

case "$VALUE" in
    true)  NOINDEX=true ;;
    false) NOINDEX=false ;;
    *)
        echo "error: $ENV_FILE has VITE_NOINDEX=$VALUE; it must be exactly true or false." >&2
        echo "       The app compares it to \"true\", so anything else means indexable." >&2
        exit 1
        ;;
esac

if [[ "$INDEXABLE" == true && "$NOINDEX" == true ]]; then
    echo "error: images.yml says this site is indexable, but $ENV_FILE sets" >&2
    echo "       VITE_NOINDEX=true. The image would tell search engines to drop" >&2
    echo "       every page. Is this a staging env file on a production entry?" >&2
    exit 1
fi
if [[ "$INDEXABLE" == false && "$NOINDEX" == false ]]; then
    echo "error: images.yml says this site is not indexable, but $ENV_FILE sets" >&2
    echo "       VITE_NOINDEX=false. A staging copy would compete with the live" >&2
    echo "       site in search results." >&2
    exit 1
fi

echo "==> indexable: $INDEXABLE (VITE_NOINDEX=$NOINDEX in $ENV_FILE)"
