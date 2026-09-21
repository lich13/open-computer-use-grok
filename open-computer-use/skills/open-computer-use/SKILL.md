---
name: open-computer-use
description: Desktop Computer Use for native macOS, Linux, and Windows apps via the Open Computer Use MCP server. Use when the user wants to control the computer, click or type in a local GUI app, inspect Accessibility UI, grant Accessibility/Screen Recording, or run Open Computer Use / OCU. Do not use for websites.
when-to-use: Native desktop GUI automation — Finder, TextEdit, System Settings, Slack, WeChat, and other local apps. Triggers include computer use, desktop control, Accessibility, OCU, open-computer-use. For websites or web apps, use browser-use or chrome-devtools instead.
user-invocable: true
---

# Open Computer Use (Grok Build)

This plugin wires Grok to the official [open-computer-use](https://github.com/iFurySt/open-codex-computer-use) MCP server. The runtime is `open-computer-use@latest` on npm, published from that repository. Do not use Codex / Claude / Gemini installers from the upstream skill; MCP is already configured by this plugin.

## When not to use

- Public web pages, logged-in websites, scraping, or browser QA → `browser-use` or `chrome-devtools`.
- Files, git, and shell work that need no GUI → built-in tools.
- Headless SSH / CI without a logged-in desktop session → the server cannot see GUI windows.

## First run

1. On macOS, require 14.0 or later (`sw_vers -productVersion`). Older versions cannot launch; permissions will not fix that.
2. If MCP tools are missing, the `npx -y open-computer-use@latest mcp` server failed to start. Install Node.js, retry, and if needed run `npm i -g open-computer-use` then `open-computer-use doctor`.
3. On macOS, before the first real GUI task, ask the user to run `open-computer-use doctor` (or `npx -y open-computer-use@latest doctor`) and grant **Accessibility** and **Screen Recording**. Do not bypass TCC prompts.

## Call the tools

Prefer MCP over the CLI. Discover tools with `search_tool` (`open-computer-use`) and call them with `use_tool`. Catalog keys:

| Tool | Purpose |
|---|---|
| `open-computer-use__list_apps` | Discover running apps / bundle ids |
| `open-computer-use__get_app_state` | Accessibility tree + screenshot for one app |
| `open-computer-use__click` | Click an `element_index` or coordinates |
| `open-computer-use__perform_secondary_action` | Secondary action exposed by the tree |
| `open-computer-use__scroll` | Scroll |
| `open-computer-use__drag` | Drag |
| `open-computer-use__type_text` | Type |
| `open-computer-use__press_key` | Key press |
| `open-computer-use__set_value` | Set an editable control |

If MCP is down, the same tools exist on the CLI: `npx -y open-computer-use@latest call <tool> --args '{...}'`. Use `call --calls '[...]'` when a sequence must reuse `element_index` in one process.

## Operating rules

1. `list_apps` before guessing an app name. Use the returned name or bundle id.
2. `get_app_state` immediately before any `element_index` action. Re-snapshot after navigation, modals, reloads, or failed actions. Never reuse indexes across sessions or large UI changes.
3. Prefer semantic `element_index` actions and `set_value` for editable controls. Coordinate `click` / `scroll` / `drag` only when the tree has no safer target.
4. Default `get_app_state` is enough for most clicks. Raise `text_limit` (1000 or `"max"`) only for long semantic text. Raise `max_tree_nodes` / `max_tree_depth` only when a visible long list is truncated.
5. Grok truncates large MCP results (default ~20 KB inline). Keep snapshots bounded; do not request `"max"` text and a huge tree together unless the task needs it.
6. Do not set `OPEN_COMPUTER_USE_ALLOW_GLOBAL_POINTER_FALLBACKS=1` unless the user explicitly asked for `click_method: "global"`, a window-server `drag`, or diagnostics that may move the real pointer.
7. Treat this as the user's real desktop. Do not open password managers or unrelated private apps unless asked. Pause before send / delete / purchase / approve / upload / other externally visible changes.

## Canonical upstream docs

Read these before non-trivial GUI work. They are copied from `iFurySt/open-codex-computer-use` (CI + SessionStart). Ignore agent-specific installers in them.

- [references/upstream/SKILL.md](references/upstream/SKILL.md)
- [references/upstream/usage.md](references/upstream/usage.md) — click methods, drag delivery, text/tree limits, MCP vs CLI
- [references/upstream/installation.md](references/upstream/installation.md) — macOS permissions (`doctor`)
- [references/upstream/troubleshooting.md](references/upstream/troubleshooting.md)

If those files are missing or `references/upstream/SOURCE.json` is more than a day old, fetch the same paths from:

`https://raw.githubusercontent.com/iFurySt/open-codex-computer-use/main/skills/open-computer-use/`
