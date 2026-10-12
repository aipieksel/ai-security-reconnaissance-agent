import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import yaml from 'js-yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const EXPLOIT_MARKERS = [
  '<?php system(',
  'wget http',
  '/etc/passwd',
  'union select',
  '<script>alert',
  'cmd.exe',
  '/bin/bash -i',
  'metasploit',
  'reverse shell',
  'exploit-db',
  'msfvenom',
  'sqlmap',
  'hydra -L',
  'nmap -sV --script vuln',
];

const LOCKED_PACKS = ['core', 'wordpress', 'api', 'documents', 'osint'];

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

function runNode(args, env = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (b) => { stdout += b; });
    child.stderr.on('data', (b) => { stderr += b; });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolvePromise({ code: 124, stdout, stderr });
    }, 60000);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

test('lab www tree and server script exist', async () => {
  assert.equal(await exists(join(root, 'lab/www/index.html')), true);
  assert.equal(await exists(join(root, 'lab/www/readme.html')), true);
  assert.equal(await exists(join(root, 'lab/www/xmlrpc.php')), true);
  assert.equal(await exists(join(root, 'lab/www/wp-json/index.json')), true);
  assert.equal(await exists(join(root, 'lab/www/phpinfo-stub.html')), true);
  assert.equal(await exists(join(root, 'lab/www/openapi.json')), true);
  assert.equal(await exists(join(root, 'lab/www/actuator/health')), true);
  assert.equal(await exists(join(root, 'lab/www/documents/notes.txt')), true);
  assert.equal(await exists(join(root, 'lab/www/dot-git/HEAD')), true);
  assert.equal(await exists(join(root, 'scripts/lab-server.mjs')), true);
  assert.equal(await exists(join(root, 'scripts/fixture-dry-run.mjs')), true);
  assert.equal(await exists(join(root, 'scripts/mission-packs.mjs')), true);
  assert.equal(await exists(join(root, 'packs/registry.json')), true);
  const gitDir = join(root, 'lab/www/dot-git');
  const entries = await readdir(gitDir);
  assert.deepEqual(entries, ['HEAD']);
});

