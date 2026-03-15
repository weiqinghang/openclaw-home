#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ACPX_BIN="$("$ROOT_DIR/scripts/resolve-acpx-bin.sh")"

exec "$ACPX_BIN" --cwd "$ROOT_DIR" uiux-designer "$@"
