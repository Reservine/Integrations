<script lang="ts">
  import { onMount } from 'svelte';

  import type {
    ReservineMembershipPurchasedDetail,
    ReservineMembershipsElement,
    ReservineMembershipsProps
  } from '../contract.js';
  import { RESERVINE_MEMBERSHIP_PURCHASED_EVENT, RESERVINE_OPEN_CHANGE_EVENT } from '../contract.js';
  import {
    applyReservineMembershipsPropsWhenReady,
    defineReservineElements,
    setReservineOpen
  } from '../element.js';

  export let config: ReservineMembershipsProps = {};
  export let onOpenChange: ((open: boolean) => void) | undefined = undefined;
  export let onPurchased: ((detail: ReservineMembershipPurchasedDetail) => void) | undefined =
    undefined;

  let element: ReservineMembershipsElement;

  $: if (element) void applyReservineMembershipsPropsWhenReady(element, config);

  onMount(() => {
    void defineReservineElements();
    const openListener = (event: Event) => {
      onOpenChange?.((event as CustomEvent<{ open: boolean }>).detail.open);
    };
    const purchasedListener = (event: Event) => {
      onPurchased?.((event as CustomEvent<ReservineMembershipPurchasedDetail>).detail);
    };
    element.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, openListener);
    element.addEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, purchasedListener);
    return () => {
      element.removeEventListener(RESERVINE_OPEN_CHANGE_EVENT, openListener);
      element.removeEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, purchasedListener);
    };
  });

  export function open(planId?: number): void {
    if (planId === undefined) setReservineOpen(element, true);
    else if (typeof element.open === 'function') element.open(planId);
    else element.opened = true;
  }

  export function close(): void {
    setReservineOpen(element, false);
  }

  export function refresh(): void {
    element.refresh();
  }
</script>

<reservine-memberships bind:this={element}></reservine-memberships>
