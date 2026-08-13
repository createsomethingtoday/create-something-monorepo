import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  type ThresholdDwellingDimensionCandidate,
  type ThresholdDwellingPlanZone
} from './dimensioned-project.js';
import { THRESHOLD_DWELLING_GLAZING_STRATEGY } from './glazing-strategy.js';
import { THRESHOLD_DWELLING_INTERIOR_INFILL } from './interior-infill.js';
import {
  THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN,
  THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION
} from './living-system-revision.js';
import {
  THRESHOLD_DWELLING_DESIGN,
  type ThresholdDwellingMaterial
} from './model.js';

/**
 * A material/assembly source for deterministic project representations.
 *
 * It deliberately distinguishes a codified design role from a selected,
 * warrantable building product. No null property in this document may be
 * inferred by a renderer, estimator, or construction workflow.
 */
export type ThresholdDwellingAssemblyBindingTargetKind =
  | 'plan-zone'
  | 'wall-class'
  | 'plan-opening'
  | 'design-role';

export type ThresholdDwellingMaterialSelectionStatus = 'role-codified-product-unselected';
export type ThresholdDwellingScopeQuantityStatus =
  'plan-derived-scope-not-procurement-quantity'
  | 'design-development-allowance-not-plan-quantity';

export interface ThresholdDwellingCodifiedMaterial {
  id: string;
  name: string;
  paletteSourceName: ThresholdDwellingMaterial['name'];
  category: ThresholdDwellingMaterial['category'];
  role: string;
  visualColor: string;
  selectionStatus: ThresholdDwellingMaterialSelectionStatus;
  manufacturer: null;
  product: null;
  modelNumber: null;
  nominalThicknessIn: null;
  performance: {
    rValue: null;
    uFactor: null;
    shgc: null;
    slipResistance: null;
    fireRating: null;
  };
  note: string;
}

export interface ThresholdDwellingAssemblyLayer {
  role: string;
  materialId: string | null;
  nominalThicknessIn: null;
  status: 'design-intent-only-not-issued';
}

export interface ThresholdDwellingAssembly {
  id: string;
  name: string;
  purpose: string;
  layers: readonly ThresholdDwellingAssemblyLayer[];
  constructionStatus: 'conceptual-assembly-not-issued';
  requiredDeterminations: readonly string[];
}

export interface ThresholdDwellingAssemblyBinding {
  id: string;
  target: {
    kind: ThresholdDwellingAssemblyBindingTargetKind;
    id: string;
  };
  assemblyId: string;
  renderMaterialId: string;
  /** True only when this binding's geometry exists in the current massing guide. */
  renderInMassingGuide: boolean;
  scopeQuantity: {
    value: number | null;
    unit: 'SF' | 'LF';
    status: ThresholdDwellingScopeQuantityStatus;
  };
  note: string;
}

export interface ThresholdDwellingAssemblySchedule {
  schemaVersion: 'workway.assembly-schedule.v1';
  id: 'threshold-dwelling-rev-0.8-design-intent-assembly-schedule';
  projectId: ThresholdDwellingDimensionCandidate['id'];
  baselineRevision: ThresholdDwellingDimensionCandidate['source']['revision'];
  spatialRevision: typeof THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.proposedRevision;
  coordinateTruth: 'revised-plan-horizontal-only';
  materials: readonly ThresholdDwellingCodifiedMaterial[];
  assemblies: readonly ThresholdDwellingAssembly[];
  bindings: readonly ThresholdDwellingAssemblyBinding[];
  requiredProfessionalDeterminations: readonly string[];
  constructionReady: false;
}

const PALETTE_BY_NAME = new Map(
  THRESHOLD_DWELLING_DESIGN.materialPalette.map((material) => [material.name, material])
);

function codifiedMaterial(
  id: string,
  paletteSourceName: ThresholdDwellingMaterial['name'],
  role: string
): ThresholdDwellingCodifiedMaterial {
  const paletteMaterial = PALETTE_BY_NAME.get(paletteSourceName);
  if (!paletteMaterial) {
    throw new Error(`Threshold Dwelling assembly schedule references a missing palette material: ${paletteSourceName}`);
  }

  return {
    id,
    name: paletteMaterial.name,
    paletteSourceName,
    category: paletteMaterial.category,
    role,
    visualColor: paletteMaterial.color,
    selectionStatus: 'role-codified-product-unselected',
    manufacturer: null,
    product: null,
    modelNumber: null,
    nominalThicknessIn: null,
    performance: {
      rValue: null,
      uFactor: null,
      shgc: null,
      slipResistance: null,
      fireRating: null
    },
    note: paletteMaterial.notes
  };
}

