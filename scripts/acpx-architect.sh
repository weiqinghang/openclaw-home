#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ACPX_BIN="$("$ROOT_DIR/scripts/resolve-acpx-bin.sh")"

CWD="$ROOT_DIR"
if [[ "${1:-}" == "--cwd" ]]; then
  CWD="${2:?missing --cwd value}"
  shift 2
fi

exec "$ACPX_BIN" --cwd "$CWD" architect "$@"
