# Pack: OSINT (`osint`)

Deep **passive** OSINT in one selection. Discovery/documentation only — Zero-Exploitation unchanged.

## Passive vs active (hard split)

- **Passive (this pack):** search-dork templates, Certificate Transparency (crt.sh), DNS/subdomain from public resolvers (DoH), web archives (Wayback CDX), public leak hunting, and BFF/edge mapping from public JS/headers. Reads static fixtures under `lab/osint/`; no attack traffic.
- **Active (NOT this pack):** port scans, path spraying, fuzzing, auth testing, exploit payloads. Those stay in the authorized loopback lab only.
- **Active against HostAfrica: on hold.** The published VDP binds (own accounts, 10 req/s, safe harbour) until the operator has **written** expand from security@hostafrica.com. This pack sends **no** live HostAfrica (or other production) traffic, and the dry-run hard-refuses any target hostname matching `/hostafrica/i`.

## `--live-osint` (default OFF)

Fixture tests run fully offline. With `--live-osint` the optional adapters (crt.sh, Wayback, DoH, GitHub code search) may query **public aggregators** for a placeholder apex — never HostAfrica. Default off keeps `pnpm test` / `test:fixture` deterministic and quiet.

```sh
pnpm run lab:dry-run -- --packs osint                 # fixtures only (default)
pnpm run lab:dry-run -- --packs osint --live-osint    # opt-in public-aggregator adapters (never HostAfrica)
pnpm run packs -- --all                               # includes osint
```

## Report sections (Scout P0 order)

1. **OSINT / Dorks** — query templates + discovered URLs (never claim index completeness).
2. **OSINT / CT** — crt.sh SAN inventory; CT-observed names separated from DoH-resolving names; wildcards stripped.
3. **OSINT / DNS** — DoH A/TXT answers; CT ∪ DoH join; NXDOMAIN flagged as dangling/takeover *candidate* only (no claim without Phase B).
4. **OSINT / Archives** — Wayback CDX historical path surface (archives ≠ current).
5. **OSINT / Leaks** — query shapes + fixture hits; prints **report-don't-auth** (record reference, never authenticate or reuse a value). Fake secrets only.
6. **OSINT / BFF-edge** — API bases from public JS, env prefixes, CORS/CDN/WAF header telltales (observation, not an abuse recipe).

## Honesty limits

CT ≠ live DNS; dorks ≠ complete index; archives ≠ current; leak hits ≠ "creds work". OSINT maps candidates; active verification stays locked to written RoE.

## Sources

- Technique catalog (folded): `/workspace/ai-security-agent-build/SCOUT-passive-osint-techniques.md`
- Reviewer brief: `/workspace/ai-security-agent-build/REVIEWER-passive-osint-extend.md`
- Fixtures + provenance: [`lab/osint/README.md`](../lab/osint/README.md)
