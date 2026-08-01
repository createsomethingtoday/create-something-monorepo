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
  assert.match(chooser, /Improve one internal workflow/);
  assert.match(chooser, /Deliver one client workflow/);
  assert.match(chooser, /Start with your team or a client\./);
  assert.match(chooser, /Choose who owns the workflow\. The method stays consistent\./);
  assert.match(chooser, /eyebrow: 'For your team'/);
  assert.match(chooser, /eyebrow: 'For a client'/);
  assert.doesNotMatch(chooser, /eyebrow: 'For client services'/);
  assert.doesNotMatch(chooser, /Which workflow are you bringing\?/);
  assert.match(chooser, /Same method/);
  assert.match(chooser, /Map, Build, and Control/);
  assert.match(chooser, /What changes/);
  assert.match(chooser, /Owner, accounts, and handoff/);
  assert.match(chooser, /This path includes/);
  assert.match(chooser, /href: '\/practice'/);
  assert.match(chooser, /href: '\/for-service-providers'/);
  assert.match(chooser, /adoption_path_click/);
});

test('tool compatibility follows the workflow choice as a bounded next step', () => {
  const home = read('../src/routes/+page.svelte');
  const chooser = read('../src/lib/components/AdoptionPathChooser.svelte');
  const compatibility = read('../src/lib/components/IntegrationCompatibilityRail.svelte');

  assert.ok(
    home.indexOf('<AdoptionPathChooser />') <
      home.indexOf('<IntegrationCompatibilityRail surface="homepage" />')
  );
  assert.match(compatibility, /data-surface=\{surface\}/);
  assert.match(compatibility, /Connect the workflow after the boundary is clear\./);
  assert.match(compatibility, /Map the owner, approvals, and proof first\./);
  assert.match(compatibility, /Search the connector directory/);
  assert.match(compatibility, /surface === 'homepage'/);
  assert.match(
    chooser,
    /margin:\s*clamp\(1\.5rem,\s*4vw,\s*3rem\) auto var\(--space-performance-page-gutter/
  );
  assert.match(
    compatibility,
    /data-surface='homepage'\]\s*\{[\s\S]*?margin-top:\s*0;/
  );
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
