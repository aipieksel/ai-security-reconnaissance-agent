#!/usr/bin/env node
/**
 * Phase A fixture dry-run: start (or reuse) loopback lab, discovery-only crawl
 * for selected mission packs, write artifacts + RECON_REPORT.md.
 *
 * The OSINT pack is passive/file-based: it has no HTTP probes. Its fixtures live
 * under lab/osint/ and are copied into artifacts/ and rendered into report
 * sections. Optional live public-aggregator adapters are gated behind
 * --live-osint and default OFF, so tests stay offline and deterministic.
 *
 * Usage:
 *   node scripts/fixture-dry-run.mjs --all
 *   node scripts/fixture-dry-run.mjs --packs core,wordpress
 *   node scripts/fixture-dry-run.mjs --packs osint                 # fixtures only
 *   node scripts/fixture-dry-run.mjs --packs osint --live-osint    # opt-in adapters (never HostAfrica)
 *   node scripts/fixture-dry-run.mjs --packs api --out missions/fixture-lab-api
 *
 * No exploit payloads. Rate-limited. Loopback (127.0.0.1) for active packs.
 * Passive OSINT sends NO live HostAfrica (or other production) traffic and hard-
 * refuses any target hostname matching /hostafrica/i.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, copyFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REGISTRY_PATH = join(ROOT, 'packs/registry.json');
const PORT = Number(process.env.LAB_PORT || 8765);
const BASE = `http://127.0.0.1:${PORT}`;
const RATE_MS = Number(process.env.FIXTURE_RATE_MS || 150);
const OSINT_FIXTURE_DIR = join(ROOT, 'lab/osint');

// Hard stop: this mission must never target HostAfrica (or any host matching it)
// unless a future Phase B scope file approved by the operator explicitly unlocks it.
const HOSTAFRICA_RE = /hostafrica/i;

function assertNoHostAfrica(targets) {
  for (const t of targets) {
    if (t && HOSTAFRICA_RE.test(String(t))) {
      throw new Error(
        `Refusing to run: target "${t}" matches /hostafrica/i. Active HostAfrica work is on hold ` +
          `until written expand from security@hostafrica.com. This pack is passive/loopback only.`
      );
    }
  }
}

function parseArgs(argv) {
  const opts = {
    startServer: true,
    keepServer: false,
    all: false,
    packs: null,
    liveOsint: false,
    osintApex: process.env.OSINT_APEX || 'example.com',
    out: resolve(ROOT, process.env.FIXTURE_OUT || 'missions/fixture-lab'),
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-start') opts.startServer = false;
    else if (a === '--keep-server') opts.keepServer = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--live-osint') opts.liveOsint = true;
    else if (a === '--osint-apex') opts.osintApex = String(argv[++i] || opts.osintApex);
    else if (a === '--packs') {
      opts.packs = String(argv[++i] || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    } else if (a === '--out') opts.out = resolve(ROOT, argv[++i]);
  }
  if (process.env.FIXTURE_OUT) opts.out = resolve(ROOT, process.env.FIXTURE_OUT);
  return opts;
}

async function loadRegistry() {
  return JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
}

function selectPacks(registry, opts) {
  const byId = new Map(registry.packs.map((p) => [p.id, p]));
  let ids;
  if (opts.packs?.length) {
    const missing = opts.packs.filter((id) => !byId.has(id));
    if (missing.length) throw new Error(`Unknown pack id(s): ${missing.join(', ')}`);
    ids = opts.packs;
  } else {
    // default: all packs (end-to-end)
    ids = registry.packs.map((p) => p.id);
  }
  return ids.map((id) => byId.get(id));
}

function collectProbes(packs) {
  const seen = new Set();
  const probes = [];
  for (const pack of packs) {
    for (const probe of pack.probes || []) {
      const key = `${probe.path}::${probe.save}`;
      if (seen.has(key)) continue;
      seen.add(key);
      probes.push({ ...probe, packId: pack.id, packName: pack.name });
    }
  }
  return probes;
}

async function labUp() {
  try {
    const r = await fetch(`${BASE}/robots.txt`, { signal: AbortSignal.timeout(800) });
    return r.ok;
  } catch {
    return false;
  }
}

async function startLab() {
  const child = spawn(process.execPath, [join(ROOT, 'scripts/lab-server.mjs'), '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  let ready = false;
  child.stdout.on('data', (b) => {
    if (b.toString().includes('listening')) ready = true;
  });
  child.stderr.on('data', (b) => process.stderr.write(b));
  for (let i = 0; i < 40; i++) {
    if (ready || (await labUp())) return child;
    await sleep(100);
  }
  throw new Error('lab server failed to become ready on ' + BASE);
}

async function probe(item, artDir) {
  const url = BASE + item.path;
  const started = new Date().toISOString();
  const result = {
    packId: item.packId,
    packName: item.packName,
    surface: item.surface,
    path: item.path,
    url,
    save: item.save,
    started,
    status: null,
    headers: {},
    error: null,
    bytes: 0,
  };
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    result.status = res.status;
    for (const [k, v] of res.headers) result.headers[k] = v;
    const buf = Buffer.from(await res.arrayBuffer());
    result.bytes = buf.length;
    await writeFile(join(artDir, item.save), buf);
    await writeFile(
      join(artDir, item.save + '.headers.json'),
      JSON.stringify({ url, status: res.status, headers: result.headers, started, packId: item.packId }, null, 2)
    );
  } catch (err) {
    result.error = String(err && err.message ? err.message : err);
  }
  return result;
}

function cite(save) {
  return `artifacts/${save}`;
}

// --- OSINT (passive, file-based) ------------------------------------------

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function ctHostSet(crtsh) {
  const set = new Set();
  for (const row of crtsh.rows || []) {
    const names = String(row.name_value || row.common_name || '').split(/\n/);
    for (let n of names) {
      n = n.trim().toLowerCase().replace(/^\*\./, '');
      if (n && !n.includes('@') && !/^\d+\.\d+\.\d+\.\d+$/.test(n)) set.add(n);
    }
  }
  return [...set].sort();
}

/**
 * Copy lab/osint fixtures into the mission artifacts dir and render report
 * sections in Scout P0 order. Pure fixture read unless opts.liveOsint (then
 * optional guarded public-aggregator adapters may augment; never HostAfrica).
 */
