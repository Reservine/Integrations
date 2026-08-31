# @reservine/sdk

The official typed SDK for embedding Reservine booking experiences. A single lean Svelte custom element powers the browser integration and the React, Vue, Svelte, and Angular adapters.

## React

```tsx
import { ReservineButton } from '@reservine/sdk/react';

<ReservineButton
  partner="mytimegym"
  text="Book now"
  onOpenChange={(open) => console.log(open)}
/>;
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
