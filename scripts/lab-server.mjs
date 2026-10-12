#!/usr/bin/env node
/**
 * Phase A fixture lab server — loopback only (127.0.0.1).
 * Discovery-only static + light dynamic stubs. No exploit payloads.
 *
 * Usage:
 *   node scripts/lab-server.mjs [--port 8765]
 *   LAB_PORT=8765 node scripts/lab-server.mjs
 *
 * Stop: Ctrl+C, or kill the recorded PID in lab/out/lab-server.pid
 */
import http from 'node:http';
import { readFile, stat, writeFile, mkdir, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const WWW = resolve(ROOT, 'lab/www');
const OUT = resolve(ROOT, 'lab/out');
const HOST = '127.0.0.1'; // loopback only — never all-interfaces
const argPort = process.argv.includes('--port')
  ? process.argv[process.argv.indexOf('--port') + 1]
  : undefined;
const PORT = Number(process.env.LAB_PORT || argPort || 8765) || 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.php': 'text/html; charset=utf-8',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const cleaned = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const abs = resolve(WWW, '.' + cleaned);
  if (!abs.startsWith(WWW + sep) && abs !== WWW) return null;
  return abs;
}

async function sendFile(res, filePath, extraHeaders = {}) {
  const ext = extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const body = await readFile(filePath);
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length, ...extraHeaders });
  res.end(body);
}

function laravelish(res) {
  return {
    'X-Powered-By': 'PHP/8.2.12',
    'Set-Cookie': 'laravel_session=fixture_lab_session_stub; Path=/; HttpOnly',
  };
}

function symfonyish() {
  return {
    'X-Powered-By': 'PHP/8.2.12',
    'Set-Cookie': 'PHPSESSID=fixture_symfony_stub; Path=/; HttpOnly',
    'X-Debug-Token': 'fixture',
  };
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || '';
  // Reject non-loopback Host headers when obviously remote (soft check)
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    // keep trailing slash for directory stubs
  }

  try {
    // Special routes
    if (pathname === '/xmlrpc.php') {
      const body = await readFile(join(WWW, 'xmlrpc.php'));
      res.writeHead(405, {
        'Content-Type': 'text/xml; charset=utf-8',
        Allow: 'POST',
        'Content-Length': body.length,
      });
      res.end(body);
      return;
    }

    if (pathname === '/wp-json' || pathname === '/wp-json/') {
      await sendFile(res, join(WWW, 'wp-json/index.json'));
      return;
    }

    if (pathname === '/graphql' || pathname === '/graphql/') {
      const body = await readFile(join(WWW, 'graphql.json'));
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length,
        'X-GraphQL-Introspection': 'disabled',
      });
      res.end(body);
      return;
    }

    if (pathname === '/actuator/health' || pathname === '/actuator/health/') {
      await sendFile(res, join(WWW, 'actuator/health'), {
        'Content-Type': 'application/json; charset=utf-8',
      });
      return;
    }

    if (pathname === '/api/v1/status' || pathname === '/api/v1/status/') {
      await sendFile(res, join(WWW, 'api/v1/status'), {
        'Content-Type': 'application/json; charset=utf-8',
      });
      return;
    }

    if (pathname === '/api/v1/users' || pathname === '/api/v1/users/') {
      await sendFile(res, join(WWW, 'api/v1/users'), {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Fixture-Exposure': 'unauthenticated-list-route',
      });
      return;
    }

    if (pathname === '/index.php' || pathname === '/index.php/') {
      await sendFile(res, join(WWW, 'index.php'), laravelish());
      return;
    }

    if (pathname === '/app.php' || pathname === '/app.php/') {
      await sendFile(res, join(WWW, 'app.php'), symfonyish());
      return;
    }

    if (pathname === '/.git/HEAD') {
      const body = await readFile(join(WWW, 'dot-git/HEAD'));
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': body.length,
      });
      res.end(body);
      return;
    }

    // Static resolution
    let filePath = safePath(pathname);
    if (!filePath) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('bad path');
      return;
    }

    let st;
    try {
      st = await stat(filePath);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }

    if (st.isDirectory()) {
      const idx = join(filePath, 'index.html');
      try {
        await stat(idx);
        filePath = idx;
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
    }

    await sendFile(res, filePath);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('server error');
    console.error(err);
  }
});

await mkdir(OUT, { recursive: true });
server.listen(PORT, HOST, async () => {
  const addr = server.address();
  const line = `lab-server listening on http://${addr.address}:${addr.port} (www=${WWW})\n`;
  process.stdout.write(line);
  await writeFile(join(OUT, 'lab-server.pid'), String(process.pid));
  await writeFile(join(OUT, 'lab-server.url'), `http://${addr.address}:${addr.port}`);
});

async function shutdown() {
  try { await rm(join(OUT, 'lab-server.pid'), { force: true }); } catch {}
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
