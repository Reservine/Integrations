import { expect, test } from '@playwright/test';

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
    await page.addScriptTag({ path: 'packages/sdk/dist/cdn/sdk.js' });
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
});
