<svelte:options customElement="reservine-button" immutable={true} />

<script lang="ts">
  import * as Drawer from './components/drawer';
  import * as Modal from './components/modal';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';

  import { reservineButtonStyles } from './reservine-button.constants';
  import { getAdjustedFontSize } from './utils/reservine-integration.utils';
  import { IntegrationConstants } from '@apps/shared/constants/integration.constants';
  import { ResConsole } from '@apps/shared/constants/console.constants';

  // Has to be same as ShareButtonSize in share-button-code.component.ts
  enum ButtonSize {
    Small = 'small',
    Medium = 'medium',
    Large = 'large',
  }

  // Has to be same as ShareButtonStyle in share-button-code.component.ts
  enum ButtonAppearance {
    Primary = 'primary',
    Text = 'text',
    Outline = 'outline',
  }

  enum ButtonWidth {
    Auto = 'auto',
    Full = 'full',
  }

  export let text: string = '';
  export let buttonText: string = ''; // For backwards compatibility

  export let reservationUrl: string = ''; // For backwards compatibility
  export let partner: string = '';
  export let reservineTheme: string = '';

  export let size: ButtonSize = ButtonSize.Medium;
  export let width: ButtonWidth = ButtonWidth.Auto;
  export let color: string = '#ffffff'; // Hex color only - for now
  export let borderRadius: string = '6px';

  export let asWrapper: boolean = false;

  export let appearance: ButtonAppearance = ButtonAppearance.Primary;
  export let branch: number | null = null;
  export let branchId: number | null = null; // For backwards compatibility
  export let service: number | null = null;
  export let employee: number | null = null;
  export let showGallery: boolean | null = null;
  export let disableUseOfAdjustedFontSize: boolean = false;

  if (color.length === 4) {
    color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }

  if (!borderRadius.includes('px')) {
    borderRadius = `${borderRadius}px`;
  }

  // Combine text and buttonText for backwards compatibility
  $: displayText = text || buttonText;

  branch = branch || branchId; // For backwards compatibility :(  Only MyTime and YourFitness

  const open = writable(false);
  const iframeSrc = writable('');
  const pendingIframeSrc = writable('');

  // Device detection: use modal on desktop (non-touch or >= 1024px), drawer on mobile/touch
  let useModal = false;
  let modalContentRef: any;
  let iframeElement: HTMLIFrameElement;

  const detectDevice = () => {
    const isDesktopSize = window.matchMedia('(min-width: 1024px)').matches;
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    // Use modal if desktop size and NOT a touch device, otherwise use drawer
    useModal = isDesktopSize && !isTouchDevice;
  };

  // Handle iframe rendering for modal (outside shadow DOM)
  $: if (useModal && modalContentRef && $open) {
    const slotContent = modalContentRef.getContentElement();
    if (slotContent && !iframeElement) {
      iframeElement = document.createElement('iframe');
      iframeElement.title = 'Reservine';
      iframeElement.allow = 'payment';
      iframeElement.tabIndex = -1;
      iframeElement.style.cssText = 'width: 100%!important; height: 100%!important; border: none!important;background:black';

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'width: 100%!important; height: 100%!important;';
      wrapper.appendChild(iframeElement);

      slotContent.appendChild(wrapper);
    }

    if (iframeElement) {
      iframeElement.src = $iframeSrc;
    }
  } else if (!$open && iframeElement) {
    // Clean up iframe when modal closes
    if (iframeElement.parentNode) {
      iframeElement.parentNode.parentNode?.removeChild(iframeElement.parentNode);
    }
    iframeElement = null as any;
  }

  /**
   * Constructs a proper URL ensuring no double slashes and adding cache busting
   * @param baseUrl - The base URL to start with
   * @param path - Optional path to append
   * @returns Properly formatted URL
   */
  const normalizeUrl = (baseUrl: string, path?: string): URL => {
    // Create URL object (handles relative URLs too by using current origin)
    let url: URL;
    try {
      // Try to parse as absolute URL
      url = new URL(baseUrl);
    } catch (e) {
      // If not absolute, prepend origin and try again
      url = new URL(baseUrl, window.location.origin);
    }

    // If path is provided, make sure we handle it correctly
    if (path) {
      // Ensure path starts with slash and doesn't create double slashes
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;

      // Ensure the pathname ends with a slash before appending
      let pathname = url.pathname;
      pathname = pathname.endsWith('/') ? pathname : `${pathname}/`;

      // Remove leading slash from path if it exists
      const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.substring(1) : normalizedPath;

      // Set the combined pathname
      url.pathname = `${pathname}${cleanPath}`;
    }

    return url;
  };

  const constructReservationUrl = (adjustedFontSize?: number) => {
    // Determine the base URL based on whether a partner is provided
    let baseUrl: string;

    if (partner) {
      baseUrl = `https://${partner}.reservine.me`;
    } else {
      baseUrl = reservationUrl;
    }

    // Create URL object from the determined base URL
    let url = normalizeUrl(baseUrl);

    // Add branch as a path parameter if provided
    if (branch) {
      // Create proper branch path
      url = normalizeUrl(url.toString(), `branch/${branch}`);
    }

    // Add service and employee as query parameters if provided
    if (service) url.searchParams.set(IntegrationConstants.service, service.toString());
    if (employee) url.searchParams.set(IntegrationConstants.employee, employee.toString());

    // Handle promo code from query parameters
    const queryParams = new URLSearchParams(window.location.search);
    const promo = queryParams.get(IntegrationConstants.promo) || queryParams.get('p');
    if (promo) {
      url.searchParams.set(IntegrationConstants.promo, promo);
    }

    if (reservineTheme) {
      url.searchParams.set(IntegrationConstants.reservineTheme, reservineTheme);
    }

    // Add showGallery if provided
    if (showGallery !== null) {
      url.searchParams.set(IntegrationConstants.showGallery, showGallery.toString());
    }

    // Add adjusted font size if provided
    if (adjustedFontSize) {
      url.searchParams.set(IntegrationConstants.adjustedFontSize, adjustedFontSize.toString());
    }

    // Add cache busting parameter with current timestamp
    url.searchParams.set('_cb', Date.now().toString());

    return url.toString();
  };

  iframeSrc.set(constructReservationUrl());

  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === IntegrationConstants.reservineNavigation) {
      pendingIframeSrc.set(event.data.route);
    }
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
    open.set(isOpen);

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

        iframeSrc.set(constructReservationUrl(adjustedFontSize));
      } else {
        console.log(
          `%cReservine%c will use default font size: %c${IntegrationConstants.baseFontSize}px`,
          `color: ${ResConsole.blue}; font-weight: bold;`,
          'color: inherit;',
          `color: ${ResConsole.yellow}; font-weight: bold;`
        );
        iframeSrc.set(constructReservationUrl());
      }
    } else {
      pendingIframeSrc.update((pendingUrl) => {
        if (pendingUrl) iframeSrc.set(pendingUrl);
        return '';
      });
    }
  };

  const getContrastColor = (hexColor) => {
    hexColor = hexColor.replace("#", "");
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000000" : "#FFFFFF";
  };

  const adjustBrightness = (hexColor, percent) => {
    hexColor = hexColor.replace("#", "");
    let r = parseInt(hexColor.substring(0, 2), 16);
    let g = parseInt(hexColor.substring(2, 4), 16);
    let b = parseInt(hexColor.substring(4, 6), 16);

    r = Math.min(255, Math.max(0, Math.round(r * (100 + percent) / 100)));
    g = Math.min(255, Math.max(0, Math.round(g * (100 + percent) / 100)));
    b = Math.min(255, Math.max(0, Math.round(b * (100 + percent) / 100)));

    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  };

  $: hoverColor = adjustBrightness(color, -10);
  $: textColor = getContrastColor(color);

  const buttonSizes: Record<ButtonSize, string> = {
    [ButtonSize.Small]: 'height: 2.5rem; font-size: 0.75rem; padding: 0 0.75rem;',
    [ButtonSize.Medium]: 'height: 3rem; font-size: 0.875rem; padding: 0 0.875rem;',
    [ButtonSize.Large]: 'height: 3.5rem; font-size: 1rem; padding: 0 1rem;',
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

<style>
  :global(.reservine-button) {
    position: relative;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    border-radius: var(--border-radius, 6px);

    &:hover {
      background-color: var(--hover-bg-color);
    }

    &.full-width {
      width: 100%;
    }
  }

  :global(.reservine-button.primary) {
    background-color: var(--bg-color);
    color: var(--text-color);
  }

  :global(.reservine-button.text) {
    background-color: transparent;
    color: var(--bg-color);

    &:hover {
      color: var(--hover-bg-color);
    }
  }

  :global(.reservine-button.outline) {
    background-color: transparent;
    color: var(--bg-color);
    border: 1px solid currentColor;

    &:hover {
      color: var(--hover-bg-color);
    }
  }
</style>

{#if useModal}
  <Modal.Root bind:open={$open} onOpenChange={handleOpenChange}>
    <Modal.Trigger
      style="--bg-color: {color}; --hover-bg-color: {hoverColor}; --text-color: {textColor}; --border-radius: {borderRadius}; {asWrapper ? 'all: unset; cursor:pointer;' : `${buttonSizes[size]}`}"
      class="{asWrapper ? 'as-wrapper' : `reservine-button ${appearance}`} {width === ButtonWidth.Full ? 'full-width' : 'auto-width'}"
    >
      {#if asWrapper}
        <slot />
      {:else}
        <span>{displayText}</span>
      {/if}
    </Modal.Trigger>

    <Modal.Content bind:this={modalContentRef} />
  </Modal.Root>
{:else}
  <Drawer.Root bind:open={$open} onOpenChange={handleOpenChange}>
    <Drawer.Trigger
      style="--bg-color: {color}; --hover-bg-color: {hoverColor}; --text-color: {textColor}; --border-radius: {borderRadius}; {asWrapper ? 'all: unset; cursor:pointer;' : `${buttonSizes[size]}`}"
      class="{asWrapper ? 'as-wrapper' : `reservine-button ${appearance}`} {width === ButtonWidth.Full ? 'full-width' : 'auto-width'}"
    >
      {#if asWrapper}
        <slot />
      {:else}
        <span>{displayText}</span>
      {/if}
    </Drawer.Trigger>

    <Drawer.Content class="r-drawer-content">
      <div style="width: 100%!important; height: 100%!important;">
        <iframe
          title="Reservine"
          allow="payment"
          tabindex="-1"
          src={$iframeSrc}
          style="width: 100%!important; height: 100%!important; border: none!important;"
        ></iframe>
      </div>
    </Drawer.Content>
  </Drawer.Root>
{/if}
