# OSINT fixtures (Phase A — synthetic)

Static files for the **`osint`** mission pack. Dry-run reads these from disk; no loopback HTTP probes and **no outbound HostAfrica (or other production) traffic**.

| File | Role |
| --- | --- |
| `dork-serp.json` | Fake SERP URLs + dork query templates |
| `crtsh.json` | Synthetic CT / crt.sh-style rows (SANs: www/api/panel/cdn/legacy) |
| `doh.json` | Stub DoH A/TXT answers (RFC 5737 docs IPs); NXDOMAIN for `legacy.` |
| `wayback-cdx.json` | CDX-like archive index rows |
| `github-code-hits.json` | Fake code-search hits (`EXAMPLE_API_KEY=fixture-not-real` only) |
| `bff-map.json` | BFF/edge map summary |
| `app.bundle.js` | Public JS with `fetch("/api/v1/status")` + `VITE_API_BASE` |
| `headers-public.json` | Synthetic CDN/CORS/WAF header telltales |

**Domains:** `example.com` / `fixture-lab.local` placeholders only. Do not invent HostAfrica findings from these files.

**Live adapters:** optional behind `--live-osint` (default **off**). Fixture tests must stay offline.

**Technique catalog (required fold):** `/workspace/ai-security-agent-build/SCOUT-passive-osint-techniques.md` (P0 order §C). Reviewer packet: `/workspace/ai-security-agent-build/REVIEWER-passive-osint-extend.md`.

**Policy:** Zero-Exploitation. Leak section: **report-don't-auth**. Active HostAfrica remains hold until written expand from security@hostafrica.com.
