import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

function read(relativePath: string) {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
}

test('AI Buyer Readiness Audit is a bounded public diagnostic before Build and Control', () => {
  const route = read('../src/routes/agent-readiness/+page.svelte');
  const studyVariants = read('../src/lib/data/agentReadinessStudyVariants.ts');
  const salesContract = read('../content/sales/ai-buyer-readiness-audit.yaml');
  const commercialInterface = read('../content/sales/control-commercial-interface-spec.yaml');

  assert.match(studyVariants, /See what AI buyers understand—and get wrong—about your business\./);
  assert.match(studyVariants, /\$3,000 one-time/);
  assert.match(studyVariants, /25 high-intent buyer questions/);
  assert.match(studyVariants, /up to three competitors/i);
  assert.match(studyVariants, /timestamped answers/);
  assert.match(studyVariants, /cited sources/);
  assert.match(studyVariants, /prioritized 30-day plan/);
  assert.match(studyVariants, /does not include implementation/i);
  assert.match(studyVariants, /separately scoped Build/i);
  assert.match(studyVariants, /Control from \$900\/month after launch/i);
  assert.match(studyVariants, /No guaranteed rankings, citations, or recommendations\./);
  assert.match(route, /PerformanceCampaignOpening/);
  assert.match(route, /PerformanceNarrativeStage/);
  assert.match(route, /PerformanceConversionHandoff/);
  assert.match(route, /import \{ playbookHeroMedia \} from '\$lib\/data\/playbookHeroMedia'/);
  assert.match(route, /media=\{playbookHeroMedia\.agentReadiness\}/);
  assert.match(route, /mediaMobilePlacement="background"/);
  assert.match(route, /<PlaybookField variant="agent-readiness" \/>/);
  assert.match(route, /resolveAgentReadinessStudyVariant/);
  assert.doesNotMatch(route, /artifactOwnsMedia|artifactMobilePlacement/);
  assert.match(route, /agencyCoreMessaging\.agentReadinessAuditBookingHref/);
  assert.doesNotMatch(route, /x402|USDC|checkout/i);

  assert.match(salesContract, /public_name: "AI Buyer Readiness Audit"/);
  assert.match(salesContract, /one_time_usd: 3000/);
  assert.match(salesContract, /buyer_questions: 25/);
  assert.match(salesContract, /competitor_limit: 3/);
  assert.match(salesContract, /implementation: "separately_scoped_build"/);
  assert.match(salesContract, /managed_operations: "control_from_900_usd_per_month_after_launch"/);
  assert.match(salesContract, /self_service_checkout: "inactive"/);

  assert.match(commercialInterface, /buyer_readiness_audit:/);
  assert.match(
    commercialInterface,
    /contract_ref: "packages\/agency\/content\/sales\/ai-buyer-readiness-audit\.yaml"/
  );
});

test('the $49 machine snapshot remains a candidate with production charging disabled', () => {
  const contract = JSON.parse(
    read('../../database-layer/contracts/agent-commercial/v1/create-something.json')
  );
  const policy = contract.paymentPolicies.find(
    (candidate: { id: string }) => candidate.id === 'x402.agent-readiness-audit.v1'
  );
  const capability = contract.capabilities.find(
    (candidate: { id: string }) => candidate.id === 'agency.agent-readiness-audit'
  );
  const paymentAdapter = contract.providerAdapters.find(
    (candidate: { id: string }) => candidate.id === 'cloudflare.agents.x402'
  );

  assert.equal(capability.title, 'Agent Buyer Readiness Snapshot');
  assert.equal(capability.status, 'inactive');
  assert.equal(capability.surface.locator, 'candidate://agency/agent-buyer-readiness-snapshot');
  assert.equal(policy.status, 'approval_required');
  assert.deepEqual(policy.price, {
    state: 'unset',
    amount: null,
    foundingCandidate: {
      amount: 49,
      denomination: 'USD',
      billingUnit: 'completed_report',
      approval: 'separate_production_approval'
    }
  });
  assert.equal(paymentAdapter.status, 'inactive');
  assert.deepEqual(contract.productionControls, {
    charging: 'disabled',
    maxPaidRequestsPerMinute: 0,
    maxPerRequestUsd: '0',
    maxDailySpendUsd: '0',
    automaticRetry: false,
    rollbackRunbookRef:
      'packages/database-layer/contracts/agent-commercial/v1/PRODUCTION_ROLLBACK.md'
  });
});

test('the public route is registered for discovery and Canon commercial review', () => {
  const marketingPages = read('../src/lib/data/marketingPages.ts');
  const searchRoutes = JSON.parse(read('../src/lib/data/searchRoutes.json')) as Array<{
    path: string;
  }>;
  const registry = read('../../../config/performance-pages/registry.ts');
  const surfacePolicy = read('../src/lib/atlas/surface-policy.ts');

  assert.match(marketingPages, /path: '\/agent-readiness'/);
  assert.ok(searchRoutes.some((route) => route.path === '/agent-readiness'));
  assert.match(registry, /'agent-readiness'/);
  assert.match(surfacePolicy, /'\/agent-readiness'/);
});
