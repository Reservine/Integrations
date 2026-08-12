<script lang="ts">
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  const { open } = getContext<{ open: Writable<boolean> }>('modal');

  // Mirrors the drawer trigger's API so callers can bind to the rendered button.
  export let el: HTMLButtonElement | undefined = undefined;

  function handleClick() {
    open.set(true);
  }
</script>

<button bind:this={el} on:click={handleClick} {...$$restProps}>
  <slot />
</button>
