<svelte:options
  customElement={{
    tag: 'reservine-memberships',
    props: {
      apiUrl: { attribute: 'api-url' },
      branch: { type: 'Number' },
      buyText: { attribute: 'buy-text' },
      plan: { type: 'Number' },
      successUrl: { attribute: 'success-url' }
    }
  }}
  immutable={true}
/>

<script lang="ts">
  /**
   * `<reservine-memberships>` — the tenant's membership plans as native cards in
   * the host page (epic 880, D1/D2). The cards come from the public widget DTO;
   * "Buy" opens the shared purchase shell with an iframe into the tenant app's
   * chrome-less `/embed/memberships/:planId` route, so login, billing, Stripe
   * and the success view are the real ones. A purchase is re-emitted as the
   * `reservine-membership-purchased` DOM event; `successUrl` turns STAY into
   * REDIRECT (D5).
   */
  import { afterUpdate } from 'svelte';

  import PurchaseShell from './purchase-shell.svelte';
  import type {
    ReservineMembershipPlanKind,
    ReservineMembershipPurchasedDetail,
    ReservineMembershipsData,
    ReservineMembershipsTheme
  } from './contract.js';
  import { RESERVINE_MEMBERSHIP_PURCHASED_EVENT, RESERVINE_OPEN_CHANGE_EVENT } from './contract.js';
  import { IntegrationConstants } from './reservine.constants';
  import {
    formatMembershipPrice,
    membershipChecklist,
    membershipCopy,
    membershipPriceSuffix,
    resolveMembershipLocale,
    type MembershipLocale
  } from './utils/membership-copy.js';
  import {
    membershipBilling,
    membershipCardMaterial,
    membershipCards,
    membershipShelves,
    prefersDarkInk,
    type MembershipBilling,
    type MembershipCard
  } from './utils/membership-card.js';
  import { navigateTopWindow } from './utils/reservine-integration.utils';
  import { fetchWidgetData } from './utils/widget-request.js';

  export let partner: string = '';
  export let apiUrl: string = 'https://api.reservine.io';
  export let branch: number | null = null;
  export let plan: number | null = null;
  export let locale: string = '';
  export let theme: ReservineMembershipsTheme = 'auto';
  export let primary: string = '';
  export let radius: string = '';
  export let font: string = '';
  export let successUrl: string = '';
  export let buyText: string = '';
  export let opened: boolean = false;

  type Status = 'loading' | 'ready' | 'domain' | 'error';

  let root: HTMLDivElement | undefined;
  let shell: PurchaseShell | undefined;
  let data: ReservineMembershipsData | null = null;
  let status: Status = 'loading';
  let selectedPlanId: number | null = null;
  let requestToken = 0;
  /** The billing the clicked card's switch showed; null when `open()` is called without a card. */
  let selectedBilling: MembershipBilling | null = null;
  /** Each dual-sold card's switch position by plan id; absent = its first kind (subscription). */
  let billingChoice: Record<number, ReservineMembershipPlanKind> = {};
  /** The group filter chip: `all` or a shelf key. */
  let activeShelf = 'all';

  // --- data -----------------------------------------------------------------

  const widgetUrl = (): string => {
    const base = apiUrl.replace(/\/+$/, '');
    const url = new URL(`${base}/api/widget/${encodeURIComponent(partner)}/memberships`);
    if (branch) url.searchParams.set(IntegrationConstants.branch, String(branch));
    return url.toString();
  };

  /** `fresh` skips joining another instance's in-flight request for the same URL. */
  const load = async (fresh = false): Promise<void> => {
    if (!partner) {
      status = 'error';
      data = null;
      return;
    }
    const token = ++requestToken;
    status = 'loading';

    try {
      const response = await fetchWidgetData(widgetUrl(), fresh);
      if (token !== requestToken) return;

      const { body } = response;
      if (response.status === 403) {
        data = body?.data?.tenant ? { ...body.data, plans: [] } : null;
        status = 'domain';
        return;
      }
      if (!response.ok || !body?.data) {
        status = 'error';
        return;
      }
      data = body.data;
      status = 'ready';
    } catch {
      if (token === requestToken) status = 'error';
    }
  };

  /** Always a fresh request (the Retry button too), never another instance's in-flight one. */
  export function refresh(): void {
    void load(true);
  }

  // Re-fetch whenever the data-shaping props change (runs once on creation);
  // instances loading the same widget URL at the same time share one request.
  $: partner, branch, apiUrl, void load();

  $: visiblePlans = data
    ? plan != null
      ? data.plans.filter((item) => item.id === Number(plan))
      : data.plans
    : [];

  // --- cards + shelves --------------------------------------------------------

  $: cards = membershipCards(visiblePlans);
  // A single-plan call to action is never shelved.
  $: shelves = membershipShelves(cards, plan != null ? [] : (data?.groups ?? []));
  $: grouped = shelves.some((shelf) => shelf.group !== null);
  $: shownShelves = shelves.some((shelf) => shelf.key === activeShelf)
    ? shelves.filter((shelf) => shelf.key === activeShelf)
    : shelves;

  const cardKind = (
    card: MembershipCard,
    choice: Record<number, ReservineMembershipPlanKind>
  ): ReservineMembershipPlanKind => {
    const picked = choice[card.plan.id];
    return picked && card.kinds.includes(picked) ? picked : card.kinds[0];
  };

  const pickBilling = (planId: number, kind: ReservineMembershipPlanKind): void => {
    billingChoice = { ...billingChoice, [planId]: kind };
  };

  // --- locale + copy ----------------------------------------------------------

  $: resolvedLocale = resolveMembershipLocale(
    locale,
    typeof document !== 'undefined' ? document.documentElement.lang : '',
    data?.tenant.locale
  ) as MembershipLocale;
  $: copy = membershipCopy(resolvedLocale);

  // --- theme ------------------------------------------------------------------

  const NEUTRAL: Record<'light' | 'dark', Record<string, string>> = {
    light: {
      primary: '#2563eb',
      'primary-content': '#ffffff',
      'base-100': '#ffffff',
      'base-200': '#f4f5f7',
      'base-300': '#e5e7eb',
      'base-content': '#111827'
    },
    dark: {
      primary: '#3b82f6',
      'primary-content': '#ffffff',
      'base-100': '#121417',
      'base-200': '#1a1e24',
      'base-300': '#2c333d',
      'base-content': '#f3f4f6'
    }
  };

  const prefersDark = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  $: mode = (theme === 'light' || theme === 'dark' ? theme : prefersDark() ? 'dark' : 'light') as
    | 'light'
    | 'dark';

  const normalizeHex = (value: string): string => {
    const hex = value.trim().replace(/^#/, '');
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return '';
    return hex.length === 3 ? `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : `#${hex}`;
  };

  const contrastColor = (hex: string): string => (prefersDarkInk(hex) ? '#000000' : '#ffffff');

  const token = (tokens: Record<string, string> | undefined, key: string, fallback: string): string =>
    tokens?.[key] || fallback;

  $: primaryHex = normalizeHex(primary);
  $: tokens = { ...NEUTRAL[mode], ...(data?.theme?.[mode] ?? {}) };
  /** A host's CSS `--reservine-primary` (hex) wins over the prop and theme, as it does in the card gradient. */
  let hostPrimary = '';
  /** The primary accent-less classic cards are cut from; their ink follows its contrast. */
  $: cardPrimary =
    hostPrimary || primaryHex || normalizeHex(token(tokens, 'primary', NEUTRAL[mode].primary));
  $: cssVars = [
    `--rm-primary: ${primaryHex || token(tokens, 'primary', NEUTRAL[mode].primary)}`,
    `--rm-primary-content: ${primaryHex ? contrastColor(primaryHex) : token(tokens, 'primary-content', NEUTRAL[mode]['primary-content'])}`,
    `--rm-bg: ${token(tokens, 'base-100', NEUTRAL[mode]['base-100'])}`,
    `--rm-bg-muted: ${token(tokens, 'base-200', NEUTRAL[mode]['base-200'])}`,
    `--rm-border: ${token(tokens, 'base-300', NEUTRAL[mode]['base-300'])}`,
    `--rm-fg: ${token(tokens, 'base-content', NEUTRAL[mode]['base-content'])}`,
    `--rm-radius: ${radius || '14px'}`,
    ...(font && font !== 'inherit' ? [`--rm-font: ${font}`] : [])
  ].join('; ');

  // --- purchase shell -------------------------------------------------------

  /** The tenant app origin: the DTO's public url when present, else the slug-derived host. */
  const tenantOrigin = (): string => {
    const configured = data?.tenant.url?.trim();
    if (configured) {
      try {
        return new URL(configured).origin;
      } catch {
        // fall through to the slug-derived host
      }
    }
    return `https://${partner}.reservine.me`;
  };

  const buildUrl = (adjustedFontSize?: number): string => {
    if (!partner) return '';
    const planId = selectedPlanId ?? plan ?? visiblePlans[0]?.id ?? '';
    const url = new URL(`${tenantOrigin()}/embed/memberships/${planId}`);
    if (branch) url.searchParams.set(IntegrationConstants.branch, String(branch));
    url.searchParams.set(IntegrationConstants.reservineTheme, mode);
    if (primaryHex) url.searchParams.set(IntegrationConstants.reservinePrimary, primaryHex.slice(1));
    if (selectedBilling) url.searchParams.set(IntegrationConstants.billing, selectedBilling);
    // The embed page posts the purchase back to this origin when the host's
    // Referrer-Policy strips document.referrer.
    if (typeof window !== 'undefined') {
      url.searchParams.set(IntegrationConstants.reservineHost, window.location.origin);
    }
    if (adjustedFontSize) {
      url.searchParams.set(IntegrationConstants.adjustedFontSize, adjustedFontSize.toString());
    }
    url.searchParams.set('_cb', Date.now().toString());
    return url.toString();
  };

  const hostElement = (): HTMLElement | null => {
    const node = root?.getRootNode();
    return node instanceof ShadowRoot ? node.host as HTMLElement : null;
  };

  // Re-read after every render; an unchanged value is a no-op, so this never loops.
  afterUpdate(() => {
    const host = hostElement();
    if (!host || typeof getComputedStyle !== 'function') return;
    hostPrimary = normalizeHex(getComputedStyle(host).getPropertyValue('--reservine-primary'));
  });

  const emit = (type: string, detail: unknown): void => {
    hostElement()?.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  };

  const openPlan = (planId: number | null, billing: MembershipBilling | null): void => {
    selectedPlanId = planId;
    selectedBilling = billing;
    shell?.open();
  };

  /** Without a card's switch the embed opens the plan's default billing. */
  export function open(planId?: number): void {
    openPlan(planId ?? plan ?? visiblePlans[0]?.id ?? null, null);
  }

  export function close(): void {
    shell?.close();
  }

  const handleOpenChange = (isOpen: boolean): void => {
    emit(RESERVINE_OPEN_CHANGE_EVENT, { open: isOpen });
  };

  const isPurchasedMessage = (
    value: unknown
  ): value is { type: string; orderId: number; planId: number } =>
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === IntegrationConstants.reservineMembershipPurchased &&
    'orderId' in value &&
    'planId' in value;

  const handleMessage = (message: unknown): void => {
    if (!isPurchasedMessage(message)) return;

    const detail: ReservineMembershipPurchasedDetail = {
      orderId: Number(message.orderId),
      planId: Number(message.planId)
    };
    emit(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, detail);

    if (successUrl) {
      close();
      navigateTopWindow(successUrl);
    }
  };
</script>

<style>
  .rm-root {
    display: block;
    color: var(--reservine-fg, var(--rm-fg));
    font-family: var(--reservine-font, var(--rm-font, inherit));
    /* Owned, not inherited: a card (and its skeleton) is the same height on every host. */
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  .rm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16.5rem, 1fr));
    gap: 1rem;
  }

  /* Group filter chips + headed shelves (only when the tenant groups its plans). */
  .rm-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .rm-chip {
    padding: 0.375rem 0.875rem;
    border: 1px solid var(--reservine-card-border, var(--rm-border));
    border-radius: 9999px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.25rem;
    cursor: pointer;
  }

  .rm-chip[aria-pressed='true'] {
    border-color: transparent;
    background: var(--reservine-primary, var(--rm-primary));
    color: var(--reservine-primary-content, var(--rm-primary-content));
  }

  .rm-chip:focus-visible { outline: 2px solid var(--reservine-primary, var(--rm-primary)); outline-offset: 2px; }

  .rm-shelf + .rm-shelf { margin-top: 2rem; }

  .rm-shelf-title {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.5rem;
  }

  /* A wallet pass: the material IS the tier (classic plastic → silver → black → gold). */
  .rm-card {
    --rm-ink: oklch(0.98 0.01 250);
    --rm-cta-bg: oklch(0.98 0.01 250);
    --rm-cta-ink: oklch(0.22 0.03 265);
    --rm-track: oklch(0.22 0.03 265 / 0.25);
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--reservine-radius, var(--rm-radius));
    background: var(--reservine-card-bg, var(--rm-material));
    color: var(--rm-ink);
    box-shadow: 0 12px 24px -14px oklch(0.2 0.02 260 / 0.5), 0 2px 6px -2px oklch(0.2 0.02 260 / 0.2);
    box-sizing: border-box;
    min-height: 100%;
  }

  .rm-finish-classic {
    --rm-material: linear-gradient(160deg, var(--rm-accent), color-mix(in oklch, var(--rm-accent), black 38%));
  }

  .rm-finish-classic.rm-ink-dark {
    --rm-ink: oklch(0.22 0.04 60);
    --rm-cta-bg: oklch(0.22 0.04 60);
    --rm-cta-ink: oklch(0.98 0.01 250);
  }

  .rm-finish-silver {
    --rm-material: repeating-linear-gradient(90deg, oklch(1 0 0 / .07) 0 1px, transparent 1px 3px), linear-gradient(160deg, color-mix(in oklch, oklch(0.92 0.01 260), var(--rm-tint, transparent) 22%), color-mix(in oklch, oklch(0.72 0.015 260), var(--rm-tint, transparent) 30%) 45%, color-mix(in oklch, oklch(0.88 0.01 260), var(--rm-tint, transparent) 22%) 70%, color-mix(in oklch, oklch(0.64 0.02 260), var(--rm-tint, transparent) 34%));
    --rm-ink: oklch(0.2 0.02 260);
    --rm-cta-bg: oklch(0.22 0.03 265);
    --rm-cta-ink: oklch(0.98 0.01 250);
    --rm-track: oklch(0.2 0.02 260 / 0.1);
  }

  .rm-finish-black {
    --rm-material: repeating-linear-gradient(45deg, oklch(1 0 0 / .035) 0 2px, transparent 2px 4px), repeating-linear-gradient(-45deg, oklch(1 0 0 / .035) 0 2px, transparent 2px 4px), linear-gradient(160deg, oklch(0.3 0.01 260), oklch(0.14 0.005 260) 55%, oklch(0.24 0.01 260));
    --rm-ink: oklch(0.93 0.01 260);
    --rm-cta-bg: oklch(0.93 0.01 260);
    --rm-cta-ink: oklch(0.22 0.03 265);
    --rm-track: oklch(0.93 0.01 260 / 0.1);
  }

  .rm-finish-gold {
    --rm-material: repeating-linear-gradient(90deg, oklch(1 0.05 90 / .07) 0 1px, transparent 1px 3px), linear-gradient(150deg, oklch(0.92 0.1 92), oklch(0.78 0.13 82) 35%, oklch(0.9 0.11 90) 55%, oklch(0.66 0.12 70));
    --rm-ink: oklch(0.25 0.05 70);
    --rm-cta-bg: oklch(0.22 0.04 60);
    --rm-cta-ink: oklch(0.92 0.1 90);
    --rm-track: oklch(0.22 0.04 60 / 0.15);
  }

  /* Gold alone loops a slow glare sweep. */
  .rm-glare {
    position: absolute;
    inset: -40%;
    z-index: 1;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 43%, oklch(1 0.03 95 / .55) 50%, transparent 57%);
    mix-blend-mode: overlay;
    animation: rm-glare 6s ease-in-out infinite;
  }

  @keyframes rm-glare {
    0%, 15% { transform: translateX(-60%); }
    55%, 100% { transform: translateX(60%); }
  }

  /* The metals lift and catch a sheen on hover. */
  .rm-sheen {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: radial-gradient(circle at 30% 15%, oklch(1 0 0 / .24), transparent 45%);
    mix-blend-mode: soft-light;
    opacity: 0;
    transition: opacity 0.3s ease-out;
  }

  .rm-metal { transition: transform 0.3s ease-out; }

  @media (hover: hover) {
    .rm-metal:hover { transform: translateY(-0.25rem); }
    .rm-metal:hover .rm-sheen { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .rm-metal,
    .rm-sheen { transition: none; }
    .rm-metal:hover { transform: none; }
    .rm-glare { animation: none; transform: translateX(10%); opacity: 0.5; }
  }

  .rm-head {
    position: relative;
    flex: 1;
    padding: 1.25rem 1.25rem 1rem;
  }

  .rm-eyebrow {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.8;
  }

  .rm-name {
    margin: 0.75rem 0 0;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.5rem;
    letter-spacing: -0.01em;
  }

  /* The full description: never clamped, the admin's line breaks kept. */
  .rm-desc {
    margin: 0.5rem 0 0;
    font-size: 0.78125rem;
    line-height: 1.125rem;
    opacity: 0.75;
    white-space: pre-line;
  }

  /* The perforation between the pass head and its stub. */
  .rm-seam {
    position: relative;
    height: 0;
    border-top: 1.5px dashed color-mix(in oklch, var(--rm-ink) 25%, transparent);
  }

  .rm-seam span {
    position: absolute;
    top: -0.6875rem;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 9999px;
    background: var(--reservine-seam-bg, var(--rm-bg));
  }

  .rm-seam span:first-child { left: -0.6875rem; }
  .rm-seam span:last-child { right: -0.6875rem; }

  .rm-stub {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0.875rem 1.25rem 1.25rem;
  }

  .rm-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rm-facts li {
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: var(--rm-track);
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1rem;
  }

  .rm-deal {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .rm-price {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    margin: 0;
    white-space: nowrap;
  }

  .rm-amount {
    font-size: 1.375rem;
    font-weight: 700;
    line-height: 1.75rem;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }

  .rm-suffix {
    font-size: 0.71875rem;
    line-height: 1rem;
    opacity: 0.65;
  }

  /* Subscription · One-time, for a plan sold both ways; exactly as tall as the price. */
  .rm-switch {
    display: inline-flex;
    padding: 0.1875rem;
    border-radius: 9999px;
    background: var(--rm-track);
  }

  .rm-switch button {
    padding: 0.1875rem 0.625rem;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1rem;
    opacity: 0.7;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out, color 0.15s ease-in-out;
  }

  .rm-switch button[aria-pressed='true'] {
    background: var(--rm-cta-bg);
    color: var(--rm-cta-ink);
    opacity: 1;
    box-shadow: 0 1px 2px oklch(0 0 0 / 0.15);
  }

  .rm-switch button:focus-visible { outline: 2px solid var(--rm-ink); outline-offset: 1px; }

  .rm-once {
    padding: 0.125rem 0.5rem;
    border: 1px dashed currentColor;
    border-radius: 9999px;
    font-size: 0.6875rem;
    line-height: 1rem;
    opacity: 0.75;
  }

  .rm-buy {
    margin-top: 0.75rem;
    padding: 0.625rem 1rem;
    border: 0;
    border-radius: calc(var(--reservine-radius, var(--rm-radius)) * 0.6);
    background: var(--rm-cta-bg);
    color: var(--rm-cta-ink);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
    cursor: pointer;
    transition: filter 0.15s ease-in-out;
  }

  .rm-buy:hover { filter: brightness(0.92); }
  .rm-buy:focus-visible { outline: 2px solid var(--rm-ink); outline-offset: 2px; }

  .rm-hint {
    margin: 0;
    padding: 1rem 1.25rem;
    border: 1px dashed var(--reservine-card-border, var(--rm-border));
    border-radius: var(--reservine-radius, var(--rm-radius));
    font-size: 0.875rem;
    line-height: 1.4;
    opacity: 0.8;
  }

  .rm-hint button {
    margin-left: 0.5rem;
    padding: 0;
    border: 0;
    background: none;
    color: var(--reservine-primary, var(--rm-primary));
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  /* One row of skeletons at any width: cards past the first row collapse and clip. */
  .rm-loading {
    grid-template-rows: auto;
    grid-auto-rows: 0;
    row-gap: 0;
    overflow: hidden;
  }

  /* A real card's structure with hidden placeholder text, so it is exactly as tall
     as a typical card: one-line name and description, one row of fact chips. */
  .rm-skeleton {
    background: var(--reservine-card-bg, var(--rm-bg-muted));
    opacity: 0.6;
    animation: rm-pulse 1.4s ease-in-out infinite;
  }

  .rm-skeleton > * {
    visibility: hidden;
  }

  @keyframes rm-pulse {
    50% { opacity: 0.35; }
  }
</style>

<div bind:this={root} class="rm-root" data-theme={mode} style={cssVars}>
  {#if status === 'loading'}
    <div class="rm-grid rm-loading" aria-busy="true">
      {#each Array(plan != null ? 1 : 2) as _}
        <div class="rm-card rm-skeleton" aria-hidden="true">
          <div class="rm-head">
            <p class="rm-eyebrow">&nbsp;</p>
            <p class="rm-name">&nbsp;</p>
            <p class="rm-desc">&nbsp;</p>
          </div>
          <div class="rm-seam"></div>
          <div class="rm-stub">
            <ul class="rm-facts"><li>&nbsp;</li></ul>
            <div class="rm-deal"><p class="rm-price"><span class="rm-amount">&nbsp;</span></p></div>
            <div class="rm-buy">&nbsp;</div>
          </div>
        </div>
      {/each}
    </div>
  {:else if status === 'domain'}
    <p class="rm-hint" data-reservine-state="domain-not-registered">
      {copy.domainNotRegistered(data?.tenant.name || partner)}
    </p>
  {:else if status === 'error'}
    <p class="rm-hint" data-reservine-state="error">
      {copy.loadFailed}
      <button type="button" on:click={refresh}>{copy.retry}</button>
    </p>
  {:else if visiblePlans.length === 0}
    <p class="rm-hint" data-reservine-state="empty">
      {plan != null ? copy.planNotFound : copy.noPlans}
    </p>
  {:else}
    {#if grouped}
      <div class="rm-chips" role="group" aria-label={copy.groupsLabel}>
        <button
          type="button"
          class="rm-chip"
          data-shelf-filter="all"
          aria-pressed={!shelves.some((shelf) => shelf.key === activeShelf)}
          on:click={() => (activeShelf = 'all')}
        >
          {copy.groupAll}
        </button>
        {#each shelves as shelf (shelf.key)}
          <button
            type="button"
            class="rm-chip"
            data-shelf-filter={shelf.key}
            aria-pressed={shelf.key === activeShelf}
            on:click={() => (activeShelf = shelf.key)}
          >
            {shelf.group?.name ?? copy.groupOther}
          </button>
        {/each}
      </div>
    {/if}
    {#each shownShelves as shelf (shelf.key)}
      <section class="rm-shelf" data-shelf={shelf.key}>
        {#if grouped}
          <h2 class="rm-shelf-title">{shelf.group?.name ?? copy.groupOther}</h2>
        {/if}
        <div class="rm-grid">
          {#each shelf.cards as card (card.plan.id)}
            {@const kind = cardKind(card, billingChoice)}
            {@const sold = { ...card.plan, kind }}
            {@const material = membershipCardMaterial(card.plan, cardPrimary)}
            <article
              class="rm-card rm-finish-{material.finish}"
              class:rm-metal={material.metal}
              class:rm-ink-dark={material.darkInk}
              style={material.style}
              data-plan-id={card.plan.id}
              data-plan-kind={kind}
              data-plan-finish={material.finish}
            >
              {#if material.glare}
                <span class="rm-glare" aria-hidden="true"></span>
              {/if}
              {#if material.metal}
                <span class="rm-sheen" aria-hidden="true"></span>
              {/if}
              <div class="rm-head">
                <p class="rm-eyebrow">
                  {card.plan.eyebrow?.trim() ||
                    (kind === 'subscription' ? copy.kindSubscription : copy.kindOneTime)}
                </p>
                <h3 class="rm-name">{card.plan.name}</h3>
                {#if card.plan.description?.trim()}
                  <p class="rm-desc">{card.plan.description.trim()}</p>
                {/if}
              </div>
              <div class="rm-seam" aria-hidden="true"><span></span><span></span></div>
              <div class="rm-stub">
                <ul class="rm-facts">
                  {#each membershipChecklist(resolvedLocale, sold) as fact}
                    <li>{fact}</li>
                  {/each}
                </ul>
                <div class="rm-deal">
                  <p class="rm-price">
                    <span class="rm-amount">
                      {formatMembershipPrice(resolvedLocale, card.plan.price, card.plan.currency_code)}
                    </span>
                    <span class="rm-suffix">{membershipPriceSuffix(resolvedLocale, sold)}</span>
                  </p>
                  {#if card.kinds.length > 1}
                    <div class="rm-switch" role="group" aria-label={copy.billingLabel}>
                      {#each card.kinds as option (option)}
                        <button
                          type="button"
                          data-billing={membershipBilling(option)}
                          aria-pressed={option === kind}
                          on:click={() => pickBilling(card.plan.id, option)}
                        >
                          {option === 'subscription' ? copy.billingSubscription : copy.billingOnce}
                        </button>
                      {/each}
                    </div>
                  {:else if kind === 'one_time'}
                    <span class="rm-once">{copy.billingOnce}</span>
                  {/if}
                </div>
                <button
                  type="button"
                  class="rm-buy"
                  data-plan-buy={card.plan.id}
                  aria-label="{buyText || copy.buy} – {card.plan.name}"
                  on:click={() => openPlan(card.plan.id, membershipBilling(kind))}
                >
                  {buyText || copy.buy}
                </button>
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/each}
  {/if}
</div>

<PurchaseShell
  bind:this={shell}
  bind:opened
  {buildUrl}
  onOpenChange={handleOpenChange}
  onMessage={handleMessage}
  withTrigger={false}
/>
