# Verification

Run `pnpm install --frozen-lockfile --ignore-scripts`, then:

```sh
pnpm run doctor
pnpm test
pnpm run test:runtime
pnpm run audit:release
```

`doctor` checks the Node/platform requirements, pinned runtime version, and named external commands. It does not read provider keys.

The unit checks cover byte-preserving and repeatable installation, refusal to overwrite edits or follow preset file links, and parsing the original Cordis YAML dialect without evaluating its JavaScript expression.

The runtime smoke starts the published Web runtime with temporary state and a synthetic local provider. It discovers and mounts AI Security Reconnaissance Agent, inspects the actual system prompt and tool schemas, executes Bash against one loopback HTTP fixture, verifies shell state survives a second call, creates a report through the file editor, and waits for session completion. Temporary processes and files are removed afterward. The test explicitly uses full access only in that scripted test process; it does not change the normal launcher's permission settings.

The release audit checks candidate files selected by Git ignore rules, distribution preset hashes, local Markdown links, private-state filenames, and common credential/private-source patterns. Manual review remains necessary before publication. No existing Git history is imported.

## Evidence limits

A scripted provider demonstrates runtime wiring and tool execution. It does not test a paid model's reasoning, open-ended reconnaissance quality, completeness, or adherence to instructions on hostile pages. Linux CI, a fresh clone from GitHub, and anonymous access cannot be claimed until those checks actually run. Local preparation creates neither a GitHub repository nor a public release.

On a disk-constrained local machine, `pnpm install --frozen-lockfile --ignore-scripts --package-import-method=hardlink` can reuse the local store without duplicating package files. The store and checkout must support hard links on the same filesystem. This does not reduce the runtime dependency set.

## Local verification on 2026-09-07

On macOS arm64 with Node 26.0.0: all four unit checks, dependency doctor, two complete local fixture missions, release-file audit, and React peer consistency checks passed. Before the publication rename, the browser rendered the Web UI and custom reconnaissance preset, and selecting it changed the default. The normal launcher remained bound to loopback. No real provider credential or third-party reconnaissance target was used.

A fresh source export on a separate local volume passed a frozen-lockfile install using the already downloaded package store, all four unit tests, doctor, the complete runtime fixture mission, release audit, and peer checks. It used a newly populated `node_modules`, not the development installation. This was an uncommitted source export, not a clone of a release commit. Internal-disk exhaustion prevented a second installation on that disk; no unrelated files were deleted.

After the publication rename, the installer tests, dependency checks, release audit, and complete runtime fixture mission were rerun successfully. The runtime test verifies the new preset identifier, displayed name, DeepSeek Harness description, and agent identity. Earlier browser and clean-export evidence predates this naming-only change.
