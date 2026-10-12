#!/usr/bin/env node
/**
 * Mission pack selector — prints a menu and writes MISSION_PACKS.md / scope JSON
 * for the agent (and fixture dry-run) to read.
 *
 * Usage:
 *   node scripts/mission-packs.mjs                  # interactive-ish menu to stdout + write all
 *   node scripts/mission-packs.mjs --all             # select every pack
 *   node scripts/mission-packs.mjs --packs core,api  # subset
 *   node scripts/mission-packs.mjs --list            # list only
 *   node scripts/mission-packs.mjs --out missions/fixture-lab
 *
 * Loopback / Zero-Exploitation only for Phase A lab work.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REGISTRY_PATH = join(ROOT, 'packs/registry.json');

function parseArgs(argv) {
  const opts = { all: false, list: false, packs: null, out: join(ROOT, 'missions/fixture-lab'), menu: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') opts.all = true;
    else if (a === '--list') opts.list = true;
    else if (a === '--menu') opts.menu = true;
    else if (a === '--packs') opts.packs = String(argv[++i] || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    else if (a === '--out') opts.out = resolve(ROOT, argv[++i] || opts.out);
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

async function loadRegistry() {
  return JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
}

function printMenu(registry) {
  const lines = [
    'Mission packs (Zero-Exploitation, discovery-only)',
    '================================================',
    '',
    'Select one or more packs at mission start, or run all end-to-end.',
    '',
  ];
  registry.packs.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name}  [id=${p.id}]`);
    lines.push(`   ${p.summary}`);
    lines.push('');
  });
  lines.push('Commands:');
  lines.push('  pnpm run packs -- --all');
  lines.push('  pnpm run packs -- --packs core,wordpress');
  lines.push('  pnpm run lab:dry-run -- --packs api,documents');
  lines.push('  pnpm run lab:dry-run -- --all');
  lines.push('');
  lines.push('To add a pack: edit packs/registry.json (see packs/README.md).');
  return lines.join('\n');
}

function resolveSelection(registry, opts) {
  const byId = new Map(registry.packs.map((p) => [p.id, p]));
  if (opts.all || (!opts.packs && !opts.menu)) {
    return registry.packs.map((p) => p.id);
  }
  if (opts.packs) {
    const missing = opts.packs.filter((id) => !byId.has(id));
    if (missing.length) throw new Error(`Unknown pack id(s): ${missing.join(', ')}. Known: ${[...byId.keys()].join(', ')}`);
    return opts.packs;
  }
  return registry.packs.filter((p) => p.default).map((p) => p.id);
}

async function interactiveMenu(registry) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  process.stdout.write(printMenu(registry) + '\n');
  const answer = await ask('Enter pack ids (comma-separated), numbers, or "all" [all]: ');
  rl.close();
  const raw = (answer || 'all').trim().toLowerCase();
  if (!raw || raw === 'all' || raw === '*') return registry.packs.map((p) => p.id);
  const tokens = raw.split(/[,\s]+/).filter(Boolean);
  const ids = [];
  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      const idx = Number(t) - 1;
      if (!registry.packs[idx]) throw new Error(`No pack number ${t}`);
      ids.push(registry.packs[idx].id);
    } else {
      ids.push(t);
    }
  }
  return ids;
}

function renderMissionPacksMd(registry, selectedIds, outDir) {
  const selected = selectedIds.map((id) => registry.packs.find((p) => p.id === id));
  const lines = [
    '# Mission packs selection',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Output dir: \`${outDir}\``,
    `- Mode: ${selected.length === registry.packs.length ? 'all packs' : 'selected subset'}`,
    `- Zero-Exploitation: discovery and documentation only`,
    '',
    '## Selected packs',
    '',
  ];
  for (const p of selected) {
    lines.push(`### ${p.name} (\`${p.id}\`)`);
    lines.push('');
    lines.push(p.summary);
    lines.push('');
    lines.push(`Report sections: ${p.reportSections.join(', ')}`);
    lines.push('');
  }
  lines.push('## Operator checklist');
  lines.push('');
  lines.push('- [ ] Authorized scope confirmed (Phase A: loopback fixture lab only)');
  lines.push('- [ ] Pack selection matches intent (all vs subset)');
  lines.push('- [ ] Rate limit / stop conditions set');
  lines.push('- [ ] No exploit payloads, sprays, fuzz, auth bypass, or git object dumps');
  lines.push('- [ ] Phase B live requires host named by the operator + written scope');
  lines.push('');
  lines.push('## Agent preamble');
  lines.push('');
  lines.push('Run only the selected packs above. Cover every listed report section with');
  lines.push('evidence citations. PHP/stack signals belong to **Core**, not a separate pack.');
  lines.push('Write `RECON_REPORT.md` with sections for each selected pack (plus PHP / stack');
  lines.push('when Core is selected).');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const opts = parseArgs(process.argv);
  const registry = await loadRegistry();

  if (opts.help) {
    process.stdout.write(`Usage: node scripts/mission-packs.mjs [--all|--packs id,id|--menu|--list] [--out dir]\n`);
    return;
  }

  if (opts.list) {
    process.stdout.write(printMenu(registry) + '\n');
    return;
  }

  let selectedIds;
  if (opts.menu && process.stdin.isTTY) {
    selectedIds = await interactiveMenu(registry);
    // validate
    selectedIds = resolveSelection(registry, { packs: selectedIds });
  } else {
    process.stdout.write(printMenu(registry) + '\n');
    selectedIds = resolveSelection(registry, opts);
  }

  await mkdir(opts.out, { recursive: true });
  const md = renderMissionPacksMd(registry, selectedIds, opts.out);
  const scope = {
    version: 1,
    selected: selectedIds,
    packs: selectedIds.map((id) => {
      const p = registry.packs.find((x) => x.id === id);
      return { id: p.id, name: p.name, reportSections: p.reportSections };
    }),
    zeroExploitation: true,
    loopbackOnlyPhaseA: true,
  };
  await writeFile(join(opts.out, 'MISSION_PACKS.md'), md);
  await writeFile(join(opts.out, 'mission-packs.json'), JSON.stringify(scope, null, 2) + '\n');
  process.stdout.write(`Wrote ${join(opts.out, 'MISSION_PACKS.md')}\n`);
  process.stdout.write(`Selected: ${selectedIds.join(', ')}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
