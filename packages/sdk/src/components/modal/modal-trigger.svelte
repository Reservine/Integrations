<script lang="ts">
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  const { open } = getContext<{ open: Writable<boolean> }>('modal');

  function handleClick() {
    open.set(true);
  }
</script>

<button on:click={handleClick} {...$$restProps}>
  <slot />
</button>
