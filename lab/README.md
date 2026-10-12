# Phase A fixture lab

Static tree in `www/`, served by `../scripts/lab-server.mjs` on **127.0.0.1 only**.

```sh
pnpm run lab                 # http://127.0.0.1:8765
pnpm run lab:dry-run -- --all
pnpm run lab:dry-run -- --packs core,wordpress
```

Surfaces: WordPress, PHP/stack (Core pack), API, Documents. Discovery-only.

Passive **OSINT** fixtures live under [`osint/`](osint/) (static files, no HTTP server, no live
HostAfrica). Run `pnpm run lab:dry-run -- --packs osint`. See [`../packs/osint.md`](../packs/osint.md).
