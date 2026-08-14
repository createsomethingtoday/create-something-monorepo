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

/**
 * A review-only horizontal allocation for the massing guide. It makes the
 * concrete-to-glass study visible without inventing an elevation, panel
 * schedule, glazing height, or construction geometry.
 */
export interface ThresholdDwellingFacadeMaterialStudySpan {
  id: string;
  sourceWallId: string;
  startIn: { xIn: number; yIn: number };
  endIn: { xIn: number; yIn: number };
  materialId: 'M-ENV-001';
  role: 'concentrated-glazing-study';
}

export interface ThresholdDwellingFacadeMaterialStudy {
  id: 'threshold-dwelling-r08-concrete-majority-facade-study';
  visualStatus: 'horizontal-material-allocation-study-not-elevation';
  targetGlazingToGrossExteriorWallRatio: number;
  spans: readonly ThresholdDwellingFacadeMaterialStudySpan[];
  constructionReady: false;
}

export interface ThresholdDwellingFacadeWallInput {
  id?: string;
  exterior?: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ThresholdDwellingFacadeWallSegment {
  id?: string;
  exterior?: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  materialId: string;
  studyRole: 'concentrated-glazing-study' | 'opaque-concrete-study';
}

const INCHES_PER_FOOT = 12;
const FACADE_STUDY_EPSILON = 1e-6;

const facadeStudySpans = [
  {
    id: 'north-public-glazing-field',
    sourceWallId: 'wall-exterior-north',
    startIn: { xIn: 12 * INCHES_PER_FOOT, yIn: 0 },
    endIn: { xIn: 55 * INCHES_PER_FOOT, yIn: 0 },
    materialId: 'M-ENV-001',
    role: 'concentrated-glazing-study'
  },
  {
    id: 'east-arrival-glazing-field',
    sourceWallId: 'wall-exterior-east',
    startIn: { xIn: 65 * INCHES_PER_FOOT, yIn: 17.5 * INCHES_PER_FOOT },
    endIn: { xIn: 65 * INCHES_PER_FOOT, yIn: 32.5 * INCHES_PER_FOOT },
    materialId: 'M-ENV-001',
    role: 'concentrated-glazing-study'
  },
  {
    id: 'south-private-glazing-field',
    sourceWallId: 'wall-exterior-south',
    startIn: { xIn: 44 * INCHES_PER_FOOT, yIn: 42 * INCHES_PER_FOOT },
    endIn: { xIn: 17 * INCHES_PER_FOOT, yIn: 42 * INCHES_PER_FOOT },
    materialId: 'M-ENV-001',
    role: 'concentrated-glazing-study'
  },
  {
    id: 'west-hall-glazing-field',
    sourceWallId: 'wall-exterior-west',
    startIn: { xIn: 0, yIn: 22 * INCHES_PER_FOOT },
    endIn: { xIn: 0, yIn: 12 * INCHES_PER_FOOT },
    materialId: 'M-ENV-001',
    role: 'concentrated-glazing-study'
  }
] as const satisfies readonly ThresholdDwellingFacadeMaterialStudySpan[];

export const THRESHOLD_DWELLING_FACADE_MATERIAL_STUDY = {
  id: 'threshold-dwelling-r08-concrete-majority-facade-study',
  visualStatus: 'horizontal-material-allocation-study-not-elevation',
  targetGlazingToGrossExteriorWallRatio: THRESHOLD_DWELLING_DESIGN.buildMetrics.glazingToGrossExteriorWallRatio,
  spans: facadeStudySpans,
  constructionReady: false
} as const satisfies ThresholdDwellingFacadeMaterialStudy;

function clampUnitInterval(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function pointAlongWall(
  wall: ThresholdDwellingFacadeWallInput,
  t: number
): { x: number; y: number } {
  return {
    x: wall.x1 + (wall.x2 - wall.x1) * t,
    y: wall.y1 + (wall.y2 - wall.y1) * t
  };
}

function projectPointOntoWall(
  wall: ThresholdDwellingFacadeWallInput,
  pointIn: { xIn: number; yIn: number }
): number | undefined {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= FACADE_STUDY_EPSILON) return undefined;

  const pointX = pointIn.xIn / INCHES_PER_FOOT;
  const pointY = pointIn.yIn / INCHES_PER_FOOT;
  const cross = (pointX - wall.x1) * dy - (pointY - wall.y1) * dx;
  if (Math.abs(cross) > FACADE_STUDY_EPSILON) return undefined;

  return ((pointX - wall.x1) * dx + (pointY - wall.y1) * dy) / lengthSquared;
}

/**
 * Splits an exterior plan-line segment only for the renderer's material study.
 * The returned subsegments preserve the input's exact horizontal coordinates;
 * their material allocation is not a facade elevation or construction issue.
 */
export function splitThresholdDwellingExteriorWallForMaterialStudy(
  wall: ThresholdDwellingFacadeWallInput
): readonly ThresholdDwellingFacadeWallSegment[] {
  const fallbackBinding = resolveThresholdDwellingAssemblyBinding('wall-class', 'exterior');
  if (!fallbackBinding) {
    throw new Error('Threshold Dwelling facade study requires an exterior wall binding.');
  }

  if (!wall.exterior || !wall.id) {
    return [
      {
        ...wall,
        materialId: fallbackBinding.renderMaterialId,
        studyRole: 'opaque-concrete-study'
      }
    ];
  }

  const intervals = THRESHOLD_DWELLING_FACADE_MATERIAL_STUDY.spans
    .filter((span) => span.sourceWallId === wall.id)
    .flatMap((span) => {
      const startT = projectPointOntoWall(wall, span.startIn);
      const endT = projectPointOntoWall(wall, span.endIn);
      if (startT === undefined || endT === undefined) return [];
      const start = clampUnitInterval(Math.min(startT, endT));
      const end = clampUnitInterval(Math.max(startT, endT));
      return end - start > FACADE_STUDY_EPSILON ? [{ start, end, span }] : [];
    });
  const breaks = [...new Set([0, 1, ...intervals.flatMap(({ start, end }) => [start, end])])].sort(
    (a, b) => a - b
  );

  return breaks.slice(0, -1).flatMap((start, index) => {
    const end = breaks[index + 1];
    if (end - start <= FACADE_STUDY_EPSILON) return [];
    const midpoint = (start + end) / 2;
    const glazing = intervals.find(
      (interval) => midpoint > interval.start - FACADE_STUDY_EPSILON && midpoint < interval.end + FACADE_STUDY_EPSILON
    );
    const startPoint = pointAlongWall(wall, start);
    const endPoint = pointAlongWall(wall, end);

    return [
      {
        id: wall.id,
        exterior: true,
        x1: startPoint.x,
        y1: startPoint.y,
        x2: endPoint.x,
        y2: endPoint.y,
        materialId: glazing?.span.materialId ?? fallbackBinding.renderMaterialId,
        studyRole: glazing ? 'concentrated-glazing-study' : 'opaque-concrete-study'
      }
    ];
  });
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
  codifiedMaterial('M-STR-002', 'Coated Steel', 'localized primary structure and glazed-span support role'),
  codifiedMaterial('M-ENV-001', 'Low-E Insulated Glass', 'concentrated floor-to-ceiling facade spans; actual units and performance unselected'),
  codifiedMaterial('M-ENV-002', 'Architectural Concrete', 'primary interior wall mass and concrete-majority exterior envelope'),
  codifiedMaterial('M-ENV-003', 'Formed Metal', 'roof, service volumes, flashings, and trim role'),
  codifiedMaterial('M-ENV-004', 'Protected Cedar', 'sheltered exterior accent role'),
  codifiedMaterial('M-INT-001', 'Polished Concrete', 'continuous conditioned-floor finish datum'),
  codifiedMaterial('M-INT-002', 'Large-Format Porcelain', 'wet-area finish role'),
  codifiedMaterial('M-INT-003', 'Gypsum + Mineral Finish', 'selective ceiling and non-concrete service-finish role'),
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
    name: 'Concrete-majority exterior envelope with concentrated glazing concept',
    purpose: 'Architectural concrete is the predominant aggregate exterior-wall design intent; Low-E insulated glass is concentrated at selected public, view, and arrival spans, and coated steel is localized at glazed spans and required frame/lateral conditions. This is not a window schedule, wall section, or structural design.',
    layers: [
      { role: 'concrete-majority exterior field', materialId: 'M-ENV-002', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'concentrated floor-to-ceiling glazing spans', materialId: 'M-ENV-001', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'localized glazed-span and frame support', materialId: 'M-STR-002', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'air, water, thermal, and structural backing systems', materialId: null, nominalThicknessIn: null, status: 'design-intent-only-not-issued' }
    ],
    constructionStatus: 'conceptual-assembly-not-issued',
    requiredDeterminations: [
      'facade-specific glazing ratio, apertures, units, operation, shaded-zone design, and Miesian-precedent non-transfer review',
      'architectural concrete system, thickness, reinforcement, finish, movement, and mockup design at the exterior field and interior wall mass',
      'glazed-span steel support, lateral, connection, corrosion, and installation design',
      'tested drainage, flashing, air/water, thermal, and installation details'
    ]
  },
  {
    id: 'A-WAL-002',
    name: 'Interior architectural concrete wall-mass concept',
    purpose: 'Architectural concrete is the primary interior-wall design intent; gypsum/mineral finish remains selective at ceilings and non-concrete service-finish planes. This is not a partition, structural, acoustic, or MEP detail.',
    layers: [
      { role: 'primary interior wall mass', materialId: 'M-ENV-002', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'selective ceiling and service-finish planes', materialId: 'M-INT-003', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'partition structure, acoustic, and service routing', materialId: null, nominalThicknessIn: null, status: 'design-intent-only-not-issued' }
    ],
    constructionStatus: 'conceptual-assembly-not-issued',
    requiredDeterminations: [
      'interior concrete wall system, thickness, reinforcement, openings, ratings, and MEP routing',
      'acoustic criteria and selective gypsum/mineral finish locations',
      'door swings and final clearance review'
    ]
  },
  {
    id: 'A-OPN-001',
    name: 'Glazing concept',
    purpose: 'Concentrate useful floor-to-ceiling glass at the facade-study spans where site, safety, privacy, energy, water-management, and engineered support determinations allow. Exact units, height, operation, and support are not issued.',
    layers: [
      { role: 'glazing unit', materialId: 'M-ENV-001', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'localized steel support at glazed spans', materialId: 'M-STR-002', nominalThicknessIn: null, status: 'design-intent-only-not-issued' },
      { role: 'frame, air, water, and shade systems', materialId: null, nominalThicknessIn: null, status: 'design-intent-only-not-issued' }
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
      'The massing defaults to a concrete-majority exterior field, then applies review-only horizontal glazing spans over exact plan-perimeter linework. It does not assert glass-panel locations, pane count, mullions, heights, thicknesses, openings, assemblies, or takeoff.'
  },
  {
    id: 'B-wall-interior',
    target: { kind: 'wall-class', id: 'interior' },
    assemblyId: 'A-WAL-002',
    renderMaterialId: 'M-ENV-002',
    renderInMassingGuide: true,
    scopeQuantity: {
      value: null,
      unit: 'LF',
      status: 'design-development-allowance-not-plan-quantity'
    },
    note:
      'The massing renders an interior architectural-concrete field over exact plan linework only. No interior-wall linear quantity, thickness, reinforcement, opening, service, or partition takeoff is asserted.'
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
