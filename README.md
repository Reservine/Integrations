# Reservine integrations

This repository owns the public `@reservine/sdk` package, its framework adapters, the browser CDN artifact, and the AWS infrastructure that distributes it.

It is for developers of websites that embed Reservine booking (`<reservine-button>`) and membership checkout (`<reservine-memberships>`), in plain HTML or through the React, Vue, Svelte and Angular adapters. Existing `reservine-button` installations are served by the compatibility package; new integrations use `@reservine/sdk`.

Production releases currently publish only the browser bundle at `cdn.reservine.io`. npm publishing is deliberately deferred; the package and its adapters stay release-ready in this repository (`docs/releasing.md`).

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
bun run build
bun run test:packages
```

Test suites and the dev server run in the VM-backed Devbox; `devbox.yaml` is the canonical topology:

```text
devbox run test   # project-level verification: bun run release:verify, then the infra check, test and cdk synth
devbox up         # starts the sdk playground app
devbox url        # prints its address
```

## Browser installation

The compatible major channel updates automatically without crossing breaking SDK versions:

```html
<script defer src="https://cdn.reservine.io/sdk/v1.js"></script>
<reservine-button partner="mytimegym" text="Book now"></reservine-button>
```

See `packages/sdk/README.md` for framework usage, `docs/releasing.md` for provisioning, release, migration, and rollback operations, and `infra/README.md` for the AWS stack.
