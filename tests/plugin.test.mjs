import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { turnEnded } from '../open-computer-use/scripts/turn-ended.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));

test('both hosts discover the same version, MCP and executable hooks', async () => {
  const versions = new Set();
  for (const host of ['claude', 'grok']) {
    const market = await readJSON(join(root, `.${host}-plugin/marketplace.json`));
    assert.equal(market.name, 'open-computer-use-grok');
    const entry = market.plugins.find(p => p.name === 'open-computer-use');
    const pluginRoot = join(root, entry.source);
    const manifest = await readJSON(join(pluginRoot, `.${host}-plugin/plugin.json`));
    assert.equal(entry.version, manifest.version);
    versions.add(manifest.version);
    assert.equal(manifest.name, entry.name);
    const hooks = (await readJSON(join(pluginRoot, manifest.hooks))).hooks;
    for (const event of ['Stop', 'StopFailure', 'SubagentStop', 'SessionEnd']) assert.ok(hooks[event]);
    assert.equal(Boolean(hooks.StopCancelled), host === 'grok');
    assert.equal(hooks.SessionStart, undefined, 'do not mutate installed files at startup');
    for (const groups of Object.values(hooks)) {
      for (const group of groups) for (const hook of group.hooks) {
        assert.equal(hook.type, 'command');
        const expectedRoot = host === 'claude' ? 'CLAUDE_PLUGIN_ROOT' : 'GROK_PLUGIN_ROOT';
        assert.ok(hook.command.includes(`"\${${expectedRoot}}/`));
        const match = hook.command.match(/\/scripts\/([^"\s]+)/);
        assert.ok(match);
        await access(join(pluginRoot, 'scripts', match[1]));
      }
    }
    const mcp = await readJSON(join(pluginRoot, '.mcp.json'));
    assert.equal(mcp.mcpServers['open-computer-use'].command, 'npx');
    assert.deepEqual(mcp.mcpServers['open-computer-use'].args, ['-y', 'open-computer-use@latest', 'mcp']);
  }
  assert.equal(versions.size, 1);
});

test('turn end never downloads, writes protocol output or blocks on a missing runtime', () => {
  for (const platform of ['darwin', 'linux', 'win32']) {
    let call;
    assert.doesNotThrow(() => turnEnded((command, args, options) => {
      call = { command, args, options };
      return { status: 1, error: new Error('runtime unavailable') };
    }, platform));
    assert.ok(call);
    assert.equal(call.command, platform === 'win32' ? 'npx.cmd' : 'npx');
    assert.ok(call.args.includes('--offline'));
    assert.deepEqual(call.args.slice(-2), ['open-computer-use@latest', 'turn-ended']);
    assert.equal(call.options.stdio, 'ignore');
    assert.ok(call.options.timeout < 5000);
    assert.equal(call.options.shell, platform === 'win32');
  }
  assert.doesNotThrow(() => turnEnded(() => { throw new Error('spawn failed'); }));
});
