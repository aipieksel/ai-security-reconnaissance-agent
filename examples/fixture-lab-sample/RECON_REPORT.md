# Reconnaissance report — Fixture Lab (Phase A dry-run)

- Target and authorized scope: `http://127.0.0.1:8765` (loopback only, fixture lab)
- Mission packs: **Core, WordPress, API, Documents** (core, wordpress, api, documents)
- Mode: all packs
- Start and end time (Africa/Johannesburg): 2026/10/02, 01:53:06 SAST → 2026/10/02, 01:53:08 SAST
- Request limits: 30 GETs, ~30ms spacing, discovery-only
- Model and Harness version: n/a (deterministic Node dry-run harness)
- Lab server: scripts/lab-server.mjs bound to 127.0.0.1:8765
- Pack scope file: [MISSION_PACKS.md](MISSION_PACKS.md)

## Overview

Dry mission against the local Phase A fixture lab for pack selection **Core, WordPress, API, Documents**.
Surfaces covered in this run: WordPress, PHP/stack (via Core), APIs, Documents.
No authentication attempts, no exploit payloads, no fuzzing, no git object dumps.

## Asset inventory

| Asset | Source | Observed address or service | In scope? | Evidence |
| --- | --- | --- | --- | --- |
| Fixture root | lab www | http://127.0.0.1:8765/ | yes | pack probes |
| Selected packs | MISSION_PACKS.md | Core, WordPress, API, Documents | yes | this report |

## Technology map

| Layer | Observation | Confidence | Evidence |
| --- | --- | --- | --- |
| Pack selection | Core, WordPress, API, Documents | high | MISSION_PACKS.md |
| WordPress signals | generator/readme/wp-json/xmlrpc/theme | high (fixture) | WordPress section |
| PHP / stack | phpinfo stub; X-Powered-By; Laravel/Symfony-ish cookies | medium–high | PHP / stack under Core |
| APIs | OpenAPI; GraphQL introspection disabled; Actuator; /api/v1 | high | APIs section |
| Documents | robots/sitemap docs; uploads listing; backup name; .git/HEAD | high | Documents section |

## Core surface

- `/robots.txt` → HTTP 200 — evidence: [artifacts/robots.txt](artifacts/robots.txt)
- `/sitemap.xml` → HTTP 200 — evidence: [artifacts/sitemap.xml](artifacts/sitemap.xml)
- `/` → HTTP 200 — evidence: [artifacts/index.html](artifacts/index.html)
- `/static/app.js` → HTTP 200 — evidence: [artifacts/static-app.js](artifacts/static-app.js)

### PHP / stack (under Core)

PHP/stack signals are part of the **Core** pack (not a separate pack).

- `/phpinfo-stub.html` → HTTP 200 — evidence: [artifacts/phpinfo-stub.html](artifacts/phpinfo-stub.html)
- `/index.php` → HTTP 200 — evidence: [artifacts/index.php.html](artifacts/index.php.html) — X-Powered-By: PHP/8.2.12 — Set-Cookie present
- `/app.php` → HTTP 200 — evidence: [artifacts/app.php.html](artifacts/app.php.html) — X-Powered-By: PHP/8.2.12 — Set-Cookie present

Robots and HTML also reference `.php` paths when present (see Core artifacts).

## WordPress surface

- `/readme.html` → HTTP 200 — evidence: [artifacts/readme.html](artifacts/readme.html)
- `/xmlrpc.php` → HTTP 405 — evidence: [artifacts/xmlrpc.php.xml](artifacts/xmlrpc.php.xml)
- `/wp-json/` → HTTP 200 — evidence: [artifacts/wp-json.json](artifacts/wp-json.json)
- `/wp-includes/js/wp-emoji-release.min.js?ver=6.4.3` → HTTP 200 — evidence: [artifacts/wp-emoji.js](artifacts/wp-emoji.js)
- `/wp-content/plugins/hello-dolly/hello.js` → HTTP 200 — evidence: [artifacts/hello-dolly.js](artifacts/hello-dolly.js)
- `/wp-content/themes/twentytwentyfour/style.css` → HTTP 200 — evidence: [artifacts/theme-style.css](artifacts/theme-style.css)

Theme stylesheet Theme Name / Version headers are in theme CSS artifacts when probed.
XML-RPC HTTP 405 is an expected discovery signal in this lab.

## APIs surface

- `/swagger-ui.html` → HTTP 200 — evidence: [artifacts/swagger-ui.html](artifacts/swagger-ui.html)
- `/openapi.json` → HTTP 200 — evidence: [artifacts/openapi.json](artifacts/openapi.json)
- `/graphql` → HTTP 200 — evidence: [artifacts/graphql.json](artifacts/graphql.json)
- `/actuator/health` → HTTP 200 — evidence: [artifacts/actuator-health.json](artifacts/actuator-health.json)
- `/api/v1/status` → HTTP 200 — evidence: [artifacts/api-v1-status.json](artifacts/api-v1-status.json)
- `/api/v1/users` → HTTP 200 — evidence: [artifacts/api-v1-users.json](artifacts/api-v1-users.json) — CORS: *
- `/static/app.js` → HTTP 200 — evidence: [artifacts/static-app-api.js](artifacts/static-app-api.js)

