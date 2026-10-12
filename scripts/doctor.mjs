import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root } from './setup.mjs';
const [major, minor] = process.versions.node.split('.').map(Number);
let failed = false;
function check(name, ok, detail) {
  console.log(`${ok ? 'OK' : 'MISSING'} ${name}${detail ? ': ' + detail : ''}`);
  if (!ok) failed = true;
}
check('Node.js', (major === 22 && minor >= 19) || major >= 24, process.versions.node);
check('platform', ['darwin', 'linux'].includes(process.platform), process.platform);
for (const tool of ['bash', 'curl', 'wget', 'nc', 'dig', 'nslookup', 'whois', 'jq']) {
  check(tool, spawnSync('sh', ['-c', 'command -v "$1" >/dev/null', 'doctor', tool]).status === 0);
}
try {
  const runtime = JSON.parse(readFileSync(join(root, 'node_modules/@deepseek-ai/dsh/package.json')));
  check('DeepSeek Harness', runtime.version === '0.1.1-rc.2', runtime.version);
} catch { check('DeepSeek Harness', false, 'run pnpm install --frozen-lockfile --ignore-scripts'); }
console.log('Provider credentials are not inspected. Configure a model in the local Web UI before a real mission.');
process.exitCode = failed ? 1 : 0;
