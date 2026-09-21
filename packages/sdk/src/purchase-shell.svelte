<script lang="ts">
  /**
   * The ONE modal/drawer + iframe surface shared by `<reservine-button>` and
   * `<reservine-memberships>`: device detection (modal on desktop, drawer on
   * touch/small screens), the portaled iframe, the `reservine-navigation`
   * resume-where-you-were handling, the zoom-adjusted font size and the
   * shared document-level styles. Elements decide WHAT url to load (`buildUrl`)
   * and WHAT to do with element-specific messages (`onMessage`).
   */
  import * as Drawer from './components/drawer';
  import * as Modal from './components/modal';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';

  import { reservineButtonStyles } from './reservine-button.constants';
  import { getAdjustedFontSize } from './utils/reservine-integration.utils';
  import { IntegrationConstants, ResConsole } from './reservine.constants';

  /** Builds the iframe url; called on every open so late prop changes are honoured. */
  export let buildUrl: (adjustedFontSize?: number) => string;
  export let opened: boolean = false;
  export let disableUseOfAdjustedFontSize: boolean = false;
  /** Called whenever the open state flips (the element re-dispatches it on its host). */
  export let onOpenChange: (open: boolean) => void = () => {};
  /** Messages from the iframe origin that are not navigation messages. */
  export let onMessage: ((data: unknown) => void) | undefined = undefined;
  /** Render the built-in trigger button (`slot="trigger"`); elements with their own CTAs pass false. */
  export let withTrigger: boolean = true;
  export let triggerClass: string = '';
  export let triggerStyle: string = '';

  const openState = writable(opened);
  const iframeSrc = writable('');
  const pendingIframeSrc = writable('');

  $: openState.set(opened);

  export function open(): void {
    handleOpenChange(true);
  }

  export function close(): void {
    handleOpenChange(false);
  }

  export function currentOrigin(): string {
    try {
      return new URL($iframeSrc).origin;
    } catch {
      return '';
    }
  }

  // Device detection: use modal on desktop (non-touch or >= 1024px), drawer on mobile/touch
  let useModal = false;
  let modalContentRef: { getContentElement(): Element | null } | undefined;
  let iframeElement: HTMLIFrameElement | undefined;

  const mountModalIframe = (slotContent: Element): void => {
    if (!iframeElement) {
      iframeElement = document.createElement('iframe');
      iframeElement.title = 'Reservine';
      iframeElement.allow = 'payment';
      iframeElement.style.cssText = 'width: 100%!important; height: 100%!important; border: none!important;background:black';

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width: 100%!important; height: 100%!important;';
      wrapper.appendChild(iframeElement);
      slotContent.appendChild(wrapper);
    }

    iframeElement.src = $iframeSrc;
  };

  const detectDevice = () => {
    const isDesktopSize = window.matchMedia('(min-width: 1024px)').matches;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    // Use modal if desktop size and NOT a touch device, otherwise use drawer
    useModal = isDesktopSize && !isTouchDevice;
  };

  // Handle iframe rendering for modal (outside shadow DOM)
  $: if (useModal && modalContentRef && $openState) {
    const slotContent = modalContentRef.getContentElement();
    if (slotContent) mountModalIframe(slotContent);
  } else if (!$openState && iframeElement) {
    // Clean up iframe when modal closes
    if (iframeElement.parentNode) {
      iframeElement.parentNode.parentNode?.removeChild(iframeElement.parentNode);
    }
    iframeElement = undefined;
  }

  iframeSrc.set(buildUrl());

  const handleMessage = (event: MessageEvent<unknown>) => {
    const origin = currentOrigin();
    if (!origin || event.origin !== origin) return;

    const message = parseReservineMessage(event.data);
    if (!message) return;

    if (message.type === IntegrationConstants.reservineNavigation) {
      const nextUrl = new URL(message.route, origin);
      if (nextUrl.origin === origin) {
        pendingIframeSrc.set(nextUrl.toString());
      }
      return;
    }

    onMessage?.(message);
  };

  type ReservineNavigationMessage = {
    type: typeof IntegrationConstants.reservineNavigation;
    route: string;
  };
  type ReservineMembershipPurchasedMessage = {
    type: typeof IntegrationConstants.reservineMembershipPurchased;
    orderId: number;
    planId: number;
  };
  type ReservineMessage = ReservineNavigationMessage | ReservineMembershipPurchasedMessage;

  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  const finiteNumber = (value: unknown): number | null => {
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(number) ? number : null;
  };

  /**
   * Only messages the Reservine app is known to post get through: a plain object
   * with a `reservine-` typed name whose payload matches that type's schema.
   * Unknown types and malformed payloads are dropped before `onMessage`.
   */
  const parseReservineMessage = (value: unknown): ReservineMessage | null => {
    if (!isPlainObject(value)) return null;
    const type = value.type;
    if (typeof type !== 'string' || !type.startsWith('reservine-')) return null;

    if (type === IntegrationConstants.reservineNavigation) {
      return typeof value.route === 'string' ? { type, route: value.route } : null;
    }

    if (type === IntegrationConstants.reservineMembershipPurchased) {
      const orderId = finiteNumber(value.orderId);
      const planId = finiteNumber(value.planId);
      return orderId !== null && planId !== null ? { type, orderId, planId } : null;
    }

    return null;
  };

  onMount(() => {
    injectMainStyles();
    detectDevice();

    const handleResize = () => detectDevice();

    window.addEventListener('message', handleMessage);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('resize', handleResize);
    };
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (opened !== isOpen) {
      opened = isOpen;
      onOpenChange(isOpen);
    }
    openState.set(isOpen);

    if (isOpen) {
      const adjustedFontSize = getAdjustedFontSize(IntegrationConstants.baseFontSize);
      updateVariableStyles(adjustedFontSize);

      const useAdjustedFontSize = adjustedFontSize !== IntegrationConstants.baseFontSize && !disableUseOfAdjustedFontSize;

      if (useAdjustedFontSize) {
        console.log(
          `%cReservine%c will use adjusted font size: %c${adjustedFontSize}px`,
          `color: ${ResConsole.blue}; font-weight: bold;`,
          'color: inherit;',
          `color: ${ResConsole.yellow}; font-weight: bold;`
        );

        console.log(
          `%cReservine:%c You can disable the use of adjusted font size by setting '%cdisableUseOfAdjustedFontSize%c' to '%ctrue%c'.`,
          `color: ${ResConsole.blue}; font-weight: bold;`,
          'color: inherit;',
          `color: ${ResConsole.green}; font-weight: bold;`,  // Property name in green
          'color: inherit;',
          `color: ${ResConsole.yellow}; font-weight: bold;`, // "true" in yellow
          'color: inherit;'
        );

        iframeSrc.set(buildUrl(adjustedFontSize));
      } else {
        console.log(
          `%cReservine%c will use default font size: %c${IntegrationConstants.baseFontSize}px`,
          `color: ${ResConsole.blue}; font-weight: bold;`,
          'color: inherit;',
          `color: ${ResConsole.yellow}; font-weight: bold;`
        );
        iframeSrc.set(buildUrl());
      }
    } else {
      pendingIframeSrc.update((pendingUrl) => {
        if (pendingUrl) iframeSrc.set(pendingUrl);
        return '';
      });
    }
  };

  const injectMainStyles = () => {
    if (!document.getElementById('reservine-button-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'reservine-button-styles';
      styleElement.textContent = reservineButtonStyles;
      document.head.appendChild(styleElement);
    }
  };

  const updateVariableStyles = (adjustedFontSize: number) => {
    let variableStyleElement = document.getElementById('reservine-variable-styles');

    // Create the style element if it doesn't exist
    if (!variableStyleElement) {
      variableStyleElement = document.createElement('style');
      variableStyleElement.id = 'reservine-variable-styles';
      document.head.appendChild(variableStyleElement);
    }

    // Update the font size only if it has changed
    const currentFontSize = variableStyleElement.getAttribute('data-adjusted-font-size');
    if (currentFontSize !== adjustedFontSize.toString()) {
      variableStyleElement.textContent = `:root { --reservine-font-size: ${adjustedFontSize}px; }`;
      variableStyleElement.setAttribute('data-adjusted-font-size', adjustedFontSize.toString());
    }
  };
</script>

{#if useModal}
  <Modal.Root bind:open={$openState} onOpenChange={handleOpenChange}>
    {#if withTrigger}
      <Modal.Trigger style={triggerStyle} class={triggerClass}>
        <slot name="trigger" />
      </Modal.Trigger>
    {/if}

    <Modal.Content bind:this={modalContentRef} onContentReady={mountModalIframe} />
  </Modal.Root>
{:else}
  <Drawer.Root bind:open={$openState} onOpenChange={handleOpenChange}>
    {#if withTrigger}
      <Drawer.Trigger style={triggerStyle} class={triggerClass}>
        <slot name="trigger" />
      </Drawer.Trigger>
    {/if}

    <Drawer.Content class="r-drawer-content">
      <div style="width: 100%!important; height: 100%!important;">
        <iframe
          title="Reservine"
          allow="payment"
          src={$iframeSrc}
          style="width: 100%!important; height: 100%!important; border: none!important;"
        ></iframe>
      </div>
    </Drawer.Content>
  </Drawer.Root>
{/if}
