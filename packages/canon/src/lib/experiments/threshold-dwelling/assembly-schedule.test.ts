import { describe, expect, it } from 'vitest';

import { THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN } from './living-system-revision.js';
import {
  THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE,
  resolveThresholdDwellingAssemblyBinding
} from './assembly-schedule.js';

describe('Threshold Dwelling assembly schedule', () => {
  it('binds every revised plan zone and wall class to a codified design-intent material', () => {
    const schedule = THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE;
    const materialIds = new Set(schedule.materials.map((material) => material.id));

    expect(schedule.schemaVersion).toBe('workway.assembly-schedule.v1');
    expect(schedule.spatialRevision).toBe('0.8');
    expect(schedule.constructionReady).toBe(false);

    for (const zone of THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.zones) {
      expect(zone.id).toBeTruthy();
      const binding = resolveThresholdDwellingAssemblyBinding('plan-zone', zone.id!);
      expect(binding).toBeDefined();
      expect(binding?.renderInMassingGuide).toBe(true);
      expect(materialIds.has(binding!.renderMaterialId)).toBe(true);
      expect(binding?.scopeQuantity.status).toBe('plan-derived-scope-not-procurement-quantity');
    }

    for (const id of ['exterior', 'interior'] as const) {
      const binding = resolveThresholdDwellingAssemblyBinding('wall-class', id);
      expect(binding?.renderInMassingGuide).toBe(true);
      expect(materialIds.has(binding!.renderMaterialId)).toBe(true);
    }
  });

  it('does not fabricate a selected product, layer thickness, or performance value', () => {
    const schedule = THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE;

    for (const material of schedule.materials) {
      expect(material.selectionStatus).toBe('role-codified-product-unselected');
      expect(material.manufacturer).toBeNull();
      expect(material.product).toBeNull();
      expect(material.modelNumber).toBeNull();
      expect(material.nominalThicknessIn).toBeNull();
      expect(material.performance).toEqual({
        rValue: null,
        uFactor: null,
        shgc: null,
        slipResistance: null,
        fireRating: null
      });
    }

    expect(schedule.requiredProfessionalDeterminations).toContain(
      'wet-room-waterproofing-and-slip-resistance-selection'
    );
    expect(schedule.requiredProfessionalDeterminations).toContain(
      'energy model, glazing performance, and room-by-room HVAC loads'
    );
  });

  it('keeps concrete primary, cedar restrained, and steel/glass limited to their intended roles', () => {
    const schedule = THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE;
    const exteriorBinding = resolveThresholdDwellingAssemblyBinding('wall-class', 'exterior');
    const exteriorAssembly = schedule.assemblies.find((assembly) => assembly.id === 'A-WAL-001');
    const glazingAssembly = schedule.assemblies.find((assembly) => assembly.id === 'A-OPN-001');

    expect(exteriorBinding?.renderMaterialId).toBe('M-ENV-002');
    expect(schedule.materials.find((material) => material.id === 'M-ENV-002')?.name).toBe(
      'Architectural Concrete'
    );
    expect(exteriorAssembly?.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialId: 'M-ENV-002' }),
        expect.objectContaining({ materialId: 'M-STR-002' })
      ])
    );
    expect(glazingAssembly?.purpose).toMatch(/Maximize useful floor-to-ceiling glass/i);
    expect(glazingAssembly?.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ materialId: 'M-ENV-001' }),
        expect.objectContaining({ materialId: 'M-STR-002' })
      ])
    );
  });
});
