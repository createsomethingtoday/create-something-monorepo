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

test('public agency copy guard discovers every visitor-facing route', () => {
  const files = discoverPublicCopyFiles().map(packageRelative);

  assert.ok(files.includes('src/routes/+page.svelte'));
  assert.ok(files.includes('src/routes/cloudflare/+page.svelte'));
  assert.ok(files.includes('src/routes/products/ground/+page.svelte'));
  assert.ok(files.includes('src/routes/terms/+page.svelte'));
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

  assert.match(home, /Built primarily with OpenAI Codex\. Designed to outlast any model\./);
  assert.match(home, /https:\/\/createsomething\.ltd\/canon\/concepts\/conviction-without-dependence/);
  assert.match(stack, /Model-opinionated in practice\. Model-portable by design\./);
  assert.match(stack, /data, MCP contracts, harnesses, skills, prompts, policy, evals, receipts/i);
  assert.match(partners, /OpenAI is the primary reasoning and agent environment/i);
  assert.match(partners, /open-weight and custom models/i);
});

test('commercial decision routes lead with plain meaning before owned terminology', () => {
  const layout = readFileSync(new URL('../src/routes/+layout.svelte', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../src/routes/+page.svelte', import.meta.url), 'utf8');
  const services = readFileSync(new URL('../src/routes/services/+page.svelte', import.meta.url), 'utf8');
  const productsPage = readFileSync(new URL('../src/routes/products/+page.svelte', import.meta.url), 'utf8');
  const stack = readFileSync(new URL('../src/routes/stack/+page.svelte', import.meta.url), 'utf8');
  const proof = readFileSync(
    new URL('../src/routes/proof/marketplace-workflow/+page.svelte', import.meta.url),
    'utf8'
  );

  assert.match(layout, /label: 'How It Works', href: '\/services'/);
  assert.match(layout, /label: 'What You Keep', href: '\/stack'/);
  assert.doesNotMatch(layout, /label: 'How I Work'/);
  assert.doesNotMatch(layout, /label: 'Stack Boundary'/);

  assert.match(home, /Choose one handoff your team still checks manually/);
  assert.match(home, />See a worked example</);
  assert.doesNotMatch(home, /Train the workflow/);

  assert.match(services, /Bring one handoff your team still checks manually/);
  assert.match(services, /Keep the work moving without giving up the decision/);

  assert.match(productsPage, /title="One workflow\. Four visible jobs\."/);
  assert.match(productsPage, /Map the work\. Watch changes\. Route decisions\. Keep the record\./);
  assert.ok(
    productsPage.indexOf("value: 'Map'") < productsPage.indexOf("value: 'Signal'"),
    'the product sequence should begin with the map before live signals'
  );

  assert.match(stack, /You keep the accounts, data, approval rights, and operating history/);
  assert.match(proof, /title="Turn a watched review queue into a testable workflow\."/);
  assert.match(proof, /title="Spend less time rebuilding context\."/);
  assert.match(proof, /prototype measurements, not customer ROI claims/);
});

test('public stack positioning names Substrate and the active OpenAI, Dify, Cloudflare stack', () => {
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
  assert.match(partners, /OpenAI, Dify, and Cloudflare are the active external stack/i);
  assert.doesNotMatch(stack, /\bNotion\b/);
  assert.doesNotMatch(partners, /\bNotion\b/);
  assert.doesNotMatch(cloudflare, /\bNotion\b/);
  assert.doesNotMatch(dify, /\bNotion\b/);
  assert.doesNotMatch(layout, /href:\s*['"]\/notion['"]/);
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
  assert.match(source, /Built primarily with OpenAI Codex\. Designed to outlast any model\./);
  assert.match(source, /### Current System Stack Contract/);
  assert.match(source, /Substrate is the owned database and operator layer/);
  assert.match(source, /OpenAI, Dify, and\s+> Cloudflare are the active external stack/);
});
