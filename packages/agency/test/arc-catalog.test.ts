import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { getAgencyArc, getAgencyArcCatalog } from '../src/lib/server/arc-catalog.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Agency exposes every registered Arc through one read-only catalog', () => {
  const catalog = getAgencyArcCatalog();
  assert.equal(catalog.length, 54);
  assert.equal(new Set(catalog.map((arc) => arc.slug)).size, 54);
  assert.ok(catalog.every((arc) => arc.visibility === 'public-noindex'));
  assert.ok(catalog.every((arc) => !('composition' in arc)));

  const runbook = getAgencyArc('runbook-codex-morning-briefing');
  assert.equal(runbook?.source.kind, 'runbook');
  assert.ok(runbook?.composition.routes.some((route) => route.kind === 'arc'));
  assert.equal(getAgencyArc('private-client-procedure'), undefined);
});

test('catalog and dynamic Arc pages declare the noindex presentation boundary', async () => {
  const [indexPage, arcPage] = await Promise.all([
    readFile(path.join(packageRoot, 'src/routes/arcs/+page.svelte'), 'utf8'),
    readFile(path.join(packageRoot, 'src/routes/arc/[slug]/+page.svelte'), 'utf8')
  ]);

  assert.match(indexPage, /54 presentation routes/);
  assert.match(indexPage, /href=\{arc\.href\}/);
  assert.match(indexPage, /name="robots" content="noindex, nofollow"/);
  assert.match(arcPage, /PerformanceNarrativeStage/);
  assert.match(arcPage, /scene\.presentation\.reader\.stakeholders/);
  assert.match(arcPage, /name="robots" content="noindex, nofollow"/);
  assert.match(arcPage, /href="\/arcs"/);
});
