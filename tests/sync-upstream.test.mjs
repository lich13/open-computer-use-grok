import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncUpstream } from '../scripts/sync-upstream.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const commit = 'a'.repeat(40);
const docs = 'open-computer-use/skills/open-computer-use/references/upstream';
const readJSON = async path => JSON.parse(await readFile(path, 'utf8'));

async function fixture(t, { changedDoc, version, fail } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'ocu-plugin-'));
  t.after(() => rm(directory, { recursive: true }));
  for (const path of ['open-computer-use', '.claude-plugin', '.grok-plugin']) {
    await cp(join(root, path), join(directory, path), { recursive: true });
  }
  const runtime = await readJSON(join(directory, 'open-computer-use/upstream.json'));
  const urls = [];
  const fetchImpl = async url => {
    urls.push(url);
    if (url.includes('/commits/main')) return Response.json({ sha: commit });
    if (url.includes('registry.npmjs.org')) return Response.json({ version: version || runtime.version });
    assert.ok(url.includes(`/${commit}/`), 'document URLs must be pinned to the resolved SHA');
    const name = url.endsWith('/SKILL.md') ? 'official-skill.md' : url.split('/').at(-1);
    if (name === fail) return new Response('network failure', { status: 503 });
    const body = await readFile(join(directory, docs, name), 'utf8');
    return new Response(body + (name === changedDoc ? '\nUpstream changed this document.\n' : ''));
  };
  return { directory, fetchImpl, urls };
}

async function snapshot(root, prefix = '') {
  const result = {};
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await snapshot(root, path));
    else result[path] = await readFile(join(root, path), 'utf8');
  }
  return result;
}

test('unchanged docs and npm version leave all bytes unchanged, even at a new upstream SHA', async t => {
  const context = await fixture(t);
  const before = await snapshot(context.directory);
  assert.deepEqual(await syncUpstream(context), { changed: false });
  assert.deepEqual(await snapshot(context.directory), before);
});

test('a docs update bumps all four manifests once and records one immutable upstream revision', async t => {
  const context = await fixture(t, { changedDoc: 'usage.md' });
  const original = await readJSON(join(context.directory, 'open-computer-use/.claude-plugin/plugin.json'));
  const [a, b, c] = original.version.split('.').map(Number);
  const result = await syncUpstream(context);
  assert.equal(result.version, `${a}.${b}.${c + 1}`);
  for (const host of ['claude', 'grok']) {
    const plugin = await readJSON(join(context.directory, `open-computer-use/.${host}-plugin/plugin.json`));
    const marketplace = await readJSON(join(context.directory, `.${host}-plugin/marketplace.json`));
    assert.equal(plugin.version, result.version);
    assert.equal(marketplace.plugins[0].version, result.version);
  }
  const source = await readJSON(join(context.directory, docs, 'SOURCE.json'));
  assert.equal(source.commit, commit);
  assert.ok(source.files.every(url => url.includes(commit)));
  assert.equal(source.syncedAtUnix, undefined);
  // Fetch the now-current docs unchanged; a repeated sync must be a no-op.
  const fetchImpl = async url => url.includes('raw.githubusercontent.com')
    ? new Response(await readFile(join(context.directory, docs, url.endsWith('/SKILL.md') ? 'official-skill.md' : url.split('/').at(-1)), 'utf8'))
    : context.fetchImpl(url);
  assert.deepEqual(await syncUpstream({ ...context, fetchImpl }), { changed: false });
});

test('a new npm version releases the plugin independently of the runtime version', async t => {
  const context = await fixture(t, { version: '91.2.3' });
  const result = await syncUpstream(context);
  assert.equal(result.changed, true);
  assert.notEqual(result.version, '91.2.3');
  assert.equal((await readJSON(join(context.directory, 'open-computer-use/upstream.json'))).version, '91.2.3');
});

test('a partial upstream download failure preserves every installed source file and version', async t => {
  const context = await fixture(t, { changedDoc: 'usage.md', version: '91.2.3', fail: 'troubleshooting.md' });
  const before = await snapshot(context.directory);
  await assert.rejects(syncUpstream(context), /HTTP 503/);
  assert.deepEqual(await snapshot(context.directory), before);
});

test('malformed npm metadata is rejected before writing', async t => {
  const context = await fixture(t, { version: 'not-a-version' });
  const before = await snapshot(context.directory);
  await assert.rejects(syncUpstream(context), /Invalid npm version/);
  assert.deepEqual(await snapshot(context.directory), before);
});
