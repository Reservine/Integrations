<svelte:options customElement="reservine-widget" immutable={true} />

<script lang="ts">
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import { reservineButtonStyles } from './reservine-button.constants';

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


  const injectStyles = () => {
    if (!document.getElementById('reservine-button-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'reservine-button-styles';
      styleElement.textContent = reservineButtonStyles;
      document.head.appendChild(styleElement);
    }
  };


  onMount(() => {
    injectStyles();
  });
</script>


<iframe title="'Reservine'" allow="payment" tabindex="-1" src={$iframeSrc}
        style="
                width: 100%!important;
                height: 100%!important;
                border: none;!important;
              ">
</iframe>




