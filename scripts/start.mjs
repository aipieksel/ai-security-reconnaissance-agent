import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { install, stateHome, root } from './setup.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: pnpm start [--port 3080]\nRECON_HOME sets private state; RECON_WORKSPACE sets mission output.');
  process.exit(0);
}
if (args.length && (args.length !== 2 || args[0] !== '--port' || !/^\d+$/.test(args[1]) || +args[1] < 1024 || +args[1] > 65535)) {
  console.error('Expected --port followed by a port from 1024 to 65535.');
  process.exit(1);
}
const home = stateHome();
const workspace = resolve(process.env.RECON_WORKSPACE || join(root, 'missions'));
await install(home);
await mkdir(workspace, { recursive: true, mode: 0o700 });
const child = spawn(process.execPath, [join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), 'web', '--host', '127.0.0.1', '--port', args[1] || '3080', '--no-open'], {
  cwd: workspace, stdio: 'inherit', env: { ...process.env, DSH_HOME: home, DSH_CWD: workspace },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1); });
