#!/bin/sh
set -eu

if [ -z "${MAESTRO_API_PROXY_TARGET:-}" ]; then
  echo "MAESTRO_API_PROXY_TARGET is required so nginx can proxy /api/v1/*." >&2
  exit 1
fi

case "$MAESTRO_API_PROXY_TARGET" in
  */)
    echo "MAESTRO_API_PROXY_TARGET must not end with a slash; nginx proxy_pass would rewrite /api/v1/* paths." >&2
    exit 1
    ;;
esac

if [ -z "${MAESTRO_API_KEY:-}" ]; then
  echo "MAESTRO_API_KEY is required so nginx can proxy /api/v1/* without exposing secrets to the browser." >&2
  exit 1
fi
