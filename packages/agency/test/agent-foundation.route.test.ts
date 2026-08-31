import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

function read(relativePath: string) {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
}

test('Agent Foundation names the buyer, bounded capability, ownership, continuation, boundary, and CTA', () => {
  const route = read('../src/routes/agent-foundation/+page.svelte');
  const offer = read('../src/lib/data/agentFoundation.ts');

  assert.match(route, /PerformanceCampaignOpening/);
  assert.match(route, /PerformanceNarrativeStage/);
  assert.match(route, /PerformanceConversionHandoff/);
  assert.match(route, /media=\{playbookHeroMedia\.services\}/);
  assert.match(route, /agencyCoreMessaging\.agentFoundationBookingHref/);
  assert.match(route, /agencyCoreMessaging\.bringAgentProjectLabel/);
  assert.match(route, /Foundation pricing is quoted after fit/);
  assert.match(route, /Production Promotion/);
  assert.match(route, /No hidden CREATE SOMETHING account/);

  assert.match(
    offer,
    /builders and operating teams with an idea, prototype, or stalled Codex project/i
  );
  assert.match(offer, /one useful capability/i);
  assert.match(offer, /GitHub repository/i);
  assert.match(offer, /continue in your own environment/i);
  assert.match(offer, /Production access and operation are promoted separately/i);
  assert.match(offer, /one agreed change/i);
  assert.match(offer, /not every future change or production use/i);
  assert.doesNotMatch(
    `${route}\n${offer}`,
    /finished product|fully autonomous|runs your whole business|guaranteed savings/i
  );
});

test('Agent Foundation has a machine-readable quoted-after-fit contract with Production Promotion excluded', () => {
  const contract = read('../content/sales/agent-foundation.yaml');
  const commercialInterface = read('../content/sales/control-commercial-interface-spec.yaml');
  const salesReadme = read('../content/sales/README.md');

  assert.match(contract, /public_name: 'Agent Foundation'/);
  assert.match(contract, /engagement_model: 'paid_fixed_scope_build'/);
  assert.match(contract, /pricing_state: 'quoted_after_fit'/);
  assert.match(contract, /agent_roles: 1/);
  assert.match(contract, /consequential_jobs: 1/);
  assert.match(contract, /codex_onboarding_and_one_bounded_continuation_change/);
  assert.match(contract, /production_credentials_or_writes: false/);
  assert.match(contract, /public_deployment_or_hosting: false/);
  assert.match(contract, /real_user_acceptance: false/);
  assert.match(contract, /live_authority_and_deployment: 'Production Promotion'/);
  assert.doesNotMatch(contract, /one_time_usd|monthly_usd|amount_usd/);

  assert.match(commercialInterface, /agent_foundation:/);
  assert.match(
    commercialInterface,
    /contract_ref: ['"]packages\/agency\/content\/sales\/agent-foundation\.yaml['"]/
  );
  assert.match(salesReadme, /Agent Foundation contract/);
});

test('Agent Foundation is registered for discovery, Canon review, and booking', () => {
  const marketingCopy = read('../src/lib/data/marketingCopy.ts');
  const marketingPages = read('../src/lib/data/marketingPages.ts');
  const searchRoutes = JSON.parse(read('../src/lib/data/searchRoutes.json')) as Array<{
    path: string;
  }>;
  const registry = read('../../../config/performance-pages/registry.ts');
  const surfacePolicy = read('../src/lib/atlas/surface-policy.ts');
  const booking = read('../src/routes/book/+page.svelte');

  assert.match(marketingCopy, /agentFoundationHref: '\/agent-foundation'/);
  assert.match(marketingCopy, /bringAgentProjectLabel: 'Bring your agent project'/);
  assert.match(
    marketingCopy,
    /agentFoundationBookingHref:\s*'\/book\?source=agent-foundation&intent=agent-foundation&lane=workflow_infrastructure'/
  );
  assert.match(marketingPages, /path: '\/agent-foundation'/);
  assert.ok(searchRoutes.some((route) => route.path === '/agent-foundation'));
  assert.match(registry, /'agent-foundation'/);
  assert.match(surfacePolicy, /'\/agent-foundation'/);
  assert.match(booking, /intent === 'agent-foundation'/);
  assert.match(booking, /Agent Foundation fit call/);
  assert.match(booking, /one role, one job, and one representative case/);
});

test('the homepage and shared navigation lead with the Agent Foundation path', () => {
  const home = read('../src/routes/+page.svelte');
  const layout = read('../src/routes/+layout.svelte');

  assert.match(home, /Build an agent you can keep building\./);
  assert.match(home, /agencyCoreMessaging\.agentFoundationHref/);
  assert.match(home, /agencyCoreMessaging\.bringAgentProjectLabel/);
  assert.match(home, /Production Promotion/);
  assert.match(layout, /ctaLabel=\{agencyCoreMessaging\.bringAgentProjectLabel\}/);
  assert.match(layout, /const primaryCtaHref = agencyCoreMessaging\.agentFoundationHref/);
  assert.match(layout, /ctaHref=\{primaryCtaHref\}/);
});
