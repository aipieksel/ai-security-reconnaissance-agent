# Reconnaissance report

- Target and authorized scope:
- Start and end time (UTC):
- Request limits and stopping conditions:
- Model and Harness version:
- Zero-Exploitation confirmation: discovery-only; no exploits, sprays, or data changes

## Overview

Summarize the exposed assets, supported findings, and material coverage gaps.

## Asset inventory

| Asset | Source | Observed address or service | In scope? | Evidence |
| --- | --- | --- | --- | --- |
| | | | | |

## Technology map

| Layer | Observation | Confidence and alternative explanations | Evidence |
| --- | --- | --- | --- |
| | | | |

## WordPress surface

Public-evidence fingerprints only (generator meta, readme.html, wp-includes /
wp-content paths, plugin asset paths, xmlrpc.php presence, `/wp-json/` when
publicly readable). No credential attempts.

| Check | URL / path | Status | Observation | Evidence |
| --- | --- | --- | --- | --- |
| | | | | |

## PHP / stack signals

Headers, cookies, error pages, robots/sitemap/HTML/JS `.php` hints, and
framework fingerprints (Laravel, Symfony, etc.). Flag exposure severity.
Never craft payloads.

| Indicator | Source | Severity | Notes | Evidence |
| --- | --- | --- | --- | --- |
| | | | | |

## API endpoints

Expanded discovery from HTML/JS crawl (one-level, authorized host), sitemaps,
`.well-known`, Swagger/OpenAPI/Redoc, GraphQL, Actuator. Rate ≤1 rps.

| Endpoint | How found | Status | Notes | Evidence |
| --- | --- | --- | --- | --- |
| | | | | |

## Documents / text artifacts

Publicly linked or guessable docs (pdf/doc/docx/txt/md/csv/json/xml),
env-looking names, backups, READMEs, changelogs, licenses, directory listings,
and `.git` *indicators* only (do not dump objects). Record path, status, and
snippet hash — not bulk private data.

| Path | Status | Snippet hash | Notes | Evidence |
| --- | --- | --- | --- | --- |
| | | | | |

## Discovery artifacts

For each check: timestamp, URL/host, command, status or error, and relative artifact filename. Redact credentials, cookies, personal data, and private content before sharing.

## Failed and skipped checks

Record blocked sources, redirects out of scope, missing tools, rate limits, and untested services.

## Follow-up

List questions and separately authorized verification steps. Public accessibility alone is not an exploitable finding.