test('lab-server.mjs binds 127.0.0.1 only (source check)', async () => {
  const src = await readFile(join(root, 'scripts/lab-server.mjs'), 'utf8');
  assert.match(src, /HOST\s*=\s*['"]127\.0\.0\.1['"]/);
  assert.match(src, /listen\(\s*PORT\s*,\s*HOST/);
  assert.doesNotMatch(src, /listen\([^)]*0\.0\.0\.0/);
  assert.doesNotMatch(src, /HOST\s*=\s*['"]0\.0\.0\.0['"]/);
});

test('pack registry lists locked Core/WordPress/API/Documents and PHP under Core', async () => {
  const registry = JSON.parse(await readFile(join(root, 'packs/registry.json'), 'utf8'));
  assert.deepEqual(registry.packs.map((p) => p.id), LOCKED_PACKS);
  const core = registry.packs.find((p) => p.id === 'core');
  assert.ok(core.probes.some((pr) => pr.surface === 'PHP'));
  assert.ok(core.reportSections.some((s) => /PHP/i.test(s)));
  assert.equal(registry.packs.some((p) => p.id === 'php'), false);
  // OSINT is the passive, file-based 5th pack: no HTTP probes.
  const osint = registry.packs.find((p) => p.id === 'osint');
  assert.ok(osint, 'osint pack must be registered');
  assert.deepEqual(osint.probes, [], 'osint pack must have no HTTP probes (file-based)');
  assert.ok(osint.reportSections.some((sct) => /OSINT/i.test(sct)));
  assert.equal(osint.default, true);
});

test('persona covers mission packs, Zero-Exploitation, PHP under Core', async () => {
  const schema = yaml.DEFAULT_SCHEMA.extend([
    new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: (v) => v }),
  ]);
  const rows = yaml.load(
    await readFile(join(root, 'presets/ai-security-reconnaissance-agent/agent.cordis.yml'), 'utf8'),
    { schema }
  );
  const text = rows[0].config.text;
  assert.match(text, /Zero-Exploitation/);
  assert.match(text, /Mission packs/);
  assert.match(text, /Pack: Core/);
  assert.match(text, /Pack: WordPress/);
  assert.match(text, /Pack: API/);
  assert.match(text, /Pack: Documents/);
  assert.match(text, /Pack: OSINT/);
  assert.match(text, /PHP \/ stack signals belong here/);
  assert.match(text, /\.git\/HEAD/);
});

test('no exploit payload markers in persona, packs, and scripts', async () => {
  const files = [
    'presets/ai-security-reconnaissance-agent/agent.cordis.yml',
    'scripts/lab-server.mjs',
    'scripts/fixture-dry-run.mjs',
    'scripts/mission-packs.mjs',
    'packs/registry.json',
    'packs/osint.md',
  ];
  // Also scan every OSINT fixture file (synthetic; fake secrets only).
  const osintDir = join(root, 'lab/osint');
  for (const f of await readdir(osintDir)) files.push(join('lab/osint', f));
  for (const rel of files) {
    const body = (await readFile(join(root, rel), 'utf8')).toLowerCase();
    for (const marker of EXPLOIT_MARKERS) {
      assert.equal(body.includes(marker.toLowerCase()), false, `${rel} must not contain ${marker}`);
    }
  }
});

test('fixture dry-run --all produces report with WP, PHP, API, Documents', async () => {
  const port = 18765;
  const out = join(root, 'lab/out/test-dry-run-all');
  await rm(out, { recursive: true, force: true });
  const { code, stdout, stderr } = await runNode(
    [join(root, 'scripts/fixture-dry-run.mjs'), '--all'],
    { LAB_PORT: String(port), FIXTURE_OUT: out, FIXTURE_RATE_MS: '15' }
  );
  assert.equal(code, 0, `exit ${code}\nstdout=${stdout}\nstderr=${stderr}`);
  const report = await readFile(join(out, 'RECON_REPORT.md'), 'utf8');
  assert.match(report, /## Core surface/);
  assert.match(report, /PHP \/ stack \(under Core\)/);
  assert.match(report, /## WordPress surface/);
  assert.match(report, /## APIs surface/);
  assert.match(report, /## Documents surface/);
  assert.match(report, /## OSINT surface \(passive/);
  assert.match(report, /OSINT — Certificate Transparency/);
  assert.match(report, /artifacts\/wp-json\.json|artifacts\/openapi\.json/);
  assert.match(report, /artifacts\/git-HEAD\.txt/);
  assert.match(report, /artifacts\/crtsh\.json/);
  assert.match(report, /all packs/i);
  const scope = JSON.parse(await readFile(join(out, 'mission-packs.json'), 'utf8'));
  assert.deepEqual(scope.selected, LOCKED_PACKS);
});

test('fixture dry-run --packs wordpress,api is a selected subset', async () => {
  const port = 18766;
  const out = join(root, 'lab/out/test-dry-run-subset');
  await rm(out, { recursive: true, force: true });
  const { code, stdout, stderr } = await runNode(
    [join(root, 'scripts/fixture-dry-run.mjs'), '--packs', 'wordpress,api'],
    { LAB_PORT: String(port), FIXTURE_OUT: out, FIXTURE_RATE_MS: '15' }
  );
  assert.equal(code, 0, `exit ${code}\nstdout=${stdout}\nstderr=${stderr}`);
  const report = await readFile(join(out, 'RECON_REPORT.md'), 'utf8');
  assert.match(report, /## WordPress surface/);
  assert.match(report, /## APIs surface/);
  assert.match(report, /selected subset/i);
  assert.doesNotMatch(report, /## Documents surface/);
  assert.doesNotMatch(report, /## Core surface/);
  const scope = JSON.parse(await readFile(join(out, 'mission-packs.json'), 'utf8'));
  assert.deepEqual(scope.selected, ['wordpress', 'api']);
});

test('fixture-dry-run source: liveOsint defaults false, parses --live-osint, refuses hostafrica', async () => {
  const src = await readFile(join(root, 'scripts/fixture-dry-run.mjs'), 'utf8');
  assert.match(src, /liveOsint:\s*false/, 'liveOsint must default to false');
  assert.match(src, /--live-osint/, 'must parse --live-osint flag');
  assert.match(src, /\/hostafrica\/i/, 'must guard against /hostafrica/i');
  assert.match(src, /assertNoHostAfrica/, 'must call the HostAfrica guard');
});

test('lab/osint fixtures exist (synthetic, example.com only)', async () => {
  const dir = join(root, 'lab/osint');
  for (const f of [
    'dork-serp.json',
    'crtsh.json',
    'doh.json',
    'wayback-cdx.json',
    'github-code-hits.json',
    'bff-map.json',
    'app.bundle.js',
    'README.md',
  ]) {
    assert.equal(await exists(join(dir, f)), true, `missing fixture ${f}`);
  }
  // Fake secrets only; never a believable live credential.
  const leaks = await readFile(join(dir, 'github-code-hits.json'), 'utf8');
  assert.match(leaks, /fixture-not-real/);
});

test('fixture dry-run --packs osint writes OSINT sections + artifacts (no live traffic)', async () => {
  const port = 18767; // unused: osint pack starts no server
  const out = join(root, 'lab/out/test-dry-run-osint');
  await rm(out, { recursive: true, force: true });
  const { code, stdout, stderr } = await runNode(
    [join(root, 'scripts/fixture-dry-run.mjs'), '--packs', 'osint'],
    { LAB_PORT: String(port), FIXTURE_OUT: out, FIXTURE_RATE_MS: '15' }
  );
  assert.equal(code, 0, `exit ${code}\nstdout=${stdout}\nstderr=${stderr}`);
  const report = await readFile(join(out, 'RECON_REPORT.md'), 'utf8');
  assert.match(report, /## OSINT surface \(passive/);
  assert.match(report, /OSINT — Search dorks/);
  assert.match(report, /OSINT — Certificate Transparency/);
  assert.match(report, /OSINT — DNS \/ subdomains/);
  assert.match(report, /OSINT — Archives/);
  assert.match(report, /OSINT — Leak hunting/);
  assert.match(report, /OSINT — BFF \/ edge map/);
  assert.match(report, /report-don't-auth/);
  assert.match(report, /--live-osint off/);
  // The report may reference the HostAfrica *policy* (active hold), but must state
  // the passive/no-live-traffic posture rather than any live HostAfrica probe.
  assert.match(report, /no live HostAfrica/i);
  assert.doesNotMatch(report, /HTTP \d+.*hostafrica/i);
  // fixtures copied into artifacts
  assert.equal(await exists(join(out, 'artifacts/crtsh.json')), true);
  assert.equal(await exists(join(out, 'artifacts/app.bundle.js')), true);
  const scope = JSON.parse(await readFile(join(out, 'mission-packs.json'), 'utf8'));
  assert.deepEqual(scope.selected, ['osint']);
});

test('fixture dry-run refuses a hostafrica OSINT apex', async () => {
  const out = join(root, 'lab/out/test-dry-run-osint-refuse');
  await rm(out, { recursive: true, force: true });
  const { code, stdout, stderr } = await runNode(
    [join(root, 'scripts/fixture-dry-run.mjs'), '--packs', 'osint', '--osint-apex', 'panel.hostafrica.com'],
    { LAB_PORT: '18768', FIXTURE_OUT: out, FIXTURE_RATE_MS: '15' }
  );
  assert.notEqual(code, 0, 'must refuse a hostafrica target');
  assert.match(stdout + stderr, /hostafrica/i);
});
