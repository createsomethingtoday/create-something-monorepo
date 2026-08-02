import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (relativePath: string) => {
  const url = new URL(relativePath, import.meta.url);
  return existsSync(url) ? readFileSync(url, 'utf8') : '';
};

const home = read('../src/routes/+page.svelte');
const component = read('../src/lib/components/PaperUnderPressureStage.svelte');
const model = read('../src/lib/data/paperWorkflow.ts');
const canvas = read('../src/lib/components/PaperPressureCanvas.svelte');
const renderer = read('../src/lib/visual/paperPressureRenderer.ts');

test('the homepage opening makes one paper workflow legible before WebGL is available', () => {
  assert.match(home, /import PaperUnderPressureStage/);
  assert.match(home, /mode="paper"/);
  assert.match(home, /\{#snippet artifact\(\)\}[\s\S]*?<PaperUnderPressureStage \/>/);
  assert.doesNotMatch(home, /agency-fluid-intelligence-loop-v4/);

  assert.match(component, /data-paper-under-pressure/);
  assert.match(component, /aria-label="Choose a paper workflow stage"/);
  assert.match(component, /aria-pressed=\{activeStageId === stage\.id\}/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /<svg[\s\S]*?role="img"/);
  assert.match(component, /<title id="paper-workflow-title">/);
  assert.match(component, /<desc id="paper-workflow-description">/);
  assert.match(component, /prefers-reduced-motion: reduce/);

  for (const stage of ['map', 'build', 'control']) {
    assert.match(model, new RegExp(`id: '${stage}'`));
    assert.match(component, new RegExp(`data-paper-stage="${stage}"`));
  }

  for (const term of ['Signal', 'Decision', 'Proof', 'Owner', 'Authority', 'Receipt']) {
    assert.ok(`${component}\n${model}`.includes(term), `paper workflow should expose ${term}`);
  }
});

test('the paper composition is one dominant material object rather than a floating workflow card', () => {
  assert.match(component, /class="paper-pressure__material"/);
  assert.match(component, /class="paper-pressure__annotation"[\s\S]*?aria-live="polite"/);
  assert.match(component, /class="paper-pressure__controls"/);
  assert.match(component, /\.paper-pressure__artifact\s*\{[\s\S]*?pointer-events:\s*none/);
  assert.match(component, /\.paper-pressure__controls\s*\{[\s\S]*?pointer-events:\s*auto/);
  assert.doesNotMatch(component, /paper-pressure__readout/);
  assert.doesNotMatch(component, /paper-pressure__registration/);
  assert.doesNotMatch(component, /paper-pressure__state-word/);
  assert.doesNotMatch(component, /paper-pressure__ledger/);
  assert.doesNotMatch(component, /backdrop-filter/);
});

test('Three.js progressively enhances the same paper semantics within an inspectable budget', () => {
  assert.match(component, /import PaperPressureCanvas/);
  assert.match(component, /<PaperPressureCanvas stage=\{activeStageId\}/);
  assert.match(component, /<svg[\s\S]*?role="img"/);

  assert.match(canvas, /<canvas[\s\S]*?aria-hidden="true"/);
  assert.match(canvas, /await import\('\$lib\/visual\/paperPressureRenderer'\)/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /ResizeObserver/);
  assert.match(canvas, /prefers-reduced-motion: reduce/);
  assert.match(canvas, /contextRecoveryInFlight/);
  assert.match(canvas, /disposeRenderer\(false\)/);

  for (const receipt of ['data-render-profile', 'data-render-budget', 'data-draw-calls']) {
    assert.ok(canvas.includes(receipt), `paper canvas should publish ${receipt}`);
  }

  for (const semantic of [
    '--paper-pressure-ink',
    '--paper-pressure-sheet',
    '--paper-pressure-signal',
    '--paper-pressure-review',
    '--paper-pressure-stop'
  ]) {
    assert.ok(renderer.includes(semantic), `renderer should inherit ${semantic}`);
  }

  for (const contract of [
    'PlaneGeometry',
    'BufferGeometry',
    'createPipelineEnvironmentPixels',
    'createPipelineSurfacePixels',
    'PMREMGenerator',
    'roughnessMap',
    'normalMap',
    'textureRegistry',
    'setStage',
    'setVisible',
    'renderStatic',
    'forceContextLoss',
    'maximumPixelRatio',
    'withinBudget'
  ]) {
    assert.ok(renderer.includes(contract), `renderer should expose ${contract}`);
  }

  for (const prohibited of ['@react-three/fiber', '@threlte', 'gsap', 'lenis', '.glb', '<audio']) {
    assert.equal(`${canvas}\n${renderer}`.toLowerCase().includes(prohibited), false);
  }
});

test('the paper workflow remains an original operating artifact rather than a game or logo cloud', () => {
  const source = `${home}\n${component}\n${model}`.toLowerCase();

  for (const prohibited of [
    'rock paper scissors',
    'noomo',
    'moniveo',
    'mobbin',
    'logo cloud',
    'integration constellation',
    'confetti'
  ]) {
    assert.equal(source.includes(prohibited), false, `${prohibited} must not enter the implementation`);
  }
});
