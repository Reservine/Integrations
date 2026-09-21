import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReservineMembershipsData, ReservineMembershipsElement } from './contract';
import { RESERVINE_MEMBERSHIP_PURCHASED_EVENT } from './contract';

vi.mock('./utils/reservine-integration.utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./utils/reservine-integration.utils')>()),
  navigateTopWindow: vi.fn()
}));

const { navigateTopWindow } = await import('./utils/reservine-integration.utils');

const DTO: ReservineMembershipsData = {
  tenant: { slug: 'fitflow', name: 'FitFlow Studios', locale: 'cs', currency: 'CZK' },
  theme: {
    light: { primary: '#2563eb', 'base-100': '#ffffff' },
    dark: { primary: '#93c5fd', 'base-100': '#0b0d10' }
  },
  branches: [{ id: 3, name: 'Centrum' }],
  plans: [
    {
      id: 12,
      name: 'Pro',
      description: 'Unlimited classes',
      price: 1490,
      currency_code: 'CZK',
      duration_months: 12,
      kind: 'subscription',
      uses_per_voucher: 0,
      usage_per: null,
      branch_id: null
    },
    {
      id: 7,
      name: '10 vstupů',
      description: null,
      price: 2900,
      currency_code: 'CZK',
      duration_months: 6,
      kind: 'one_time',
      uses_per_voucher: 10,
      usage_per: null,
      branch_id: 3
    }
  ]
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const flush = async () => {
  for (let i = 0; i < 4; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};

const nbsp = (value: string | null | undefined) => (value ?? '').replace(/[  ]/g, ' ').trim();

const shadow = (element: HTMLElement) => element.shadowRoot as ShadowRoot;

const mountElement = async (attributes: Record<string, string>) => {
  const element = document.createElement('reservine-memberships') as ReservineMembershipsElement;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.appendChild(element);
  await flush();
  return element;
};

const iframeSrc = () => new URL(document.querySelector<HTMLIFrameElement>('iframe[title="Reservine"]')?.src ?? 'about:blank');

const purchasedMessage = (element: HTMLElement, orderId = 501, planId = 12) => {
  const origin = iframeSrc().origin;
  window.dispatchEvent(
    new MessageEvent('message', {
      origin,
      data: { type: 'reservine-membership-purchased', orderId, planId }
    })
  );
};

describe('<reservine-memberships>', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    // Desktop, non-touch → the purchase shell uses the modal (plain DOM, jsdom-safe).
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn()
    }));
    await import('./register');
  });

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: DTO })));
    vi.stubGlobal('fetch', fetchMock);
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.mocked(navigateTopWindow).mockClear();
    vi.unstubAllGlobals();
  });

  it('fetches the widget DTO for the partner and renders one card per plan', async () => {
    const element = await mountElement({ partner: 'fitflow' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.reservine.io/api/widget/fitflow/memberships',
      expect.objectContaining({ credentials: 'omit' })
    );
    const cards = shadow(element).querySelectorAll('.rm-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('.rm-name')?.textContent).toBe('Pro');
    expect(cards[1].getAttribute('data-plan-kind')).toBe('one_time');
  });

  it('renders only the requested plan and a hint for an unknown one', async () => {
    const single = await mountElement({ partner: 'fitflow', plan: '7' });
    expect(shadow(single).querySelectorAll('.rm-card')).toHaveLength(1);
    expect(shadow(single).querySelector('.rm-card')?.getAttribute('data-plan-id')).toBe('7');

    const missing = await mountElement({ partner: 'fitflow', plan: '999' });
    expect(shadow(missing).querySelectorAll('.rm-card')).toHaveLength(0);
    expect(shadow(missing).querySelector('[data-reservine-state="empty"]')?.textContent).toContain(
      'not available'
    );
  });

  it('forwards branch and apiUrl into the fetch and branch into the checkout iframe url', async () => {
    const element = await mountElement({
      partner: 'fitflow',
      branch: '3',
      'api-url': 'https://api.reservine.devlp.lovinka.com/'
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.reservine.devlp.lovinka.com/api/widget/fitflow/memberships?branch=3'
    );

    shadow(element).querySelector<HTMLButtonElement>('[data-plan-buy="12"]')?.click();
    await flush();

    const src = iframeSrc();
    expect(src.origin).toBe('https://fitflow.reservine.me');
    expect(src.pathname).toBe('/embed/memberships/12');
    expect(src.searchParams.get('branch')).toBe('3');
    expect(src.searchParams.get('reservine-theme')).toBe('light');
  });

  it('maps tenant theme tokens to CSS variables and follows theme="dark"', async () => {
    const light = await mountElement({ partner: 'fitflow', theme: 'light' });
    const lightStyle = shadow(light).querySelector<HTMLElement>('.rm-root')?.getAttribute('style') ?? '';
    expect(lightStyle).toContain('--rm-primary: #2563eb');
    expect(lightStyle).toContain('--rm-bg: #ffffff');

    const dark = await mountElement({ partner: 'fitflow', theme: 'dark' });
    const darkRoot = shadow(dark).querySelector<HTMLElement>('.rm-root');
    expect(darkRoot?.getAttribute('data-theme')).toBe('dark');
    expect(darkRoot?.getAttribute('style')).toContain('--rm-primary: #93c5fd');
    expect(darkRoot?.getAttribute('style')).toContain('--rm-bg: #0b0d10');
  });

  it('lets primary / radius / font override the tenant tokens and forwards them to the checkout', async () => {
    const element = await mountElement({
      partner: 'fitflow',
      theme: 'dark',
      primary: '#e11d48',
      radius: '4px',
      font: 'Georgia, serif'
    });
    const style = shadow(element).querySelector<HTMLElement>('.rm-root')?.getAttribute('style') ?? '';
    expect(style).toContain('--rm-primary: #e11d48');
    expect(style).toContain('--rm-primary-content: #ffffff');
    expect(style).toContain('--rm-radius: 4px');
    expect(style).toContain('--rm-font: Georgia, serif');

    shadow(element).querySelector<HTMLButtonElement>('[data-plan-buy="7"]')?.click();
    await flush();
    const src = iframeSrc();
    expect(src.pathname).toBe('/embed/memberships/7');
    expect(src.searchParams.get('reservine-primary')).toBe('e11d48');
    expect(src.searchParams.get('reservine-theme')).toBe('dark');
  });

  it('re-emits the purchase message as a composed DOM event and stays open without successUrl', async () => {
    const element = await mountElement({ partner: 'fitflow' });
    const received: unknown[] = [];
    document.body.addEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, (event) =>
      received.push((event as CustomEvent).detail)
    );

    shadow(element).querySelector<HTMLButtonElement>('[data-plan-buy="12"]')?.click();
    await flush();
    purchasedMessage(element, 501, 12);
    await flush();

    expect(received).toEqual([{ orderId: 501, planId: 12 }]);
    expect(element.opened).toBe(true);
    expect(document.querySelector('iframe[title="Reservine"]')).not.toBeNull();
    expect(navigateTopWindow).not.toHaveBeenCalled();
  });

  it('closes the checkout and navigates the top window when successUrl is set', async () => {
    const element = await mountElement({
      partner: 'fitflow',
      'success-url': 'https://tenant.cz/thanks'
    });
    const detailSpy = vi.fn();
    element.addEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, (event) =>
      detailSpy((event as CustomEvent).detail)
    );

    element.open(12);
    await flush();
    expect(element.opened).toBe(true);

    purchasedMessage(element, 777, 12);
    await flush();

    expect(detailSpy).toHaveBeenCalledTimes(1);
    expect(detailSpy).toHaveBeenCalledWith({ orderId: 777, planId: 12 });
    expect(element.opened).toBe(false);
    expect(document.querySelector('iframe[title="Reservine"]')).toBeNull();
    expect(navigateTopWindow).toHaveBeenCalledWith('https://tenant.cz/thanks');
  });

  it('ignores purchase messages from a foreign origin', async () => {
    const element = await mountElement({ partner: 'fitflow' });
    const detailSpy = vi.fn();
    element.addEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, detailSpy);
    element.open(12);
    await flush();

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: { type: 'reservine-membership-purchased', orderId: 1, planId: 12 }
      })
    );
    await flush();

    expect(detailSpy).not.toHaveBeenCalled();
  });

  it('formats prices and labels in Czech and English', async () => {
    const cs = await mountElement({ partner: 'fitflow', locale: 'cs', plan: '12' });
    const csCard = shadow(cs).querySelector('.rm-card') as HTMLElement;
    expect(nbsp(csCard.querySelector('.rm-amount')?.textContent)).toBe(
      nbsp(new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0 }).format(1490))
    );
    expect(nbsp(csCard.querySelector('.rm-amount')?.textContent)).toBe('1 490 Kč');
    expect(csCard.querySelector('.rm-suffix')?.textContent?.trim()).toBe('/ měsíc');
    expect(csCard.querySelector('.rm-kind')?.textContent?.trim()).toBe('Předplatné');
    expect(csCard.textContent).toContain('Platí 12 měsíců');
    expect(csCard.querySelector('.rm-buy')?.textContent?.trim()).toBe('Koupit');

    const en = await mountElement({ partner: 'fitflow', locale: 'en', plan: '7' });
    const enCard = shadow(en).querySelector('.rm-card') as HTMLElement;
    expect(nbsp(enCard.querySelector('.rm-amount')?.textContent)).toBe('CZK 2,900');
    expect(enCard.querySelector('.rm-suffix')?.textContent?.trim()).toBe('one-time');
    expect(enCard.textContent).toContain('10 uses');
    expect(enCard.textContent).toContain('Valid for 6 months');
    expect(enCard.querySelector('.rm-buy')?.textContent?.trim()).toBe('Buy');

    const custom = await mountElement({ partner: 'fitflow', 'buy-text': 'Join now', plan: '12' });
    expect(shadow(custom).querySelector('.rm-buy')?.textContent?.trim()).toBe('Join now');
  });

  it('shows the domain-registration hint on 403 domain_not_registered', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse({ data: { reason: 'domain_not_registered', tenant: DTO.tenant } }, 403)
      )
    );
    const element = await mountElement({ partner: 'fitflow', locale: 'en' });

    const hint = shadow(element).querySelector('[data-reservine-state="domain-not-registered"]');
    expect(hint?.textContent).toContain('FitFlow Studios');
    expect(hint?.textContent).toContain('Settings › Tenant › Domains');
    expect(shadow(element).querySelectorAll('.rm-card')).toHaveLength(0);
  });
});
