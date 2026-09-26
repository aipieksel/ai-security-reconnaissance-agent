import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { install, files, root } from '../scripts/setup.mjs';
import yaml from 'js-yaml';

async function withHome(fn) {
  const home = await mkdtemp(join(tmpdir(), 'ai-security-reconnaissance-agent-test-'));
  try { await fn(home); } finally { await rm(home, { recursive: true, force: true }); }
}
test('install preserves both source files and is repeatable', () => withHome(async home => {
  const target = await install(home);
  await install(home);
  for (const file of files) assert.deepEqual(await readFile(join(target, file)), await readFile(join(root, 'presets/ai-security-reconnaissance-agent', file)));
}));
test('edited preset survives a rejected reinstall', () => withHome(async home => {
  const target = await install(home);
  await writeFile(join(target, 'agent.cordis.yml'), 'user changes\n');
  await assert.rejects(install(home), /differs/);
  assert.equal(await readFile(join(target, 'agent.cordis.yml'), 'utf8'), 'user changes\n');
}));
test('preset symlinks cannot overwrite another file', () => withHome(async home => {
  const target = await install(home);
  await rm(join(target, 'preset.yml'));
  await symlink(join(root, 'presets/ai-security-reconnaissance-agent/preset.yml'), join(target, 'preset.yml'));
  await assert.rejects(install(home), /link or non-file/);
}));
test('Cordis YAML exposes the configured persona and both tool groups', async () => {
  // Parse the trusted expression as text; only Harness evaluates !!js.
  const schema = yaml.DEFAULT_SCHEMA.extend([new yaml.Type('tag:yaml.org,2002:js', {kind: 'scalar', construct: value => value})]);
  const rows = yaml.load(await readFile(join(root, 'presets/ai-security-reconnaissance-agent/agent.cordis.yml'), 'utf8'), {schema});
  assert.match(rows[0].config.text, /Zero-Exploitation/);
  assert.deepEqual(rows.map(row => row.id), ['persona', 'persistent-shell', 'filesystem']);
  assert.equal(rows[2].config[0].config.cwd, 'process.env.DSH_CWD ?? process.cwd()');
});