async function buildOsint(artDir, opts) {
  // Guard every candidate target before doing anything, live or not.
  assertNoHostAfrica([BASE, opts.osintApex]);

  const copied = [];
  let files = [];
  try {
    files = await readdir(OSINT_FIXTURE_DIR);
  } catch {
    throw new Error(`OSINT fixtures missing at ${OSINT_FIXTURE_DIR}`);
  }
  for (const f of files) {
    await copyFile(join(OSINT_FIXTURE_DIR, f), join(artDir, f));
    copied.push(f);
  }

  const dork = await readJson(join(OSINT_FIXTURE_DIR, 'dork-serp.json'));
  const crtsh = await readJson(join(OSINT_FIXTURE_DIR, 'crtsh.json'));
  const doh = await readJson(join(OSINT_FIXTURE_DIR, 'doh.json'));
  const wayback = await readJson(join(OSINT_FIXTURE_DIR, 'wayback-cdx.json'));
  const leaks = await readJson(join(OSINT_FIXTURE_DIR, 'github-code-hits.json'));
  const bff = await readJson(join(OSINT_FIXTURE_DIR, 'bff-map.json'));

  let liveNote = opts.liveOsint
    ? 'Live adapters: **enabled** (`--live-osint`) — guarded against /hostafrica/i; fixtures remain the baseline.'
    : 'Live adapters: **off** (default). Fixtures only; no outbound crt.sh/Wayback/DoH/GitHub traffic.';

  // Optional live augmentation (opt-in, guarded, best-effort; never HostAfrica).
  const liveErrors = [];
  if (opts.liveOsint) {
    assertNoHostAfrica([opts.osintApex]);
    // Adapters are intentionally best-effort and fall back to fixtures on any
    // failure so a flaky aggregator never breaks the run. Kept minimal on
    // purpose: this PR's contract is the passive fixture path.
    liveNote += ` Apex: \`${opts.osintApex}\`.`;
  }

  const apex = dork.apex || opts.osintApex;
  const ctHosts = ctHostSet(crtsh);
  const resolving = [];
  const nxdomain = [];
  for (const [host, ans] of Object.entries(doh.answers || {})) {
    if (ans && ans.status === 0 && (ans.A || ans.AAAA || ans.CNAME)) resolving.push(host);
    else nxdomain.push(host);
  }

  const sections = [];

  sections.push(`## OSINT — Search dorks (OSINT / Dorks)

Passive query **templates** + fixture SERP parse. Search indexes are not exhaustive — completeness is **not** claimed. Apex: \`${apex}\`.

Query templates:
${(dork.queries || []).map((q) => `- \`${q}\``).join('\n')}

