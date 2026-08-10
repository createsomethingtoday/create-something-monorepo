import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  auditPublicCopy,
  discoverPublicCopyFiles,
  packageRoot
} from '../scripts/check-public-copy.mjs';
import { products } from '../src/lib/data/services.ts';

function packageRelative(file: string): string {
  return file.replace(`${packageRoot}/`, '');
}

function conversionHandoffOpenings(source: string): string[] {
  return [...source.matchAll(/<PerformanceConversionHandoff\b[\s\S]*?>/g)].map(
    ([opening]) => opening
  );
}

test('public agency copy guard discovers every visitor-facing route', () => {
  const files = discoverPublicCopyFiles().map(packageRelative);

  assert.ok(files.includes('src/routes/+page.svelte'));
  assert.ok(files.includes('src/routes/cloudflare/+page.svelte'));
  assert.ok(files.includes('src/routes/products/ground/+page.svelte'));
  assert.ok(files.includes('src/routes/terms/+page.svelte'));
  assert.ok(
    files.some((file) =>
      file.endsWith('apps/create-something-scheduler/src/notifications/booking-email.ts')
    )
  );
  assert.ok(!files.includes('src/routes/admin/funnel/+page.svelte'));
  assert.ok(!files.includes('src/routes/login/+page.svelte'));
});

test('public agency copy avoids internal strategy and unclear control language', () => {
  assert.deepEqual(auditPublicCopy(), []);
});

