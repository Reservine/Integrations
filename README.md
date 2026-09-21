# Reservine integrations

This repository owns the public `@reservine/sdk` package, its framework adapters, the browser CDN artifact, and the AWS infrastructure that distributes it.

## Architecture

- `packages/sdk` — framework-neutral contract, the Svelte custom elements (`reservine-button`, `reservine-memberships`) and React/Vue/Svelte/Angular adapters
- `packages/reservine-button-compat` — final compatibility release for existing `reservine-button` consumers
- `infra` — AWS CDK stack for private S3 storage, CloudFront, TLS, and GitHub release identity
- `.github/workflows` — verification, atomic release promotion, and rollback

`packages/sdk/src/purchase-shell.svelte` is the single modal/drawer/iframe implementation; `reservine-button.component.svelte` and `reservine-memberships.component.svelte` are the only two UI elements built on it. Framework adapters map their native property, event, and ref conventions onto those elements and stay thin.

## Development

```text
bun install
bun run check
bun run test
bun run build
bun run test:packages
bun run dev
```

The playground runs on port 3333 locally. Project-level verification runs in the VM-backed Devbox with `devbox test`.

## Browser installation

The compatible major channel updates automatically without crossing breaking SDK versions:

```html
<script defer src="https://cdn.reservine.io/sdk/v1.js"></script>
<reservine-button partner="mytimegym" text="Book now"></reservine-button>
```

See `packages/sdk/README.md` for framework usage and `docs/releasing.md` for provisioning, release, migration, and rollback operations.
