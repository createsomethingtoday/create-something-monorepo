import { expect, test } from '@playwright/test';

const HIGH_TOUCH_ROUTES = ['/services', '/products', '/about', '/book', '/security', '/contact'];

for (const route of HIGH_TOUCH_ROUTES) {
  test(`${route} keeps the floating mobile search button out of the first-screen layout`, async ({
    page
  }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response, `No response when loading route ${route}`).not.toBeNull();
    expect(response!.ok(), `Route ${route} returned HTTP ${response!.status()}`).toBeTruthy();

    await expect(page.locator('.mobile-search-button')).toHaveCount(0);
  });
}

test('/book keeps step labels visible and exposes the direct fallback when slots fail', async ({
  page
}) => {
  await page.route('**/api/booking/slots?**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Slot service unavailable' })
    });
  });

  const response = await page.goto('/book', { waitUntil: 'domcontentloaded' });
  expect(response, 'No response when loading route /book').not.toBeNull();
  expect(response!.ok(), `Route /book returned HTTP ${response!.status()}`).toBeTruthy();

  await expect(page.locator('.mobile-search-button')).toHaveCount(0);
  await expect(page.locator('.progress-step .step-label').first()).toBeVisible();
  await expect(page.locator('.progress-step .step-label').first()).toContainText('Date');
  await expect(page.locator('.booking-alert')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Book on SavvyCal' })).toBeVisible();
});

test('/security keeps the policy handoff visible on mobile', async ({ page }) => {
  const response = await page.goto('/security', { waitUntil: 'domcontentloaded' });
  expect(response, 'No response when loading route /security').not.toBeNull();
  expect(response!.ok(), `Route /security returned HTTP ${response!.status()}`).toBeTruthy();

  const panel = page.locator('.handoff-panel');
  await panel.scrollIntoViewIfNeeded();

  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Read Bearer Token Policy' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Book Mapping Session' })).toBeVisible();
});

test('/services exposes the async workflow brief handoff in the closing CTA', async ({ page }) => {
  const response = await page.goto('/services', { waitUntil: 'domcontentloaded' });
  expect(response, 'No response when loading route /services').not.toBeNull();
  expect(response!.ok(), `Route /services returned HTTP ${response!.status()}`).toBeTruthy();

  const panel = page.locator('.cta-panel').last();
  await panel.scrollIntoViewIfNeeded();

  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Book Mapping Session' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Send Workflow Brief' })).toBeVisible();
});

test('/contact makes the live and async contact paths visible on mobile', async ({ page }) => {
  const response = await page.goto('/contact', { waitUntil: 'domcontentloaded' });
  expect(response, 'No response when loading route /contact').not.toBeNull();
  expect(response!.ok(), `Route /contact returned HTTP ${response!.status()}`).toBeTruthy();

  await expect(page.locator('.mobile-search-button')).toHaveCount(0);
  await expect(page.locator('.hero-path')).toHaveCount(3);
  await expect(
    page.getByRole('heading', { name: 'Book a workflow mapping session' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Send a workflow brief' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send workflow brief' })).toBeVisible();
});
