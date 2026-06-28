import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const publicMarketingFiles = [
  'src/lib/data/marketingCopy.ts',
  'src/lib/data/services.ts',
  'src/routes/+page.svelte',
  'src/routes/about/+page.svelte',
  'src/routes/atlas/+page.svelte',
  'src/routes/book/+page.svelte',
  'src/routes/contact/+page.svelte',
  'src/routes/delivery/+page.svelte',
  'src/routes/dify/+page.svelte',
  'src/routes/dify/agent-eval-gates/+page.svelte',
  'src/routes/dify/content-engine/+page.svelte',
  'src/routes/dify/mcp-control-plane/+page.svelte',
  'src/routes/dify/n8n-vs-dify/+page.svelte',
  'src/routes/dify/ship-dify-app-with-mcp-tools/+page.svelte',
  'src/routes/methodology/+page.svelte',
  'src/routes/products/+page.svelte',
  'src/routes/security/+page.svelte',
  'src/routes/services/+page.svelte',
  'src/routes/stack/+page.svelte',
  'src/routes/use-cases/business/+page.svelte',
  'src/routes/use-cases/enterprise/+page.svelte'
];

const bannedPublicFrames = [
  /\bbuyers?\b/i,
  /\bwedge(s)?\b/i,
  /productized\s+wedge/i,
  /\bgtm\s+vector\b/i,
  /\blead\s+magnet\b/i,
  /\bmcp-first\s+thesis\b/i,
  /\bMCP\s+consumption\s+is\s+commoditized\b/i
];

test('public agency copy avoids internal strategy and buyer language', () => {
  const failures: string[] = [];

  for (const file of publicMarketingFiles) {
    const path = new URL(`../${file}`, import.meta.url);
    const source = readFileSync(path, 'utf8');

    for (const pattern of bannedPublicFrames) {
      if (pattern.test(source)) {
        failures.push(`${file} matched ${pattern}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});

test('agency README documents the public copy contract', () => {
  const source = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

  assert.match(source, /### Public Copy Contract/);
  assert.match(source, /Public `\.agency` copy should read like a clear business conversation/);
  assert.match(source, /Avoid public words and frames like:/);
});
