import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

function read(relativePath: string) {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
}

test('Agent Foundation makes one clear argument from stalled project to owned continuation', () => {
  const route = read('../src/routes/agent-foundation/+page.svelte');
  const offer = read('../src/lib/data/agentFoundation.ts');

  assert.match(route, /PerformanceCampaignOpening/);
  assert.match(route, /media=\{playbookHeroMedia\.services\}/);
  assert.match(route, /data-agent-foundation-proof/);
  assert.match(route, /Inside your repository/);
  assert.match(route, /Example handoff structure/);
  assert.match(route, /You make the next change/);
  assert.match(route, /Illustrative job/);
  assert.match(route, /Meeting notes/);
  assert.match(route, /Draft result/);
  assert.match(route, /Human review before any external write/);
  assert.match(route, /We quote the Foundation after we review the project and agree on the job/);
  assert.match(route, /Production Promotion/);
  assert.match(route, /No hidden CREATE\s+SOMETHING account/);
  assert.match(route, /agent_foundation_booking_clicked/);
  assert.equal(route.match(/href=\{agencyCoreMessaging\.agentFoundationBookingHref\}/g)?.length, 2);
  assert.equal(route.match(/agencyCoreMessaging\.bookAgentFoundationLabel/g)?.length, 2);
  assert.doesNotMatch(route, /PerformanceNarrativeStage/);
  assert.doesNotMatch(route, /PerformanceConversionHandoff/);
  assert.doesNotMatch(route, /agencyCoreMessaging\.selfMapHref/);
  assert.doesNotMatch(route, /workflowCompilerIntegrationHref/);
  assert.match(route, /href="\/services"/);
  assert.match(route, /See how delivery works/);
  assert.doesNotMatch(route, /See what the foundation includes|Start with Map|State:\s*ready/i);

  assert.match(offer, /Bring an idea, prototype, or stalled agent project/i);
  assert.match(offer, /You started the agent\. We’ll get one useful job working\./);
  assert.match(offer, /one useful job/i);
  assert.match(offer, /GitHub repository/i);
  assert.match(offer, /you make the next change/i);
  assert.match(offer, /Codex helps you make the next change/i);
  assert.match(offer, /real example/i);
  assert.match(offer, /rules for what the agent may do/i);
  assert.doesNotMatch(offer, /Database|Automation|Judgment|accepted development path/);
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
    lastmod: string;
  }>;
  const registry = read('../../../config/performance-pages/registry.ts');
  const surfacePolicy = read('../src/lib/atlas/surface-policy.ts');
  const booking = read('../src/routes/book/+page.svelte');
  const schedulerPage = read('../../../apps/create-something-scheduler/src/ui/page.ts');
  const schedulerManageLink = read(
    '../../../apps/create-something-scheduler/src/notifications/manage-link.ts'
  );

  assert.match(marketingCopy, /agentFoundationHref: '\/agent-foundation'/);
  assert.match(marketingCopy, /reviewAgentFoundationLabel: 'Review the Agent Foundation'/);
  assert.match(marketingCopy, /bookAgentFoundationLabel: 'Book a Foundation fit call'/);
  assert.match(
    marketingCopy,
    /agentFoundationBookingHref:\s*'\/book\?source=agent-foundation&intent=agent-foundation&lane=workflow_infrastructure'/
  );
  assert.match(marketingPages, /path: '\/agent-foundation'/);
  assert.ok(searchRoutes.some((route) => route.path === '/agent-foundation'));
  assert.equal(searchRoutes.find((route) => route.path === '/')?.lastmod, '2026-09-02');
  assert.match(
    marketingPages,
    /path: '\/',[\s\S]*?intent:[\s\S]*?Agent Foundation[\s\S]*?lastmod: '2026-09-02'/
  );
  assert.match(registry, /'agent-foundation'/);
  assert.match(surfacePolicy, /'\/agent-foundation'/);
  assert.match(booking, /intent === 'agent-foundation'/);
  assert.match(booking, /Agent Foundation fit call/);
  assert.match(booking, /person or team the agent serves, and one representative example/);
  assert.match(booking, /data-agent-foundation-booking/);
  assert.match(booking, /Choose a time to review your agent project/);
  assert.match(booking, /What you leave with/);
  assert.doesNotMatch(
    booking.match(/const agentFoundationBookingOffer = \{[\s\S]*?\} as const;/)?.[0] ?? '',
    /Map first|Harness or MCP-only|Production scope/
  );
  assert.match(schedulerPage, /title: 'Agent Foundation Fit Call \| CREATE SOMETHING'/);
  assert.match(schedulerPage, /heading: 'Fit One Agent Foundation'/);
  assert.match(schedulerPage, /normalizeSchedulerOfferIntent\(input\.intent\)/);
  assert.match(schedulerManageLink, /normalizeSchedulerOfferIntent\(input\.intent\)/);
});

test('the homepage and shared navigation lead with the Agent Foundation path', () => {
  const home = read('../src/routes/+page.svelte');
  const layout = read('../src/routes/+layout.svelte');

  assert.match(home, /Build an agent you can keep building\./);
  assert.match(home, /agencyCoreMessaging\.agentFoundationHref/);
  assert.match(home, /agencyCoreMessaging\.reviewAgentFoundationLabel/);
  assert.match(home, /Production Promotion/);
  assert.match(layout, /ctaLabel=\{agencyCoreMessaging\.reviewAgentFoundationLabel\}/);
  assert.match(layout, /const primaryCtaHref = agencyCoreMessaging\.agentFoundationHref/);
  assert.match(layout, /ctaHref=\{primaryCtaHref\}/);
});