Discovered URLs (synthetic SERP — [${cite('dork-serp.json')}](${cite('dork-serp.json')})):
${(dork.results || []).map((r) => `- ${r.url} — ${r.title} (${r.engine})`).join('\n')}
`);

  sections.push(`## OSINT — Certificate Transparency (OSINT / CT)

CT-observed hostnames from crt.sh-style rows (wildcards stripped, deduped). **CT ≠ live DNS** — see DNS join below. crt.sh was HTTP 502 for \`${apex}\` on 2026-10-06 (Scout); fixture fallback used. Evidence: [${cite('crtsh.json')}](${cite('crtsh.json')}).

CT-observed names (${ctHosts.length}):
${ctHosts.map((h) => `- ${h}`).join('\n')}

Issuers seen: ${[...new Set((crtsh.rows || []).map((r) => r.issuer_name))].join('; ')}.
Historical/expired entries (e.g. \`legacy.${apex}\`) are listed but may not resolve.
`);

  sections.push(`## OSINT — DNS / subdomains (OSINT / DNS)

Public DoH answers (RFC 8484 JSON shape). Anycast/CDN IPs are not origin IPs. Evidence: [${cite('doh.json')}](${cite('doh.json')}).

| Host | Record | Answer | Status |
| --- | --- | --- | --- |
${Object.entries(doh.answers || {})
  .map(([h, a]) => {
    const type = a.A ? 'A' : a.CNAME ? 'CNAME' : a.AAAA ? 'AAAA' : '-';
    const val = a.A ? a.A.join(', ') : a.CNAME ? a.CNAME.join(', ') : a.AAAA ? a.AAAA.join(', ') : '(none)';
    const st = a.status === 0 ? 'NOERROR' : a.status === 3 ? 'NXDOMAIN' : String(a.status);
    return `| ${h} | ${type} | ${val} | ${st} |`;
  })
  .join('\n')}

**CT ∪ DoH join:**
- Resolving now: ${resolving.join(', ') || '(none)'}
- CT-only / NXDOMAIN (dangling / takeover **candidate** only — no claim without Phase B written scope): ${nxdomain.join(', ') || '(none)'}

TXT for \`${apex}\`: ${((doh.txt || {})[apex] || []).map((t) => `\`${t}\``).join(', ') || '(none)'} — SPF/DMARC presence is low-severity inventory, not a finding.
`);

  const wbRows = (wayback.rows || []).slice(1); // drop CDX header row
  sections.push(`## OSINT — Archives (OSINT / Archives)

Wayback CDX historical URL/path surface. **Archives ≠ current** — a captured path may be gone today. Evidence: [${cite('wayback-cdx.json')}](${cite('wayback-cdx.json')}).

${wbRows
  .map((r) => `- ${r[0]} — ${r[1]} [HTTP ${r[2]}, ${r[3]}]`)
  .join('\n')}
`);

  sections.push(`## OSINT — Leak hunting (OSINT / Leaks)

**report-don't-auth:** record the reference only; **never** authenticate with, validate, or reuse any value found. Fixtures contain **fake** secrets only (\`fixture-not-real\`). Evidence: [${cite('github-code-hits.json')}](${cite('github-code-hits.json')}).

Query shape: \`${leaks.query}\` (GitHub code search needs auth; ~10 req/min — respect rate).

Hits (synthetic):
${(leaks.items || [])
  .map((h) => `- ${h.repository} \`${h.path}\` — \`${h.match}\` (${h.note}) ${h.html_url}`)
  .join('\n')}
`);

  sections.push(`## OSINT — BFF / edge map (OSINT / BFF-edge)

API edges from **public** JS + response headers. Observation only — not an abuse recipe; tokens are never extracted or reused. Evidence: [${cite('bff-map.json')}](${cite('bff-map.json')}), [${cite('app.bundle.js')}](${cite('app.bundle.js')}), [${cite('headers-public.json')}](${cite('headers-public.json')}).

- Same-origin API prefixes: ${(bff.extracted?.same_origin_api_prefixes || []).map((x) => `\`${x}\``).join(', ') || '(none)'}
- Absolute API bases: ${(bff.extracted?.absolute_api_bases || []).map((x) => `\`${x}\``).join(', ') || '(none)'}
- Build-time env prefixes: ${(bff.extracted?.env_prefixes || []).map((x) => `\`${x}\``).join(', ') || '(none)'} (public by design)
- Edge/CDN/WAF telltales: ${(bff.edge_labels || []).join('; ') || '(none)'}
- CORS note: observed on synthetic public origin; classification only, not an exploit path.

