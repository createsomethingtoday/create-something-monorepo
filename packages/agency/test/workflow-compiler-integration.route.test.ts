import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

function read(relativePath: string) {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
}

test('Workflow Compiler Integration is a bounded, client-owned Build engagement', () => {
  const route = read('../src/routes/workflow-compiler-integration/+page.svelte');
  const offer = read('../src/lib/data/workflowCompilerIntegration.ts');

  assert.match(route, /PerformanceCampaignOpening/);
  assert.match(route, /PerformanceNarrativeStage/);
  assert.match(route, /PerformanceConversionHandoff/);
  assert.match(route, /media=\{playbookHeroMedia\.services\}/);
  assert.match(route, /mediaMobilePlacement="background"/);
  assert.match(route, /agencyCoreMessaging\.workflowCompilerIntegrationBookingHref/);
  assert.match(route, /https:\/\/www\.npmjs\.com\/package\/@createsomething\/workflow-compiler/);
  assert.match(route, /href="\/services"/);
  assert.match(route, /href="\/map"/);

  assert.match(offer, /Paid, fixed-scope implementation\./);
  assert.match(offer, /Priced after fit\./);
  assert.match(offer, /one repository/i);
  assert.match(offer, /one consequential workflow/i);
  assert.match(offer, /required MCP or agent tools/i);
  assert.match(offer, /policies, approval contracts, golden cases, and receipts/i);
  assert.match(offer, /CI gate/i);
  assert.match(offer, /client-owned/i);
  assert.match(offer, /No hosted control plane/i);
  assert.match(offer, /No live workflow execution/i);
  assert.doesNotMatch(`${route}\n${offer}`, /\$\d|checkout/i);
});

test('the fixed-scope service is governed by a machine-readable commercial contract', () => {
  const contract = read('../content/sales/workflow-compiler-integration.yaml');
  const commercialInterface = read('../content/sales/control-commercial-interface-spec.yaml');
  const salesReadme = read('../content/sales/README.md');

  assert.match(contract, /public_name: 'Control Compiler Integration'/);
  assert.match(contract, /engagement_model: 'paid_fixed_scope'/);
  assert.match(contract, /pricing_state: 'quoted_after_fit'/);
  assert.match(contract, /self_service_checkout: 'inactive'/);
  assert.match(contract, /repositories: 1/);
  assert.match(contract, /consequential_workflows: 1/);
  assert.match(contract, /hosted_control_plane: false/);
  assert.match(contract, /live_workflow_execution: false/);
  assert.match(contract, /client_owns/);
  assert.doesNotMatch(contract, /one_time_usd|monthly_usd|amount_usd/);

  assert.match(commercialInterface, /control_compiler_integration:/);
  assert.match(
    commercialInterface,
    /contract_ref: ['"]packages\/agency\/content\/sales\/workflow-compiler-integration\.yaml['"]/
  );
  assert.match(salesReadme, /Workflow Compiler Integration contract/);
  assert.match(salesReadme, /workflow-compiler-integration\.yaml/);
});

test('the integration route is registered for discovery, performance review, and Services', () => {
  const marketingCopy = read('../src/lib/data/marketingCopy.ts');
  const marketingPages = read('../src/lib/data/marketingPages.ts');
  const searchRoutes = JSON.parse(read('../src/lib/data/searchRoutes.json')) as Array<{
    path: string;
  }>;
  const registry = read('../../../config/performance-pages/registry.ts');
  const surfacePolicy = read('../src/lib/atlas/surface-policy.ts');
  const servicesProductPath = read('../src/lib/components/ServicesProductPath.svelte');
  const agentFoundation = read('../src/routes/agent-foundation/+page.svelte');

  assert.match(marketingCopy, /workflowCompilerIntegrationHref: '\/workflow-compiler-integration'/);
  assert.match(
    marketingCopy,
    /workflowCompilerIntegrationBookingHref:\s*'\/book\?source=workflow-compiler-integration&intent=compiler-integration&lane=workflow_infrastructure'/
  );
  assert.match(marketingPages, /path: '\/workflow-compiler-integration'/);
  assert.ok(searchRoutes.some((route) => route.path === '/workflow-compiler-integration'));
  assert.match(registry, /'workflow-compiler-integration'/);
  assert.match(surfacePolicy, /'\/workflow-compiler-integration'/);
  assert.match(servicesProductPath, /agencyCoreMessaging\.agentFoundationHref/);
  assert.match(agentFoundation, /agencyCoreMessaging\.workflowCompilerIntegrationHref/);
});

test('the integration CTA resolves to matching Agency and scheduler booking copy', () => {
  const bookingRoute = read('../src/routes/book/+page.svelte');
  const schedulerPage = read('../../../apps/create-something-scheduler/src/ui/page.ts');
  const schedulerWorker = read('../../../apps/create-something-scheduler/src/worker.ts');
  const schedulerManageLink = read(
    '../../../apps/create-something-scheduler/src/notifications/manage-link.ts'
  );

  assert.match(bookingRoute, /intent === 'compiler-integration'/);
  assert.match(bookingRoute, /Workflow Compiler Integration fit call/);
  assert.match(bookingRoute, /one repository, one consequential workflow/);
  assert.match(bookingRoute, /Review the integration offer/);
  assert.match(schedulerPage, /resolveSchedulerPageOffer/);
  assert.match(schedulerPage, /Workflow Compiler Integration Fit Call \| CREATE SOMETHING/);
  assert.match(schedulerPage, /Fit One Integration/);
  assert.match(schedulerPage, /Compiler Integration \/ V1/);
  assert.match(schedulerPage, /canonicalBookingUrl/);
  assert.match(schedulerPage, /if \(offerIntent\) params\.set\('intent',offerIntent\)/);
  assert.match(schedulerWorker, /intent: url\.searchParams\.get\('intent'\)/);
  assert.match(schedulerWorker, /booking\.context\?\.intent/);
  assert.match(schedulerManageLink, /input\.intent === 'compiler-integration'/);
});
