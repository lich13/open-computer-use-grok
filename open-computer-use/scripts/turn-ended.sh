#!/usr/bin/env bash
# Hide the Open Computer Use overlay cursor at a Grok turn boundary.
# Must exit 0: Grok's Stop hook is a gate (exit 2 keeps the agent working).
set -u

run() {
  if command -v open-computer-use >/dev/null 2>&1; then
    open-computer-use turn-ended
    return $?
  fi
  if command -v ocu >/dev/null 2>&1; then
    ocu turn-ended
    return $?
  fi
  return 0
}

run >/dev/null 2>&1 || true
exit 0