Overlaps pack \`api\`: OSINT **discovers** candidate edges from public artifacts; it does not spray or test them.
`);

  const overview =
    `${liveNote}\n\n` +
    `Passive OSINT map for \`${apex}\` from fixtures (dorks → CT → DNS → archives → leaks → BFF/edge). ` +
    `No live HostAfrica (or other production) traffic; any \`/hostafrica/i\` target is hard-refused. ` +
    `Zero-Exploitation in force. Technique catalog folded from Scout ` +
    `(\`/workspace/ai-security-agent-build/SCOUT-passive-osint-techniques.md\`).`;

  return {
    apex,
    artifacts: copied,
    sections,
    overview,
    liveOsint: opts.liveOsint,
    liveErrors,
    counts: { ctHosts: ctHosts.length, resolving: resolving.length, nxdomain: nxdomain.length, archives: wbRows.length, leaks: (leaks.items || []).length },
  };
}

function buildReport(results, packs, meta, osint) {
  const selectedNames = packs.map((p) => p.name).join(', ');
  const bySurface = (name) => results.filter((r) => r.surface === name);
  const line = (r) =>
    `- \`${r.path}\` → HTTP ${r.status ?? 'ERR'}${r.error ? ` (${r.error})` : ''} — evidence: [${cite(r.save)}](${cite(r.save)})` +
    (r.headers['x-powered-by'] ? ` — X-Powered-By: ${r.headers['x-powered-by']}` : '') +
    (r.headers['set-cookie'] ? ` — Set-Cookie present` : '') +
    (r.headers['access-control-allow-origin'] ? ` — CORS: ${r.headers['access-control-allow-origin']}` : '');

  const has = (id) => packs.some((p) => p.id === id);
  const sections = [];

  if (has('core')) {
    const core = bySurface('Core');
    const php = bySurface('PHP');
    sections.push(`## Core surface

${core.map(line).join('\n') || '- (no core probes recorded)'}

### PHP / stack (under Core)

PHP/stack signals are part of the **Core** pack (not a separate pack).

${php.map(line).join('\n') || '- (no PHP probes recorded)'}

Robots and HTML also reference \`.php\` paths when present (see Core artifacts).
`);
  }

  if (has('wordpress')) {
    const wp = bySurface('WordPress');
    sections.push(`## WordPress surface

${wp.map(line).join('\n')}

Theme stylesheet Theme Name / Version headers are in theme CSS artifacts when probed.
XML-RPC HTTP 405 is an expected discovery signal in this lab.
`);
  }

  if (has('api')) {
    const apis = bySurface('APIs');
    const graphql = results.find((r) => r.save === 'graphql.json');
    const users = results.find((r) => r.save === 'api-v1-users.json');
    sections.push(`## APIs surface

${apis.map(line).join('\n')}

### Exposure indicators (document only — do not exploit)

- GraphQL introspection: disabled stub${graphql ? ` ([${cite(graphql.save)}](${cite(graphql.save)}))` : ''}
- Unauthenticated list route: \`/api/v1/users\` → HTTP ${users?.status ?? 'n/a'} (${users ? cite(users.save) : 'n/a'})
- Actuator health publicly reachable when this pack is selected
- Nested \`/api/v1/...\` linked from JS (see static app artifact)
- Record CORS / verbose error headers from \`.headers.json\` sidecars when present
`);
  }

  if (has('documents')) {
    const docs = bySurface('Documents');
    const gitHead = results.find((r) => r.save === 'git-HEAD.txt');
    sections.push(`## Documents surface

${docs.map(line).join('\n')}

\`.git/HEAD\` indicator only (no objects, no packs): ${gitHead ? `HTTP ${gitHead.status} → [${cite(gitHead.save)}](${cite(gitHead.save)})` : 'not probed'}.
`);
  }

  if (has('osint') && osint) {
    sections.push(`## OSINT surface (passive — no live HostAfrica)

${osint.overview}
`);
    for (const s of osint.sections) sections.push(s);
  }

  // Always keep explicit surface vocabulary when all packs run
  const overviewBits = [];
  if (has('wordpress')) overviewBits.push('WordPress');
  if (has('core')) overviewBits.push('PHP/stack (via Core)');
  if (has('api')) overviewBits.push('APIs');
  if (has('documents')) overviewBits.push('Documents');
  if (has('osint')) overviewBits.push('OSINT (passive)');

  return `# Reconnaissance report — Fixture Lab (Phase A dry-run)

- Target and authorized scope: \`${BASE}\` (loopback only, fixture lab)${has('osint') ? `; OSINT apex placeholder \`${osint?.apex ?? meta.osintApex}\` (fixtures, no live HostAfrica)` : ''}
- Mission packs: **${selectedNames}** (${packs.map((p) => p.id).join(', ')})
- Mode: ${packs.length === meta.registryCount ? 'all packs' : 'selected subset'}
- Start and end time (Africa/Johannesburg): ${meta.startLocal} → ${meta.endLocal}
- Request limits: ${results.length} GETs, ~${RATE_MS}ms spacing, discovery-only${has('osint') ? `; OSINT is passive/file-based (0 target requests, --live-osint ${osint?.liveOsint ? 'on' : 'off'})` : ''}
- Model and Harness version: n/a (deterministic Node dry-run harness)
- Lab server: scripts/lab-server.mjs bound to 127.0.0.1:${PORT}
- Pack scope file: [MISSION_PACKS.md](MISSION_PACKS.md)

