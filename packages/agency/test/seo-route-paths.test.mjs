import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageFileForRoute, sourceDeclaresNoindex } from '../scripts/seo-route-paths.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/routes');
const entries=JSON.parse(fs.readFileSync(new URL('../src/lib/data/searchRoutes.json',import.meta.url)));

test('all eight indexed Webflow studies resolve to the actual dynamic page',()=>{
  const studies=entries.filter(entry=>/^\/case-studies\/webflow-marketplace\//.test(entry.path));
  assert.equal(studies.length,8);
  for(const {path:route} of studies){
    const file=pageFileForRoute(route,root);
    assert.ok(fs.existsSync(file),`${route} must have an owning page`);
    assert.match(fs.readFileSync(file,'utf8'),/data\.study\.title/);
  }
});
test('overview, workflows, static routes and deeper unknown paths retain their owners',()=>{
  assert.equal(pageFileForRoute('/case-studies/webflow-marketplace',root),path.join(root,'case-studies/webflow-marketplace/+page.svelte'));
  assert.equal(pageFileForRoute('/workflows/webflow-template-review',root),path.join(root,'workflows/[slug]/+page.svelte'));
  assert.equal(pageFileForRoute('/services',root),path.join(root,'services/+page.svelte'));
  assert.equal(pageFileForRoute('/',root),path.join(root,'+page.svelte'));
  assert.equal(pageFileForRoute('/case-studies/webflow-marketplace/preflight/extra',root),path.join(root,'case-studies/webflow-marketplace/preflight/extra/+page.svelte'));
});

test('authored robots metadata keeps private intake out of sitemap requirements',()=>{
  const support=fs.readFileSync(path.join(root,'support-brief/+page.svelte'),'utf8');
  assert.equal(sourceDeclaresNoindex(support),true);
  assert.equal(sourceDeclaresNoindex('<meta content="nofollow, NOINDEX" name="robots">'),true);
  assert.equal(sourceDeclaresNoindex('<SEO noindex={true} />'),true);
  assert.equal(sourceDeclaresNoindex('<meta name="robots" content="index,follow">'),false);
  assert.equal(sourceDeclaresNoindex('<meta name="description" content="noindex">'),false);
  assert.equal(sourceDeclaresNoindex('Copy discussing noindex does not exclude a page.'),false);
});
