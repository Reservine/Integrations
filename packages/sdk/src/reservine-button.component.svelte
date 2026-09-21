<svelte:options customElement="reservine-button" immutable={true} />

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import PurchaseShell from './purchase-shell.svelte';
  import { IntegrationConstants } from './reservine.constants';

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
  export let opened: boolean = false;

  const dispatch = createEventDispatcher<{ 'reservine-open-change': { open: boolean } }>();

  if (color.length === 4) {
    color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }

  if (!borderRadius.includes('px')) {
    borderRadius = `${borderRadius}px`;
  }

  // Combine text and buttonText for backwards compatibility
  $: displayText = text || buttonText;

  branch = branch || branchId; // For backwards compatibility :(  Only MyTime and YourFitness

  let shell: PurchaseShell | undefined;

  export function open(): void {
    shell?.open();
  }

  export function close(): void {
    shell?.close();
  }

  const handleOpenChange = (isOpen: boolean) => {
    dispatch('reservine-open-change', { open: isOpen });
  };

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

  const getContrastColor = (hexColor: string): string => {
    hexColor = hexColor.replace("#", "");
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000000" : "#FFFFFF";
  };

  const adjustBrightness = (hexColor: string, percent: number): string => {
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

<PurchaseShell
  bind:this={shell}
  bind:opened
  buildUrl={constructReservationUrl}
  {disableUseOfAdjustedFontSize}
  onOpenChange={handleOpenChange}
  triggerStyle="--bg-color: {color}; --hover-bg-color: {hoverColor}; --text-color: {textColor}; --border-radius: {borderRadius}; {asWrapper ? 'all: unset; cursor:pointer;' : `${buttonSizes[size]}`}"
  triggerClass="{asWrapper ? 'as-wrapper' : `reservine-button ${appearance}`} {width === ButtonWidth.Full ? 'full-width' : 'auto-width'}"
>
  <svelte:fragment slot="trigger">
    {#if asWrapper}
      <slot />
    {:else}
      <span>{displayText}</span>
    {/if}
  </svelte:fragment>
</PurchaseShell>