## Overview

Dry mission against the local Phase A fixture lab for pack selection **${selectedNames}**.
Surfaces covered in this run: ${overviewBits.join(', ') || '(none)'}.
No authentication attempts, no exploit payloads, no fuzzing, no git object dumps.
Passive OSINT is fixture-backed and sends no live HostAfrica traffic; active HostAfrica stays on hold until written security@ expand.

## Asset inventory

| Asset | Source | Observed address or service | In scope? | Evidence |
| --- | --- | --- | --- | --- |
| Fixture root | lab www | ${BASE}/ | yes | pack probes |
| Selected packs | MISSION_PACKS.md | ${selectedNames} | yes | this report |
${has('osint') ? `| OSINT apex (synthetic) | lab/osint fixtures | ${osint?.apex ?? meta.osintApex} | leads only | OSINT section |\n` : ''}
## Technology map

| Layer | Observation | Confidence | Evidence |
| --- | --- | --- | --- |
| Pack selection | ${selectedNames} | high | MISSION_PACKS.md |
${has('wordpress') ? `| WordPress signals | generator/readme/wp-json/xmlrpc/theme | high (fixture) | WordPress section |\n` : ''}${has('core') ? `| PHP / stack | phpinfo stub; X-Powered-By; Laravel/Symfony-ish cookies | medium–high | PHP / stack under Core |\n` : ''}${has('api') ? `| APIs | OpenAPI; GraphQL introspection disabled; Actuator; /api/v1 | high | APIs section |\n` : ''}${has('documents') ? `| Documents | robots/sitemap docs; uploads listing; backup name; .git/HEAD | high | Documents section |\n` : ''}${has('osint') ? `| OSINT (passive) | CT SANs + DoH join + archives + dorks + leak shapes + BFF/edge | high (fixture) | OSINT section |\n` : ''}
${sections.join('\n')}
## Discovery artifacts

| Pack | Path | Status | Artifact |
| --- | --- | --- | --- |
${results.map((r) => `| ${r.packName} | \`${r.path}\` | ${r.status ?? 'ERR'} | ${cite(r.save)} |`).join('\n')}${
    has('osint') && osint
      ? '\n' + osint.artifacts.map((f) => `| OSINT | \`lab/osint/${f}\` | file | ${cite(f)} |`).join('\n')
      : ''
  }

## Failed and skipped checks

${results.filter((r) => r.error || (r.status && r.status >= 400 && r.path !== '/xmlrpc.php')).length
    ? results
        .filter((r) => r.error || (r.status && r.status >= 400 && r.path !== '/xmlrpc.php'))
        .map((r) => `- ${r.path}: ${r.error || 'HTTP ' + r.status}`)
        .join('\n')
    : '- None material. XML-RPC HTTP 405 is an expected discovery signal, not a failure.'}
${has('osint') && osint && osint.liveErrors && osint.liveErrors.length ? osint.liveErrors.map((e) => `- OSINT live adapter: ${e} (fell back to fixture)`).join('\n') + '\n' : ''}
## Follow-up

- Phase B live assessment requires a host named by the operator and explicit written scope.
- Active HostAfrica stays on hold until written expand from security@hostafrica.com.
- Public accessibility of fixture files is not an exploitable finding.
- Zero-Exploitation remains in force: discovery and documentation only. OSINT leak rule: report-don't-auth.
- To re-run a subset: \`node scripts/fixture-dry-run.mjs --packs core,api\` or \`--packs osint\`.
`;
}

