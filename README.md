# Open Computer Use for Claude Code and Grok Build

通过官方 [open-computer-use](https://github.com/iFurySt/open-codex-computer-use) MCP 控制原生桌面 App。两端共用运行时和 Skill，分别加载兼容的回合结束 hook。

## 安装

需要 Node.js 22+。macOS 需要 14+；Linux / Windows 的桌面依赖见[官方安装说明](open-computer-use/skills/open-computer-use/references/upstream/installation.md)。

### Claude Code

```bash
claude plugin marketplace add lich13/open-computer-use-grok
claude plugin install open-computer-use@open-computer-use-grok
```

在 `/plugin` → Marketplaces → `open-computer-use-grok` 开启 **Enable auto-update**。也可以在 `~/.claude/settings.json` 合并以下字段：

```json
{
  "extraKnownMarketplaces": {
    "open-computer-use-grok": {
      "source": { "source": "github", "repo": "lich13/open-computer-use-grok" },
      "autoUpdate": true
    }
  }
}
```

如果已设置 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`、`DISABLE_AUTOUPDATER=1` 或 `DISABLE_UPDATES=1`，还需在 settings 的 `env` 中设置 `"FORCE_AUTOUPDATE_PLUGINS": "1"`，才能单独允许插件更新。

### Grok Build

```bash
grok plugin marketplace add lich13/open-computer-use-grok
grok plugin install open-computer-use --trust
grok plugin enable open-computer-use
```

Grok 默认在会话启动时更新插件。若全局或组织策略设置了 `plugin_auto_update=false`，需先解除该限制；Claude 导入设置里的 marketplace `autoUpdate:false` 也会关闭 Grok 的全局插件自动更新。

### macOS 权限

```bash
npx -y open-computer-use@latest doctor
```

按系统提示授予 **Accessibility** 和 **Screen Recording**，再启动新会话。可以让 Claude 或 Grok“用 Open Computer Use 查看 TextEdit 窗口”。网页任务使用浏览器工具。

## 自动更新

| 内容 | 更新方式 |
|---|---|
| 官方运行时 | 每次 MCP 启动通过 `npx -y open-computer-use@latest mcp` 解析 npm 最新版 |
| 官方 Skill / 文档 | GitHub Actions 每 6 小时检查；从同一个上游 commit 获取，内容未变则不提交 |
| 插件与 hooks | 文档或 npm 版本变化时自动递增插件补丁版本，并同步两端清单；本机由各自的 marketplace 更新器安装 |

更新不改动正在运行的 MCP。Claude 可运行 `/reload-plugins`，或两端启动新会话以使用新版。网络不可用时，上游同步失败会保留仓库中已有文档；首次下载运行时需要网络。

手动更新：

```bash
claude plugin marketplace update open-computer-use-grok
claude plugin update open-computer-use@open-computer-use-grok
grok plugin update open-computer-use
```

Claude 的后台更新在交互会话第一次发言后延迟运行，最长约 10 分钟；`--print` 不触发这轮后台更新。详见[官方更新规则](https://code.claude.com/docs/en/plugins/loading#when-auto-update-runs)。

## 开发

```bash
node --test
claude plugin validate .
claude plugin validate open-computer-use
grok plugin validate open-computer-use
node scripts/sync-upstream.mjs
```

修改插件时递增两个 `plugin.json` 和两个 `marketplace.json` 的版本；版本独立于 npm 运行时。测试会检查两端清单、hooks 和版本一致性。

## License

MIT。运行时来自 [iFurySt/open-codex-computer-use](https://github.com/iFurySt/open-codex-computer-use)，本仓库不 fork 原生运行时，与 Anthropic / xAI / 上游作者无官方从属关系。
