import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { agencyEditorialPageKind, agencyNeedsDocumentNavigation } from '../src/lib/data/agencyEditorialPresentation';

test('Agency editorial presentation covers nested workspace, identity, public and error routes without access decisions', () => {
  for (const path of ['/account','/admin/security/audit','/admin/funnel/leads/new','/delivery/abundance','/mcp-access/tools','/map/workspace/one/handoff/two','/map/share/token','/map/subscribe?source=site']) assert.equal(agencyEditorialPageKind(path), 'workspace',path);
  for (const path of ['/login','/auth/callback','/auth/cross-domain']) assert.equal(agencyEditorialPageKind(path), 'identity',path);
  for (const path of ['/','/dispatch/','/workflows/mcp-security-oauth','/experiments/example','/dify/mcp-control-plane']) assert.equal(agencyEditorialPageKind(path), 'public',path);
  assert.equal(agencyEditorialPageKind('/admin/unknown',404),'error');
});
test('Shared shell applies editorial design and forces cross-owner document navigation', () => {
  const layout=readFileSync(new URL('../src/routes/+layout.svelte',import.meta.url),'utf8');
  assert.match(layout,/onclickcapture=\{markEdgeOwnedLink\}/);
  assert.match(layout,/data-agency-design="editorial"/);
  assert.match(layout,/agencyEditorialPageKind\(\$page.url.pathname, \$page.status\)/);
});

test('Only exact Webflow destinations cross the document boundary, preserving workspace state and local hashes', () => {
  const current = new URL('https://createsomething.agency/map/workspace/example');
  for (const path of ['/dispatch/', '/about?source=tool', '/field-reports/template-review#proof']) assert.equal(agencyNeedsDocumentNavigation(new URL(path,current),current),true,path);
  for (const path of ['/map/workspace/second','/map/workspace/example#details','/admin/security','/field-reports/unknown','https://example.test/about']) assert.equal(agencyNeedsDocumentNavigation(new URL(path,current),current),false,path);
  assert.equal(agencyNeedsDocumentNavigation(new URL('https://createsomething.agency/dispatch#featured-report'),new URL('https://createsomething.agency/dispatch')),false);
});

test('private-owner editorial art is canonical in production and uses the opt-in local proxy in development', async () => {
  const { agencyEditorialAssetUrl } = await import('../src/lib/data/agencyEditorialPresentation');
  assert.equal(agencyEditorialAssetUrl('/agency/editorial/connected-tools-1280.webp'), 'https://createsomething.agency/agency/editorial/connected-tools-1280.webp');
  assert.equal(agencyEditorialAssetUrl('/agency/editorial/connected-tools-640.webp', true), '/agency/editorial/connected-tools-640.webp');
  assert.equal(agencyEditorialAssetUrl('/images/product.png'), '/images/product.png');
});
