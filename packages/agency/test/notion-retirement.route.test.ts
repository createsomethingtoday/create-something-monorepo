import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { marketingPagePortfolio } from '../src/lib/data/marketingPages.ts';
import { load } from '../src/routes/notion/+page.server.ts';

const packageRoot = new URL('..', import.meta.url).pathname;

test('the retired Notion marketing route permanently redirects to the current stack', () => {
  assert.throws(
    () => load(),
    (error: unknown) => {
      assert.ok(error && typeof error === 'object');
      assert.equal('status' in error ? error.status : undefined, 308);
      assert.equal('location' in error ? error.location : undefined, '/stack');
      return true;
    }
  );
});

test('the retired Notion route is absent from the marketing portfolio and sitemap', () => {
  const searchRoutes = JSON.parse(
    readFileSync(path.join(packageRoot, 'src/lib/data/searchRoutes.json'), 'utf8')
  ) as Array<{ path: string }>;

  assert.ok(!marketingPagePortfolio.some((entry) => entry.path === '/notion'));
  assert.ok(!searchRoutes.some((entry) => entry.path === '/notion'));
});
