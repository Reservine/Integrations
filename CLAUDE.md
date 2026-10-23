# Reservine Integrations

The public Reservine browser SDK: `@reservine/sdk`, its framework adapters, the CDN bundle and the AWS stack that distributes it. README.md says who it serves and what ships today.

## Commands

Use Bun exclusively. Run test suites and the dev server through Devbox; `devbox.yaml` is the canonical topology.

```text
bun run check
bun run test
bun run build
bun run test:packages
devbox run test
```

`devbox run test` runs `bun run release:verify` (the four `bun run` scripts above) plus the `infra` check, test and `cdk synth`.

## Shared SDK architecture

`packages/sdk/src/contract.ts` is the source of truth for public widget props, events, element methods, defaults, and adapter property names. Change the contract first, then update every adapter and its parity tests in the same change.

`packages/sdk/src/purchase-shell.svelte` is the single modal/drawer/iframe implementation: device detection, the portaled `allow="payment"` iframe, `reservine-navigation` resume, the zoom-adjusted font size, the typed iframe-message gate and the document-level styles live there once. Both custom elements consume it — `reservine-button.component.svelte` (the booking button trigger + URL builder) and `reservine-memberships.component.svelte` (native plan cards + the checkout URL builder). Never re-implement modal, drawer or iframe behaviour in an element. React, Vue, Svelte, and Angular code under `packages/sdk/src/adapters` must remain thin lifecycle/property/event bridges; never reproduce booking or purchase behavior inside an adapter.

`defineReservineElements()` is SSR-safe and idempotent. Adapters render the element immediately and register it only in the browser. Frameworks expose an `open` configuration prop and `open()` / `close()` handles; the underlying custom element uses `opened` internally so its imperative `open()` method remains possible.

CDN release objects are immutable. Only `sdk/vX.js` and `sdk/canary.js` may be overwritten and invalidated. AWS infrastructure lives in `infra`; release and rollback logic lives in `.github/workflows`.

Read `docs/releasing.md` before release, rollback or provisioning work, and `infra/README.md` before changing `infra`.
