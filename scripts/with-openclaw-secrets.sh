#!/bin/sh
set -eu

ROOT_DIR="${OPENCLAW_ROOT_DIR:-$HOME/.openclaw}"
SECRETS_FILE="${OPENCLAW_SECRETS_FILE:-$ROOT_DIR/secrets.local.json}"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "Missing secrets file: $SECRETS_FILE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

gateway_token="$(jq -r '.runtime.OPENCLAW_GATEWAY_TOKEN // empty' "$SECRETS_FILE")"
minimax_api_key="$(jq -r '.providers["minimax-cn"].apiKey // empty' "$SECRETS_FILE")"

if [ -z "$gateway_token" ]; then
  echo "Missing .runtime.OPENCLAW_GATEWAY_TOKEN in $SECRETS_FILE" >&2
  exit 1
fi

if [ -z "$minimax_api_key" ]; then
  echo "Missing .providers[\"minimax-cn\"].apiKey in $SECRETS_FILE" >&2
  exit 1
fi

export OPENCLAW_GATEWAY_TOKEN="$gateway_token"
export MINIMAX_API_KEY="$minimax_api_key"

exec "$@"
