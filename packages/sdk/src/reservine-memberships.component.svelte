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
  import PurchaseShell from './purchase-shell.svelte';
  import type {
    ReservineMembershipPlan,
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
    resolveMembershipLocale,
    type MembershipLocale
  } from './utils/membership-copy.js';
  import { navigateTopWindow } from './utils/reservine-integration.utils';

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

  // --- data -----------------------------------------------------------------

  const widgetUrl = (): string => {
    const base = apiUrl.replace(/\/+$/, '');
    const url = new URL(`${base}/api/widget/${encodeURIComponent(partner)}/memberships`);
    if (branch) url.searchParams.set(IntegrationConstants.branch, String(branch));
    return url.toString();
  };

  const load = async (): Promise<void> => {
    if (!partner) {
      status = 'error';
      data = null;
      return;
    }
    const token = ++requestToken;
    status = 'loading';

    try {
      const response = await fetch(widgetUrl(), { credentials: 'omit' });
      if (token !== requestToken) return;

      const body = await response.json().catch(() => null);
      if (response.status === 403) {
        data = body?.data?.tenant ? { ...body.data, plans: [] } : null;
        status = 'domain';
        return;
      }
      if (!response.ok || !body?.data) {
        status = 'error';
        return;
      }
      data = body.data as ReservineMembershipsData;
      status = 'ready';
    } catch {
      if (token === requestToken) status = 'error';
    }
  };

  export function refresh(): void {
    void load();
  }

  // Re-fetch whenever the data-shaping props change (runs once on creation).
  $: partner, branch, apiUrl, refresh();

  $: visiblePlans = data
    ? plan != null
      ? data.plans.filter((item) => item.id === Number(plan))
      : data.plans
    : [];

  // --- locale + copy ----------------------------------------------------------

  $: resolvedLocale = resolveMembershipLocale(
    locale,
    typeof document !== 'undefined' ? document.documentElement.lang : '',
    data?.tenant.locale
  ) as MembershipLocale;
  $: copy = membershipCopy(resolvedLocale);

  const priceSuffix = (item: ReservineMembershipPlan): string =>
    item.kind === 'subscription' ? copy.perMonth : copy.oneTime;

  const kindLabel = (item: ReservineMembershipPlan): string =>
    item.kind === 'subscription' ? copy.kindSubscription : copy.kindOneTime;

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

  const contrastColor = (hex: string): string => {
    const value = hex.replace('#', '');
    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff';
  };

  const token = (tokens: Record<string, string> | undefined, key: string, fallback: string): string =>
    tokens?.[key] || fallback;

  $: primaryHex = normalizeHex(primary);
  $: tokens = { ...NEUTRAL[mode], ...(data?.theme?.[mode] ?? {}) };
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

  const buildUrl = (adjustedFontSize?: number): string => {
    if (!partner) return '';
    const planId = selectedPlanId ?? plan ?? visiblePlans[0]?.id ?? '';
    const url = new URL(`https://${partner}.reservine.me/embed/memberships/${planId}`);
    if (branch) url.searchParams.set(IntegrationConstants.branch, String(branch));
    url.searchParams.set(IntegrationConstants.reservineTheme, mode);
    if (primaryHex) url.searchParams.set(IntegrationConstants.reservinePrimary, primaryHex.slice(1));
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

  const emit = (type: string, detail: unknown): void => {
    hostElement()?.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  };

  export function open(planId?: number): void {
    selectedPlanId = planId ?? plan ?? visiblePlans[0]?.id ?? null;
    shell?.open();
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
    -webkit-font-smoothing: antialiased;
  }

  .rm-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16.5rem, 1fr));
    gap: 1rem;
  }

  .rm-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--reservine-card-border, var(--rm-border));
    border-radius: var(--reservine-radius, var(--rm-radius));
    background: var(--reservine-card-bg, var(--rm-bg));
    box-sizing: border-box;
    min-height: 100%;
  }

  .rm-head {
    padding: 1.5rem 1.5rem 1.75rem;
    background: var(--reservine-card-head-bg, color-mix(in srgb, var(--reservine-primary, var(--rm-primary)) 8%, transparent));
  }

  .rm-kind {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--reservine-primary, var(--rm-primary));
  }

  .rm-name {
    margin: 0.5rem 0 0;
    font-size: 1.6875rem;
    font-weight: 600;
    line-height: 1.08;
    letter-spacing: -0.01em;
  }

  .rm-desc {
    margin: 1rem 0 0;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    opacity: 0.6;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .rm-seam {
    position: relative;
    height: 0;
    border-top: 1px dashed color-mix(in srgb, var(--reservine-fg, var(--rm-fg)) 20%, transparent);
  }

  .rm-seam span {
    position: absolute;
    top: -0.75rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 9999px;
    background: var(--reservine-seam-bg, var(--rm-bg-muted));
    border: 1px solid var(--reservine-card-border, var(--rm-border));
  }

  .rm-seam span:first-child { left: -0.75rem; }
  .rm-seam span:last-child { right: -0.75rem; }

  .rm-stub {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 1.25rem 1.5rem 1.5rem;
  }

  .rm-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rm-list li {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    font-size: 0.84375rem;
    line-height: 1.25rem;
    opacity: 0.8;
  }

  .rm-list svg {
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    margin-top: 0.125rem;
    opacity: 0.5;
  }

  .rm-price {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    margin: auto 0 0;
    padding-top: 1.5rem;
  }

  .rm-amount {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
  }

  .rm-suffix {
    font-size: 0.8125rem;
    opacity: 0.55;
  }

  .rm-buy {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    border: 0;
    border-radius: calc(var(--reservine-radius, var(--rm-radius)) * 0.6);
    background: var(--reservine-primary, var(--rm-primary));
    color: var(--reservine-primary-content, var(--rm-primary-content));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.15s ease-in-out;
  }

  .rm-buy:hover { filter: brightness(0.92); }
  .rm-buy:focus-visible { outline: 2px solid var(--reservine-primary, var(--rm-primary)); outline-offset: 2px; }

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

  .rm-skeleton {
    height: 18rem;
    border-radius: var(--reservine-radius, var(--rm-radius));
    background: var(--reservine-card-bg, var(--rm-bg-muted));
    opacity: 0.6;
    animation: rm-pulse 1.4s ease-in-out infinite;
  }

  @keyframes rm-pulse {
    50% { opacity: 0.35; }
  }
</style>

<div bind:this={root} class="rm-root" data-theme={mode} style={cssVars}>
  {#if status === 'loading'}
    <div class="rm-grid" aria-busy="true">
      {#each Array(plan != null ? 1 : 2) as _}
        <div class="rm-skeleton"></div>
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
    <div class="rm-grid">
      {#each visiblePlans as item (item.id)}
        <article class="rm-card" data-plan-id={item.id} data-plan-kind={item.kind}>
          <div class="rm-head">
            <p class="rm-kind">{kindLabel(item)}</p>
            <h3 class="rm-name">{item.name}</h3>
            {#if item.description}
              <p class="rm-desc">{item.description}</p>
            {/if}
          </div>
          <div class="rm-seam" aria-hidden="true"><span></span><span></span></div>
          <div class="rm-stub">
            <ul class="rm-list">
              {#each membershipChecklist(resolvedLocale, item) as row}
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span>{row}</span>
                </li>
              {/each}
            </ul>
            <p class="rm-price">
              <span class="rm-amount">{formatMembershipPrice(resolvedLocale, item.price, item.currency_code)}</span>
              <span class="rm-suffix">{priceSuffix(item)}</span>
            </p>
            <button type="button" class="rm-buy" data-plan-buy={item.id} on:click={() => open(item.id)}>
              {buyText || copy.buy}
            </button>
          </div>
        </article>
      {/each}
    </div>
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
