#!/usr/bin/env bash
# Copy the canonical Open Computer Use skill from iFurySt/open-codex-computer-use.
# Used by CI (commit into the plugin) and SessionStart (refresh on the machine).
set -euo pipefail

REPO="${OPEN_COMPUTER_USE_UPSTREAM_REPO:-iFurySt/open-codex-computer-use}"
REF="${OPEN_COMPUTER_USE_UPSTREAM_REF:-main}"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/${REF}/skills/open-computer-use"
API_COMMIT="https://api.github.com/repos/${REPO}/commits/${REF}"

DEST=""
MAX_AGE=0
FAIL_OPEN=0

usage() {
  echo "usage: sync-upstream-skill.sh [--dest DIR] [--max-age SECONDS] [--fail-open]" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dest)
      DEST="${2:-}"
      shift 2
      ;;
    --max-age)
      MAX_AGE="${2:-0}"
      shift 2
      ;;
    --fail-open)
      FAIL_OPEN=1
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      usage
      ;;
  esac
done

if [[ -z "$DEST" ]]; then
  if [[ -n "${GROK_PLUGIN_ROOT:-}" ]]; then
    DEST="${GROK_PLUGIN_ROOT}/skills/open-computer-use/references/upstream"
  else
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    DEST="${SCRIPT_DIR}/../skills/open-computer-use/references/upstream"
  fi
fi

now="$(date -u +%s)"
source_json="${DEST}/SOURCE.json"

if [[ "$MAX_AGE" -gt 0 && -f "$source_json" ]]; then
  synced="$(python3 -c 'import json,sys
try:
    print(int(json.load(open(sys.argv[1])).get("syncedAtUnix") or 0))
except Exception:
    print(0)' "$source_json" 2>/dev/null || echo 0)"
  if [[ "$synced" =~ ^[0-9]+$ ]] && (( now - synced < MAX_AGE )); then
    exit 0
  fi
fi

fail() {
  echo "sync-upstream-skill: $*" >&2
  if [[ "$FAIL_OPEN" -eq 1 ]]; then
    exit 0
  fi
  exit 1
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

download() {
  local rel="$1"
  local out="$2"
  if ! curl -fsSL --max-time 20 "${RAW_BASE}/${rel}" -o "$out"; then
    fail "failed to download ${RAW_BASE}/${rel}"
  fi
  if [[ ! -s "$out" ]]; then
    fail "empty download ${RAW_BASE}/${rel}"
  fi
}

# Keep the official skill filename off SKILL.md so Grok does not
# discover a second skill while walking this directory.
download SKILL.md "${tmpdir}/official-skill.md"
download references/installation.md "${tmpdir}/installation.md"
download references/usage.md "${tmpdir}/usage.md"
download references/troubleshooting.md "${tmpdir}/troubleshooting.md"

commit="unknown"
if command -v gh >/dev/null 2>&1; then
  commit="$(gh api "repos/${REPO}/commits/${REF}" --jq .sha 2>/dev/null || echo unknown)"
fi
if [[ "$commit" == "unknown" || -z "$commit" ]]; then
  commit_json="${tmpdir}/commit.json"
  if curl -fsSL --max-time 15 \
    -H "Accept: application/vnd.github+json" \
    -H "User-Agent: open-computer-use-grok-sync" \
    "$API_COMMIT" -o "$commit_json" 2>/dev/null; then
    commit="$(python3 -c 'import json,sys
try:
    print(json.load(open(sys.argv[1])).get("sha") or "unknown")
except Exception:
    print("unknown")' "$commit_json" 2>/dev/null || echo unknown)"
  fi
fi

mkdir -p "$DEST"
cp "${tmpdir}/official-skill.md" "${DEST}/official-skill.md"
cp "${tmpdir}/installation.md" "${DEST}/installation.md"
cp "${tmpdir}/usage.md" "${DEST}/usage.md"
cp "${tmpdir}/troubleshooting.md" "${DEST}/troubleshooting.md"
rm -f "${DEST}/SKILL.md"

python3 - "$source_json" "$REPO" "$REF" "$commit" "$now" "$RAW_BASE" <<'PY'
import json, sys
from datetime import datetime, timezone
path, repo, ref, commit, now, raw_base = sys.argv[1:]
payload = {
    "repo": repo,
    "ref": ref,
    "commit": commit,
    "syncedAtUnix": int(now),
    "syncedAt": datetime.fromtimestamp(int(now), timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "files": [
        f"{raw_base}/SKILL.md",
        f"{raw_base}/references/installation.md",
        f"{raw_base}/references/usage.md",
        f"{raw_base}/references/troubleshooting.md",
    ],
}
with open(path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2)
    fh.write("\n")
PY

echo "synced ${REPO}@${commit} -> ${DEST}"
