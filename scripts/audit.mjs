import { execFileSync } from 'node:child_process';
import { readFile, lstat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { root } from './setup.mjs';

const candidates = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean);
const findings = [];
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{24,})\b/,
  /(?:\/Users\/[^\s/]+\/|\/home\/[^\s/]+\/)/,
];
for (const path of candidates) {
  const absolute = join(root, path);
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.size > 2_000_000) findings.push(`${path}: unexpected type or size`);
  if (/(^|\/)(?:\.credentials\.yaml|settings\.yaml|\.env|sessions|storages|recon)(?:\/|$)/.test(path)) findings.push(`${path}: private runtime filename`);
  const text = await readFile(absolute, 'utf8');
  if (patterns.some(pattern => pattern.test(text))) findings.push(`${path}: review credential or private-source pattern`);
  if (path.endsWith('.md')) {
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
      try { await lstat(resolve(dirname(absolute), target)); }
      catch { findings.push(`${path}: broken link ${target}`); }
    }
  }
}
const expected = {
  'agent.cordis.yml': 'ba793fd13e0327b408ca0bff87c527063d71d7ee67d16219266392434d4fbfa2',
  'preset.yml': 'acae4b00404e50360a6f011871c2ce75c52690ab09e978bab03f7cb3f98ce54a',
};
for (const [file, digest] of Object.entries(expected)) assert.equal(createHash('sha256').update(await readFile(join(root, 'presets/ai-security-reconnaissance-agent', file))).digest('hex'), digest, file);
assert.equal(findings.length, 0, findings.join('\n'));
console.log(`PASS: ${candidates.length} candidate files; source hashes, local Markdown links, private-state filenames, and credential-pattern checks. This is a heuristic scan, not a guarantee.`);
