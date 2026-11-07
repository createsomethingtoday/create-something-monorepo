import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { marketingPagePortfolio } from '../src/lib/data/marketingPages';
import { usesAgencyMeasuredPublicSurface } from '../src/lib/data/publicSurfacePolicy';
import { getAgencyPageFoundation } from '../src/lib/data/agencyPageFoundations';

const supporting = ['/privacy', '/terms', '/support-brief', '/ai-workflow-control', '/ai-workflow-recovery', '/marketplace-review-automation', '/arcs', '/experiments'];
const fixedPaths = [...new Set([...marketingPagePortfolio.map(entry => entry.path), ...supporting])]
  .filter(path => path !== '/' && usesAgencyMeasuredPublicSurface(path));
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('every reviewed fixed public page has a bounded, page-specific foundation', () => {
  for (const path of fixedPaths) {
    const result = getAgencyPageFoundation(path);
    assert.ok(result, path);
    assert.ok(result.label && result.spine, path);
    assert.ok(result.chapters.length >= 2 && result.chapters.length <= 6, path);
    assert.equal(result.chapters[0].id, 'main-content', path);
    assert.equal(result.chapters.at(-1)?.id, 'agency-directory', path);
    assert.equal(new Set(result.chapters.map(chapter => chapter.id)).size, result.chapters.length, path);
    assert.ok(result.chapters.every(chapter => chapter.label && chapter.short && chapter.note), path);
  }
});

test('route normalization preserves one foundation without widening ownership', () => {
  assert.deepEqual(getAgencyPageFoundation('/services///?source=brand#membership'), getAgencyPageFoundation('/services'));
  for (const path of ['/', '/login', '/account', '/auth/callback', '/map/workspace', '/map/workspace/123', '/map/share/123', '/prospects', '/prospects/client', '/client/example', '/api/arcs', '/unknown', '/services/unknown', '/products/unknown', '/dify', '/dify/agent-eval-gates', '/case-studies/webflow-marketplace', '/case-studies/webflow-marketplace/validator']) {
    assert.equal(getAgencyPageFoundation(path), null, path);
  }
});

test('workflow labels come from the reviewed portfolio and link to the shared guide template', () => {
  for (const entry of marketingPagePortfolio.filter(entry => entry.path.startsWith('/workflows/'))) {
    assert.ok(entry.requiredTerms[1], entry.path);
    assert.equal(getAgencyPageFoundation(entry.path)?.label, entry.requiredTerms[1], entry.path);
    assert.deepEqual(getAgencyPageFoundation(entry.path)?.chapters.map(chapter => chapter.id), ['main-content', 'signals-heading', 'operating-path', 'artifacts-heading', 'proof-heading', 'agency-directory']);
  }
});

test('public Arc details share real template destinations while redirected experiments stay with io', () => {
  assert.deepEqual(getAgencyPageFoundation('/arc/runbook-claude-desktop-mcp-quick-access')?.chapters.map(chapter => chapter.id), ['main-content', 'arc-presentation', 'registry-arc-contract-title', 'agency-directory']);
  // Publication/404 decisions belong to the loader, not this presentation map.
  assert.equal(getAgencyPageFoundation('/arc/future-published-slug')?.label, 'Workflow presentation');
  assert.equal(getAgencyPageFoundation('/arc/example/nested'), null);
  assert.equal(getAgencyPageFoundation('/experiments/example'), null);
  assert.equal(getAgencyPageFoundation('/experiments/example/?source=brand'), null);
});

test('the separately authored App Review Arc uses its own visible presentation and context', () => {
  const result=getAgencyPageFoundation('/arc/app-review-governance')!;
  assert.deepEqual(result.chapters.map(chapter=>chapter.id),['main-content','app-review-deck','arc-contract-title','agency-directory']);
  assert.equal(result.label,'App Review Governance');
  const source=read('src/routes/arc/app-review-governance/+page.svelte');
  for(const chapter of result.chapters.slice(1,-1)) assert.ok(source.includes(`id="${chapter.id}"`),chapter.id);
});

