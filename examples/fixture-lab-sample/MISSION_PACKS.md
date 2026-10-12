# Mission packs selection

- Generated: 2026-10-01T23:53:06.749Z
- Mode: all packs
- Selected: Core (core), WordPress (wordpress), API (api), Documents (documents)
- Zero-Exploitation: discovery and documentation only

## Selected packs

### Core (`core`)

OSINT/job/blog/repo leads, DNS/CT (crt.sh), authorized port probes, tech fingerprint (headers/cookies/JS), robots.txt + sitemap.xml, common static paths, and PHP/stack signals (phpinfo-like stubs, framework headers/cookies, .php paths).

Report sections: Core, PHP / stack

### WordPress (`wordpress`)

generator meta, readme.html, wp-includes versioned assets, plugin asset paths, xmlrpc, wp-json routes, theme style.css headers. Discovery-only.

Report sections: WordPress

### API (`api`)

OpenAPI/Swagger HTML+JSON, GraphQL discoverable endpoint with introspection-disabled stub, Actuator health, nested /api/v1 from JS, plus exposure indicators (auth-required vs public, CORS/headers, verbose errors, unauthenticated list routes). Zero-exploitation.

Report sections: APIs

### Documents (`documents`)

robots/sitemap links to pdf/txt/md/csv/json, directory listing stubs, backup-looking filenames (harmless content), .git/HEAD indicator only (no object dump).

Report sections: Documents

## Agent preamble

Run only the selected packs. PHP/stack signals belong to **Core**.
Cite artifacts for every claim in RECON_REPORT.md.
