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

test('public agency copy guard permits the bounded AI Buyer Readiness category', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-copy-'));
  const fixture = path.join(tempDir, '+page.svelte');

  try {
    writeFileSync(
      fixture,
      '<h1>AI Buyer Readiness Audit</h1><p>Test 25 buyer questions for AI buyers.</p>'
    );
    assert.deepEqual(auditPublicCopy([fixture]), []);

    writeFileSync(fixture, '<p>The buyer needs a funnel.</p>');
    assert.deepEqual(
      auditPublicCopy([fixture]).map((finding) => finding.rule),
      ['buyer-language']
    );
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

test('public agency surfaces explain ownership and provider roles', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const stack = readFileSync(new URL('../src/routes/stack/+page.svelte', import.meta.url), 'utf8');
  const partners = readFileSync(new URL('../src/routes/partners/+page.svelte', import.meta.url), 'utf8');
  assert.match(home, /Built with OpenAI and Cloudflare\. Designed to remain yours\./);
  assert.match(home, /Your team owns the system\./);
  assert.match(home, /OpenAI Codex, an AI coding tool/);
  assert.match(home, /A new setup still needs testing/);
  assert.match(home, /https:\/\/createsomething\.ltd\/canon\/concepts\/conviction-without-dependence/);
  assert.match(stack, /Your project keeps its data, code, tool definitions, instructions, tests, and recovery guide/);
  assert.match(stack, /A different model must pass the relevant checks before you switch/);
  assert.match(partners, /open-weight and custom models/);
});

test('the homepage introduces a business task before developer and provider details', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const opening = home.slice(home.indexOf('<PerformanceCampaignOpening'), home.indexOf('</PerformanceCampaignOpening>'));
  assert.match(opening, /title="Put AI to work on one useful task\."/);
  assert.match(opening, /Bring a task your team repeats, an idea, or a project you started/);
  assert.match(opening, /Going live is scoped separately/);
  assert.match(opening, /media=\{playbookHomeHeroMedia\}/);
  assert.match(opening, /expression="editorial"/);
  assert.match(opening, /mediaMobilePlacement="background"/);
  assert.doesNotMatch(opening, /Codex|GitHub|governed|authority|MCP/);
  assert.match(opening, /agencyCoreMessaging.agentFoundationHref/);
  assert.ok(home.indexOf('An agent is software') < home.indexOf('<aside class="home-section ownership-callout"'));
});

test('commercial decision routes explain the task, delivery, ownership, and proof', () => {
  const read = (route: string) => readFileSync(new URL(`../src/routes/${route}`, import.meta.url), 'utf8');
  const home = read('+page.svelte');
  const layout = read('+layout.svelte');
  assert.match(layout, /label: 'How It Works', href: '\/services'/);
  assert.match(layout, /label: 'What You Keep', href: '\/stack'/);
  assert.match(home, /Turn meeting notes into a draft action list\./);
  assert.match(home, /Illustrative example, not a measured client result/);
  assert.match(home, /Approve before saving to another tool/);
  assert.match(home, /Code, tests, and instructions/);
  assert.match(read('services/+page.svelte'), /Bring a task to automate or a product you have already built/);
  assert.match(read('products/+page.svelte'), /Map and Control are subscriptions/);
  assert.match(read('products/+page.svelte'), /Control includes Map/);
  assert.match(read('stack/+page.svelte'), /You keep the accounts, data, approval rights, and operating history/);
  assert.match(read('proof/marketplace-workflow/+page.svelte'), /prototype measurements, not customer ROI claims/);
});

