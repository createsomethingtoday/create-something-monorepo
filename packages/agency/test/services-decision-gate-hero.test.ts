import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const agencyRoot = resolve(import.meta.dirname, '..');

function read(relativePath: string): string {
  return readFileSync(resolve(agencyRoot, relativePath), 'utf8');
}

test('Services keeps its semantic Paper fallback while Omma adds a bounded renderer behind copy', () => {
  const route = read('src/routes/services/+page.svelte');
  const canvasPath = resolve(agencyRoot, 'src/lib/components/ServicesDecisionGateCanvas.svelte');
  const rendererPath = resolve(agencyRoot, 'src/lib/visual/servicesDecisionGateRenderer.ts');

  assert.ok(existsSync(canvasPath), 'Services must own its renderer wrapper');
  assert.ok(existsSync(rendererPath), 'Services must own the bounded renderer source');

  const canvas = readFileSync(canvasPath, 'utf8');
  const renderer = readFileSync(rendererPath, 'utf8');

  assert.match(route, /import ServicesDecisionGateCanvas/);
  assert.match(route, /artifactLayer="behind-content"/);
  assert.match(route, /artifactOwnsMedia={ommaReady}/);
  assert.match(route, /<ServicesDecisionGateCanvas[\s\S]*?onStateChange=/);

  assert.match(canvas, /prefers-reduced-motion: reduce/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /data-renderer-state=/);
  assert.match(canvas, /aria-hidden="true"/);
  assert.match(canvas, /typeof document !== 'undefined'/);
  assert.match(renderer, /failIfMajorPerformanceCaveat: true/);
  assert.match(renderer, /maximumPixelRatio/);
  assert.match(canvas, /@media \(max-width: 47\.99rem\)/);
  assert.match(canvas, /inset: 46% 0 0/);
  assert.match(renderer, /const portrait = options\.compact \|\| width < 760/);
  assert.match(renderer, /root\.scale\.setScalar\(0\.48\)/);
  assert.match(renderer, /renderStatic/);
  assert.doesNotMatch(`${canvas}\n${renderer}`, /deviceorientation|requestAnimationFrame/);
});