### Exposure indicators (document only — do not exploit)

- GraphQL introspection: disabled stub ([artifacts/graphql.json](artifacts/graphql.json))
- Unauthenticated list route: `/api/v1/users` → HTTP 200 (artifacts/api-v1-users.json)
- Actuator health publicly reachable when this pack is selected
- Nested `/api/v1/...` linked from JS (see static app artifact)
- Record CORS / verbose error headers from `.headers.json` sidecars when present

## Documents surface

- `/robots.txt` → HTTP 200 — evidence: [artifacts/robots-docs.txt](artifacts/robots-docs.txt)
- `/sitemap.xml` → HTTP 200 — evidence: [artifacts/sitemap-docs.xml](artifacts/sitemap-docs.xml)
- `/documents/notes.txt` → HTTP 200 — evidence: [artifacts/notes.txt](artifacts/notes.txt)
- `/documents/readme.md` → HTTP 200 — evidence: [artifacts/readme.md](artifacts/readme.md)
- `/documents/inventory.csv` → HTTP 200 — evidence: [artifacts/inventory.csv](artifacts/inventory.csv)
- `/documents/manifest.json` → HTTP 200 — evidence: [artifacts/manifest.json](artifacts/manifest.json)
- `/docs/public-overview.pdf` → HTTP 200 — evidence: [artifacts/public-overview.pdf](artifacts/public-overview.pdf)
- `/uploads/` → HTTP 200 — evidence: [artifacts/uploads-index.html](artifacts/uploads-index.html)
- `/backups/config.bak.txt` → HTTP 200 — evidence: [artifacts/config.bak.txt](artifacts/config.bak.txt)
- `/.git/HEAD` → HTTP 200 — evidence: [artifacts/git-HEAD.txt](artifacts/git-HEAD.txt)

`.git/HEAD` indicator only (no objects, no packs): HTTP 200 → [artifacts/git-HEAD.txt](artifacts/git-HEAD.txt).

## Discovery artifacts

| Pack | Path | Status | Artifact |
| --- | --- | --- | --- |
| Core | `/robots.txt` | 200 | artifacts/robots.txt |
| Core | `/sitemap.xml` | 200 | artifacts/sitemap.xml |
| Core | `/` | 200 | artifacts/index.html |
| Core | `/static/app.js` | 200 | artifacts/static-app.js |
| Core | `/phpinfo-stub.html` | 200 | artifacts/phpinfo-stub.html |
| Core | `/index.php` | 200 | artifacts/index.php.html |
| Core | `/app.php` | 200 | artifacts/app.php.html |
| WordPress | `/readme.html` | 200 | artifacts/readme.html |
| WordPress | `/xmlrpc.php` | 405 | artifacts/xmlrpc.php.xml |
| WordPress | `/wp-json/` | 200 | artifacts/wp-json.json |
| WordPress | `/wp-includes/js/wp-emoji-release.min.js?ver=6.4.3` | 200 | artifacts/wp-emoji.js |
| WordPress | `/wp-content/plugins/hello-dolly/hello.js` | 200 | artifacts/hello-dolly.js |
| WordPress | `/wp-content/themes/twentytwentyfour/style.css` | 200 | artifacts/theme-style.css |
| API | `/swagger-ui.html` | 200 | artifacts/swagger-ui.html |
| API | `/openapi.json` | 200 | artifacts/openapi.json |
| API | `/graphql` | 200 | artifacts/graphql.json |
| API | `/actuator/health` | 200 | artifacts/actuator-health.json |
| API | `/api/v1/status` | 200 | artifacts/api-v1-status.json |
| API | `/api/v1/users` | 200 | artifacts/api-v1-users.json |
| API | `/static/app.js` | 200 | artifacts/static-app-api.js |
| Documents | `/robots.txt` | 200 | artifacts/robots-docs.txt |
| Documents | `/sitemap.xml` | 200 | artifacts/sitemap-docs.xml |
| Documents | `/documents/notes.txt` | 200 | artifacts/notes.txt |
| Documents | `/documents/readme.md` | 200 | artifacts/readme.md |
| Documents | `/documents/inventory.csv` | 200 | artifacts/inventory.csv |
| Documents | `/documents/manifest.json` | 200 | artifacts/manifest.json |
| Documents | `/docs/public-overview.pdf` | 200 | artifacts/public-overview.pdf |
| Documents | `/uploads/` | 200 | artifacts/uploads-index.html |
| Documents | `/backups/config.bak.txt` | 200 | artifacts/config.bak.txt |
| Documents | `/.git/HEAD` | 200 | artifacts/git-HEAD.txt |

## Failed and skipped checks

- None material. XML-RPC HTTP 405 is an expected discovery signal, not a failure.

## Follow-up

- Phase B live assessment requires a host named by the operator and explicit written scope.
- Public accessibility of fixture files is not an exploitable finding.
- Zero-Exploitation remains in force: discovery and documentation only.
- To re-run a subset: `node scripts/fixture-dry-run.mjs --packs core,api`
