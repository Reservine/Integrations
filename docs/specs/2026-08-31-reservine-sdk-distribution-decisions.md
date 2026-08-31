# Reservine SDK and Distribution — Decisions

## Summary

Reservine's booking button will become a production SDK with a single lean Svelte custom-element implementation, typed adapters for common frameworks, and Reservine-controlled distribution. The public npm package will be `@reservine/sdk`; compatible browser updates will be promoted through a versioned CloudFront channel at `cdn.reservine.io` while exact releases remain immutable and roll-backable.

## Decisions

| # | Decision | Call | Why |
|---|---|---|---|
| 1 | SDK architecture | Compile one Svelte implementation to a standards-based custom element and wrap it with thin adapters | Preserves the small widget while preventing framework implementations from drifting |
| 2 | Package surface | `@reservine/sdk` for framework-neutral APIs and `@reservine/sdk/react`, `/vue`, `/svelte`, and `/angular` subpath exports | Gives every framework first-class types without imposing its runtime on other consumers |
| 3 | Component control | Support declarative `open`, `onOpenChange`, and imperative `open()` / `close()` | Supports both the supplied button and custom site triggers |
| 4 | Update contract | Serve compatible updates through a `v1` channel and retain immutable exact-version assets | Enables automatic fixes with an intentional boundary for breaking changes and instant rollback |
| 5 | CDN endpoint | Use `cdn.reservine.io/sdk/v1.js` | Leaves the hostname useful for future Reservine SDK assets |
| 6 | Infrastructure | Define private S3, CloudFront, ACM, and release resources with AWS CDK in this repository | Keeps infrastructure typed, reviewable, reproducible, and beside its release workflow |
| 7 | DNS | Keep authoritative DNS at GoDaddy and add the CDK-provided validation and CDN CNAME records once | Avoids a risky whole-zone migration for one endpoint |
| 8 | Release authority | Protected GitHub release workflow with AWS OIDC and npm trusted publishing | Builds once, avoids long-lived credentials, verifies immutable artifacts, and promotes only after smoke tests |
| 9 | Repository tooling | Replace the obsolete Nx 17/pnpm release setup with a focused Bun workspace | Matches current project conventions and removes machinery that no longer helps this small SDK |
| 10 | Initial version | Publish `@reservine/sdk` as `1.0.0` and deprecate the old `reservine-button` package through a final compatibility release | Makes the new compatibility contract explicit while preserving a migration path |

Rollout note (2026-08-31): production starts with the controlled `v1.js` browser channel. npm publication and trusted-publisher activation are deferred to a later phase; package source and adapters remain ready without being part of the current release workflow.
| 11 | Framework window | Before npm publishing is enabled, test current and previous practical majors: React 18/19, Vue 3, Svelte 4/5, and the supported modern Angular range | Covers normal production sites without turning the SDK into a legacy framework project; npm publishing was explicitly deferred from this CDN-first release |
| 12 | Rollout | Canary on MyTimeGym, then migrate MyZoneGym, then update Reservine-generated snippets | Limits blast radius while validating React and plain external embedding on real sites |

## Assumptions

- A typed widget-contract manifest is the source of truth for properties, events, methods, generated adapter bindings, declarations, and documentation tables.
- Existing element attributes and deprecated aliases remain compatible throughout the `v1` browser channel.
- Runtime code has no default analytics. CloudFront access logs and release health checks provide distribution observability.
- The stable channel loader has a short cache lifetime; release assets are content/version-addressed and immutable.
- Exact-version CDN URLs and npm versions remain available for consumers that require pinned artifacts or subresource integrity.
- `cdn.reservine.io` is currently unused: it has no A, AAAA, or CNAME record and does not resolve over HTTPS as of 2026-08-31.
- The public npm registry currently has no published `@reservine/sdk`; `@reservine` organization permission will be confirmed during authenticated setup.

## Architecture notes

```text
widget contract manifest
        |
        +--> Svelte custom element --> immutable browser bundle
        |                              +--> CDN v1 channel loader
        +--> shared TypeScript types
        +--> React / Vue / Svelte / Angular adapters
        +--> declaration, docs, and parity-test fixtures

GitHub release --> build and test once --> npm exact version
                                   +----> S3 exact version
                                   +----> smoke test --> promote v1 loader
```

CDK owns the AWS side. Because GoDaddy remains authoritative for `reservine.io`, setup emits the ACM validation CNAME and CloudFront alias CNAME for one-time DNS configuration.

## Open questions

- The AWS account/region and GitHub environment names will be selected from the authenticated account during provisioning.
- npm organization permission and trusted-publisher configuration require authenticated verification.
