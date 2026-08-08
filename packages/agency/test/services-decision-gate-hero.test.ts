import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const agencyRoot = resolve(import.meta.dirname, '..');

function read(relativePath: string): string {
  return readFileSync(resolve(agencyRoot, relativePath), 'utf8');
}

const suppliedV2Modules = {
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/PaperHero.svelte':
    'cbb2a4f0bc9fad8b9c47b674d512e24a81c8f8f655e2ef7ccd1ceaed8634e3a7',
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/paper/geometry.js':
    'eed1e8d2c2c2c12eca2ffdae9a37b3e24ef73f16013d90028b0f2cf3cdcefe4f',
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/paper/lighting.js':
    'aa3184d262bdf5dede31c04c9c2f7ec0efc170c4fcff4eaa7a48270cccba18a0',
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/paper/materials.js':
    'bf71c1fb9eb68e536290926f04bd8cff6d3a36af7be9763bae7cc66f88b9a8e5',
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/paper/rigs.js':
    '01e16fc9c1ddda17befa6fec19710d09c8bc51783e5f7514a99d9890381b848e',
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/paper/rng.js':
    '1117fbb1caaa44d80cdb086536254b3d5caf71d705e155f72eac1455f547a771',
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/paper/scene.js':
    'fb69c055e049dd0a6d26cd2d44f97145973b872ebc24773b3541018fb12d8691',
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/paper/states.js':
    'ba05d99a361621bbd2393da19025e94fa8ff846f47332397738895fbb97bdd80',
  'content/assets/brand/sources/omma-paper-hero-v2/src/lib/paper/textures.js':
    '55b47ec55ea0c3b6499c1b56513c2605032ff2d076922c0c2f8c3445501e0475'
} as const;

test('Services preserves the complete supplied Omma v2 visual source byte-for-byte', () => {
  for (const [relativePath, expectedHash] of Object.entries(suppliedV2Modules)) {
    const filePath = resolve(agencyRoot, relativePath);
    assert.ok(existsSync(filePath), `${relativePath} must be preserved`);
    const actualHash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
    assert.equal(actualHash, expectedHash, `${relativePath} drifted from the supplied export`);
  }
});

test('Services runs only the repaired v2 scene behind authored copy', () => {
  const route = read('src/routes/services/+page.svelte');
  const media = read('src/lib/data/performanceMedia.ts');
  const canvasPath = resolve(agencyRoot, 'src/lib/components/ServicesDecisionGateCanvas.svelte');
  const rendererPath = resolve(agencyRoot, 'src/lib/visual/servicesDecisionGateRenderer.ts');
  const geometry = read('src/lib/visual/omma-paper-hero-v2/paper/geometry.js');
  const rigs = read('src/lib/visual/omma-paper-hero-v2/paper/rigs.js');
  const states = read('src/lib/visual/omma-paper-hero-v2/paper/states.js');

  assert.ok(existsSync(canvasPath), 'Services must own its renderer wrapper');
  assert.ok(existsSync(rendererPath), 'Services must own the bounded renderer source');

  const canvas = readFileSync(canvasPath, 'utf8');
  assert.match(route, /density="compact"/);
  const renderer = readFileSync(rendererPath, 'utf8');

  assert.match(route, /import ServicesDecisionGateCanvas/);
  assert.match(route, /mode="ink"/);
  assert.match(route, /--color-performance-ink: #0e1113/);
  assert.match(route, /artifactLayer="behind-content"/);
  assert.match(route, /artifactOwnsMedia={ommaReady}/);
  assert.match(route, /<ServicesDecisionGateCanvas[\s\S]*?onStateChange=/);
  assert.match(media, /paperServicesDecisionGateMedia[\s\S]*?width: 1280,[\s\S]*?height: 720/);
  assert.match(media, /registered source stack[\s\S]*?held sheet[\s\S]*?gold authority tab/);
  assert.equal(
    createHash('sha256')
      .update(readFileSync(resolve(agencyRoot, 'static/images/performance-lab/paper-services-decision-gate.webp')))
      .digest('hex'),
    'b383c6b8478527e88c60f54dffa4b0aae212bdb8894926af165608f60f38a608'
  );
  assert.equal(
    createHash('sha256')
      .update(readFileSync(resolve(agencyRoot, 'static/images/performance-lab/paper-services-decision-gate-mobile.webp')))
      .digest('hex'),
    'd94a9188a43f5c4e2d92badd26ac23e4c871985cccdcf5484d225296050ddcca'
  );

  assert.match(canvas, /prefers-reduced-motion: reduce/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /data-renderer-state=/);
  assert.match(canvas, /aria-hidden="true"/);
  assert.match(canvas, /typeof document !== 'undefined'/);
  assert.doesNotMatch(canvas, /<canvas/);
  assert.match(renderer, /failIfMajorPerformanceCaveat: true/);
  assert.ok(renderer.includes('omma-paper-hero-v2/paper/scene.js'));
  assert.match(renderer, /createPaperScene\(host/);
  assert.doesNotMatch(renderer, /new THREE\.(?:BoxGeometry|MeshPhysicalMaterial|PlaneGeometry)/);
  assert.doesNotMatch(renderer, /app\.resume\(\)/);
  assert.match(renderer, /maximumPixelRatio/);
  assert.match(canvas, /position: absolute;[\s\S]*?inset: 0/);
  assert.doesNotMatch(canvas, /clip-path|transform: scale|inset: 46%/);
  assert.match(renderer, /renderStatic/);
  assert.doesNotMatch(`${canvas}\n${renderer}`, /deviceorientation|postprocess/i);

  assert.match(geometry, /indices\.push\(a, c, d, a, d, b\)/);
  assert.match(geometry, /indices\.push\(a, b, d, a, d, c\)/);
  assert.match(rigs, /crossVectors\(new Vector3\(0, 1, 0\), dir\)/);
  assert.match(rigs, /crossVectors\(dir, right\)/);
  assert.match(states, /collapseSheetBoxGroups/);
  assert.match(states, /addGroup\(0, 24, 0\)/);
  assert.match(states, /addGroup\(24, 12, 1\)/);
});
