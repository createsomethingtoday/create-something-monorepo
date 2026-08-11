import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routePath = path.join(packageRoot, 'src/routes/arc/app-review-governance/+page.svelte');
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

test('the App Review Arc is a full deck with typed scene compositions and owned media', async () => {
  const [route, metadata] = await Promise.all([readFile(routePath, 'utf8'), readFile(metadataPath, 'utf8')]);

  assert.match(route, /enablePresentation/);
  assert.match(route, /data-layout=\{scene\.presentation\.layout\}/);
  for (const layout of ['statement', 'split', 'code', 'map', 'decision', 'branches', 'demo', 'proof']) {
    assert.match(route, new RegExp(`=== '${layout}'`), `${layout} should render as a first-class deck composition`);
  }
  assert.match(route, /<pre><code/);
  assert.match(route, /<img/);
  assert.match(route, /localAction\('propose'\)/);
  assert.match(route, /scene\.presentation\.reader\.heading/);
  assert.match(route, /scene\.presentation\.reader\.explanation/);
  assert.match(route, /scene\.presentation\.reader\.stakeholders/);
  assert.match(route, /What this means for you/);
  assert.match(route, /The durable review record \(D1\)/);
  assert.match(route, /The team's readable workspace \(Airtable\)/);
  assert.match(route, /The partner conversation \(Zendesk\)/);
  assert.match(route, /<summary>See the technical handoff<\/summary>/);
  assert.match(route, /Try it: draft the creator update/);
  assert.ok(
    route.indexOf('<PerformanceNarrativeStage') < route.indexOf('class="arc-contract"'),
    'the app-review story should precede the Arc product contract'
  );
  assert.match(metadata, /f761a8d1dc61f57344405a97cb574396a49a2dc353bc9ee72ae23a58e90e5650/);
  await access(assetPath);
});

test('the presentation rail preserves readable scene labels on a narrow deck', async () => {
  const stage = await readFile(narrativeStagePath, 'utf8');

  assert.match(stage, /grid-auto-flow: column/);
  assert.match(stage, /overflow-x: auto/);
  assert.match(stage, /grid-auto-columns: minmax\(8\.3rem, 58vw\)/);
});

test('presentation mode owns one viewport and keeps the slide canvas inside it', async () => {
  const stage = await readFile(narrativeStagePath, 'utf8');

  assert.match(
    stage,
    /data-presenting='true'[\s\S]*?height:\s*100dvh;[\s\S]*?overflow:\s*hidden;/
  );
  assert.match(stage, /aria-modal=\{presenting \? 'true' : undefined\}/);
  assert.match(stage, /a\[href\], button, input, textarea, select, summary/);
  assert.match(stage, /\{presenting \? 'Previous slide' : 'Previous'\}/);
  assert.match(stage, /\{presenting \? 'Next slide' : 'Next'\}/);
});
