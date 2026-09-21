# Open Computer Use for Grok Build

Grok Build plugin that exposes the official
[open-computer-use](https://github.com/iFurySt/open-codex-computer-use)
MCP server. This repository does not vendor the native Computer Use runtime.

- **Runtime:** `npx -y open-computer-use@latest mcp` (npm package published from the official repo)
- **Skill:** Grok overlay plus a copy of the official skill, refreshed from `main` by CI and on session start
- **Hooks:** `turn-ended` at Grok turn boundaries so the overlay cursor can hide

## Install

From the marketplace repo:

```bash
grok plugin marketplace add lich13/open-computer-use-grok
grok plugin install open-computer-use --trust
grok plugin enable open-computer-use
```

Or install the plugin directory directly:

```bash
grok plugin install lich13/open-computer-use-grok#open-computer-use --trust
grok plugin enable open-computer-use
```

On macOS 14+, run once and grant Accessibility and Screen Recording:

```bash
npx -y open-computer-use@latest doctor
```

## Update

```bash
grok plugin update open-computer-use
```

The MCP server resolves `open-computer-use@latest` on spawn, so tool implementations follow official npm releases without a plugin bump.
