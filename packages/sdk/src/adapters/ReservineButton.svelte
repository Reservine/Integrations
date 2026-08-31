<script lang="ts">
  import { onMount } from 'svelte';

  import type { ReservineButtonElement, ReservineButtonProps } from '../contract';
  import { RESERVINE_OPEN_CHANGE_EVENT } from '../contract';
  import { applyReservineProps, defineReservineElements, setReservineOpen } from '../element';

  export let config: ReservineButtonProps = {};
  export let onOpenChange: ((open: boolean) => void) | undefined = undefined;

  let element: ReservineButtonElement;

  $: if (element) applyReservineProps(element, config);

  onMount(() => {
    void defineReservineElements();
    const listener = (event: Event) => {
      onOpenChange?.((event as CustomEvent<{ open: boolean }>).detail.open);
    };
    element.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, listener);
    return () => element.removeEventListener(RESERVINE_OPEN_CHANGE_EVENT, listener);
  });

  export function open(): void {
    setReservineOpen(element, true);
  }

  export function close(): void {
    setReservineOpen(element, false);
  }
</script>

<reservine-button bind:this={element}>
  <slot />
</reservine-button>