const materials = [
  codifiedMaterial('M-STR-001', 'Reinforced Concrete', 'foundation and conditioned-slab substrate'),
  codifiedMaterial('M-STR-002', 'Coated Steel', 'primary structure and selected exposed supports'),
  codifiedMaterial('M-ENV-001', 'Low-E Insulated Glass', 'glazing role; actual units and performance unselected'),
  codifiedMaterial('M-ENV-002', 'Mineral Rainscreen', 'primary opaque exterior field'),
  codifiedMaterial('M-ENV-003', 'Formed Metal', 'roof, service volumes, flashings, and trim role'),
  codifiedMaterial('M-ENV-004', 'Protected Cedar', 'sheltered exterior accent role'),
  codifiedMaterial('M-INT-001', 'Polished Concrete', 'continuous conditioned-floor finish datum'),
  codifiedMaterial('M-INT-002', 'Large-Format Porcelain', 'wet-area finish role'),
  codifiedMaterial('M-INT-003', 'Gypsum + Mineral Finish', 'interior partition and ceiling finish role'),
  codifiedMaterial('M-INT-004', 'Cedar Accent', 'limited public ceiling and tactile millwork role'),
  codifiedMaterial('M-INT-005', 'Durable Casework', 'kitchen and storage role'),
  codifiedMaterial('M-EXT-001', 'Concrete Terrace', 'independent exterior slab role'),
  codifiedMaterial('M-EXT-002', 'Decomposed Granite', 'drainable drive and path role')
] as const;

const sharedScheduleDeterminations = [
  'licensed site survey and actual site orientation',
  'coordinated architectural wall, door, window, fixture, and finish schedules',
  'structural, wind, foundation, and connection design',
  'mechanical, electrical, plumbing, and low-voltage coordination',
  'energy compliance package and selected envelope performance',
  'jurisdictional determination and permit-submittal requirements'
] as const;

const assemblies = [
  {
    id: 'A-FLR-001',
    name: 'Conditioned polished-concrete floor datum',
    purpose: 'The continuous interior floor role outside wet areas.',
    layers: [
      { role: 'substrate', materialId: 'M-STR-001', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'finish', materialId: 'M-INT-001', nominalThicknessIn: null, status: 'design-intent-only-not-issued' }
    ],
    constructionStatus: 'conceptual-assembly-not-issued',
    requiredDeterminations: [
      'geotechnical and structural slab design',
      'joints, curing, sealer, tolerance, and mockup selection'
    ]
  },
  {
    id: 'A-FLR-002',
    name: 'Wet-area porcelain finish concept',
    purpose: 'Laundry and bath floor-finish role; not a waterproofing detail.',
    layers: [
      { role: 'substrate', materialId: 'M-STR-001', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'waterproofing system', materialId: null, nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'finish', materialId: 'M-INT-002', nominalThicknessIn: null, status: 'design-intent-only-not-issued' }
    ],
    constructionStatus: 'conceptual-assembly-not-issued',
    requiredDeterminations: [
      'wet-room-waterproofing-and-slip-resistance-selection',
      'floor slope, drain, threshold, transition, and maintenance coordination'
    ]
  },
  {
    id: 'A-WAL-001',
    name: 'Opaque exterior envelope concept',
    purpose: 'Ventilated mineral rainscreen and formed-metal role; not a wall section.',
    layers: [
      { role: 'primary cladding field', materialId: 'M-ENV-002', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'formed-metal field and trim', materialId: 'M-ENV-003', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'air, water, thermal, and structural backing systems', materialId: null, nominalThicknessIn: null, status: 'design-intent-only-not-issued' }
    ],
    constructionStatus: 'conceptual-assembly-not-issued',
    requiredDeterminations: [
      'wall thickness, structure, insulation, and control-layer design',
      'tested drainage, flashing, movement, corrosion, and installation details'
    ]
  },
  {
    id: 'A-WAL-002',
    name: 'Interior partition finish concept',
    purpose: 'Repairable quiet neutral interior field around structure and services.',
    layers: [
      { role: 'interior finish', materialId: 'M-INT-003', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'partition structure, acoustic, and service cavity', materialId: null, nominalThicknessIn: null, status: 'design-intent-only-not-issued' }
    ],
    constructionStatus: 'conceptual-assembly-not-issued',
    requiredDeterminations: [
      'partition thickness, ratings, acoustic criteria, and MEP routing',
      'door swings and final clearance review'
    ]
  },
  {
    id: 'A-OPN-001',
    name: 'Glazing concept',
    purpose: 'Maximized useful glass intent; exact units, height, operation, and support are not issued.',
    layers: [
      { role: 'glazing unit', materialId: 'M-ENV-001', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'frame, support, air, water, and shade systems', materialId: null, nominalThicknessIn: null, status: 'design-intent-only-not-issued' }
    ],
    constructionStatus: 'conceptual-assembly-not-issued',
    requiredDeterminations: [
      'surveyed compass orientation and obstruction context',
      'facade-specific solar and shade study',
      'engineered support and lateral design',
      'energy model, glazing performance, and room-by-room HVAC loads',
      'tested water-management and installation details'
    ]
  }
] as const satisfies readonly ThresholdDwellingAssembly[];

