import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createRenderReceipt,
  generateFloorPlanSvg,
  hashRenderRecipe,
  inspectGlb,
  normalizeRenderRecipe,
  type RenderRecipeInput
} from '../src/index.js';
import { THRESHOLD_DWELLING } from '../data/threshold-dwelling.js';

import { THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN } from '@create-something/canon/experiments/threshold-dwelling/living-system-revision';

const SOURCE_HASH = 'a'.repeat(64);

test('uses Canon’s derived Threshold Dwelling revision instead of a second render geometry source', () => {
  assert.equal(THRESHOLD_DWELLING, THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN);
  assert.equal(THRESHOLD_DWELLING.width, 65);
  assert.equal(THRESHOLD_DWELLING.depth, 42);
  assert.equal(THRESHOLD_DWELLING.doors?.length, 13);
  assert.deepEqual(THRESHOLD_DWELLING.entry, { x: 75, y: 16 });
  assert.deepEqual(
    THRESHOLD_DWELLING.overhangs?.find((overhang) => overhang.label === 'Arrival\nLoggia'),
    { x: 65, y: 13, width: 10, height: 14, label: 'Arrival\nLoggia' }
  );
  assert.deepEqual(
    THRESHOLD_DWELLING.zones.find((zone) => zone.x === 55 && zone.y === 13),
    { x: 55, y: 13, width: 10, height: 7, type: 'public' }
  );
  assert.deepEqual(
    THRESHOLD_DWELLING.rooms.find((room) => room.name === 'Entry\nHall'),
    { x: 60, y: 16.5, name: 'Entry\nHall', small: true }
  );
  assert.deepEqual(
    THRESHOLD_DWELLING.overhangs?.find((overhang) => overhang.label === 'Companion\nCarport'),
    { x: 80, y: 0, width: 12, height: 27, label: 'Companion\nCarport' }
  );
  const svg = generateFloorPlanSvg(THRESHOLD_DWELLING);
  assert.match(svg, />Arrival<\/text>/);
  assert.match(svg, />Loggia<\/text>/);
  assert.match(svg, />Companion<\/text>/);
  assert.match(svg, />Carport<\/text>/);
});

function validRecipe(): RenderRecipeInput {
  return {
    version: 1,
    id: 'street-court-macro-01',
    asset: {
      id: 'street-court',
      browserUri: '/asset.glb',
      sourceSha256: SOURCE_HASH,
      provenance: {
        creator: 'Fixture Artist',
        sourceUrl: 'https://example.com/assets/street-court',
        licenseStatus: 'local-test-license',
        aiUse: 'prohibited',
        externalUploadAllowed: false
      }
    },
    shot: {
      focalLengthMm: 82,
      position: [5.8, 2.65, 0.85],
      target: [0, 0, 0.1],
      focusDistance: 6.2,
      aperture: 0.00009
    },
    style: {
      background: '#030404',
      court: '#111414',
      line: '#d8d3c6',
      structure: '#0754cf',
      proof: '#176f43',
      exposure: 0.93
    },
    output: {
      format: 'png',
      width: 1920,
      height: 1080,
      pixelRatioCap: 1.5
    },
    budgets: {
      maxSourceBytes: 70_000_000,
      maxTriangles: 125_000,
      maxDrawCalls: 48,
      maxTextures: 24
    },
    motion: {
      enabled: true,
      amplitude: 0.012,
      periodMs: 8000
    }
  };
}

test('normalizes and hashes a valid local render recipe deterministically', async () => {
  const recipeA = normalizeRenderRecipe(validRecipe());
  const recipeB = normalizeRenderRecipe({ ...validRecipe(), id: '  street-court-macro-01  ' });

  assert.deepEqual(recipeA, recipeB);
  assert.equal(recipeA.id, 'street-court-macro-01');

  const hashA = await hashRenderRecipe(recipeA);
  const hashB = await hashRenderRecipe(recipeB);
  assert.match(hashA, /^[a-f0-9]{64}$/);
  assert.equal(hashA, hashB);
});

test('rejects remote or generative upload asset references', () => {
  const remote = validRecipe();
  remote.asset.browserUri = 'https://example.com/court.glb';
  assert.throws(() => normalizeRenderRecipe(remote), /local browser URI/i);

  const uploadable = validRecipe();
  uploadable.asset.provenance.externalUploadAllowed = true;
  assert.throws(() => normalizeRenderRecipe(uploadable), /external upload/i);
});

test('rejects invalid output dimensions and incomplete provenance', () => {
  const oversized = validRecipe();
  oversized.output.width = 9000;
  assert.throws(() => normalizeRenderRecipe(oversized), /width/i);

  const missingCreator = validRecipe();
  missingCreator.asset.provenance.creator = ' ';
  assert.throws(() => normalizeRenderRecipe(missingCreator), /creator/i);

  const invalidAiUse = validRecipe();
  invalidAiUse.asset.provenance.aiUse = 'unknown' as RenderRecipeInput['asset']['provenance']['aiUse'];
  assert.throws(() => normalizeRenderRecipe(invalidAiUse), /aiUse/i);
});

test('creates an inspectable receipt with explicit fallback state', async () => {
  const recipe = normalizeRenderRecipe(validRecipe());
  const recipeHash = await hashRenderRecipe(recipe);
  const receipt = createRenderReceipt({
    recipe,
    recipeHash,
    backend: 'webgl2',
    durationMs: 412,
    render: { drawCalls: 18, triangles: 107_880, textures: 15 },
    fallback: { available: true, active: false, reason: null },
    capturedAt: '2026-08-09T23:00:00.000Z'
  });

  assert.equal(receipt.recipeHash, recipeHash);
  assert.equal(receipt.sourceSha256, SOURCE_HASH);
  assert.deepEqual(receipt.output, { format: 'png', width: 1920, height: 1080 });
  assert.equal(receipt.budgets.pass, true);
  assert.equal(receipt.fallback.available, true);
});

test('inspects a GLB without materializing proprietary image data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'render-lab-contract-'));
  const path = join(directory, 'fixture.glb');
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: '2.0' },
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
      accessors: [{ count: 3 }, { count: 3 }],
      materials: [],
      textures: [],
      images: [],
      animations: []
    })
  );
  const paddedLength = Math.ceil(json.length / 4) * 4;
  const glb = Buffer.alloc(12 + 8 + paddedLength, 0x20);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(paddedLength, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  json.copy(glb, 20);
  await writeFile(path, glb);

  try {
    const inspection = await inspectGlb(path);
    assert.match(inspection.sourceSha256, /^[a-f0-9]{64}$/);
    assert.equal(inspection.byteLength, glb.length);
    assert.equal(inspection.counts.scenes, 1);
    assert.equal(inspection.counts.meshes, 1);
    assert.equal(inspection.counts.vertices, 3);
    assert.equal(inspection.counts.triangles, 1);
    assert.equal(inspection.embeddedImageBytes, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
