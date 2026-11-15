import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { agencyHeroes, agencyHeroDisposition, getAgencyHero, getAgencyHeroCoverage } from '../src/lib/data/agencyHeroCoverage';
import { agencyHeroStyles } from '../src/lib/data/agencyHeroStyles';

const root = resolve(import.meta.dirname, '..');

test('every page template has an explicit hero disposition', () => {
  const pages = readdirSync(resolve(root, 'src/routes'), { recursive: true })
    .map(String).filter(path => path.endsWith('+page.svelte'));
  const missing = pages.map(path => '/' + path.replace(/\/?\+page.svelte$/, ''))
    .filter(path => agencyHeroDisposition(path) === 'missing');
  assert.deepEqual(missing, [], 'new public pages must declare an image, redirect or exclusion');
});

test('only audited gaps get the fallback; existing owners and homepage are preserved', () => {
  assert.deepEqual(agencyHeroes.filter(hero => hero.owner === 'coverage').map(hero => hero.route).sort(), [
    '/ai-workflow-control', '/ai-workflow-recovery', '/basketball-systems-lab',
    '/case-studies/webflow-marketplace', '/case-studies/webflow-marketplace/[study]',
    '/dental-ai-agents', '/map', '/marketplace-review-automation', '/scopefield'
  ].sort());
  for (const hero of agencyHeroes.filter(hero => hero.owner === 'route')) assert.equal(getAgencyHero(hero.route), undefined);
  assert.equal(getAgencyHero('/'), undefined);
  assert.equal(getAgencyHero('/openai-dots'), undefined);
  assert.match(readFileSync(new URL('../src/lib/styles/openai-dots.css', import.meta.url), 'utf8'), /hero-grid.*background:url/);
  assert.match(readFileSync(new URL('../src/lib/components/AgencyHeroBackground.svelte', import.meta.url), 'utf8'), /\$page\.status < 400/);
});

