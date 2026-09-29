import { readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = 'iFurySt/open-codex-computer-use';
const files = {
  'official-skill.md': 'SKILL.md',
  'installation.md': 'references/installation.md',
  'usage.md': 'references/usage.md',
  'troubleshooting.md': 'references/troubleshooting.md',
};
const json = value => JSON.stringify(value, null, 2) + '\n';

async function get(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': 'open-computer-use-plugin-sync' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

async function atomicWrite(path, content) {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, content);
  await rename(temp, path);
}

export async function syncUpstream({ directory = root, fetchImpl = fetch } = {}) {
  // Resolve one revision first: all four documents and their provenance must
  // refer to the same commit even if upstream moves during the download.
  const commit = await (await get(`https://api.github.com/repos/${repo}/commits/main`, fetchImpl)).json();
  if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('Invalid upstream commit');
  const latest = await (await get('https://registry.npmjs.org/open-computer-use/latest', fetchImpl)).json();
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(latest.version)) throw new Error('Invalid npm version');
  const base = `https://raw.githubusercontent.com/${repo}/${commit.sha}/skills/open-computer-use`;
  const docs = await Promise.all(Object.entries(files).map(async ([name, source]) => {
    const body = (await (await get(`${base}/${source}`, fetchImpl)).text()).replace(/\r\n/g, '\n');
    if (!body.trim() || /^\s*<(?:!doctype|html)/i.test(body)) throw new Error(`Invalid document: ${source}`);
    return [name, body];
  }));
  const pluginRoot = join(directory, 'open-computer-use');
  const referenceRoot = join(pluginRoot, 'skills/open-computer-use/references/upstream');
  const updates = new Map();
  for (const [name, body] of docs) {
    const path = join(referenceRoot, name);
    if ((await readFile(path, 'utf8')).replace(/\r\n/g, '\n') !== body) updates.set(path, body);
  }
  // An unrelated upstream commit or a timestamp alone is not a new release.
  if (updates.size) updates.set(join(referenceRoot, 'SOURCE.json'), json({
    repo, ref: 'main', commit: commit.sha,
    files: Object.values(files).map(name => `${base}/${name}`),
  }));
  const runtimePath = join(pluginRoot, 'upstream.json');
  const runtime = { package: 'open-computer-use', version: latest.version };
  const previousRuntime = JSON.parse(await readFile(runtimePath, 'utf8'));
  if (previousRuntime.package !== runtime.package || previousRuntime.version !== runtime.version) {
    updates.set(runtimePath, json(runtime));
  }
  if (!updates.size) return { changed: false };

  const manifests = [];
  for (const host of ['claude', 'grok']) {
    for (const [path, marketplace] of [
      [join(pluginRoot, `.${host}-plugin/plugin.json`), false],
      [join(directory, `.${host}-plugin/marketplace.json`), true],
    ]) {
      const data = JSON.parse(await readFile(path, 'utf8'));
      const entry = marketplace ? data.plugins.find(p => p.name === 'open-computer-use') : data;
      if (!entry || !/^\d+\.\d+\.\d+$/.test(entry.version)) throw new Error(`Invalid plugin version: ${path}`);
      manifests.push({ path, data, entry });
    }
  }
  if (new Set(manifests.map(m => m.entry.version)).size !== 1) throw new Error('Manifest versions disagree');
  const [major, minor, patch] = manifests[0].entry.version.split('.').map(Number);
  const version = `${major}.${minor}.${patch + 1}`;
  for (const manifest of manifests) {
    manifest.entry.version = version;
    updates.set(manifest.path, json(manifest.data));
  }
  // All network responses and manifests are validated before touching files.
  for (const [path, content] of updates) await atomicWrite(path, content);
  return { changed: true, version, runtime: latest.version, commit: commit.sha };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await syncUpstream())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
