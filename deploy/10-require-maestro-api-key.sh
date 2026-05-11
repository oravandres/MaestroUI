#!/bin/sh
set -eu

: "${MAESTRO_API_PROXY_TARGET:=http://localhost:8002}"
MAESTRO_API_PROXY_TARGET="${MAESTRO_API_PROXY_TARGET%/}"
export MAESTRO_API_PROXY_TARGET

if [ -z "${MAESTRO_API_KEY:-}" ]; then
  echo "MAESTRO_API_KEY is required so nginx can proxy /api/v1/* without exposing secrets to the browser." >&2
  exit 1
fi
