#!/usr/bin/env bash
# Launch the official Open Computer Use MCP server.
# Prefers a PATH install, then npx @latest so the runtime tracks npm releases
# of https://github.com/iFurySt/open-codex-computer-use
set -euo pipefail

try_exec() {
  local bin="$1"
  shift
  if command -v "$bin" >/dev/null 2>&1; then
    exec "$bin" "$@"
  fi
}

try_exec open-computer-use mcp
try_exec ocu mcp
try_exec open-computer-use-mcp

if command -v npx >/dev/null 2>&1; then
  exec npx -y open-computer-use@latest mcp
fi

echo "open-computer-use could not start." >&2
echo "Install Node.js, then either:" >&2
echo "  npm i -g open-computer-use" >&2
echo "  npx -y open-computer-use@latest mcp" >&2
exit 1
