import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { install, root } from './setup.mjs';

const temporary = await mkdtemp(join(tmpdir(), 'ai-security-reconnaissance-agent-smoke-'));
const workspace = join(temporary, 'workspace');
const home = join(temporary, 'state');
await mkdir(workspace);
await install(home);
const captured = [];
let fixtureRequests = 0;
let scriptStep = 0;
const report = '# Local fixture reconnaissance\n\nHTTP fixture observed; no external target contacted.\n';
const fixture = createServer((request, response) => {
  fixtureRequests++;
  response.writeHead(200, {'content-type': 'text/plain', 'x-ai-security-reconnaissance-agent-fixture': 'local-only'});
  response.end('AI Security Reconnaissance Agent local fixture\n');
});
fixture.listen(0, '127.0.0.1');
await once(fixture, 'listening');
const fixtureUrl = `http://127.0.0.1:${fixture.address().port}/`;
const provider = createServer(async (request, response) => {
  try {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw);
    captured.push(body);
    response.writeHead(200, {'content-type': 'text/event-stream'});
    let delta;
    let finish = 'stop';
    if (body.tools?.some(tool => tool.function?.name === 'bash')) {
      const commands = [
        {name: 'bash', arguments: JSON.stringify({command: `export RECON_SMOKE_MARKER=retained; curl --fail --silent --show-error --max-time 5 -D headers.txt '${fixtureUrl}' -o body.txt`})},
        {name: 'bash', arguments: JSON.stringify({command: 'test "$RECON_SMOKE_MARKER" = retained && cat headers.txt body.txt'})},
        {name: 'str_replace_editor', arguments: JSON.stringify({command: 'create', path: join(workspace, 'RECON_REPORT.md'), file_text: report})},
      ];
      const command = commands[scriptStep++];
      if (command) {
        delta = {tool_calls: [{index: 0, id: `local-call-${scriptStep}`, type: 'function', function: command}]};
        finish = 'tool_calls';
      } else { delta = {content: 'RECON_LOCAL_SMOKE_COMPLETE'}; }
    } else { delta = {content: 'Local fixture reconnaissance'}; }
    response.end([
      `data: ${JSON.stringify({choices: [{index: 0, delta}]})}`,
      `data: ${JSON.stringify({choices: [{index: 0, delta: {}, finish_reason: finish}], usage: {prompt_tokens: 10, completion_tokens: 10}})}`,
      'data: [DONE]', '',
    ].join('\n\n'));
  } catch (error) { response.destroy(error); }
});
provider.listen(0, '127.0.0.1');
await once(provider, 'listening');
// A minimal environment prevents inherited real credentials or provider routes.
const env = Object.fromEntries(['PATH', 'SystemRoot', 'TMPDIR'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
Object.assign(env, {
  HOME: temporary, DSH_HOME: home, DSH_CWD: workspace,
  DEEPSEEK_API_KEY: 'local-fixture-placeholder',
  DEEPSEEK_BASE_URL: `http://127.0.0.1:${provider.address().port}`,
  DSH_PERMISSION_MODE: 'danger-full-access',
});
// Full access is restricted to this scripted local fixture process, never the launcher.
const child = spawn(process.execPath, [join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), 'web', '--no-open', '--host', '127.0.0.1', '--port', '0'], {cwd: workspace, env, stdio: ['ignore', 'pipe', 'pipe']});
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
const childExit = once(child, 'exit');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, timeout = 60000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result;
    if (child.exitCode !== null) throw new Error(`Harness exited while waiting for ${label}:\n${output.slice(-6000)}`);
    await delay(200);
  }
  throw new Error(`Timed out waiting for ${label}:\n${output.slice(-6000)}`);
}
try {
  const baseUrl = await until(() => output.match(/dsh web:\s+(http:\/\/127\.0\.0\.1:\d+)/)?.[1], 'server URL');
  assert.equal((await fetch(baseUrl)).status, 200);
  async function rpc(method, payload) {
    const response = await fetch(`${baseUrl}/api/${method}`, {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({type: 'client-request', rpcId: crypto.randomUUID(), method, payload}),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, method);
    const body = await response.json();
    assert.equal(body.result.ok, true, `${method}: ${JSON.stringify(body.result)}`);
    return body.result.value;
  }
  const roster = await rpc('agentPreset.list', {});
  const preset = roster.presets.find(item => item.id === 'ai-security-reconnaissance-agent');
  assert.ok(preset, 'AI Security Reconnaissance Agent is discovered');
  assert.equal(preset.broken, undefined);
  assert.equal(preset.name, 'AI Security Reconnaissance Agent');
  assert.match(preset.description, /DeepSeek Harness preset/);
  const session = await rpc('session.create', {cwd: workspace, agentPreset: 'ai-security-reconnaissance-agent'});
  assert.equal(session.agentPreset, 'ai-security-reconnaissance-agent');
  await rpc('session.prompt', {sessionId: session.sessionId, mode: 'queue', content: [{type: 'text', text: `Local fixture mission: ${fixtureUrl}. Read the fixture, confirm shell persistence, and write RECON_REPORT.md. No external requests.`}]});
  await until(async () => {
    const history = await rpc('session.history', {sessionId: session.sessionId, maxMessages: 30});
    return JSON.stringify(history).includes('RECON_LOCAL_SMOKE_COMPLETE');
  }, 'fixture mission completion');
  assert.equal(await readFile(join(workspace, 'RECON_REPORT.md'), 'utf8'), report);
  assert.match(await readFile(join(workspace, 'headers.txt'), 'utf8'), /x-ai-security-reconnaissance-agent-fixture: local-only/i);
  assert.equal(await readFile(join(workspace, 'body.txt'), 'utf8'), 'AI Security Reconnaissance Agent local fixture\n');
  assert.equal(fixtureRequests, 1);
  const main = captured.find(body => body.tools?.some(tool => tool.function?.name === 'bash'));
  assert.ok(main.messages.some(message => message.role === 'system' && message.content.includes('AI Security Reconnaissance Agent') && message.content.includes('Zero-Exploitation')));
  assert.deepEqual(main.tools.map(tool => tool.function.name).sort(), ['bash', 'str_replace_editor']);
  const toolResults = captured.flatMap(body => body.messages || []).filter(message => message.role === 'tool');
  assert.ok(toolResults.some(message => String(message.content).includes('x-ai-security-reconnaissance-agent-fixture: local-only')));
  assert.ok(toolResults.every(message => !String(message.content).includes('[exit code:')));
  console.log('PASS: pinned Web runtime, preset discovery/mount, configured persona, Bash HTTP fixture, persistent shell, editor report, and completed session. No real model or external target used.');
} finally {
  child.kill('SIGTERM');
  const killer = setTimeout(() => child.kill('SIGKILL'), 5000);
  await childExit;
  clearTimeout(killer);
  provider.closeAllConnections(); fixture.closeAllConnections();
  await Promise.all([new Promise(resolve => provider.close(resolve)), new Promise(resolve => fixture.close(resolve))]);
  await rm(temporary, {recursive: true, force: true});
}
