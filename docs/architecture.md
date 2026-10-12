# Architecture and limitations

The launcher starts the pinned upstream Web profile with an isolated Harness home and a mission workspace. The profile discovers user presets from `$DSH_HOME/.agent-presets/`. Selecting AI Security Reconnaissance Agent for a new session mounts these rows:

| Row | Upstream component | Role |
| --- | --- | --- |
| `persona` | `@deepseek-ai/dsh-persona` | Three-phase research and reporting instructions |
| `persistent-shell` | Cordis group, terminal, terminal-bash, tool-bash-persistent | Persistent Bash, five-minute command timeout |
| `filesystem` | Cordis group, fs-local, tool-str-replace-editor | Workspace file access and precise edits |

The `isolate` entries separate Cordis services. They are not OS containers. `fs-local.cwd` uses the trusted Cordis `!!js` expression `process.env.DSH_CWD ?? process.cwd()`. Do not run untrusted preset compositions.

The persona uses `complete: true` and `includeRuntimeContext: false`, preserving the original source. It replaces the composed system prompt and suppresses default runtime context. Scope, evidence standards, and operating limits should be explicit in the mission message; do not assume another preset's instructions apply.

The host profile owns model routing, credentials, session persistence, approvals, and the Web UI. The preset supplies the model-facing Bash and editor tools. Operating-system commands are external dependencies, not bundled scanner implementations. No dedicated browser or web-search tool is installed by AI Security Reconnaissance Agent.

The upstream headless bundle creates its agent without the Web preset roster. Merely setting `DSH_HOME` and using `dsh --profile headless` does not activate AI Security Reconnaissance Agent. This package deliberately documents the existing Web workflow.

Installation copies only the two preset files. Existing differing files fail without replacement. The default state and mission folders are Git-ignored; external paths need their own access controls and backup policies. This project has no deployment, service-restart, remote-upload, or GitHub-publish action.

React and React DOM are both pinned to 18.3.1 to satisfy the published runtime dependencies. Unconstrained peer resolution otherwise selected React DOM 19 alongside React 18. The lockfile records the verified combination.

## Phase A fixture lab

Local discovery validation lives under `lab/www/` and is served only on
`127.0.0.1` by `scripts/lab-server.mjs`. `scripts/fixture-dry-run.mjs` performs a
rate-limited, discovery-only crawl and writes `missions/fixture-lab/RECON_REPORT.md`
with WordPress, PHP/stack, APIs, and Documents sections plus artifact citations.
The lab is not an exploitation range: no payloads, sprays, fuzzing, or git object
dumps. Live (Phase B) targets require an explicitly authorized host and scope.

## Mission packs

Discovery is split into named packs registered in `packs/registry.json`:
**Core** (includes PHP/stack), **WordPress**, **API**, and **Documents**.
Operators select all or a subset via `scripts/mission-packs.mjs`; the dry-run
harness honors `--all` / `--packs`. Adding a fifth pack is an append to the
registry plus optional lab fixtures — no persona hard-coding required beyond
honoring `MISSION_PACKS.md`.
