#!/bin/sh
set -eu

ACPX_VERSION="${OPENCLAW_ACPX_VERSION:-0.1.16}"

if [ -n "${OPENCLAW_ACPX_BIN:-}" ] && [ -x "${OPENCLAW_ACPX_BIN}" ]; then
  printf '%s\n' "${OPENCLAW_ACPX_BIN}"
  exit 0
fi

install_plugin_local_acpx() {
  plugin_root="$1"
  bundled_bin="$plugin_root/node_modules/.bin/acpx"

  if [ -x "$bundled_bin" ]; then
    printf '%s\n' "$bundled_bin"
    return 0
  fi

  if ! command -v npm >/dev/null 2>&1; then
    return 1
  fi

  (
    cd "$plugin_root"
    npm install --omit=dev --no-save "acpx@$ACPX_VERSION" >/dev/null 2>&1
  )

  if [ -x "$bundled_bin" ]; then
    printf '%s\n' "$bundled_bin"
    return 0
  fi

  return 1
}

find_plugin_root() {
  for candidate in \
    "/opt/homebrew/lib/node_modules/openclaw/extensions/acpx" \
    "/usr/local/lib/node_modules/openclaw/extensions/acpx"
  do
    if [ -d "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if ! command -v npm >/dev/null 2>&1; then
    return 1
  fi

  npm_root="$(npm root -g 2>/dev/null || true)"
  if [ -z "$npm_root" ]; then
    return 1
  fi

  candidate="${npm_root}/openclaw/extensions/acpx"
  if [ -d "$candidate" ]; then
    printf '%s\n' "$candidate"
    return 0
  fi

  return 1
}

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

if plugin_root="$(find_plugin_root)"; then
  if bundled_bin="$(install_plugin_local_acpx "$plugin_root")"; then
    printf '%s\n' "$bundled_bin"
    exit 0
  fi
fi

if find_from_npm_root; then
  exit 0
fi

echo "acpx binary not found. Set OPENCLAW_ACPX_BIN or install openclaw with the acpx extension." >&2
exit 1