test('public agency copy guard catches phrases split across markup whitespace', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-copy-'));
  const fixture = path.join(tempDir, '+page.svelte');

  try {
    writeFileSync(fixture, '<p>Bring the approval\n  owner before the build.</p>');

    assert.deepEqual(auditPublicCopy([fixture]), [
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 14,
        rule: 'approval-owner',
        text: 'approval\n  owner',
        replacement: 'approval authority'
      }
    ]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('public agency copy guard catches old lane and partner framing', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-copy-'));
  const fixture = path.join(tempDir, '+page.svelte');

  try {
    writeFileSync(
      fixture,
      '<p>The Partner Lane should not include a partner claim when the support lane requires review.</p>'
    );

    assert.deepEqual(auditPublicCopy([fixture]), [
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 8,
        rule: 'partner-lane',
        text: 'Partner Lane',
        replacement: 'workflow tool paths'
      },
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 42,
        rule: 'partner-claim',
        text: 'partner claim',
        replacement: 'public claim'
      },
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 65,
        rule: 'support-lane',
        text: 'support lane',
        replacement: 'support scope'
      },
      {
        file: path.relative(packageRoot, fixture).replaceAll(path.sep, '/'),
        line: 1,
        column: 73,
        rule: 'lane-requires',
        text: 'lane requires',
        replacement: 'workflow scope requires'
      }
    ]);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('public agency copy guard rejects unauthorized OpenAI relationship claims', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-copy-'));
  const fixture = path.join(tempDir, '+page.svelte');

  try {
    writeFileSync(
      fixture,
      [
        'Official OpenAI Partner',
        'Certified OpenAI Provider',
        'OpenAI-approved implementation partner',
        'OpenAI reseller',
        'OpenAI affiliate',
        'Frontier Alliance partner'
      ].join('\n')
    );

    assert.deepEqual(
      auditPublicCopy([fixture]).map((finding) => finding.rule),
      [
        'official-openai-partner',
        'certified-openai-provider',
        'openai-approved-partner',
        'openai-reseller',
        'openai-affiliate',
        'frontier-alliance-partner'
      ]
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('public agency surfaces state the OpenAI conviction and owned-system boundary', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const stack = readFileSync(new URL('../src/routes/stack/+page.svelte', import.meta.url), 'utf8');
  const partners = readFileSync(
    new URL('../src/routes/partners/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(home, /<span>How we build<\/span>/);
  assert.match(home, /Built with OpenAI and Cloudflare\. Designed to remain yours\./);
  assert.match(home, /We use OpenAI Codex to map, build, and maintain the workflow\./);
  assert.match(
    home,
    /If the model\s+or agent environment\s+changes, the system does not have to start over\./
  );
  assert.match(home, />Why we build this way</);
  assert.doesNotMatch(
    home,
    /Current agent environment|Designed to outlast any model|MCP contracts, harnesses/
  );
  assert.match(
    home,
    /https:\/\/createsomething\.ltd\/canon\/concepts\/conviction-without-dependence/
  );
  assert.match(stack, /Model-opinionated in practice\. Model-portable by design\./);
  assert.match(stack, /data, MCP contracts, harnesses, skills, prompts, policy, evals, receipts/i);
  assert.match(partners, /OpenAI is the primary reasoning and agent environment/i);
  assert.match(partners, /open-weight and custom models/i);
});

test('the homepage leads with a Playbook-led operating-system message before its provider stack', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const opening = home.slice(
    home.indexOf('<PerformanceCampaignOpening'),
    home.indexOf('</PerformanceCampaignOpening>')
  );
  const ownership = home.slice(
    home.indexOf('<aside class="ownership-callout">'),
    home.indexOf('</aside>', home.indexOf('<aside class="ownership-callout">'))
  );

  assert.match(home, /title="AI Operating Systems \| CREATE SOMETHING \.agency"/);
  assert.match(opening, /eyebrow="CREATE SOMETHING \.agency"/);
  assert.match(opening, /propertyRole="Embedded AI operating partner"/);
  assert.match(opening, /expression="editorial"/);
  assert.match(opening, /title="Your people and AI need the same playbook\."/);
  assert.match(
    opening,
    /We embed with operators to map one workflow, install its AI infrastructure, and hand back a client-owned Playbook\./
  );
  assert.match(
    opening,
    /Offense advances approved work\. Defense protects decisions, proof, and recovery\./
  );
  assert.match(opening, /The opposition is ambiguity, AI out of reach, and untrusted automation\./);
  assert.match(opening, /<PlaybookField variant="home"/);
  assert.doesNotMatch(opening, /mode="paper"|paperOperatingRouteMedia/);
  assert.match(ownership, /Built with OpenAI and Cloudflare\. Designed to remain yours\./);
  assert.match(
    ownership,
    /CREATE SOMETHING owns the system\. OpenAI provides intelligence\. Cloudflare provides\s+infrastructure\./
  );
  assert.match(ownership, /Your\s+team\s+keeps the map, rules, history, and recovery path\./);
  assert.doesNotMatch(home, /Cloudflare OS/);
});

test('commercial decision routes lead with plain meaning before owned terminology', () => {
  const layout = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const services = readFileSync(
    new URL('../src/routes/services/+page.svelte', import.meta.url),
    'utf8'
  );
  const servicesMapPreview = readFileSync(
    new URL('../src/lib/components/ServicesMapPreview.svelte', import.meta.url),
    'utf8'
  );
  const productsPage = readFileSync(
    new URL('../src/routes/products/+page.svelte', import.meta.url),
    'utf8'
  );
  const stack = readFileSync(new URL('../src/routes/stack/+page.svelte', import.meta.url), 'utf8');
  const proof = readFileSync(
    new URL('../src/routes/proof/marketplace-workflow/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(layout, /label: 'How It Works', href: '\/services'/);
  assert.match(layout, /label: 'What You Keep', href: '\/stack'/);
  assert.doesNotMatch(layout, /label: 'How I Work'/);
  assert.doesNotMatch(layout, /label: 'Stack Boundary'/);

  assert.match(home, /title="Your people and AI need the same playbook\."/);
  assert.match(home, /We embed with operators to map one workflow/);
  assert.match(home, />See the Marketplace workflow</);
  assert.match(home, /label: 'Control',[\s\S]*?value: 'Run \/ Wait \/ Stop'/);
  const heroProof = home.slice(
    home.indexOf('const heroProofItems'),
    home.indexOf('const serviceFlowSteps')
  );
  const heroOpening = home.slice(
    home.indexOf('<PerformanceCampaignOpening'),
    home.indexOf('</PerformanceCampaignOpening>')
  );
  assert.doesNotMatch(heroOpening, /and easier to run|See a worked example/);
  assert.doesNotMatch(heroProof, /label: 'Map'/);
  assert.doesNotMatch(home, /Train the workflow/);

  assert.match(services, /Bring one handoff your team still checks manually/);
  assert.match(servicesMapPreview, /See the operating path before deciding to build/);
  assert.doesNotMatch(services, /PerformanceFieldSequence|PerformanceThesisConditions/);

  assert.match(productsPage, /title="One playbook\. Three operating paths\."/);
  assert.match(productsPage, /Map defines the client-owned Playbook/);
  assert.match(productsPage, /Build makes its approved Runbooks executable/);
  assert.match(productsPage, /Control operates and improves the system/);
  assert.doesNotMatch(productsPage, /Product hierarchy|Product protocol|Operating sequence/);

  assert.match(stack, /You keep the accounts, data, approval rights, and operating history/);
  assert.match(stack, /title="What You Keep \| CREATE SOMETHING \.agency"/);
  assert.match(proof, /title="Turn a watched review queue into a testable workflow\."/);
  assert.match(proof, /title(?:=|:)\s*["']Spend less time rebuilding context\.["']/);
  assert.match(proof, /prototype measurements, not customer ROI claims/);
});

test('public Agency commercial propositions declare the shared editorial expression', () => {
  const campaignRoutes = [
    'services',
    'map',
    'control',
    'products',
    'products/ground',
    'products/loom',
    'field-reports',
    'field-reports/template-review',
    'proof/marketplace-workflow',
    'delivery',
    'experiments'
  ];
  const sectionHeroRoutes = [
    'about',
    'cloudflare',
    'contact',
    'for-service-providers',
    'partners',
    'security',
    'use-cases/business',
    'use-cases/enterprise'
  ];

  for (const route of campaignRoutes) {
    const source = readFileSync(new URL(`../src/routes/${route}/+page.svelte`, import.meta.url), 'utf8');
    const opening = source.slice(
      source.indexOf('<PerformanceCampaignOpening'),
      source.indexOf('</PerformanceCampaignOpening>')
    );
    assert.match(opening, /expression="editorial"/, `${route} must opt into editorial campaign type`);
  }

  for (const route of sectionHeroRoutes) {
    const source = readFileSync(new URL(`../src/routes/${route}/+page.svelte`, import.meta.url), 'utf8');
    const hero = source.slice(
      source.indexOf('<PerformancePageSection'),
      source.indexOf('</PerformancePageSection>')
    );
    assert.match(hero, /expression="editorial"/, `${route} must opt into editorial proposition type`);
  }

  const governanceProduct = readFileSync(
    new URL('../src/lib/components/GovernanceProductPage.svelte', import.meta.url),
    'utf8'
  );
  const practice = readFileSync(new URL('../src/routes/practice/+page.svelte', import.meta.url), 'utf8');
  const methodology = readFileSync(
    new URL('../src/routes/methodology/+page.svelte', import.meta.url),
    'utf8'
  );
  const workflows = readFileSync(new URL('../src/routes/workflows/+page.svelte', import.meta.url), 'utf8');

  assert.match(governanceProduct, /<PerformancePageSection[\s\S]*?expression="editorial"/);
  assert.match(practice, /<PerformanceConversionHandoff[\s\S]*?headingLevel="h1"[\s\S]*?expression="editorial"/);
  assert.match(methodology, /\.hero-title\s*\{[\s\S]*?font-family:\s*var\(--font-performance-editorial\)/);
  assert.match(
    workflows,
    /h1\s*\{[\s\S]*?font-family:\s*var\(--font-performance-editorial\)/,
    'the workflow library proposition must use the shared Agency editorial face'
  );
});

test('commercial conversion handoffs use editorial propositions while task surfaces stay field-led', () => {
  const commercialRoutes = [
    '',
    'about',
    'cloudflare',
    'control',
    'delivery',
    'field-reports',
    'field-reports/template-review',
    'for-service-providers',
    'map',
    'methodology',
    'partners',
    'practice',
    'products',
    'products/ground',
    'products/loom',
    'proof/marketplace-workflow',
    'security',
    'stack',
    'use-cases/business',
    'use-cases/enterprise'
  ];

  for (const route of commercialRoutes) {
    const routePath = route ? `${route}/+page.svelte` : '+page.svelte';
    const source = readFileSync(new URL(`../src/routes/${routePath}`, import.meta.url), 'utf8');
    const openings = conversionHandoffOpenings(source);

    assert.ok(openings.length > 0, `${route || 'home'} must render a conversion handoff`);
    for (const opening of openings) {
      assert.match(
        opening,
        /expression="editorial"/,
        `${route || 'home'} conversion propositions must use the editorial expression`
      );
    }
  }

  const governanceProduct = readFileSync(
    new URL('../src/lib/components/GovernanceProductPage.svelte', import.meta.url),
    'utf8'
  );
  for (const opening of conversionHandoffOpenings(governanceProduct)) {
    assert.match(opening, /expression="editorial"/);
  }

  const taskRoutes = [
    'book',
    'dify',
    'dify/agent-eval-gates',
    'dify/mcp-control-plane',
    'dify/ship-dify-app-with-mcp-tools',
    'dify/template-marketplace-proof'
  ];

  for (const route of taskRoutes) {
    const source = readFileSync(
      new URL(`../src/routes/${route}/+page.svelte`, import.meta.url),
      'utf8'
    );
    const openings = conversionHandoffOpenings(source);

    assert.ok(openings.length > 0, `${route} must render a conversion handoff`);
    for (const opening of openings) {
      assert.doesNotMatch(
        opening,
        /expression="editorial"/,
        `${route} remains an operational field surface`
      );
    }
  }
});

test('the Practice argument is editorial while its operating artifacts stay field-led', () => {
  const practice = readFileSync(new URL('../src/routes/practice/+page.svelte', import.meta.url), 'utf8');
  const argumentOpening = practice.match(/<PerformanceNarrativeStage\b[\s\S]*?>/)?.[0] ?? '';
  const diagnosticArtifact = practice.slice(
    practice.indexOf('<PerformanceThesisConditions'),
    practice.indexOf('/>', practice.indexOf('<PerformanceThesisConditions')) + 2
  );

  assert.match(argumentOpening, /expression="editorial"/);
  assert.doesNotMatch(
    diagnosticArtifact,
    /expression="editorial"/,
    'the diagnostic artifact keeps the field typography hierarchy'
  );
});

test('the homepage operating story preserves the boundary in reader-facing language', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const description = home.match(/id="agency-operating-story"[\s\S]*?description="([^"]+)"/)?.[1];

  assert(description, 'Agency operating-story description is missing');
  assert.doesNotMatch(description, /\b(?:the page|this page|this section|holds one argument)\b/i);
  assert.doesNotMatch(description, /\b(?:consequential judgment|first lane|proof attached)\b/i);
  assert.match(description, /\b(?:team|operator|you)\b/i, 'decision owner is not visible');
  assert.match(
    description,
    /\b(?:limit|decide|approval|stop)\w*\b/i,
    'authority boundary is missing'
  );
  assert.match(
    description,
    /\b(?:map|handoff|workflow|test|run)\w*\b/i,
    'bounded workflow is missing'
  );
  assert.match(
    description,
    /\b(?:record|receipt|proof|evidence)\w*\b/i,
    'inspectable proof is missing'
  );
});

test('the complete operating story translates its method into people, actions, and records', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const story = home.slice(home.indexOf('const serviceFlowSteps'), home.indexOf('</script>'));

  assert.doesNotMatch(
    story,
    /Authority scoped|Signal → proof|consequential authority|first lane|inspectable wake|Governance directs flow|Proof Graph/i
  );
  assert.match(story, /team decides what can run, what needs approval, and what must stop/i);
  assert.match(
    story,
    /where work starts[^.]*what the agent may do[^.]*where a person must approve/i
  );
  assert.match(story, /every action leaves a record your team can review/i);
  assert.match(story, /system cannot make the final decision/i);
});

test('the mobile operating story removes decorative mini artifacts from the reading path', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');

  assert.match(
    home,
    /@media \(max-width: 640px\)[\s\S]*?\.service-flow-artifact__visual\s*\{\s*display:\s*none;/
  );
});

test('commercial decision routes use one primary and one conversational action', () => {
  const messaging = readFileSync(
    new URL('../src/lib/data/marketingCopy.ts', import.meta.url),
    'utf8'
  );
  const routes = [
    '../src/routes/+layout.svelte',
    '../src/routes/+page.svelte',
    '../src/routes/services/+page.svelte',
    '../src/routes/products/+page.svelte',
    '../src/routes/book/+page.svelte',
    '../src/routes/stack/+page.svelte',
    '../src/routes/proof/marketplace-workflow/+page.svelte'
  ]
    .map((route) => readFileSync(new URL(route, import.meta.url), 'utf8'))
    .join('\n');

  assert.match(messaging, /startWithWorkflowLabel: 'Start a private workflow draft'/);
  assert.match(messaging, /selfMapLabel: 'Start a private workflow draft'/);
  assert.match(messaging, /bookMappingSessionLabel: 'Book a mapping session'/);
  assert.match(routes, />Start a private workflow draft</);
  assert.doesNotMatch(
    routes,
    /Start Workflow Map|Talk Through a Workflow|Map the workflow first|Map your workflow/
  );
});

test('public stack positioning names the owned Cloudflare and OpenAI boundary', () => {
  const layout = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
  const stack = readFileSync(new URL('../src/routes/stack/+page.svelte', import.meta.url), 'utf8');
  const partners = readFileSync(
    new URL('../src/routes/partners/+page.svelte', import.meta.url),
    'utf8'
  );
  const cloudflare = readFileSync(
    new URL('../src/routes/cloudflare/+page.svelte', import.meta.url),
    'utf8'
  );
  const dify = readFileSync(new URL('../src/routes/dify/+page.svelte', import.meta.url), 'utf8');

  assert.match(stack, /Substrate is the owned database and operator layer/i);
  assert.match(partners, /CREATE SOMETHING owns the system/i);
  assert.match(partners, /Cloudflare provides infrastructure/i);
  assert.match(partners, /OpenAI provides intelligence/i);
  assert.doesNotMatch(stack, /Dify .{0,80}(?:active|current|runtime)/i);
  assert.doesNotMatch(partners, /Dify .{0,80}(?:active|current|runtime)/i);
  assert.doesNotMatch(stack, /\bNotion\b/);
  assert.doesNotMatch(partners, /\bNotion\b/);
  assert.doesNotMatch(cloudflare, /\bNotion\b/);
  assert.doesNotMatch(dify, /\bNotion\b/);
  assert.doesNotMatch(layout, /href:\s*['"]\/notion['"]/);
  assert.doesNotMatch(layout, /href:\s*['"]\/dify(?:\/|['"])/);
});

test('the active product catalog leads with Substrate and keeps Notion only as client history', () => {
  const substrate = products.find((product) => product.id === 'substrate');
  const activeNotionProducts = products.filter(
    (product) =>
      product.category !== 'client' &&
      /\bNotion\b/i.test([product.title, product.tagline, product.description].join(' '))
  );

  assert.equal(substrate?.category, 'framework');
  assert.match(substrate?.tagline ?? '', /agent-native data layer/i);
  assert.deepEqual(activeNotionProducts, []);
  assert.ok(
    products.some(
      (product) =>
        product.category === 'client' &&
        /\bNotion\b/i.test([product.title, product.tagline, product.description].join(' '))
    ),
    'historical client evidence should remain available'
  );
});

test('agency README documents the public copy contract', () => {
  const source = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(source, /### Public Copy Contract/);
  assert.match(source, /Public `\.agency` copy should read like a clear business conversation/);
  assert.match(source, /Avoid public words and frames like:/);
  assert.match(source, /partner lane/);
  assert.match(source, /support lane/);
  assert.match(source, /Run `pnpm copy:check`/);
  assert.match(source, /Run `pnpm copy:heal`/);
  assert.match(source, /### Platform Conviction Contract/);
  assert.match(source, /Built with OpenAI and Cloudflare\. Designed to remain yours\./);
  assert.match(source, /plain customer ownership\s+language/);
  assert.match(source, /### Current System Stack Contract/);
  assert.match(source, /Substrate is the owned database and operator layer/);
  assert.match(source, /CREATE SOMETHING owns the system/);
  assert.match(source, /Cloudflare provides infrastructure/);
  assert.match(source, /OpenAI[\s>]+provides intelligence/);
  assert.match(source, /### Compatibility Proof Contract/);
  assert.match(source, /`Connector available` means a brokered tool path is present/);
});

test('integration proof keeps compatibility distinct from partnership and delivery', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const partners = readFileSync(
    new URL('../src/routes/partners/+page.svelte', import.meta.url),
    'utf8'
  );
  const rail = readFileSync(
    new URL('../src/lib/components/IntegrationCompatibilityRail.svelte', import.meta.url),
    'utf8'
  );
  const catalog = readFileSync(
    new URL('../src/lib/components/IntegrationCatalog.svelte', import.meta.url),
    'utf8'
  );
  const map = readFileSync(new URL('../src/routes/map/+page.svelte', import.meta.url), 'utf8');
  const mapCanvas = readFileSync(
    new URL('../src/lib/components/PublicAtlasCanvas.svelte', import.meta.url),
    'utf8'
  );

  assert.match(home, /IntegrationCompatibilityRail surface="homepage"/);
  assert.match(partners, /IntegrationCompatibilityRail surface="partners"/);
  assert.match(partners, /<IntegrationCatalog \/>/);
  assert.match(rail, /Brand marks identify tool paths, not partnerships or endorsements/);
  assert.match(catalog, /Connector available ≠ connected or write-authorized/);
  assert.match(catalog, /not a live customer connection/);
  assert.match(catalog, /integration_name=/);
  assert.match(map, /initialIntegration=/);
  assert.match(map, /initialIntegrationName=/);
  assert.match(mapCanvas, /seedIntegrationContext\(\)/);
  assert.match(mapCanvas, /Connector context added/);
  assert.doesNotMatch(`${rail}\n${catalog}`, /certified integration|official partner|1,041/gi);
});
