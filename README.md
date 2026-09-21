# open-computer-use-grok

Grok Build 插件：把官方 [open-computer-use](https://github.com/iFurySt/open-codex-computer-use) 接到 Grok。

这不是 Computer Use 运行时的 fork。原生能力仍由官方 npm 包 `open-computer-use` 提供；本仓库只提供 Grok 的 marketplace、`.mcp.json`、Skill 和 turn-ended hook。

## 安装

```bash
grok plugin marketplace add lich13/open-computer-use-grok
grok plugin install open-computer-use --trust
grok plugin enable open-computer-use
```

也可以直接装插件目录：

```bash
grok plugin install lich13/open-computer-use-grok#open-computer-use --trust
grok plugin enable open-computer-use
```

macOS 14+ 第一次用前授权 **Accessibility** 和 **Screen Recording**：

```bash
npx -y open-computer-use@latest
# 或
npx -y open-computer-use@latest doctor
```

网页任务继续用已安装的 `browser-use` / `chrome-devtools`。本插件只管 Finder、TextEdit、系统设置等原生 App。

## 如何跟着官方仓库更新

| 层 | 更新方式 |
|---|---|
| Computer Use 运行时（9 个桌面工具） | MCP 每次启动 `npx -y open-computer-use@latest mcp`，跟随官方 npm |
| 官方 Skill / 用法文档 | GitHub Action 每 6 小时从 `iFurySt/open-codex-computer-use` 的 `main` 同步；Grok 会话开始时也会刷新（6 小时缓存） |
| 本插件封装 | `grok plugin update open-computer-use`，或 Grok 默认的 session-start plugin auto-update |

## 本机更新

```bash
grok plugin update open-computer-use
```

## 仓库布局

```
.grok-plugin/marketplace.json     # Grok marketplace 索引
open-computer-use/                # 实际插件
  .grok-plugin/plugin.json
  .mcp.json                       # npx open-computer-use@latest mcp
  hooks/hooks.json                # SessionStart 同步 + turn-ended
  scripts/
  skills/open-computer-use/
```

## 安全

插件会在本机拉起官方 Computer Use MCP，从而读取窗口树并点击、输入。只从你信任的 git 源安装，并在 macOS 上按系统提示授权。不要对密码管理器或无关的私人 App 使用，除非用户明确要求。

本项目与 iFurySt / OpenAI / xAI 无官方从属关系。上游许可证为 MIT。

## License

MIT. Upstream Computer Use runtime: [iFurySt/open-codex-computer-use](https://github.com/iFurySt/open-codex-computer-use) (MIT).
