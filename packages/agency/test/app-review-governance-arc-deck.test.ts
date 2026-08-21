import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { performancePageRegistry } from '../../../config/performance-pages/registry.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routePath = path.join(packageRoot, 'src/routes/arc/app-review-governance/+page.svelte');
const arcRendererPath = path.resolve(packageRoot, '../arc/src/lib/ArcDeck.svelte');
const assetPath = path.join(
  packageRoot,
  'static/images/arcs/app-review-governance-evidence-gate.v1.png'
);
const metadataPath = path.join(
  packageRoot,
  'content/assets/brand/agency-app-review-governance-evidence-gate.v20260811/metadata.md'
);
const narrativeStagePath = path.resolve(
  packageRoot,
  '../canon/src/lib/components/performance/PerformanceNarrativeStage.svelte'
);

test('the reference route consumes the same shared Arc renderer as customer surfaces', async () => {
  const [route, renderer, metadata] = await Promise.all([
    readFile(routePath, 'utf8'),
    readFile(arcRendererPath, 'utf8'),
    readFile(metadataPath, 'utf8')
  ]);

  assert.match(route, /import \{ ArcDeck \} from '@create-something\/arc'/);
  assert.match(route, /actionEndpoint="\/api\/arcs\/app-review-governance"/);
  assert.match(route, /What this means for you/);
  assert.match(renderer, /enablePresentation/);
  assert.match(renderer, /data-layout=\{scene\.presentation\.layout\}/);
  for (const layout of [
    'split',
    'capabilities',
    'code',
    'map',
    'decision',
    'branches',
    'demo',
    'proof'
  ]) {
    assert.match(
      renderer,
      new RegExp(`=== '${layout}'`),
      `${layout} should render as a first-class deck composition`
    );
  }
  assert.match(renderer, /<pre><code/);
  assert.match(renderer, /<img/);
  assert.match(renderer, /runAction\('propose'\)/);
  assert.match(renderer, /scene\.presentation\.reader\.heading/);
  assert.match(renderer, /scene\.presentation\.reader\.explanation/);
  assert.match(renderer, /scene\.presentation\.reader\.stakeholders/);
  assert.match(renderer, /The durable review record \(D1\)/);
  assert.match(renderer, /The team's readable workspace \(Airtable\)/);
  assert.match(renderer, /The partner conversation \(Zendesk\)/);
  assert.match(renderer, /scene\.presentation\.relationships/);
  assert.match(renderer, /relationship\.label/);
  assert.match(renderer, /What it can do/);
  assert.match(renderer, /What it produces/);
  assert.match(renderer, /What it cannot decide/);
  assert.doesNotMatch(renderer, /arc-map__trace/);
  assert.match(renderer, /<summary>See the technical handoff<\/summary>/);
  assert.match(metadata, /f761a8d1dc61f57344405a97cb574396a49a2dc353bc9ee72ae23a58e90e5650/);
  await access(assetPath);
});

test('the App Review Arc remains a noindex local fixture with a governed tool contract', async () => {
  const route = await readFile(routePath, 'utf8');
  const publicTools = performancePageRegistry.find((group) => group.id === 'agency-public-tools');

  assert.match(route, /search-policy:\s*noindex/);
  assert.match(route, /<meta[\s\S]*?name="robots"[\s\S]*?content="noindex, nofollow"\s*\/?>/);
  assert.equal(publicTools?.status, 'pending');
  assert.equal(publicTools?.contract?.archetype, 'tool');
  assert.ok(
    publicTools?.sources.includes(
      'packages/agency/src/routes/arc/app-review-governance/+page.svelte'
    )
  );
});

test('the focused map relationship has explicit semantic origin, direction, and destination', async () => {
  const renderer = await readFile(arcRendererPath, 'utf8');

  assert.match(renderer, /relationship\.fromNodeId/);
  assert.match(renderer, /relationship\.toNodeId/);
  assert.match(renderer, /aria-label=\{`\$\{nodeLabels\[relationship\.fromNodeId\]\}/);
  assert.match(renderer, /\.arc-map li\s*\{[^}]*grid-template-columns:/);
  assert.match(renderer, /\.arc-map li > p i::after/);
  assert.match(renderer, /@media \(max-width: 48rem\)[\s\S]*?\.arc-map li\s*\{[^}]*grid-template-columns:\s*1fr;/);
});

test('presentation mode owns one viewport and keeps primary reading copy legible', async () => {
  const stage = await readFile(narrativeStagePath, 'utf8');

  assert.match(stage, /data-presenting='true'[\s\S]*?height:\s*100dvh;[\s\S]*?overflow:\s*hidden;/);
  assert.match(stage, /aria-modal=\{presenting \? 'true' : undefined\}/);
  assert.match(stage, /a\[href\], button, input, textarea, select, summary/);
  assert.match(stage, /\{presenting \? 'Previous slide' : 'Previous'\}/);
  assert.match(stage, /\{presenting \? 'Next slide' : 'Next'\}/);
  assert.match(stage, /font-size:\s*clamp\(1rem,/);
});
