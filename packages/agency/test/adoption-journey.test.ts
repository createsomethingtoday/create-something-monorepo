import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('the public shell exposes Practice and keeps client-service adoption one click away', () => {
  const layout = read('../src/routes/+layout.svelte');
  const home = read('../src/routes/+page.svelte');
  const chooser = read('../src/lib/components/AdoptionPathChooser.svelte');

  assert.match(layout, /label: 'Practice', href: '\/practice'/);
  assert.match(layout, /label: 'Field Reports', href: '\/field-reports'/);
  assert.match(layout, /label: 'Use With Clients', href: '\/for-service-providers'/);
  assert.match(home, /<AdoptionPathChooser \/>/);
  assert.match(chooser, /Use it for my team/);
  assert.match(chooser, /Use it with clients/);
  assert.match(chooser, /href: '\/practice'/);
  assert.match(chooser, /href: '\/for-service-providers'/);
  assert.match(chooser, /adoption_path_click/);
});

test('the service-provider route explains a bounded client delivery lifecycle', () => {
  const routeUrl = new URL('../src/routes/for-service-providers/+page.svelte', import.meta.url);
  assert.equal(existsSync(routeUrl), true);

  const route = read('../src/routes/for-service-providers/+page.svelte');
  assert.match(route, /Use CREATE SOMETHING with your clients/);
  assert.match(route, /Map the client workflow/);
  assert.match(route, /Confirm ownership and authority/);
  assert.match(route, /Build and verify the approved path/);
  assert.match(route, /Hand over proof or operate with Control/);
  assert.match(route, /Client-owned accounts/);
  assert.match(route, /No automatic white-label, reseller, or certification rights/);
  assert.match(route, /\/map\?source=service-provider/);
  assert.match(route, /\/book\?source=service-provider/);
});

test('tool compatibility remains separate from the service-provider relationship', () => {
  const partners = read('../src/routes/partners/+page.svelte');
  const portfolio = read('../src/lib/data/marketingPages.ts');
  const searchRoutes = read('../src/lib/data/searchRoutes.json');

  assert.match(partners, /href="\/for-service-providers"/);
  assert.match(partners, /Deliver workflows for clients/);
  assert.match(partners, /<IntegrationCatalog \/>/);
  assert.match(portfolio, /path: '\/for-service-providers'/);
  assert.match(searchRoutes, /"path": "\/for-service-providers"/);
});
