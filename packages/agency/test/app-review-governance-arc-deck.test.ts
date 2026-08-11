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
  for (const layout of ['statement', 'split', 'capabilities', 'code', 'map', 'decision', 'branches', 'demo', 'proof']) {
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
  assert.match(route, /scene\.presentation\.relationships/);
  assert.match(route, /class="arc-map__connector"/);
  assert.match(route, /relationship\.label/);
  assert.match(route, /scene\.presentation\.capabilities/);
  assert.match(route, /What it can do/);
  assert.match(route, /What it produces/);
  assert.match(route, /What it cannot decide/);
  assert.match(route, /data-capability-node=\{capability\.nodeId\}/);
  assert.match(route, /scene\.presentation\.layout === 'capabilities'/);
  assert.match(route, /\.arc-capabilities\s*\{[^}]*display:\s*flex;[^}]*padding:\s*0;/);
  assert.match(route, /\.arc-module\s*\{[^}]*padding:\s*0;/);
  assert.doesNotMatch(
    route,
    /\.arc-capabilities\s*\{[^}]*min-height:\s*21rem;/,
    'the capability composition should size to its content instead of drawing an unexplained empty band'
  );
  assert.match(
    route,
    /data-presenting='true'\]\) \.arc-capabilities\s*\{[^}]*min-height:\s*0;[^}]*height:\s*max-content;/,
    'capability cards should use the artifact viewport instead of forcing an extra full-height row'
  );
  assert.match(
    route,
    /panel:has\(\.arc-scene\[data-layout='capabilities'\]\)[\s\S]*?stakeholders\)\s*\{\s*display:\s*none;/,
    'capability slides should spend the presentation viewport on capability boundaries'
  );
  assert.doesNotMatch(route, /arc-map__trace/);
  assert.match(route, /<summary>See the technical handoff<\/summary>/);
  assert.match(route, /Try it: draft the creator update/);
  assert.ok(
    route.indexOf('<PerformanceNarrativeStage') < route.indexOf('class="arc-contract"'),
    'the app-review story should precede the Arc product contract'
  );
  assert.match(metadata, /f761a8d1dc61f57344405a97cb574396a49a2dc353bc9ee72ae23a58e90e5650/);
  await access(assetPath);
});

test('the focused map relationship stacks into a readable mobile sequence', async () => {
  const route = await readFile(routePath, 'utf8');

  assert.match(route, /\.arc-map__flow\s*\{[^}]*grid-template-columns:/);
  assert.match(route, /@media \(max-width: 760px\)[\s\S]*?\.arc-map__flow\s*\{[^}]*grid-template-columns:\s*1fr;/);
  assert.match(route, /\.arc-map__connector-line::after/);
  assert.match(route, /@media \(max-width: 760px\)[\s\S]*?\.arc-capabilities article\s*\{[^}]*flex:\s*0 0 min\(16rem, 82vw\);/);
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
