import {
  THRESHOLD_DWELLING_DIMENSION_CANDIDATE,
  type ThresholdDwellingPlanOpening
} from './dimensioned-project.js';
import { THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION } from './living-system-revision.js';

/**
 * A client-safe occupancy and systems layer for spatial experience review.
 * It never turns nominal furniture, equipment, or service intent into an
 * engineering, code, product-selection, or construction claim.
 */
export type ThresholdDwellingOutfittingCategory =
  | 'opening'
  | 'furnishing'
  | 'appliance'
  | 'plumbing'
  | 'hvac'
  | 'electrical'
  | 'life-safety'
  | 'shading';

export type ThresholdDwellingOutfittingRendering =
  | 'plan-opening-marker'
  | 'design-intent-volume'
  | 'design-intent-fixture'
  | 'systems-location-marker';

export interface ThresholdDwellingOutfittingPlacement {
  xIn: number;
  yIn: number;
  widthIn: number;
  depthIn: number;
  /** Visualization profile only; never an issued elevation or installation datum. */
  renderHeightIn: number;
}

export interface ThresholdDwellingOutfittingItem {
  id: string;
  category: ThresholdDwellingOutfittingCategory;
  title: string;
  chapterId?: string;
  sourceOpeningId?: ThresholdDwellingPlanOpening['id'];
  placement: ThresholdDwellingOutfittingPlacement;
  rendering: ThresholdDwellingOutfittingRendering;
  basis: 'plan-opening' | 'design-intent-footprint' | 'systems-location-intent';
  reviewNote: string;
  constructionReady: false;
}

export interface ThresholdDwellingOutfittingSystem {
  schemaVersion: 'workway.outfitting-system.v1';
  id: 'threshold-dwelling-r08-design-intent-outfitting';
  projectId: 'threshold-dwelling';
  canonicalRevision: string;
  spatialRevision: string;
  status: 'design-intent-experience-layer';
  statement: string;
  items: readonly ThresholdDwellingOutfittingItem[];
  constructionReady: false;
}

export interface ThresholdDwellingOutfittingValidation {
  issueIds: readonly string[];
  isSafeForExperienceReview: boolean;
  constructionReady: false;
}

const feet = (value: number): number => value * 12;
const placement = (
  xFt: number,
  yFt: number,
  widthFt: number,
  depthFt: number,
  renderHeightIn: number
): ThresholdDwellingOutfittingPlacement => ({
  xIn: feet(xFt),
  yIn: feet(yFt),
  widthIn: feet(widthFt),
  depthIn: feet(depthFt),
  renderHeightIn
});

const reviewNoteByBasis: Record<ThresholdDwellingOutfittingItem['basis'], string> = {
  'plan-opening':
    'Plan location and span are derived from the candidate plan. Operation, clear opening, sill, head, elevation, safety, and installation remain professional determinations.',
  'design-intent-footprint':
    'Nominal experience-review footprint only; product selection, final dimensions, clearances, utilities, installation, and code review remain unissued.',
  'systems-location-intent':
    'Systems-location intent only; sizing, routing, capacity, circuits, controls, access, performance, and adopted-code compliance require qualified design.'
};

const item = (
  value: Omit<ThresholdDwellingOutfittingItem, 'constructionReady' | 'reviewNote'> & {
    reviewNote?: string;
  }
): ThresholdDwellingOutfittingItem => ({
  ...value,
  reviewNote: value.reviewNote ?? reviewNoteByBasis[value.basis],
  constructionReady: false
});

const chapterByOpeningId: Partial<Record<ThresholdDwellingPlanOpening['id'], string>> = {
  'door-daughter-suite': 'daughter-sleep-zone',
  'door-daughter-bath': 'daughter-sleep-zone',
  'door-primary-suite': 'primary-sleep-zone',
  'door-primary-closet': 'primary-sleep-zone',
  'door-primary-bath': 'primary-sleep-zone',
  'door-inlaw-suite': 'inlaw-sleep-zone',
  'door-inlaw-bath': 'inlaw-sleep-zone',
  'window-daughter-suite': 'daughter-sleep-zone',
  'window-primary-bedroom': 'primary-sleep-zone',
  'window-primary-bath': 'primary-sleep-zone',
  'window-inlaw-suite': 'inlaw-sleep-zone',
  'window-kitchen': 'kitchen',
  'window-living-dining': 'dining',
  'window-open-zone': 'living',
  'window-living-east': 'living'
};

