#!/usr/bin/env bash
# Set this Grok plugin's manifest version to the published npm version of
# open-computer-use. The MCP server launches that package at @latest.
set -euo pipefail

NPM_PACKAGE="${OPEN_COMPUTER_USE_NPM_PACKAGE:-open-computer-use}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PLUGIN_JSON="${ROOT}/open-computer-use/.grok-plugin/plugin.json"
MARKET_JSON="${ROOT}/.grok-plugin/marketplace.json"

fail() {
  echo "sync-plugin-version: $*" >&2
  exit 1
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

if ! curl -fsSL --max-time 20 \
  -H "Accept: application/json" \
  -H "User-Agent: open-computer-use-grok-sync" \
  "https://registry.npmjs.org/${NPM_PACKAGE}/latest" \
  -o "${tmpdir}/latest.json"; then
  fail "failed to read https://registry.npmjs.org/${NPM_PACKAGE}/latest"
fi

python3 - "$tmpdir/latest.json" "$PLUGIN_JSON" "$MARKET_JSON" <<'PY'
import json, re, sys

latest_path, plugin_path, market_path = sys.argv[1:]
latest = json.load(open(latest_path, encoding="utf-8"))
version = latest.get("version") or ""
git_head = latest.get("gitHead") or ""
if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", version):
    sys.exit(f"sync-plugin-version: unexpected npm version {version!r}")

def write_if_changed(path, new):
    old = open(path, encoding="utf-8").read()
    if old != new:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)

plugin = open(plugin_path, encoding="utf-8").read()
plugin_new, plugin_count = re.subn(
    r'("version"\s*:\s*")[^"]*(")',
    rf"\g<1>{version}\2",
    plugin,
    count=1,
)
if plugin_count != 1:
    sys.exit(f"sync-plugin-version: version field missing in {plugin_path}")
write_if_changed(plugin_path, plugin_new)

market = open(market_path, encoding="utf-8").read()
pattern = re.compile(
    r'^(?P<indent>[ \t]*)"name": "open-computer-use",\n'
    r'(?:(?P=indent)"version": "[^"]*",\n)?',
    re.M,
)
match = pattern.search(market)
if not match:
    sys.exit("sync-plugin-version: open-computer-use entry missing in marketplace.json")
indent = match.group("indent")
market_new = pattern.sub(
    lambda m: f'{m.group("indent")}"name": "open-computer-use",\n{m.group("indent")}"version": "{version}",\n',
    market,
    count=1,
)
json.loads(market_new)
write_if_changed(market_path, market_new)
print(f"{version} {git_head}")
PY
