<script lang="ts">
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';

  export let open: boolean = false;
  export let onOpenChange: ((open: boolean) => void) | undefined = undefined;

  const openStore = writable(open);

  $: openStore.set(open);
  $: if (onOpenChange) {
    onOpenChange($openStore);
  }

  setContext('modal', {
    open: openStore,
    close: () => {
      openStore.set(false);
      if (onOpenChange) onOpenChange(false);
    }
  });
</script>

<slot />
