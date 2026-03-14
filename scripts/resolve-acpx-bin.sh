#!/bin/sh
set -eu

if [ -n "${OPENCLAW_ACPX_BIN:-}" ] && [ -x "${OPENCLAW_ACPX_BIN}" ]; then
  printf '%s\n' "${OPENCLAW_ACPX_BIN}"
  exit 0
fi

find_from_npm_root() {
  if ! command -v npm >/dev/null 2>&1; then
    return 1
  fi

  npm_root="$(npm root -g 2>/dev/null || true)"
  if [ -z "$npm_root" ]; then
    return 1
  fi

  candidate="${npm_root}/openclaw/extensions/acpx/node_modules/.bin/acpx"
  if [ -x "$candidate" ]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  return 1
}

for candidate in \
  "/opt/homebrew/lib/node_modules/openclaw/extensions/acpx/node_modules/.bin/acpx" \
  "/usr/local/lib/node_modules/openclaw/extensions/acpx/node_modules/.bin/acpx"
do
  if [ -x "$candidate" ]; then
    printf '%s\n' "$candidate"
    exit 0
  fi
done

if find_from_npm_root; then
  exit 0
fi

echo "acpx binary not found. Set OPENCLAW_ACPX_BIN or install openclaw with the acpx extension." >&2
exit 1
