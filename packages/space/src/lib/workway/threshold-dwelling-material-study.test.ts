import assert from 'node:assert/strict';
import test from 'node:test';

import {
  THRESHOLD_DWELLING_DEFERRED_MATERIAL_STUDY_ROLES,
  THRESHOLD_DWELLING_MATERIAL_STUDIES,
  resolveThresholdDwellingMaterialStudy
} from './threshold-dwelling-material-study.js';

test('offers deterministic procedural studies only for the material roles present in the current massing', () => {
  assert.deepEqual(
    THRESHOLD_DWELLING_MATERIAL_STUDIES.map((study) => study.materialId),
    ['M-INT-001', 'M-INT-002', 'M-ENV-002', 'M-INT-003']
  );
  assert.ok(
    THRESHOLD_DWELLING_MATERIAL_STUDIES.every(
      (study) =>
        study.visualSource === 'workway-procedural-threejs-role-study' &&
        study.productStatus === 'role-codified-product-unselected' &&
        study.constructionReady === false
    )
  );
  assert.deepEqual(resolveThresholdDwellingMaterialStudy('M-INT-001'), {
    materialId: 'M-INT-001',
    materialName: 'Polished Concrete',
    recipe: 'polished-concrete-mottle',
    surfaceKind: 'floor',
    visualSource: 'workway-procedural-threejs-role-study',
    productStatus: 'role-codified-product-unselected',
    constructionReady: false
  });
});

test('keeps cedar and structural roles visible as deferred references rather than drawing unissued geometry', () => {
  assert.equal(resolveThresholdDwellingMaterialStudy('M-STR-002'), undefined);
  assert.deepEqual(
    THRESHOLD_DWELLING_DEFERRED_MATERIAL_STUDY_ROLES.filter(
      (role) => role.materialId === 'M-STR-002' || role.materialId === 'M-ENV-004'
    ).map((role) => [role.materialId, role.reason]),
    [
      ['M-STR-002', 'Structural support geometry is unissued.'],
      ['M-ENV-004', 'No protected-cedar accent geometry is currently issued.']
    ]
  );
});

test('makes architectural concrete the rendered exterior mass while glass and steel remain determination-gated', () => {
  assert.deepEqual(resolveThresholdDwellingMaterialStudy('M-ENV-002'), {
    materialId: 'M-ENV-002',
    materialName: 'Architectural Concrete',
    recipe: 'architectural-concrete-mottle',
    surfaceKind: 'wall',
    visualSource: 'workway-procedural-threejs-role-study',
    productStatus: 'role-codified-product-unselected',
    constructionReady: false
  });
  assert.equal(resolveThresholdDwellingMaterialStudy('M-ENV-001'), undefined);
  assert.equal(resolveThresholdDwellingMaterialStudy('M-STR-002'), undefined);
});
