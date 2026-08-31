# Reservine SDK journeys · /e2e · base main..feat/reservine-sdk

The playground embeds real cross-origin Reservine tenant pages. Host-side tests verify element registration, user-visible modal/drawer state, event state, and iframe URLs. Booking application internals remain the responsibility of the Reservine application suite, so these journeys are client-only rather than backend-verified.

## Plain HTML custom element · stack: web · roles: [visitor]

entry: `/`

1. load both the Vite SDK playground and built `dist/cdn/sdk.js` artifact → `reservine-button` is registered
2. find the generated trigger → label is visible and actionable
3. activate it → one booking surface and one iframe appear
4. inspect iframe URL → tenant is `mytimegym.reservine.me`

testid-gaps: none
finding: controlled desktop `open()` intermittently renders the dialog without attaching its booking iframe; focused E2E case is `fixme`
backend-silent: cross-origin booking application has no host-side verification hook
verified: client-only · spec: `e2e/reservine-sdk.spec.ts`

## Desktop modal and controlled API · stack: web · roles: [visitor]

entry: `/` at desktop viewport

1. activate “Open programmatically” → modal becomes visible and output reads `open`
2. inspect modal → dialog semantics, close control, and booking iframe are present
3. activate close → modal disappears and output reads `closed`
4. reopen and press Escape → modal closes and focus returns to the initiating control

testid-gaps: none
backend-silent: cross-origin booking application has no host-side verification hook
verified: client-only · spec: `e2e/reservine-sdk.spec.ts`

## Mobile drawer · stack: web · roles: [visitor]

entry: `/` with mobile viewport and coarse pointer

1. activate the wrapped custom trigger → drawer becomes visible and output reads `open`
2. inspect drawer → close control and expected booking iframe are present
3. activate close → drawer disappears and output reads `closed`

testid-gaps: none
backend-silent: cross-origin booking application has no host-side verification hook
verified: client-only · spec: `e2e/reservine-sdk.spec.ts`
