#!/bin/zsh
set -euo pipefail

ROOT="${HOME}/.openclaw"
WRAPPER="${ROOT}/scripts/with-openclaw-secrets.sh"

if [[ $# -eq 0 ]]; then
  echo "Usage: scripts/openclaw-safe.sh openclaw <subcommand> ..." >&2
  exit 64
fi

if [[ "$1" != "openclaw" ]]; then
  echo "Only 'openclaw' is supported." >&2
  exit 64
fi

cmdline=" $* "

deny() {
  echo "Blocked by openclaw-safe: $1" >&2
  exit 65
}

# High-risk runtime mutations must be handled by Codex/human.
[[ "$cmdline" == *" doctor "* && "$cmdline" == *" --fix "* ]] && deny "openclaw doctor --fix"
[[ "$cmdline" == *" doctor "* && "$cmdline" == *" --repair "* ]] && deny "openclaw doctor --repair"
[[ "$cmdline" == *" doctor "* && "$cmdline" == *" --force "* ]] && deny "openclaw doctor --force"
[[ "$cmdline" == *" gateway restart "* ]] && deny "openclaw gateway restart"
[[ "$cmdline" == *" gateway start "* ]] && deny "openclaw gateway start"
[[ "$cmdline" == *" gateway stop "* ]] && deny "openclaw gateway stop"
[[ "$cmdline" == *" gateway install "* ]] && deny "openclaw gateway install"
[[ "$cmdline" == *" update "* ]] && deny "openclaw update"
[[ "$cmdline" == *" configure "* ]] && deny "openclaw configure"
[[ "$cmdline" == *" setup "* ]] && deny "openclaw setup"
[[ "$cmdline" == *" reset "* ]] && deny "openclaw reset"
[[ "$cmdline" == *" uninstall "* ]] && deny "openclaw uninstall"
[[ "$cmdline" == *" config set "* ]] && deny "openclaw config set"
[[ "$cmdline" == *" config unset "* ]] && deny "openclaw config unset"
[[ "$cmdline" == *" plugins enable "* ]] && deny "openclaw plugins enable"
[[ "$cmdline" == *" plugins disable "* ]] && deny "openclaw plugins disable"
[[ "$cmdline" == *" plugins install "* ]] && deny "openclaw plugins install"
[[ "$cmdline" == *" plugins uninstall "* ]] && deny "openclaw plugins uninstall"
[[ "$cmdline" == *" plugins update "* ]] && deny "openclaw plugins update"
[[ "$cmdline" == *" secrets apply "* ]] && deny "openclaw secrets apply"
[[ "$cmdline" == *" secrets configure "* ]] && deny "openclaw secrets configure"

exec "$WRAPPER" "$@"
