#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ACPX_BIN="/opt/homebrew/lib/node_modules/openclaw/extensions/acpx/node_modules/.bin/acpx"

if [[ ! -x "$ACPX_BIN" ]]; then
  echo "acpx binary not found: $ACPX_BIN" >&2
  exit 1
fi

exec "$ACPX_BIN" --cwd "$ROOT_DIR" reviewer "$@"