const wetAreaZoneIds = new Set<ThresholdDwellingPlanZone['id']>([
  'zone-laundry',
  'zone-guest-bath'
]);

function zoneBinding(zone: { id?: string; width: number; height: number }): ThresholdDwellingAssemblyBinding {
  if (!zone.id) throw new Error('Threshold Dwelling assembly schedule requires stable zone IDs.');
  const wetArea = wetAreaZoneIds.has(zone.id);
  return {
    id: `B-${zone.id}`,
    target: { kind: 'plan-zone', id: zone.id },
    assemblyId: wetArea ? 'A-FLR-002' : 'A-FLR-001',
    renderMaterialId: wetArea ? 'M-INT-002' : 'M-INT-001',
    renderInMassingGuide: true,
    scopeQuantity: {
      value: zone.width * zone.height,
      unit: 'SF',
      status: 'plan-derived-scope-not-procurement-quantity'
    },
    note:
      'Exact only as horizontal Rev 0.8 plan area. It excludes waste, transitions, thickness, substrate, product sizing, and procurement takeoff.'
  };
}

const bindings = [
  ...THRESHOLD_DWELLING_LIVING_SYSTEM_FLOOR_PLAN.zones.map(zoneBinding),
  {
    id: 'B-wall-exterior',
    target: { kind: 'wall-class', id: 'exterior' },
    assemblyId: 'A-WAL-001',
    renderMaterialId: 'M-ENV-002',
    renderInMassingGuide: true,
    scopeQuantity: {
      value: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.footprint.perimeterFt,
      unit: 'LF',
      status: 'plan-derived-scope-not-procurement-quantity'
    },
    note:
      'Exact only as conceptual plan-perimeter linework. Wall height, thickness, openings, assemblies, and takeoff remain unissued.'
  },
  {
    id: 'B-wall-interior',
    target: { kind: 'wall-class', id: 'interior' },
    assemblyId: 'A-WAL-002',
    renderMaterialId: 'M-INT-003',
    renderInMassingGuide: true,
    scopeQuantity: {
      value: null,
      unit: 'LF',
      status: 'design-development-allowance-not-plan-quantity'
    },
    note:
      'No interior-wall linear quantity is asserted because segmented render lines are not a partition takeoff.'
  },
  ...THRESHOLD_DWELLING_DIMENSION_CANDIDATE.windows.map((opening) => ({
    id: `B-${opening.id}`,
    target: { kind: 'plan-opening' as const, id: opening.id },
    assemblyId: 'A-OPN-001',
    renderMaterialId: 'M-ENV-001',
    renderInMassingGuide: false,
    scopeQuantity: {
      value: opening.planOpeningWidthIn / 12,
      unit: 'LF' as const,
      status: 'plan-derived-scope-not-procurement-quantity' as const
    },
    note:
      'This is an exact plan opening width only. The current massing guide does not model a panel, sill, head, frame, operation, or glazing area.'
  }))
] as const satisfies readonly ThresholdDwellingAssemblyBinding[];

export const THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE = {
  schemaVersion: 'workway.assembly-schedule.v1',
  id: 'threshold-dwelling-rev-0.8-design-intent-assembly-schedule',
  projectId: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id,
  baselineRevision: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.source.revision,
  spatialRevision: THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.proposedRevision,
  coordinateTruth: 'revised-plan-horizontal-only',
  materials,
  assemblies,
  bindings,
  requiredProfessionalDeterminations: [
    ...sharedScheduleDeterminations,
    ...THRESHOLD_DWELLING_INTERIOR_INFILL.requiredNextDeterminations,
    ...THRESHOLD_DWELLING_GLAZING_STRATEGY.facadeStrategies.flatMap(
      (facade) => facade.requiredDeterminations
    )
  ],
  constructionReady: false
} as const satisfies ThresholdDwellingAssemblySchedule;

export function resolveThresholdDwellingAssemblyBinding(
  kind: ThresholdDwellingAssemblyBindingTargetKind,
  id: string
): ThresholdDwellingAssemblyBinding | undefined {
  return THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE.bindings.find(
    (binding) => binding.target.kind === kind && binding.target.id === id
  );
}

export function resolveThresholdDwellingCodifiedMaterial(
  id: string
): ThresholdDwellingCodifiedMaterial | undefined {
  return THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE.materials.find((material) => material.id === id);
}