function openingItem(opening: ThresholdDwellingPlanOpening): ThresholdDwellingOutfittingItem {
  const thicknessIn = 4;
  const horizontal = opening.orientation === 'horizontal';
  const widthIn = horizontal ? opening.planOpeningWidthIn : thicknessIn;
  const depthIn = horizontal ? thicknessIn : opening.planOpeningWidthIn;
  const xIn = Math.max(
    0,
    Math.min(
      opening.center.xIn - widthIn / 2,
      THRESHOLD_DWELLING_DIMENSION_CANDIDATE.footprint.widthIn - widthIn
    )
  );
  const yIn = Math.max(
    0,
    Math.min(
      opening.center.yIn - depthIn / 2,
      THRESHOLD_DWELLING_DIMENSION_CANDIDATE.footprint.depthIn - depthIn
    )
  );
  return item({
    id: 'opening-' + opening.id,
    category: 'opening',
    title: opening.kind === 'door' ? 'Door opening marker' : 'Window opening marker',
    chapterId: chapterByOpeningId[opening.id],
    sourceOpeningId: opening.id,
    placement: { xIn, yIn, widthIn, depthIn, renderHeightIn: 3 },
    rendering: 'plan-opening-marker',
    basis: 'plan-opening'
  });
}

const planOpeningItems = [
  ...THRESHOLD_DWELLING_DIMENSION_CANDIDATE.doors,
  ...THRESHOLD_DWELLING_DIMENSION_CANDIDATE.windows
].map(openingItem);

