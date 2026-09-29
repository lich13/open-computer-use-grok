import { spawnSync } from 'node:child_process';

// Use the same npx package spec as the MCP server. Never fetch packages or
// block a completed turn when the runtime has not been downloaded yet.
export function turnEnded(run = spawnSync, platform = process.platform) {
  try {
    run(platform === 'win32' ? 'npx.cmd' : 'npx',
      ['--offline', '--yes', 'open-computer-use@latest', 'turn-ended'], {
        stdio: 'ignore', timeout: 3500,
        shell: platform === 'win32',
        windowsHide: true,
        env: { ...process.env, NPM_CONFIG_UPDATE_NOTIFIER: 'false' },
      });
  } catch {
    // Stop hooks must not reopen a completed turn or prevent session exit.
  }
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) turnEnded();
