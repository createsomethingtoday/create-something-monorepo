import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_ARC_CATALOG,
  ARC_CATALOG,
  ARC_CATALOG_COUNTS,
  getArcBySlug,
  listArcSummaries
} from '../dist/arcs.js';
import { validateAtlasComposition } from '../../atlas-composition/dist/index.js';

test('every typed public Playbook and Runbook has one stable Arc', () => {
  assert.deepEqual(ARC_CATALOG_COUNTS, {
    hostPlaybooks: 6,
    outcomePlaybooks: 30,
    operatorPlaybooks: 4,
    runbooks: 14,
    generated: 54
  });
  assert.equal(ARC_CATALOG.length, ARC_CATALOG_COUNTS.generated);
  assert.equal(new Set(ARC_CATALOG.map((entry) => entry.slug)).size, ARC_CATALOG.length);

  for (const entry of ARC_CATALOG) {
    assert.match(entry.slug, /^(host|outcome|operator|runbook)-[a-z0-9-]+$/);
    assert.equal(entry.visibility, 'public-noindex');
    assert.equal(entry.source.registered, true);
    assert.equal(validateAtlasComposition(entry.composition).ok, true, entry.slug);
    assert.ok(entry.composition.routes.some((route) => route.kind === 'arc'));
    assert.ok(entry.composition.routes.some((route) => route.kind === 'playbook'));
    assert.ok(entry.composition.routes.some((route) => route.kind === 'runbook'));
  }
});

test('catalog lookup and summaries expose read-only presentation metadata', () => {
  const briefing = getArcBySlug('runbook-codex-morning-briefing');
  assert.equal(briefing?.title, 'Morning Briefing');
  assert.equal(briefing?.source.kind, 'runbook');
  assert.equal(briefing?.composition.mode, 'local-fixture');

  const operator = getArcBySlug('operator-inbound-triage');
  assert.equal(operator?.source.kind, 'operator-playbook');
  assert.match(operator?.composition.description ?? '', /incoming request/i);

  const controlTower = getArcBySlug('operator-solo-control-tower');
  assert.equal(controlTower?.source.kind, 'operator-playbook');
  assert.match(controlTower?.composition.description ?? '', /parallel work lanes/i);

  const summaries = listArcSummaries();
  assert.equal(summaries.length, ALL_ARC_CATALOG.length);
  assert.equal('composition' in summaries[0], false);
  assert.ok(summaries.every((entry) => entry.href === `/arc/${entry.slug}`));
});

test('the public catalog preserves the shipped App Review Arc beside generated coverage', () => {
  assert.equal(ALL_ARC_CATALOG.length, 55);
  const appReview = ALL_ARC_CATALOG.find((entry) => entry.slug === 'app-review-governance');
  assert.equal(appReview?.href, '/arc/app-review-governance');
  assert.equal(appReview?.source.kind, 'prototype');
  assert.equal(validateAtlasComposition(appReview?.composition).ok, true);
});

test('unregistered markdown and private client procedures are not Arc catalog entries', () => {
  assert.equal(getArcBySlug('halfdozen-fleet-watchdog'), undefined);
  assert.equal(getArcBySlug('template-runbook'), undefined);
});