test('coverage selectors retain their source markup contracts', () => {
  const sources: Record<string, string[]> = {
    '/map': ['src/routes/map/+page.svelte', 'src/lib/components/AgencyMapHero.svelte'],
    '/scopefield': ['src/routes/scopefield/+page.svelte'],
    '/basketball-systems-lab': ['../canon/src/lib/experiments/basketball-systems-lab/BasketballSystemsLab.svelte'],
    '/dental-ai-agents': ['src/routes/dental-ai-agents/+page.svelte'],
    '/case-studies/webflow-marketplace': ['src/routes/case-studies/webflow-marketplace/+page.svelte'],
    '/case-studies/webflow-marketplace/[study]': ['src/routes/case-studies/webflow-marketplace/[study]/+page.svelte']
  };
  const campaignSources = ['src/lib/components/HighIntentSearchLanding.svelte', '../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte'];
  for (const route of ['/ai-workflow-control', '/ai-workflow-recovery', '/marketplace-review-automation']) sources[route] = campaignSources;
  for (const hero of agencyHeroes.filter(hero => hero.owner === 'coverage')) {
    assert.ok(sources[hero.route], `missing source contract: ${hero.route}`);
    const markup = sources[hero.route].map(path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')).join('\n');
    for (const match of hero.selector.matchAll(/\.([\w-]+)/g)) assert.ok(markup.includes(match[1]), `${hero.route}: renamed class ${match[1]}`);
  }
  const component = readFileSync(new URL('../src/lib/components/AgencyHeroBackground.svelte', import.meta.url), 'utf8');
  assert.ok(component.includes('(width > 800px)'));
  assert.ok(component.includes('(max-width: 800px)'));
});

test('Agency scenes use explicit non-negative art and elevated copy layers', () => {
  const frame = readFileSync(new URL('../src/lib/components/AgencyHeroFrame.svelte', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/lib/styles/measured-pages.css', import.meta.url), 'utf8');
  assert.match(frame, /\.agency-hero-scene__art\s*\{[^}]*z-index:0/);
  assert.match(frame, /\.agency-hero-scene__copy\s*\{[^}]*position:relative;[^}]*z-index:1/);
  assert.match(css, /\.agency-surface \.canon-scene-lead > \.canon-scene-lead__art\s*\{[^}]*z-index:0/);
  assert.ok(css.includes("#main-content .performance-campaign-opening[data-background='scene']::before { display:none; }"));
  assert.match(css, /\.agency-surface \.canon-scene-lead > \.canon-scene-lead__copy\s*\{[^}]*position:relative;[^}]*z-index:1/);
  // display:contents wrappers cannot own a stacking level: lift the actual
  // grid children too, without altering their sizing or semantic order.
  assert.match(css, /header:has\(> div \+ dl\) > div:first-child\s*\{[^}]*z-index:1/);
  assert.match(css, /:is\(\.guide-back,\.guide-eyebrow,h1,\.guide-answer,\.guide-actions\)\s*\{[^}]*z-index:1/);
});

test('light portfolio navigation preserves its black outlined logo', () => {
  const layout = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
  assert.ok(layout.includes('.webflow-portfolio-shell :global(.nav-editorial .nav-logo-asset) { filter:none; }'));
  assert.match(layout, /\.webflow-portfolio-shell :global\(\.nav-editorial \.nav-menu-button\)\s*\{ background:transparent; color:var\(--color-performance-mode-campaign-ink\); border-color:currentColor;/);
});

test('decorative backgrounds retain accessibility and copy/proof separation', () => {
  const css = readFileSync(new URL('../src/lib/styles/hero-background.css', import.meta.url), 'utf8');
  assert.match(css, /pointer-events: none/);
  assert.match(css, /forced-colors: active/);
  assert.match(css, /order: 1/);
  assert.match(css, /order: 2/);
  assert.match(css, /min-height: 0/);
});

test('all hero assets exist and route assignments are unique', () => {
  assert.equal(new Set(agencyHeroes.map(hero => hero.route)).size, agencyHeroes.length);
  for (const hero of agencyHeroes) {
    assert.ok(hero.selector, hero.route);
    assert.ok(existsSync(resolve(root, 'static' + hero.src)), `${hero.route}: ${hero.src}`);
    assert.ok(existsSync(resolve(root, 'static' + hero.mobileSrc)), `${hero.route}: ${hero.mobileSrc}`);
    assert.match(hero.src, /^\/(?:images|films)\/[a-zA-Z0-9/_.-]+$/);
    assert.ok(!/</.test(hero.selector), 'selectors must be safe for an SSR style tag');
  }
});

test('public utility and product routes retain explicit background ownership', () => {
  for (const path of ['/contact', '/book', '/privacy', '/terms', '/bearer-token-policy', '/security',
    '/products/signal', '/products/decision', '/products/proof', '/case-studies/webflow-marketplace']) {
    assert.ok(getAgencyHeroCoverage(path), path);
    if (!path.startsWith('/case-studies/')) {
      assert.equal(getAgencyHero(path), undefined, `do not inject over native hero: ${path}`);
      assert.equal(agencyHeroDisposition(path), 'route-owned');
    }
  }
  assert.match(getAgencyHeroCoverage('/privacy')!.selector, /__copy$/);
  assert.match(getAgencyHeroCoverage('/terms')!.selector, /__copy$/);
});

test('private, authentication and workspace routes cannot inherit public heroes', () => {
  for (const path of ['/admin', '/admin/security', '/login', '/auth/callback', '/account', '/dashboard',
    '/prospects', '/delivery/abundance', '/mcp-access', '/map/workspace', '/map/share/token', '/map/subscribe']) {
    assert.equal(getAgencyHero(path), undefined, path);
    assert.equal(agencyHeroDisposition(path), 'excluded');
  }
});

test('retired routes preserve their redirect instead of loading new artwork', () => {
  for (const path of ['/notion', '/dify', '/dify/mcp-control-plane', '/experiments/[slug]']) {
    assert.equal(agencyHeroDisposition(path), 'redirect');
    assert.equal(getAgencyHero(path), undefined);
  }
});

test('dynamic routes match one segment and exact assignments take precedence', () => {
  assert.equal(getAgencyHeroCoverage('/arc/app-review-governance')!.route, '/arc/app-review-governance');
  assert.equal(getAgencyHeroCoverage('/arc/host-cursor')!.route, '/arc/[slug]');
  assert.equal(getAgencyHeroCoverage('/workflows/mcp-vs-api/')!.route, '/workflows/[slug]');
  assert.equal(getAgencyHeroCoverage('/workflows/mcp-vs-api?study=test')!.route, '/workflows/[slug]');
  assert.equal(getAgencyHero('/arc/host-cursor/private'), undefined);
  assert.equal(getAgencyHero('/unknown'), undefined);
});

test('SSR stylesheet expands trusted selectors and never interpolates request data', () => {
  const styles = readFileSync(resolve(root, 'src/lib/styles/hero-background.css'), 'utf8');
  for (const hero of agencyHeroes) {
    const result = agencyHeroStyles(hero, styles);
    assert.ok(result.includes(hero.src));
    assert.ok(result.includes(hero.mobileSrc));
    assert.ok(result.includes(`:is(${hero.selector})::before`));
    assert.ok(!result.includes('__HERO__'));
  }
  assert.equal(agencyHeroStyles(undefined, styles), '');
  assert.ok(!agencyHeroStyles(getAgencyHero('/map?injected=</style><script>'), styles).includes('<script>'));
  assert.match(styles, /aspect-ratio: 1672 \/ 941/);
  assert.match(styles, /prefers|forced-colors/);
});

test('background and preload render in head without JavaScript or injected figures', () => {
  const component = readFileSync(resolve(root, 'src/lib/components/AgencyHeroBackground.svelte'), 'utf8');
  assert.match(component, /<svelte:head>/);
  assert.match(component, /rel="preload" as="image"/);
  assert.match(component, /\$page.status < 400/);
  assert.doesNotMatch(component, /onMount|\$effect|<img|document\./);
  const treatment = readFileSync(resolve(root, 'src/lib/components/AgencyPageTreatment.svelte'), 'utf8');
  assert.match(treatment, /if\(!item \|\| getAgencyHero\(route\)\)return/);
});
