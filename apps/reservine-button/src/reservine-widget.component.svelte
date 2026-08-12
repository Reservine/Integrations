<svelte:options customElement="reservine-widget" immutable={true} />

<script lang="ts">
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';

  export let reservationUrl: string = '';

  const iframeSrc = writable('');
  const pendingIframeSrc = writable('');

  let initialUrl = `${reservationUrl}`;

  if (typeof window !== 'undefined') {
    const url = new URL(initialUrl);

    // Parse the current window's URL to check for the "promo" query parameter
    const queryParams = new URLSearchParams(window.location.search);
    const promo = queryParams.get('promo');

    if (promo) {
      url.searchParams.set('promo', promo);
    }

    initialUrl = url.toString();
  }

  iframeSrc.set(initialUrl);

  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'reservine-navigation') {
      pendingIframeSrc.set(event.data.route);
    }
  };

  onMount(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  });


  // NOTE: this component renders nothing but a fully inline-styled <iframe> inside
  // its own shadow root, so it deliberately injects NO stylesheet into the host
  // page. (It used to inject the drawer/modal stylesheet, none of which it uses.)
</script>


<iframe title="'Reservine'" allow="payment" tabindex="-1" src={$iframeSrc}
        style="
                width: 100%!important;
                height: 100%!important;
                border: none;!important;
              ">
</iframe>




