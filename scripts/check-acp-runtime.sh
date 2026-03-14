#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PATCH_STATUS_SCRIPT="$ROOT_DIR/scripts/openclaw-acp-spawnedby-patch.js"
OPENCLAW_WRAPPER="$ROOT_DIR/scripts/with-openclaw-secrets.sh"
ACPX_WRAPPER="$ROOT_DIR/scripts/acpx-codex.sh"

INTERNAL_AGENT="${1:-guichengxiang}"
INTERNAL_SESSION_ID="acp-check-$(date +%s)"
PASS_COUNT=0
FAIL_COUNT=0

run_capture() {
  local tmp
  tmp="$(mktemp)"
  if "$@" >"$tmp" 2>&1; then
    cat "$tmp"
    rm -f "$tmp"
    return 0
  fi
  cat "$tmp"
  rm -f "$tmp"
  return 1
}

pass() {
  echo "PASS $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo "FAIL $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

step() {
  echo ""
  echo "## $1"
}

step "OpenClaw Version"
if version_output="$(run_capture "$OPENCLAW_WRAPPER" openclaw --version)"; then
  echo "$version_output"
  pass "openclaw version"
else
  echo "$version_output"
  fail "openclaw version"
fi

step "Patch Status"
if patch_output="$(run_capture node "$PATCH_STATUS_SCRIPT" status)"; then
  echo "$patch_output"
  if [[ "$patch_output" == *"needs_patch"* ]] || [[ "$patch_output" == *"unknown"* ]]; then
    fail "acp patch status"
  else
    pass "acp patch status"
  fi
else
  echo "$patch_output"
  fail "acp patch status"
fi

step "Gateway Health"
if gateway_output="$(run_capture "$OPENCLAW_WRAPPER" openclaw gateway health)"; then
  echo "$gateway_output"
  if [[ "$gateway_output" == *"Gateway Health"* ]] && [[ "$gateway_output" == *"OK"* ]]; then
    pass "gateway health"
  else
    fail "gateway health"
  fi
else
  echo "$gateway_output"
  fail "gateway health"
fi

step "Project ACP"
if acpx_output="$(run_capture "$ACPX_WRAPPER" --timeout 20 exec "回复 OK")"; then
  echo "$acpx_output"
  if [[ "$acpx_output" == *"OK"* ]]; then
    pass "project acp"
  else
    fail "project acp"
  fi
else
  echo "$acpx_output"
  fail "project acp"
fi

step "Internal ACP"
if internal_output="$(run_capture "$OPENCLAW_WRAPPER" openclaw agent --agent "$INTERNAL_AGENT" --session-id "$INTERNAL_SESSION_ID" --message "请通过 ACP 转交 Codex，测试一句话回复 INTERNAL_PONG。若失败，原样返回错误。" --json --timeout 120)"; then
  echo "$internal_output"
  if [[ "$internal_output" == *"INTERNAL_PONG"* ]]; then
    pass "internal acp"
  else
    fail "internal acp"
  fi
else
  echo "$internal_output"
  fail "internal acp"
fi

echo ""
echo "Summary: pass=$PASS_COUNT fail=$FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
