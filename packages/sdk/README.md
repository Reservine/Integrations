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