const occupiedAndSystemsItems: readonly ThresholdDwellingOutfittingItem[] = [
  item({ id: 'furnishing-kitchen-casework', category: 'furnishing', title: 'Kitchen service run', chapterId: 'kitchen', placement: placement(12.25, 0.35, 14.5, 2, 36), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'furnishing-kitchen-island', category: 'furnishing', title: 'Kitchen island', chapterId: 'kitchen', placement: placement(14.25, 4.25, 9, 3.5, 36), rendering: 'design-intent-volume', basis: 'design-intent-footprint', reviewNote: 'Uses the selected 108 in by 42 in design-intent island footprint; final clearances require coordinated review.' }),
  item({ id: 'appliance-kitchen-refrigerator', category: 'appliance', title: 'Kitchen refrigerator zone', chapterId: 'kitchen', placement: placement(24.25, 0.55, 3, 2.75, 70), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'appliance-kitchen-range', category: 'appliance', title: 'Kitchen cooking zone', chapterId: 'kitchen', placement: placement(18.75, 0.45, 3, 2.35, 36), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'furnishing-dining-table', category: 'furnishing', title: 'Dining table', chapterId: 'dining', placement: placement(28.25, 4.5, 7, 3.5, 30), rendering: 'design-intent-volume', basis: 'design-intent-footprint', reviewNote: 'Nominal eight-place table footprint used to judge lived circulation; it is not an accessibility clearance claim.' }),
  item({ id: 'furnishing-living-sofa', category: 'furnishing', title: 'Living sofa', chapterId: 'living', placement: placement(43.5, 6, 8, 3.4, 32), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'furnishing-living-chair-pair', category: 'furnishing', title: 'Living chairs', chapterId: 'living', placement: placement(41.25, 2.75, 4.5, 3, 32), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'furnishing-daughter-bed', category: 'furnishing', title: 'Daughter suite bed', chapterId: 'daughter-sleep-zone', placement: placement(2, 30, 5, 6.67, 30), rendering: 'design-intent-volume', basis: 'design-intent-footprint', reviewNote: 'Nominal queen-ready sleeping footprint selected only to understand the room; occupant preference and final furniture remain open.' }),
  item({ id: 'furnishing-daughter-desk', category: 'furnishing', title: 'Daughter suite desk', chapterId: 'daughter-sleep-zone', placement: placement(11.5, 36.5, 4, 2, 30), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'furnishing-daughter-wardrobe', category: 'furnishing', title: 'Daughter suite wardrobe', chapterId: 'daughter-sleep-zone', placement: placement(12.5, 22.25, 4.5, 2, 72), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'furnishing-primary-bed', category: 'furnishing', title: 'Primary suite bed', chapterId: 'primary-sleep-zone', placement: placement(20.25, 31.25, 6.34, 6.67, 34), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'furnishing-inlaw-bed', category: 'furnishing', title: 'In-law suite bed', chapterId: 'inlaw-sleep-zone', placement: placement(41.5, 30.75, 5, 6.67, 30), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'furnishing-inlaw-sitting', category: 'furnishing', title: 'In-law sitting group', chapterId: 'inlaw-sitting-zone', placement: placement(56.25, 33.5, 6.5, 4.5, 30), rendering: 'design-intent-volume', basis: 'design-intent-footprint' }),
  item({ id: 'plumbing-kitchen-sink', category: 'plumbing', title: 'Kitchen sink zone', chapterId: 'kitchen', placement: placement(16.25, 0.55, 3, 2, 36), rendering: 'design-intent-fixture', basis: 'design-intent-footprint' }),
  item({ id: 'plumbing-laundry-zone', category: 'plumbing', title: 'Laundry water and drain zone', placement: placement(1, 0.5, 5, 2.75, 42), rendering: 'design-intent-fixture', basis: 'systems-location-intent' }),
  item({ id: 'plumbing-daughter-bath', category: 'plumbing', title: 'Daughter bath fixture group', chapterId: 'daughter-sleep-zone', placement: placement(10.75, 21, 6.5, 5.75, 32), rendering: 'design-intent-fixture', basis: 'design-intent-footprint' }),
  item({ id: 'plumbing-primary-bath', category: 'plumbing', title: 'Primary bath fixture group', chapterId: 'primary-sleep-zone', placement: placement(26.5, 20.75, 10.5, 5.75, 32), rendering: 'design-intent-fixture', basis: 'design-intent-footprint' }),
  item({ id: 'plumbing-inlaw-bath', category: 'plumbing', title: 'In-law bath fixture group', chapterId: 'inlaw-sleep-zone', placement: placement(55.5, 20.75, 8.5, 5.75, 32), rendering: 'design-intent-fixture', basis: 'design-intent-footprint' }),
  item({ id: 'plumbing-water-heater-service-zone', category: 'plumbing', title: 'Water-heating service zone', placement: placement(61, 1, 2.5, 2.5, 60), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'hvac-air-handler-service-zone', category: 'hvac', title: 'Air-handler service zone', placement: placement(56.25, 1, 3.5, 3.5, 60), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'hvac-kitchen-supply', category: 'hvac', title: 'Kitchen supply-air intent', chapterId: 'kitchen', placement: placement(15, 2.25, 0.83, 0.83, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'hvac-dining-supply', category: 'hvac', title: 'Dining supply-air intent', chapterId: 'dining', placement: placement(31, 2.25, 0.83, 0.83, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'hvac-living-supply', category: 'hvac', title: 'Living supply-air intent', chapterId: 'living', placement: placement(47, 2.25, 0.83, 0.83, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'hvac-private-suite-supply-intent', category: 'hvac', title: 'Private-suite supply-air intent', placement: placement(9, 29, 0.83, 0.83, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'hvac-central-return-intent', category: 'hvac', title: 'Central return-air intent', placement: placement(33, 16, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'electrical-service-panel', category: 'electrical', title: 'Electrical service-panel zone', placement: placement(7.75, 0.5, 2.5, 0.75, 72), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'electrical-public-lighting-intent', category: 'electrical', title: 'Public-room lighting intent', chapterId: 'dining', placement: placement(34.5, 6.1, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'electrical-kitchen-task-lighting-intent', category: 'electrical', title: 'Kitchen task-lighting intent', chapterId: 'kitchen', placement: placement(20, 5.5, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'electrical-daughter-power-data-intent', category: 'electrical', title: 'Daughter suite power and data intent', chapterId: 'daughter-sleep-zone', placement: placement(13.25, 35.75, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'electrical-primary-bedside-intent', category: 'electrical', title: 'Primary bedside power intent', chapterId: 'primary-sleep-zone', placement: placement(28, 36, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'life-safety-public-intent', category: 'life-safety', title: 'Public-area smoke and CO notification intent', placement: placement(34, 14.5, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'life-safety-daughter-intent', category: 'life-safety', title: 'Daughter-suite smoke and CO notification intent', chapterId: 'daughter-sleep-zone', placement: placement(8.5, 28.5, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'life-safety-primary-intent', category: 'life-safety', title: 'Primary-suite smoke and CO notification intent', chapterId: 'primary-sleep-zone', placement: placement(29, 28.5, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'life-safety-inlaw-intent', category: 'life-safety', title: 'In-law-suite smoke and CO notification intent', chapterId: 'inlaw-sleep-zone', placement: placement(48.5, 28.5, 1, 1, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'shading-public-facade-pocket', category: 'shading', title: 'Public-view recessed-shade intent', chapterId: 'living', placement: placement(20.5, 0.25, 29.5, 0.75, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' }),
  item({ id: 'shading-daughter-window-intent', category: 'shading', title: 'Daughter-suite privacy shade intent', chapterId: 'daughter-sleep-zone', placement: placement(9, 41.25, 6, 0.5, 3), rendering: 'systems-location-marker', basis: 'systems-location-intent' })
];

export const THRESHOLD_DWELLING_OUTFITTING_SYSTEM = {
  schemaVersion: 'workway.outfitting-system.v1',
  id: 'threshold-dwelling-r08-design-intent-outfitting',
  projectId: THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id,
  canonicalRevision: THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.base.revision,
  spatialRevision: THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.proposedRevision,
  status: 'design-intent-experience-layer',
  statement:
    'A room-comprehension layer for spatial review. Plan openings retain candidate-plan spans; furnishings, fixtures, equipment, and systems locations are nominal proxies only. None is an equipment schedule, final selection, load calculation, installation instruction, code finding, or construction release.',
  items: [...planOpeningItems, ...occupiedAndSystemsItems],
  constructionReady: false
} as const satisfies ThresholdDwellingOutfittingSystem;

const requiredCategories: readonly ThresholdDwellingOutfittingCategory[] = [
  'opening', 'furnishing', 'appliance', 'plumbing', 'hvac', 'electrical', 'life-safety', 'shading'
];

export function validateThresholdDwellingOutfittingSystem(
  system: ThresholdDwellingOutfittingSystem
): ThresholdDwellingOutfittingValidation {
  const issueIds: string[] = [];
  const sourceOpeningIds = new Set(
    [...THRESHOLD_DWELLING_DIMENSION_CANDIDATE.doors, ...THRESHOLD_DWELLING_DIMENSION_CANDIDATE.windows].map(
      (opening) => opening.id
    )
  );
  const openingItems = system.items.filter((candidate) => candidate.category === 'opening');
  const openingIds = openingItems.map((candidate) => candidate.sourceOpeningId);
  const itemIds = system.items.map((candidate) => candidate.id);
  const footprint = THRESHOLD_DWELLING_DIMENSION_CANDIDATE.footprint;

  if (
    system.id !== 'threshold-dwelling-r08-design-intent-outfitting' ||
    system.projectId !== THRESHOLD_DWELLING_DIMENSION_CANDIDATE.id ||
    system.canonicalRevision !== THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.base.revision ||
    system.spatialRevision !== THRESHOLD_DWELLING_LIVING_SYSTEM_REVISION.proposedRevision ||
    system.status !== 'design-intent-experience-layer' ||
    system.constructionReady
  ) issueIds.push('identity-or-status-mismatch');
  if (new Set(itemIds).size !== itemIds.length || itemIds.some((id) => !id.trim())) {
    issueIds.push('item-identity-invalid');
  }
  if (
    openingItems.length !== sourceOpeningIds.size ||
    openingIds.some((openingId) => !openingId || !sourceOpeningIds.has(openingId)) ||
    new Set(openingIds).size !== sourceOpeningIds.size
  ) issueIds.push('plan-opening-coverage-mismatch');
  if (requiredCategories.some((category) => !system.items.some((candidate) => candidate.category === category))) {
    issueIds.push('experience-category-missing');
  }
  if (
    system.items.some(
      (candidate) =>
        candidate.constructionReady ||
        candidate.placement.widthIn <= 0 ||
        candidate.placement.depthIn <= 0 ||
        candidate.placement.renderHeightIn <= 0 ||
        candidate.placement.xIn < 0 ||
        candidate.placement.yIn < 0 ||
        candidate.placement.xIn + candidate.placement.widthIn > footprint.widthIn ||
        candidate.placement.yIn + candidate.placement.depthIn > footprint.depthIn ||
        !candidate.reviewNote.trim()
    )
  ) issueIds.push('item-placement-or-boundary-invalid');
  if (
    !system.items.some(
      (candidate) =>
        candidate.id === 'opening-window-daughter-suite' &&
        candidate.chapterId === 'daughter-sleep-zone' &&
        candidate.sourceOpeningId === 'window-daughter-suite'
    ) ||
    !system.items.some(
      (candidate) => candidate.id === 'furnishing-daughter-bed' && candidate.chapterId === 'daughter-sleep-zone'
    )
  ) issueIds.push('daughter-suite-experience-coverage-missing');

  return {
    issueIds: issueIds.sort(),
    isSafeForExperienceReview: issueIds.length === 0,
    constructionReady: false
  };
}
