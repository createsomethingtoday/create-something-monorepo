import { expect, test, type Page } from '@playwright/test';

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function setWebPFile(
  page: Page,
  inputSelector: string,
  dimensions: { width: number; height: number },
  name: string
) {
  await page.evaluate(
    async ({ selector, width, height, fileName }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2d context unavailable');
      context.fillStyle = '#146ef5';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#ffffff';
      context.fillRect(width / 4, height / 4, width / 2, height / 2);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error('WebP encode failed'))),
          'image/webp',
          0.9
        );
      });

      const file = new File([blob], fileName, { type: 'image/webp' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector<HTMLInputElement>(selector);
      if (!input) throw new Error(`Input not found: ${selector}`);
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { selector: inputSelector, width: dimensions.width, height: dimensions.height, fileName: name }
  );
}

test('default load shows only the creator step with the stepper', async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto('/submit', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('navigation', { name: 'Submission steps' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Become a Creator/ })).toHaveAttribute(
    'aria-current',
    'step'
  );
  await expect(page.getByRole('textbox', { name: 'Primary email' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Template name *' })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('section=submit-today deep-links to the template step with all five sections', async ({
  page
}) => {
  const pageErrors = trackPageErrors(page);
  await page.goto('/submit?section=submit-today', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('button', { name: /Submit a template/ })).toHaveAttribute(
    'aria-current',
    'step'
  );
  for (const label of [
    'Creator identity',
    'Site validation',
    'Listing details',
    'Assets',
    'Confirm and submit'
  ]) {
    await expect(page.locator(`section[aria-label="${label}"]`)).toBeVisible();
  }
  await expect(page.getByRole('textbox', { name: 'Template name *' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Primary email' })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('profile shortcut and stepper switch steps and sync the section param', async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto('/submit', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'I already have a creator profile' }).click();
  await expect(page.getByRole('textbox', { name: 'Template name *' })).toBeVisible();
  await expect(page).toHaveURL(/section=submit-today/);

  await page.getByRole('button', { name: /Become a Creator/ }).click();
  await expect(page.getByRole('textbox', { name: 'Primary email' })).toBeVisible();
  await expect(page).toHaveURL(/section=join-today/);
  expect(pageErrors).toEqual([]);
});

test('step switch preserves filled creator state', async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto('/submit', { waitUntil: 'domcontentloaded' });

  await page.getByRole('textbox', { name: 'Legal name *' }).fill('Ada Lovelace');
  await page.getByRole('button', { name: /Submit a template/ }).click();
  await expect(page.getByRole('textbox', { name: 'Template name *' })).toBeVisible();
  await page.getByRole('button', { name: /Become a Creator/ }).click();
  await expect(page.getByRole('textbox', { name: 'Legal name *' })).toHaveValue('Ada Lovelace');
  expect(pageErrors).toEqual([]);
});

test('readiness chips jump to the blocking field', async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto('/submit?section=submit-today', { waitUntil: 'domcontentloaded' });

  const banner = page.locator('.submission-readiness-banner');
  await expect(banner).toContainText('required items still need attention');

  await banner.getByRole('button', { name: /Creator verified/ }).click();
  const target = page.locator('#field-creator-email');
  await expect(target).toBeInViewport();
  await expect(target.locator('input').first()).toBeFocused();
  expect(pageErrors).toEqual([]);
});

test('valid WebP uploads render previews and invalid ones do not', async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto('/submit?section=submit-today', { waitUntil: 'domcontentloaded' });

  await setWebPFile(page, '#thumbnailFile', { width: 750, height: 995 }, 'primary.webp');
  await expect(page.locator('.submission-upload-preview-thumbnail')).toBeVisible();

  await setWebPFile(page, '#thumbnailFile', { width: 100, height: 100 }, 'wrong.webp');
  await expect(page.locator('.submission-upload-preview-thumbnail')).toHaveCount(0);
  await expect(
    page.locator('.submission-field-feedback-error', { hasText: '750×995' })
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});