test('wayfinding targets stable task containers and not hidden or conditional UI states', () => {
  const forbidden = new Set(['review-heading', 'contact-name', 'contact-message', 'embedded-draw', 'platform-conviction-title', 'stack-roles-title', 'enterprise-layers-title', 'enterprise-plans-title', 'failed-boundary-title', 'measurement-plan-title']);
  for (const path of fixedPaths) {
    assert.ok(getAgencyPageFoundation(path)?.chapters.every(chapter => !forbidden.has(chapter.id)), path);
  }
  assert.ok(getAgencyPageFoundation('/contact')?.chapters.some(chapter => chapter.id === 'inquiry-form'));
  assert.ok(getAgencyPageFoundation('/book')?.chapters.some(chapter => chapter.id === 'first-party-scheduler'));
});

test('fixed chapter destinations are authored in the owning route or shared SSR component', () => {
  const shared: Record<string, string> = {
    membership: 'src/lib/components/MembershipOffer.svelte',
    'inquiry-form': 'src/lib/components/ContactOnboarding.svelte',
    'policy-content': 'src/lib/components/AgencyLegalContent.svelte',
    lab: '../canon/src/lib/experiments/basketball-systems-lab/BasketballSystemsLab.svelte',
    'board-report': '../canon/src/lib/experiments/basketball-systems-lab/BasketballSystemsLab.svelte'
  };
  const highIntent = ['workflow-control-boundary', 'workflow-recovery-boundary', 'marketplace-review-boundary'];
  for (const path of fixedPaths) {
    const route = path.startsWith('/workflows/') ? 'workflows/[slug]' : path.slice(1);
    for (const chapter of getAgencyPageFoundation(path)!.chapters) {
      if (['main-content', 'agency-directory'].includes(chapter.id)) continue; // Shared layout contract checked below.
      if (highIntent.includes(chapter.id)) {
        assert.ok(read('src/lib/components/HighIntentSearchLanding.svelte').includes('id={`${landing.intent}-boundary`}'), path);
      } else if (['signal-operating-boundary', 'decision-operating-boundary', 'proof-operating-boundary'].includes(chapter.id)) {
        assert.ok(read('src/lib/components/GovernanceProductPage.svelte').includes('id={`${product.id}-operating-boundary`}'), path);
      } else {
        const source = read(shared[chapter.id] ?? `src/routes/${route}/+page.svelte`);
        const escaped = chapter.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        assert.match(source, new RegExp(`\\bid\\s*=\\s*["']${escaped}["']`), `${path} -> #${chapter.id}`);
      }
    }
  }
  const layout = read('src/routes/+layout.svelte');
  assert.match(layout, /id="main-content"/);
  assert.match(layout, /id="agency-directory"/);
  const arc = read('src/routes/arc/[slug]/+page.svelte');
  assert.match(arc, /id="arc-presentation"/);
  assert.match(arc, /id="registry-arc-contract-title"/);
});

test('callers cannot mutate another page visit through the registry result', () => {
  const first = getAgencyPageFoundation('/services')!;
  first.chapters[0].label = 'Changed by one caller';
  assert.equal(getAgencyPageFoundation('/services')?.chapters[0].label, 'Technical support');
});

test('booking wayfinding follows known fit-call intents without reflecting arbitrary query text', () => {
  for(const [intent,label] of [['agent-foundation','Agent Foundation fit call'],['technical-review','Technical review fit call'],['compiler-integration','Workflow integration fit call'],['system-support','Software support discussion']]){
    const page=getAgencyPageFoundation('/book',intent)!;
    assert.equal(page.label,label);
    assert.equal(page.chapters[0].label,label);
    assert.ok(page.chapters.some(c=>c.id==='first-party-scheduler'));
  }
  assert.equal(getAgencyPageFoundation('/book','unknown-private-value')!.label,'Workflow mapping session');
});