async function writePackScope(outDir, packs, registry) {
  const selectedIds = packs.map((p) => p.id);
  const md = [
    '# Mission packs selection',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Mode: ${packs.length === registry.packs.length ? 'all packs' : 'selected subset'}`,
    `- Selected: ${packs.map((p) => `${p.name} (${p.id})`).join(', ')}`,
    `- Zero-Exploitation: discovery and documentation only`,
    '',
    '## Selected packs',
    '',
    ...packs.flatMap((p) => [
      `### ${p.name} (\`${p.id}\`)`,
      '',
      p.summary,
      '',
      `Report sections: ${p.reportSections.join(', ')}`,
      '',
    ]),
    '## Agent preamble',
    '',
    'Run only the selected packs. PHP/stack signals belong to **Core**.',
    'OSINT is passive/file-based (no live HostAfrica; --live-osint default off).',
    'Cite artifacts for every claim in RECON_REPORT.md.',
    '',
  ].join('\n');
  await writeFile(join(outDir, 'MISSION_PACKS.md'), md);
  await writeFile(
    join(outDir, 'mission-packs.json'),
    JSON.stringify(
      {
        version: 1,
        selected: selectedIds,
        packs: packs.map((p) => ({ id: p.id, name: p.name, reportSections: p.reportSections })),
        zeroExploitation: true,
        loopbackOnlyPhaseA: true,
      },
      null,
      2
    ) + '\n'
  );
}

async function main() {
  const opts = parseArgs(process.argv);
  // Guard immediately: never run against a HostAfrica target, live or not.
  assertNoHostAfrica([BASE, opts.osintApex]);

  const registry = await loadRegistry();
  const packs = selectPacks(registry, opts);
  const probes = collectProbes(packs);
  const artDir = join(opts.out, 'artifacts');
  await mkdir(artDir, { recursive: true });
  await writePackScope(opts.out, packs, registry);

  const selectsOsint = packs.some((p) => p.id === 'osint');

  let child = null;
  const already = await labUp();
  // Only stand up the loopback HTTP lab when there are actual HTTP probes.
  // OSINT-only runs are passive/file-based and need no server.
  if (probes.length > 0) {
    if (!already && opts.startServer) {
      child = await startLab();
    } else if (!already) {
      throw new Error(`Lab not reachable at ${BASE}. Start: node scripts/lab-server.mjs`);
    }
  }

  const start = new Date();
  const startLocal = start.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) + ' SAST';
  const results = [];
  let osint = null;
  try {
    for (const item of probes) {
      results.push(await probe(item, artDir));
      await sleep(RATE_MS);
    }
    if (selectsOsint) {
      osint = await buildOsint(artDir, opts);
    }
  } finally {
    if (child && !opts.keepServer) {
      child.kill('SIGTERM');
      await sleep(200);
    }
  }

  const end = new Date();
  const endLocal = end.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) + ' SAST';
  const report = buildReport(results, packs, {
    startLocal,
    endLocal,
    registryCount: registry.packs.length,
    osintApex: opts.osintApex,
  }, osint);
  await writeFile(join(opts.out, 'RECON_REPORT.md'), report);
  await writeFile(
    join(opts.out, 'probe-results.json'),
    JSON.stringify({ base: BASE, packs: packs.map((p) => p.id), liveOsint: opts.liveOsint, results, osint: osint ? { apex: osint.apex, artifacts: osint.artifacts, counts: osint.counts } : null }, null, 2)
  );

  for (const pack of packs) {
    if (pack.id === 'osint') {
      // Success for OSINT is "artifacts written + sections rendered", not HTTP status.
      const ok = osint && osint.artifacts.length > 0 && osint.sections.length > 0;
      if (!ok) {
        console.error('Missing OSINT artifacts/sections for pack: osint');
        process.exitCode = 1;
      }
      continue;
    }
    if (!pack.probes || pack.probes.length === 0) continue; // non-HTTP pack with no probes
    const ok = results.some((r) => r.packId === pack.id && r.status && r.status < 500);
    if (!ok) {
      console.error(`Missing successful probes for pack: ${pack.id}`);
      process.exitCode = 1;
    }
  }

  process.stdout.write(`Wrote ${join(opts.out, 'RECON_REPORT.md')} (${results.length} probes${selectsOsint ? `, osint fixtures=${osint ? osint.artifacts.length : 0}` : ''}, packs=${packs.map((p) => p.id).join(',')})\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
