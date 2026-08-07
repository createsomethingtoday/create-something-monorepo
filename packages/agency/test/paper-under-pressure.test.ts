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
const canvas = read(
  '../../canon/src/lib/components/performance/PerformancePaperStudioCanvas.svelte'
);
const renderer = read('../../canon/src/lib/components/performance/media/paper-studio-renderer.ts');
const opening = read(
  '../../canon/src/lib/components/performance/PerformanceCampaignOpening.svelte'
);
const studies = read('../../canon/src/lib/components/performance/media/paper-studies.ts');

test('the homepage opening uses immutable paper campaign art while preserving authored proof', () => {
  assert.doesNotMatch(home, /import PaperUnderPressureStage/);
  assert.match(home, /mode="paper"/);
  assert.doesNotMatch(home, /\{#snippet artifact\(\)\}[\s\S]*?<PaperUnderPressureStage \/>/);
  assert.doesNotMatch(home, /agency-fluid-intelligence-loop-v4/);

  assert.match(component, /data-paper-under-pressure/);
  assert.match(component, /aria-label="Choose a paper workflow stage"/);
  assert.match(component, /aria-pressed=\{activeStageId === stage\.id\}/);
  assert.match(component, /aria-live="polite"/);
  assert.match(home, /media=\{paperOperatingRouteMedia\}/);
  assert.match(home, /Signal[\s\S]*?Decision[\s\S]*?Proof/);
  assert.match(studies, /alt: 'A tactile paper field/);
  assert.match(opening, /<picture class:performance-campaign-opening__fallback-suppressed/);
  assert.match(opening, /<img[\s\S]*?alt=\{artifactOwnsMedia \? '' : media\.alt\}/);
  assert.match(component, /<picture class:paper-pressure__fallback--hidden=\{studioReady\}>/);
  assert.match(component, /alt=\{paperPressureHandoffMedia\.alt\}/);
  assert.match(component, /prefers-reduced-motion: reduce/);

  for (const stage of ['map', 'build', 'control']) {
    assert.match(model, new RegExp(`id: '${stage}'`));
    assert.match(model, new RegExp(`id: '${stage}'`));
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
  assert.match(component, /PerformancePaperStudioCanvas/);
  assert.match(
    component,
    /<PerformancePaperStudioCanvas[\s\S]*?shot="agency"[\s\S]*?stage=\{activeStageId\}[\s\S]*?embedded[\s\S]*?onStateChange=/
  );
  assert.match(opening, /media\.studioShot/);
  assert.match(opening, /studioReady = state === 'ready'/);
  assert.match(opening, /performance-campaign-opening__media--studio-ready picture/);

  assert.match(canvas, /<canvas bind:this=\{canvasEl\}><\/canvas>/);
  assert.match(canvas, /aria-hidden="true"/);
  assert.match(canvas, /await import\([\s\S]*?'\.\/media\/paper-studio-renderer'/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /ResizeObserver/);
  assert.match(canvas, /prefers-reduced-motion: reduce/);
  assert.match(canvas, /recoveryInFlight/);
  assert.match(canvas, /webglcontextrestored/);
  assert.match(canvas, /requestAnimationFrame/);

  for (const receipt of [
    'data-renderer-profile',
    'data-renderer-budget',
    'data-renderer-draw-calls'
  ]) {
    assert.ok(canvas.includes(receipt), `paper canvas should publish ${receipt}`);
  }

  for (const semantic of [
    '--color-performance-ink',
    '--color-performance-panel',
    '--color-performance-paper-edge',
    '--color-performance-paper-fold',
    '--color-performance-signal'
  ]) {
    assert.ok(renderer.includes(semantic), `renderer should inherit ${semantic}`);
  }

  for (const contract of [
    'BoxGeometry',
    'TubeGeometry',
    'RectAreaLight',
    'RoomEnvironment',
    'PMREMGenerator',
    'roughnessMap',
    'normalMap',
    'textureRegistry',
    'setStage',
    'setVisible',
    'renderStatic',
    'forceContextLoss',
    'maximumPixelRatio',
    'withinBudget',
    'ACESFilmicToneMapping',
    'LinearMipmapLinearFilter'
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
    assert.equal(
      source.includes(prohibited),
      false,
      `${prohibited} must not enter the implementation`
    );
  }
});
