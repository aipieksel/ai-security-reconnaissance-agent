#!/usr/bin/env node
/**
 * Local-only dry-run: parse tests/fixtures/index.html for discovery leads.
 * Does not open sockets or contact external hosts.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(root, 'tests/fixtures/index.html'), 'utf8');

assert.match(html, /WordPress/i, 'WordPress generator meta');
assert.match(html, /swagger/i, 'Swagger link');
assert.match(html, /\.pdf/i, 'PDF link');
assert.match(html, /\/api\//i, 'API path hint');

console.log('PASS: local fixture contains WordPress, Swagger, PDF, and API discovery leads. No network used.');
