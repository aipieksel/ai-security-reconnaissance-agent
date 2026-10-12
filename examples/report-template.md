# Reconnaissance report

- Target and authorized scope:
- Mission packs selected: [all | list]
- Start and end time (UTC):
- Request limits and stopping conditions:
- Model and Harness version:

## Overview

Summarize the exposed assets for the **selected packs**, supported findings, and coverage gaps.

## Asset inventory

| Asset | Source | Observed address or service | In scope? | Evidence |
| --- | --- | --- | --- | --- |
| | | | | |

## Technology map

| Layer | Observation | Confidence and alternative explanations | Evidence |
| --- | --- | --- | --- |
| | | | |

## Core surface

(Include when Core pack selected.) OSINT/DNS leads, fingerprint, robots/sitemap, static paths.

### PHP / stack (under Core)

phpinfo-like stubs (document only), framework headers/cookies, `.php` paths. Cite artifacts.

## WordPress surface

(Include when WordPress pack selected.) generator meta, readme.html, assets, xmlrpc, wp-json, theme headers. Cite artifacts.

## APIs surface

(Include when API pack selected.) OpenAPI/Swagger, GraphQL introspection state, Actuator, `/api/v1`, exposure indicators (public vs auth-required, CORS, verbose errors). Document only — do not exploit. Cite artifacts.

## Documents surface

(Include when Documents pack selected.) robots/sitemap document links, directory listings, backup-looking names, `.git/HEAD` text only. Cite artifacts. Do not dump git objects.

## Discovery artifacts

For each check: timestamp, URL/host, command, status or error, and relative artifact filename. Redact credentials, cookies, personal data, and private content before sharing.

## Failed and skipped checks

Record blocked sources, redirects out of scope, missing tools, rate limits, and untested services / unselected packs.

## Follow-up

List questions and separately authorized verification steps. Public accessibility alone is not an exploitable finding. Zero-Exploitation remains in force.
