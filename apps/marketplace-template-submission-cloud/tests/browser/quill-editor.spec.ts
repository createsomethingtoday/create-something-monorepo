import { expect, test, type Page } from '@playwright/test';

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('bulleted list formatting retains the long description after the controlled-state debounce', async ({
  page
}) => {
  const description = 'First line of the template description';
  const pageErrors = trackPageErrors(page);

  await page.goto('/submit', { waitUntil: 'domcontentloaded' });

  const editor = page.locator('.ql-editor');
  await editor.click();
  await page.keyboard.type(description);
  await page.waitForTimeout(300);

  await page.getByRole('button', { name: 'Bulleted list' }).click();
  await page.waitForTimeout(500);

  await expect(editor).toContainText(description);
  await expect(editor.locator('li[data-list="bullet"]')).toContainText(description);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.ql-editor')).toHaveText('');
  await expect(page.locator('.ql-editor')).toHaveClass(/ql-blank/);
  expect(pageErrors).toEqual([]);
});

test('numbered list and bold formatting retain the long description', async ({ page }) => {
  const description = 'Numbered template detail';
  const pageErrors = trackPageErrors(page);

  await page.goto('/submit', { waitUntil: 'domcontentloaded' });

  const editor = page.locator('.ql-editor');
  await editor.click();
  await page.keyboard.type(description);
  await page.getByRole('button', { name: 'Numbered list' }).click();
  await page.waitForTimeout(500);

  await expect(editor.locator('ol > li')).toContainText(description);

  await page.getByRole('button', { name: 'Bold' }).click();
  await page.keyboard.type(' Bold detail');
  await page.waitForTimeout(500);

  await expect(editor).toContainText('Bold detail');
  await expect(editor.locator('strong')).toContainText('Bold detail');
  expect(pageErrors).toEqual([]);
});

test('published-site autofill synchronizes sanitized list HTML through Quill', async ({ page }) => {
  const publishedUrl = 'https://autofill-check.webflow.io';
  const autofilledDescription = 'Autofilled template detail';
  const pageErrors = trackPageErrors(page);

  await page.route('**/api/intake/validate-published-url', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        passed: true,
        message: 'Published site validated.',
        normalizedUrl: publishedUrl,
        gsapDetected: false,
        autofill: {
          longDescription: `<ul><li>${autofilledDescription}</li></ul>`
        }
      })
    });
  });

  await page.goto('/submit', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Published URL *' }).fill(publishedUrl);
  await page.getByRole('button', { name: 'Validate template' }).click();

  const editor = page.locator('.ql-editor');
  await expect(editor).toContainText(autofilledDescription);
  await expect(editor.locator('li[data-list="bullet"]')).toContainText(autofilledDescription);
  expect(pageErrors).toEqual([]);
});
