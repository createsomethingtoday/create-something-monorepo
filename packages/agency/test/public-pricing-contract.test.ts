import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { PUBLIC_PRICING } from '../src/lib/data/publicPricing.ts';
import { getPublicProduct } from '../src/lib/data/productFamily.ts';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('public pricing separates free source, the Map starter, and managed Control', () => {
  assert.deepEqual(PUBLIC_PRICING.publicSource, {
    amountUsd: 0,
    label: '$0 / MIT',
    license: 'MIT',
    contractUrl:
      'https://github.com/createsomethingtoday/create-something-monorepo/blob/main/PUBLIC_DISTRIBUTION.md'
  });
  assert.deepEqual(PUBLIC_PRICING.map, {
    publicStarterLabel: '$0 browser-local starter',
    workspaceLabel: 'Account workspace · pricing at launch'
  });
  assert.deepEqual(PUBLIC_PRICING.managedControl, {
    startingMonthlyUsd: 900,
    label: 'From $900/month',
    longLabel: 'From $900 per month after launch'
  });

  assert.equal(getPublicProduct('map').accessLabel, PUBLIC_PRICING.map.workspaceLabel);
  assert.equal(getPublicProduct('control').accessLabel, PUBLIC_PRICING.managedControl.longLabel);
});

test('canonical buyer surfaces render the shared pricing contract without the old Map ambiguity', () => {
  const homepage = read('../src/routes/+page.svelte');
  const services = read('../src/routes/services/+page.svelte');
  const servicesPath = read('../src/lib/components/ServicesProductPath.svelte');
  const products = read('../src/routes/products/+page.svelte');
  const map = read('../src/routes/map/+page.svelte');
  const control = read('../src/routes/control/+page.svelte');

  for (const source of [homepage, services, servicesPath, products, map, control]) {
    assert.match(source, /PUBLIC_PRICING/);
  }

  assert.doesNotMatch(homepage, /price: 'Fixed scope'/);
  assert.doesNotMatch(services, /price: 'Monthly \/ yearly'/);
  assert.match(products, /publicSource\.label/);
  assert.match(products, /managedControl\.label/);
  assert.match(map, /map\.publicStarterLabel/);
  assert.match(map, /map\.workspaceLabel/);
});