test('public Agency commercial propositions declare the shared editorial expression', () => {
  const campaignRoutes = [
    'services',
    'practice',
    'stack',
    'map',
    'control',
    'products',
    'products/ground',
    'products/loom',
    'field-reports',
    'field-reports/template-review',
    'field-reports/upstream-contributions',
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
    const source = readFileSync(
      new URL(`../src/routes/${route}/+page.svelte`, import.meta.url),
      'utf8'
    );
    const opening = source.slice(
      source.indexOf('<PerformanceCampaignOpening'),
      source.indexOf('</PerformanceCampaignOpening>')
    );
    assert.match(
      opening,
      /expression="editorial"/,
      `${route} must opt into editorial campaign type`
    );
  }

  for (const route of sectionHeroRoutes) {
    const source = readFileSync(
      new URL(`../src/routes/${route}/+page.svelte`, import.meta.url),
      'utf8'
    );
    const hero = source.slice(
      source.indexOf('<PerformancePageSection'),
      source.indexOf('</PerformancePageSection>')
    );
    assert.match(
      hero,
      /expression="editorial"/,
      `${route} must opt into editorial proposition type`
    );
  }

  const governanceProduct = readFileSync(
    new URL('../src/lib/components/GovernanceProductPage.svelte', import.meta.url),
    'utf8'
  );
  const methodology = readFileSync(
    new URL('../src/routes/methodology/+page.svelte', import.meta.url),
    'utf8'
  );
  const workflows = readFileSync(
    new URL('../src/routes/workflows/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(governanceProduct, /<PerformancePageSection[\s\S]*?expression="editorial"/);
  assert.match(
    methodology,
    /\.hero-title\s*\{[\s\S]*?font-family:\s*var\(--font-performance-editorial\)/
  );
  assert.match(
    workflows,
    /<PerformanceCampaignOpening[\s\S]*?expression="editorial"/,
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
    'field-reports/upstream-contributions',
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
    'use-cases/enterprise',
    'workflows'
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
  const practice = readFileSync(
    new URL('../src/routes/practice/+page.svelte', import.meta.url),
    'utf8'
  );
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

test('the homepage service steps preserve approvals, testing, and separate launch', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const steps = home.slice(home.indexOf('const steps ='), home.indexOf('</script>'));
  assert.match(steps, /what AI may do and what needs approval/);
  assert.match(steps, /test environment/);
  assert.match(steps, /Launch is a separate project, quoted before you commit/);
  assert.match(steps, /monitoring, incident response, and regular reviews/);
  for (const route of ['/map', '/agent-foundation', '/control']) assert.ok(steps.includes(route));
});

test('the homepage defines unfamiliar terms beside the example', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const exampleStart = home.indexOf('<section class="home-section foundation-example"');
  const example = home.slice(exampleStart, home.indexOf('</section>', exampleStart));
  assert.match(example, /An agent is software that uses AI and connected tools/);
  assert.match(example, /Needs confirmation/);
  assert.match(home, /OpenAI Codex, an AI coding tool/);
  assert.doesNotMatch(home, /Offense|Defense|PerformanceWorkflowMiniArtifact|HeroTrustArtifact/);
});

test('the mobile homepage stacks the example and service steps for reading', () => {
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  assert.match(home, /@media \(max-width: 640px\)[\s\S]*?\.home-steps\s*\{\s*grid-template-columns: 1fr/);
  assert.match(home, /@media \(max-width: 640px\)[\s\S]*?\.example-comparison\s*\{\s*grid-template-columns: 1fr/);
  assert.doesNotMatch(home, /PublicSubstrateCanvas|MeridianEvidenceCarousel/);
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

  assert.match(messaging, /startWithWorkflowLabel: 'Map your workflow'/);
  assert.match(messaging, /selfMapLabel: 'Map your workflow'/);
  assert.match(messaging, /bookMappingSessionLabel: 'Book a mapping session'/);
  assert.match(
    routes,
    /(?:>Map your workflow<|secondaryLabel: 'Map your workflow')/
  );
  assert.doesNotMatch(
    routes,
    /Start Workflow Map|Talk Through a Workflow|Map the workflow first|Start a private workflow draft/
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

  assert.match(stack, /Our database system stores the records, tasks, approvals, and work history/i);
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

  assert.doesNotMatch(home, /IntegrationCompatibilityRail surface="homepage"/);
  assert.match(partners, /IntegrationCompatibilityRail surface="partners"/);
  assert.match(partners, /<IntegrationCatalog \/>/);
  assert.match(rail, /They do not imply partnerships or endorsements/);
  assert.match(catalog, /Available to connect\. Account access still needs approval/);
  assert.match(catalog, /does not mean an account is connected/);
  assert.match(catalog, /integration_name=/);
  assert.match(map, /initialIntegration=/);
  assert.match(map, /initialIntegrationName=/);
  assert.match(mapCanvas, /seedIntegrationContext\(\)/);
  assert.match(mapCanvas, /Connector context added/);
  assert.doesNotMatch(`${rail}\n${catalog}`, /certified integration|official partner|1,041/gi);
});

test('public agency copy permits the documented Select tier and named individual credentials', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'agency-copy-'));
  const fixture = path.join(tempDir, '+page.svelte');
  try {
    writeFileSync(fixture, 'CREATE SOMETHING is an OpenAI Select Partner. Micah Johnson holds the Codex Deployment Practitioner credential.');
    assert.deepEqual(auditPublicCopy([fixture]), []);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
