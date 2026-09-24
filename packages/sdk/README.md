# @reservine/sdk

The official typed SDK for embedding Reservine booking experiences. A single lean Svelte custom element powers the browser integration and the React, Vue, Svelte, and Angular adapters.

## Public API

Every adapter exposes the same typed configuration. Use `partner` for the tenant slug, or `reservationUrl` for an absolute booking URL. `branch`, `service`, and `employee` preselect the booking target; `text`, `appearance`, `size`, `width`, `color`, and `borderRadius` control presentation; `showGallery` controls gallery visibility; and `open` controls the booking surface declaratively.

React exposes typed `open()` and `close()` methods through its ref. Vue, Svelte, and Angular expose the same methods on their component instance. All adapters report changes through their native `openChange` callback/event.

## React

```tsx
import { useRef } from 'react';
import { ReservineButton, type ReservineButtonHandle } from '@reservine/sdk/react';

const button = useRef<ReservineButtonHandle>(null);

<ReservineButton
  ref={button}
  partner="mytimegym"
  text="Book now"
  onOpenChange={(open) => console.log(open)}
/>;

button.current?.open();
```

## Vue

```vue
<script setup lang="ts">
import { ReservineButton } from '@reservine/sdk/vue';
</script>

<template>
  <ReservineButton :config="{ partner: 'mytimegym', text: 'Book now' }" />
</template>
```

## Svelte

```svelte
<script lang="ts">
  import ReservineButton from '@reservine/sdk/svelte';
</script>

<ReservineButton config={{ partner: 'mytimegym', text: 'Book now' }} />
```

## Angular

Import the standalone `ReservineButtonComponent`, then use:

```html
<reservine-booking-button
  [config]="{ partner: 'mytimegym', text: 'Book now' }"
  (openChange)="handleOpenChange($event)"
></reservine-booking-button>
```

## Plain HTML

The compatible `v1` channel automatically receives non-breaking releases. Exact release paths remain available for pinned deployments.

```html
<script defer src="https://cdn.reservine.io/sdk/v1.js"></script>
<reservine-button partner="mytimegym" text="Book now"></reservine-button>
```

`window.ReservineSDK.version` reports the release the page is running (for example `1.1.1`).

## Memberships widget

`<reservine-memberships>` renders the tenant's membership plans as cards inside your own page and opens the Reservine checkout (login, billing, Apple/Google Pay, saved cards, 3DS) when a visitor clicks Buy.

**Prerequisite:** register your website's domain in Reservine › Settings › Public profile › Domains. The widget API only answers registered origins (unregistered ones get a `domain_not_registered` hint instead of cards), and the same registration enables Apple Pay on your domain.

Configuration, shared by every adapter:

| Prop | Meaning |
| --- | --- |
| `partner` | Tenant slug (required). |
| `plan` | Render only this plan's card (a single-plan call to action). |
| `branch` | Scope plans to a branch; omitted = default branch + tenant-wide plans. |
| `locale` | `cs` or `en`; defaults to the page language, then the tenant locale. |
| `theme` | `light`, `dark`, or `auto` (follows `prefers-color-scheme`). Cards inherit the tenant's Reservine palette by default. |
| `primary`, `radius`, `font` | Host overrides: brand hex, corner radius, font family (`inherit` adopts the page font). Forwarded into the checkout. |
| `successUrl` | After a successful purchase, close the checkout and navigate the top window here. Without it the success view stays open. |
| `buyText` | Buy button label override. |
| `apiUrl` | API origin override (defaults to the production API). |

Every adapter emits `openChange` (checkout opened/closed) and `purchased` with `{ orderId, planId }`; the plain element dispatches the same as the DOM events `reservine-open-change` and `reservine-membership-purchased`. For fine-grained styling set `--reservine-*` custom properties on the element; they win over both the tenant palette and the props.

Day-based plans (a 14-day pass) show their period in days since SDK 1.2.0: "Valid for 14 days", and a day subscription prices and counts uses per period ("/ 14 days", "8 uses every 14 days"). Earlier SDKs omit the validity row for day plans and still price a day subscription per month.

While plans load, the element shows one row of card-sized placeholders, `22.54125rem` tall. Reserve that height before the SDK script runs so the page never shifts:

```css
reservine-memberships:not(:defined) { display: block; min-height: 22.54125rem; }
```

### React

```tsx
import { useRef } from 'react';
import { ReservineMemberships, type ReservineMembershipsHandle } from '@reservine/sdk/react';

const memberships = useRef<ReservineMembershipsHandle>(null);

<ReservineMemberships
  ref={memberships}
  partner="mytimegym"
  plan={12}
  theme="dark"
  primary="#e11d48"
  radius="16px"
  font="inherit"
  successUrl="https://example.com/thanks"
  onPurchased={({ orderId, planId }) => console.log(orderId, planId)}
/>;

memberships.current?.open(12);
```

### Vue

```vue
<script setup lang="ts">
import { ReservineMemberships } from '@reservine/sdk/vue';
</script>

<template>
  <ReservineMemberships
    :config="{ partner: 'mytimegym', branch: 3, theme: 'auto', successUrl: '/thanks' }"
    @purchased="({ orderId, planId }) => track(orderId, planId)"
  />
</template>
```

### Svelte

```svelte
<script lang="ts">
  import { ReservineMemberships } from '@reservine/sdk/svelte';
</script>

<ReservineMemberships
  config={{ partner: 'mytimegym', plan: 12, primary: '#e11d48' }}
  onPurchased={(detail) => console.log(detail)}
/>
```

### Angular

Import the standalone `ReservineMembershipsComponent`, then use:

```html
<reservine-membership-plans
  [config]="{ partner: 'mytimegym', plan: 12, radius: '16px', successUrl: '/thanks' }"
  (purchased)="handlePurchased($event)"
></reservine-membership-plans>
```

### Plain HTML

```html
<script defer src="https://cdn.reservine.io/sdk/v1.js"></script>
<reservine-memberships partner="mytimegym"></reservine-memberships>

<reservine-memberships
  partner="mytimegym"
  plan="12"
  theme="dark"
  primary="#e11d48"
  radius="16px"
  font="inherit"
  success-url="https://example.com/thanks"
></reservine-memberships>

<script>
  document.querySelector('reservine-memberships')
    .addEventListener('reservine-membership-purchased', (event) => {
      console.log(event.detail.orderId, event.detail.planId);
    });
</script>
```
