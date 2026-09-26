# Contributing

Read the README and architecture notes before changing the preset. Preserve evidence-based reporting and its non-exploitation scope. Never add real target reports, secrets, session state, or provider credentials as fixtures.

Run `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm test`, and `pnpm run test:runtime`. Use local fixtures for automated checks. A live model or third-party assessment requires a separately defined scope; passing fixture tests does not measure reconnaissance quality.

When changing runtime versions, verify preset discovery, new-session mounting, both tools, launch/shutdown, and the documented setup from a fresh export. Update provenance if the original preset changes. Submit focused changes with the reason, test results, and limitations.
