import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createThresholdDwellingMassingGlb,
  inspectGlb
} from '../src/index.js';
import { THRESHOLD_DWELLING } from '../data/threshold-dwelling.js';

test('creates a compact GLB from the Canon Rev 0.8 plan without inventing vertical construction data', async () => {
  const result = createThresholdDwellingMassingGlb(THRESHOLD_DWELLING);
  const directory = await mkdtemp(join(tmpdir(), 'threshold-dwelling-massing-'));
  const path = join(directory, 'threshold-dwelling-r08-massing-guide.glb');
  await writeFile(path, result.glb);

  try {
    const inspection = await inspectGlb(path);
    assert.equal(result.receipt.horizontalDimensionsIn.width, 780);
    assert.equal(result.receipt.horizontalDimensionsIn.depth, 504);
    assert.equal(result.receipt.verticalMassingHeightIn, 108);
    assert.equal(result.receipt.verticalStatus, 'illustrative-visualization-parameter');
    assert.equal(
      result.receipt.assemblyScheduleId,
      'threshold-dwelling-rev-0.8-design-intent-assembly-schedule'
    );
    assert.equal(result.receipt.materialBindingStatus, 'role-codified-product-unselected');
    assert.deepEqual(result.receipt.renderedMaterialIds, [
      'M-INT-002',
      'M-INT-001',
      'M-ENV-002',
      'M-ENV-001'
    ]);
    assert.equal(result.receipt.constructionReady, false);
    assert.equal(inspection.generator, 'CREATE SOMETHING WorkWay deterministic massing exporter');
    assert.equal(inspection.counts.scenes, 1);
    assert.ok(inspection.counts.meshes >= 4);
    assert.equal(inspection.counts.textures, 0);
    assert.equal(inspection.counts.images, 0);
    assert.ok(inspection.counts.vertices > 0);
    assert.ok(inspection.counts.triangles > 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('keeps the checked-in client GLB current with the deterministic exporter', async () => {
  const expected = createThresholdDwellingMassingGlb(THRESHOLD_DWELLING).glb;
  const delivered = await readFile(
    new URL(
      '../../space/static/experiments/threshold-dwelling/renders/threshold-dwelling-r08-massing-guide.glb',
      import.meta.url
    )
  );

  assert.deepEqual(delivered, expected);
});
