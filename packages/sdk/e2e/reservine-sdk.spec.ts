import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import type { ReservineMembershipsData } from '../src/contract';

const expectedTenantOrigin = 'https://mytimegym.reservine.me';

test.describe('Reservine SDK playground', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('registers the custom element and opens the expected tenant iframe', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Plain-HTML desktop journey');

    const generatedButton = page.getByTestId('generated-button');

    await expect
      .poll(() => page.evaluate(() => customElements.get('reservine-button')?.name))
      .toBeTruthy();
    await expect(generatedButton.getByRole('button', { name: 'Book a visit' })).toBeVisible();

    await generatedButton.getByRole('button', { name: 'Book a visit' }).click();

    const iframe = page.locator('iframe[title="Reservine"]');
    await expect(iframe).toHaveCount(1);
    await expect
      .poll(async () => new URL((await iframe.getAttribute('src')) ?? 'about:blank').origin)
      .toBe(expectedTenantOrigin);
  });

  test('loads the built CDN artifact as a standalone browser integration', async ({ page }) => {
    await page.evaluate(() => {
      document.body.replaceChildren();
    });
    await page.addScriptTag({ url: '/dist/cdn/sdk.js' });

    await expect
      .poll(() => page.evaluate(() => Boolean(customElements.get('reservine-button'))))
      .toBe(true);

    await page.evaluate(() => {
      const element = document.createElement('reservine-button');
      element.setAttribute('partner', 'mytimegym');
      element.setAttribute('text', 'Book from CDN');
      document.body.appendChild(element);
    });
    const button = page.locator('reservine-button');
    await expect(button.getByRole('button', { name: 'Book from CDN' })).toBeVisible();
    await button.getByRole('button', { name: 'Book from CDN' }).click();

    const iframe = page.locator('iframe[title="Reservine"]');
    await expect(iframe).toHaveCount(1);
    await expect
      .poll(async () => new URL((await iframe.getAttribute('src')) ?? 'about:blank').origin)
      .toBe(expectedTenantOrigin);
  });

  test('supports controlled desktop modal open, close, Escape, events, and focus restoration', async (
    { page },
    testInfo
  ) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-modal journey');

    const openControl = page.getByTestId('open-controlled');
    const wrappedButton = page.getByTestId('wrapped-button');
    const state = page.getByTestId('open-state');
    const dialog = page.getByRole('dialog', { name: 'Reservine booking' });

    await openControl.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close modal' })).toBeFocused();
    await expect(state).toHaveText('open');

    await wrappedButton.evaluate((element: HTMLElement & { close: () => void }) => element.close());
    await expect(dialog).toBeHidden();
    await expect(state).toHaveText('closed');

    await openControl.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(state).toHaveText('closed');
    await expect(openControl).toBeFocused();
  });

  test('reliably attaches the booking iframe for controlled desktop open', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-modal journey');

    await page.goto('about:blank');
    await page.addScriptTag({ path: 'dist/cdn/sdk.js' });
    await page.evaluate(() => {
      const element = document.createElement('reservine-button');
      element.dataset.testid = 'built-controlled-button';
      element.setAttribute('partner', 'mytimegym');
      document.body.appendChild(element);
    });
    const button = page.getByTestId('built-controlled-button');
    await expect.poll(() => button.evaluate((element) => typeof (element as { open?: unknown }).open)).toBe('function');
    await button.evaluate((element) => (element as HTMLElement & { open: () => void }).open());

    await expect(page.getByRole('dialog', { name: 'Reservine booking' })).toBeVisible();
    await expect(page.locator('iframe[title="Reservine"]')).toHaveAttribute(
      'src',
      /^https:\/\/mytimegym\.reservine\.me\//
    );
  });

  test('supports the mobile drawer open and close event contract', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-drawer journey');

    const wrappedButton = page.getByTestId('wrapped-button');
    const state = page.getByTestId('open-state');

    await wrappedButton.getByTestId('wrapped-trigger').click();

    const closeButton = page.getByRole('button', { name: 'Close booking' });
    const iframe = page.locator('iframe[title="Reservine"]');
    await expect(closeButton).toBeVisible();
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute('src', /^https:\/\/mytimegym\.reservine\.me\//);
    await expect(state).toHaveText('open');

    await closeButton.click();
    await expect(closeButton).toBeHidden();
    await expect(iframe).toHaveCount(0);
    await expect(state).toHaveText('closed');
  });

  test('restores the page scroll instantly on close under a host smooth-scroll rule', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'The drawer pins the body and restores the scroll');

    await page.addStyleTag({ content: 'html { scroll-behavior: smooth !important; } body { padding-bottom: 200vh; }' });
    const trigger = page.getByTestId('wrapped-trigger');
    await trigger.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const before = await page.evaluate(() => Math.round(window.scrollY));
    expect(before).toBeGreaterThan(100);
    const near = (y: number) => Math.abs(y - before) <= 2;

    await trigger.click();
    const closeButton = page.getByRole('button', { name: 'Close booking' });
    await expect(closeButton).toBeVisible();

    await page.evaluate(() => {
      const samples: number[] = [];
      (window as Window & { scrollSamples?: number[] }).scrollSamples = samples;
      const tick = () => {
        samples.push(Math.round(window.scrollY));
        if (samples.length < 120) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await closeButton.click();
    await expect.poll(async () => near(await page.evaluate(() => window.scrollY))).toBe(true);

    // Pinned at 0 while open, then straight back — no smooth-scroll frames in between.
    const samples = await page.evaluate(() => (window as Window & { scrollSamples?: number[] }).scrollSamples ?? []);
    expect(samples.filter((y) => y > 2 && !near(y))).toEqual([]);
  });

  test('hands the host its <html> scroll styles back after a programmatic drawer close', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-drawer journey');

    const wrappedButton = page.getByTestId('wrapped-button');
    const html = page.locator('html');
    await wrappedButton.getByTestId('wrapped-trigger').click();
    await expect(page.getByRole('button', { name: 'Close booking' })).toBeVisible();
    await expect(html).toHaveAttribute('style', /overscroll-behavior: none/);

    await wrappedButton.evaluate((element: HTMLElement & { close: () => void }) => element.close());
    await expect(page.getByRole('button', { name: 'Close booking' })).toBeHidden();
    await expect(html).not.toHaveAttribute('style', /scroll-behavior/);
  });

  test('reserves one typical card row while loading, so the plans replace it without a shift', async ({ page }) => {
    const typicalPlan: ReservineMembershipsData = {
      tenant: { slug: 'skeleton-check', name: 'Skeleton Check', locale: 'en', currency: 'CZK' },
      theme: null,
      branches: [],
      plans: [
        {
          id: 1,
          name: 'Pro',
          description: 'Unlimited classes',
          price: 1490,
          currency_code: 'CZK',
          duration_months: 12,
          kind: 'subscription',
          uses_per_voucher: 0,
          usage_per: null,
          branch_id: null
        }
      ]
    };
    let release: () => void = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('https://api.reservine.io/api/widget/skeleton-check/memberships', async (route) => {
      await released;
      await route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { data: typicalPlan } });
    });
    await page.evaluate(() => {
      const element = document.createElement('reservine-memberships');
      element.setAttribute('partner', 'skeleton-check');
      element.dataset.testid = 'skeleton-check';
      document.body.prepend(element);
    });
    const root = page.getByTestId('skeleton-check').locator('.rm-root');
    const heightInRem = () =>
      root.evaluate(
        (element) =>
          element.getBoundingClientRect().height / parseFloat(getComputedStyle(document.documentElement).fontSize)
      );

    await expect(root.locator('[aria-busy="true"]')).toBeVisible();
    const skeleton = await heightInRem();
    release();
    await expect(root.locator('[data-plan-id]')).toHaveCount(1);

    expect(await heightInRem()).toBeCloseTo(skeleton, 1);
    // The reservation the docs publish: reservine-memberships:not(:defined) { min-height: 22.54125rem }
    expect(skeleton).toBeCloseTo(22.54125, 2);
  });

  test('exposes the package version on the ReservineSDK browser global', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'A build constant needs one browser');

    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    await page.goto('about:blank');
    await page.addScriptTag({ path: 'dist/cdn/sdk.js' });

    const exposed = await page.evaluate(
      () => (window as Window & { ReservineSDK?: { version?: unknown } }).ReservineSDK?.version
    );
    expect(exposed).toBe(version);
  });
});
