# Mission packs registry

Named discovery packs the operator selects at mission start. Locked names:

| id | Name | Notes |
| --- | --- | --- |
| `core` | **Core** | Baseline recon + **PHP/stack signals** (not a separate pack) |
| `wordpress` | **WordPress** | WP discovery-only |
| `api` | **API** | OpenAPI/GraphQL/Actuator/nested API exposure indicators |
| `documents` | **Documents** | Public docs, listings, backup-looking names, `.git/HEAD` text only |
| `osint` | **OSINT** | Deep **passive** OSINT: dorks, CT, DoH DNS, Wayback, leak query shapes (report-don't-auth), BFF/edge. Fixtures under `lab/osint/`; `--live-osint` default off. No live HostAfrica |

## Passive vs active split

The `osint` pack is **passive only** and file-based (no HTTP probes; `"probes": []`). Its
fixtures live in `lab/osint/` and are copied into the mission `artifacts/`. Optional live
public-aggregator adapters sit behind `--live-osint` (**default off**). Active checks against
HostAfrica stay on **hold** until the operator has written expand from security@hostafrica.com; the
dry-run hard-refuses any target hostname matching `/hostafrica/i`. See `packs/osint.md`.

## Add a 6th pack

1. Append an object to `registry.json` → `packs` with `id`, `name`, `summary`, `reportSections`, `default`, and `probes[]`.
2. Optionally add `packs/<id>.md` with operator notes.
3. Extend the lab under `lab/www/` if new fixtures are needed.
4. Mention the pack in README + `examples/mission.md`.

`scripts/mission-packs.mjs` and `scripts/fixture-dry-run.mjs` load this registry; no hard-coded pack list beyond the schema.
