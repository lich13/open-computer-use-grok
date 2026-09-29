---
name: open-computer-use
description: Control native desktop apps such as Finder, TextEdit, or System Settings through the Open Computer Use MCP server. Use for desktop clicks, typing, Accessibility inspection, or OCU troubleshooting. Use browser tools for websites instead.
user-invocable: true
---

# Open Computer Use

The plugin configures the official `open-computer-use@latest` MCP server for Claude Code and Grok Build. Do not run upstream agent installers: they would add a duplicate MCP server outside the plugin.

## Tools

Discover the installed MCP tools instead of guessing their names:

- **Claude Code:** use tool search if available, then call the discovered MCP tools directly. Plugin-qualified names typically begin with `mcp__plugin_open-computer-use_open-computer-use__`.
- **Grok Build:** use `search_tool` for `open-computer-use`, then `use_tool` with the returned name, such as `open-computer-use__list_apps`.

The server provides `list_apps`, `get_app_state`, `click`, `perform_secondary_action`, `scroll`, `drag`, `type_text`, `press_key`, and `set_value`.

Start with `list_apps` to identify the app. Take a fresh `get_app_state` before acting on an `element_index`; repeat after navigation, a modal, or a failed action. Prefer semantic controls over coordinates. Keep snapshots bounded, increasing `text_limit` or tree limits only when relevant content is truncated.

Use the user's existing authorization for the requested task. Treat unrelated private apps and externally visible actions such as sending, purchasing, or deleting as outside that scope unless authorized. Do not enable `OPEN_COMPUTER_USE_ALLOW_GLOBAL_POINTER_FALLBACKS=1` unless the user requested operations that require the real pointer.

## Setup and failures

On macOS, require version 14+ and run `npx -y open-computer-use@latest doctor` before the first GUI task. Proceed when permissions are granted; ask for the specific missing Accessibility or Screen Recording permission only if the runtime reports it. Do not bypass macOS permission controls.

If tools are missing, inspect the host's plugin/MCP status and confirm Node.js and npx are on PATH. Restart the session after fixing startup or updating the plugin. A logged-in desktop session is required for GUI operations.

If MCP is unavailable, the official CLI supports `npx -y open-computer-use@latest call <tool> --args '{...}'`. Related index-based calls must share one process via `call --calls '[...]'`; indexes from a finished CLI process are not reusable.

## References

These are bundled snapshots of official docs, updated through the marketplace. Read the relevant reference for non-trivial actions or troubleshooting; ignore its agent-specific installers.

- [Usage](references/upstream/usage.md): click methods, input, tree limits, and sequencing.
- [Installation](references/upstream/installation.md): platform dependencies and permissions.
- [Troubleshooting](references/upstream/troubleshooting.md): MCP startup and desktop access.
- [Official skill](references/upstream/official-skill.md) and [source revision](references/upstream/SOURCE.json).
