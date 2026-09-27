# AI Security Reconnaissance Agent

Maintained by [aipieksel](https://github.com/aipieksel). Upstream credits and licenses remain with their respective authors.

AI Security Reconnaissance Agent helps an authorized assessor build an evidence-backed map of a target before deciding what needs closer review. It guides passive research, bounded discovery of exposed services, and a final inventory of assets and technologies. Its report records observations and scope rather than claiming to have exploited or proven vulnerabilities.

This repository supplies an agent preset and setup helpers for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Harness supplies the Web UI, model connection, sessions, and tools; the preset supplies the reconnaissance workflow. Use an existing Harness installation or launch a separate local instance with the helpers below. You need permission for the target and a configured model provider.

## How a mission works

1. Define the exact authorized host, allowed checks, request pace, and stop conditions.
2. Select the preset in a new Harness session and run passive research before bounded active discovery.
3. Review the generated `RECON_REPORT.md` and supporting evidence in the mission workspace before using them for any later assessment.

The workflow prohibits exploitation, authentication bypass, data changes, and service disruption. Discovered subdomains and third-party systems are leads until separately authorized.

## Already using DeepSeek Harness?

The reusable preset is in [`presets/ai-security-reconnaissance-agent/`](presets/ai-security-reconnaissance-agent/). It contains:

- `preset.yml`: the name and description displayed in DeepSeek Harness.
- `agent.cordis.yml`: the reconnaissance instructions and tool configuration.

Copy that entire folder into **the state directory used by your running Harness instance**, at `$DSH_HOME/.agent-presets/ai-security-reconnaissance-agent/`. If you have not configured `DSH_HOME`, Harness uses `$HOME/.dsh`. Check for an existing folder before copying; preserve any customizations. Keep your current model settings, credentials, and sessions in place.

Open **Settings → Agent presets**, select **AI Security Reconnaissance Agent** as the default, and start a new session in your chosen mission workspace. Configure a model under **Settings → Models** if you have not already done so. Submit the [mission example below](#run-a-mission) in that session.

## Run a separate local Harness instance

The included setup helpers install the preset into separate local state and launch the pinned DeepSeek Harness Web UI.

Requires macOS or Linux, pnpm **11.19.0**, Node.js **22.19+ within 22.x, or 24+**, and `bash`, `curl`, `wget`, `nc`, `dig`, `nslookup`, `whois`, and `jq`.

Install pnpm with `npm install -g pnpm@11.19.0` if needed.

Install missing tools through your normal package manager. On Debian/Ubuntu, the package names are `bash curl wget netcat-openbsd dnsutils whois jq`. On macOS, many are built in; Homebrew provides `wget`, `jq`, `whois`, and `bind` (for DNS tools).

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run doctor
pnpm run setup
pnpm start
```

The published runtime includes the artifacts needed here; dependency lifecycle scripts are skipped.

Open **http://127.0.0.1:3080**. In **Settings → Models**, configure your model provider and credential. In **Settings → Agent presets**, select **AI Security Reconnaissance Agent** as the default, then create a **new** session. Click **Choose workspace** and select the generated `missions` folder (or your configured mission directory). Check the selected preset before submitting the mission. An existing session retains its own composition.

## Run a mission

Use a target you own or have permission to assess:

```text
Reconnaissance mission: https://your-authorized-domain.example/
Perform full passive and active discovery. Document everything.

Scope: this hostname only, HTTP/HTTPS on ports 80 and 443.
Treat discovered subdomains and third-party infrastructure as leads, not authorized targets.
Use at most one request per second; stop on rate limits or service instability.
Do not attempt authentication, exploit vulnerabilities, or retrieve private data.
Save the report and supporting artifacts in the working directory.
Separate observations, inferences, failed checks, and coverage gaps.
```

Replace the example hostname before running a real mission. More detail and a report template are in [examples/mission.md](examples/mission.md) and [examples/report-template.md](examples/report-template.md).

## Where things live

| Path | Purpose |
| --- | --- |
| `presets/ai-security-reconnaissance-agent/` | Reconnaissance instructions, plugin composition, and display metadata |
| `scripts/` | Local installation, launch, dependency checks, and runtime verification |
| `.recon/` | Private Harness state, model settings, credentials, and sessions; ignored by Git |
| `missions/` | Working directory and mission output; ignored by Git |
| `examples/` | Sanitized mission and report templates |

`pnpm run setup` copies the preset into `.recon/.agent-presets/ai-security-reconnaissance-agent/`. Repeating it is safe when the files match. It refuses to replace modified files. To use separate state or a separate mission directory:

```sh
RECON_HOME="$HOME/.local/share/ai-security-reconnaissance-agent" \
RECON_WORKSPACE="$HOME/ai-security-reconnaissance-agent-missions/example" \
pnpm start --port 3085
```

The launcher sets `DSH_HOME` and `DSH_CWD` for its child process. It does not use or modify an existing Harness installation. `RECON_HOME` and `RECON_WORKSPACE` may point outside this checkout; protect and exclude those directories yourself.

## How it works

`preset.yml` names the preset. `agent.cordis.yml` supplies its persona and composes upstream plugins for persistent Bash and file editing. The model decides which commands to run and how to interpret their output. There is no separate hidden scanner or fixed pipeline.

The dependency is pinned to **`@deepseek-ai/dsh@0.1.1-rc.2`**, matching the source installation. DeepSeek Harness is a developer preview with breaking changes; test upgrades before changing the pin. Its generic `dsh --profile headless` command does **not** mount AI Security Reconnaissance Agent. Use the Web launch documented here.

See [architecture and limitations](docs/architecture.md), [source provenance](docs/provenance.md), and [verification](docs/verification.md).

## Boundaries and privacy

The zero-exploitation rule is a **prompt instruction**, not an enforced network allowlist, filesystem sandbox, or rate limiter. Shell tools run with the operating-system permissions of the Harness process. Use a dedicated account or isolated machine for real assessments, keep secrets outside the workspace, and supervise commands.

A model provider receives the conversation, tool results, and collected evidence. Harness stores session history and credentials in its state directory. Review provider retention settings and sanitize reports before sharing them. Do not expose the local Web server through a public interface or proxy without appropriate authentication.

Passive services can be unavailable, search pages can block automation, and technology fingerprints can be ambiguous. The preset has no dedicated search-engine API, no exhaustive-coverage guarantee, and no deterministic report guarantee. An HTTP 200 or public JavaScript asset proves a response was accessible; it does not prove privileged access or a vulnerability.

## Development

```sh
pnpm test
pnpm run test:runtime
```

The runtime test uses isolated temporary state and local fixtures. It needs no provider key and does not assess an external target. See [CONTRIBUTING.md](CONTRIBUTING.md).

AI Security Reconnaissance Agent is an independent project built on DeepSeek Harness. It is not an official DeepSeek product. Third-party attribution is in [NOTICE](NOTICE).

## License

[MIT](LICENSE). The upstream preset-pattern attribution is retained in [NOTICE](NOTICE).
