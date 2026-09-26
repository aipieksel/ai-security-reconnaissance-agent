# Source provenance

Recovered on 2026-09-07 from the owner's running DeepSeek Harness installation.

The original recovered files had these SHA-256 fingerprints before the publication rename:

| File | SHA-256 |
| --- | --- |
| `agent.cordis.yml` | `30904f0d7a79a79b333f24e360095dbbba279912bc11917e0a4d63dbb2e2a96e` |
| `preset.yml` | `ee99dea71aecb2ea578427698d4567dc510f99851170d40f13cb1be3354593b5` |

The preset's comments identify the DeepSeek Harness minimal preset as its starting pattern. Upstream source: https://github.com/deepseek-ai/deepseek-harness, MIT license. The observed installed runtime is `@deepseek-ai/dsh@0.1.1-rc.2`. The source checkout and installed runtime are distinct; this package depends on the published runtime instead of copying an unrelated development checkout or its Git history.

The preset directory contains only the two files above. A separate mission workspace contains collected responses and reports, with no additional reusable shell/Python helper or package manifest found in the inspected workspace. Those target-specific artifacts, session records, provider settings, credentials, service wrappers, backups, and unrelated source changes are excluded.

The local installer, launcher, checks, templates, and publication documentation were added for this repository. For publication, the agent name, preset identifier, and display description were updated. The reconnaissance methodology and tool configuration are preserved. No change was deployed to the source server. Dependency provenance and resolved package integrity are recorded by `pnpm-lock.yaml`; upstream package licenses remain with their packages.

The installed macOS dependency manifests were reviewed for declared licenses. Most are MIT, Apache-2.0, BSD, or ISC. `argparse` declares Python-2.0; the optional Sharp libvips binary declares LGPL-3.0-or-later. No dependency binaries are committed here. Preserve their notices and review LGPL redistribution requirements if you later bundle a runtime or container.

Current distribution fingerprints after the publication rename:

- `agent.cordis.yml`: `08e240088093d73f5fffa52ab04d828658fc8646035664f8abc35a3f96ac51d8`
- `preset.yml`: `cb7b5ee39b3e856ff740b231ba33878421fc5297cb73efc5a859ef713c625bdf`
