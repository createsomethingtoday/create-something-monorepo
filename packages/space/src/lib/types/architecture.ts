/**
 * Architecture Types
 *
 * Data structures for CREATE SOMETHING floor plan visualization.
 * Based on Heidegger threshold zone theory.
 */

export type ThresholdZone = 'outer' | 'service' | 'public' | 'private' | 'open';

export interface Zone {
	x: number;
	y: number;
	width: number;
	height: number;
	type: ThresholdZone;
}

export interface Wall {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	exterior?: boolean;
}

export interface Room {
	x: number;
	y: number;
	name: string;
	small?: boolean;
}

export interface Column {
	x: number;
	y: number;
}

export interface EntryPoint {
	x: number;
	y: number;
}

export interface Overhang {
	x: number;
	y: number;
	width: number;
	height: number;
	label?: string;
}

export interface CostLineItem {
	category: string;
	description: string;
	estimate: number; // USD
	notes?: string;
}

export interface MaterialsSummary {
	totalSF: number;
	costPerSF: number;
	lineItems: CostLineItem[];
	assumptions?: string[];
	lastUpdated?: string;
}

// ============================================================================
// SECTION VIEW TYPES
// ============================================================================

export type SectionZone = 'ground' | 'floor' | 'wall' | 'ceiling' | 'roof' | 'void';

export interface SectionElement {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	type: 'wall' | 'floor' | 'ceiling' | 'roof' | 'grade';
	filled?: boolean; // Solid fill for cut elements
}

export interface SectionLabel {
	x: number;
	y: number;
	text: string;
	small?: boolean;
}

export interface SectionDimension {
	x: number;
	y1: number;
	y2: number;
	label: string;
}

export interface SectionData {
	name: string;
	cutLine?: string; // e.g., "A-A" or "Looking North"
	width: number; // Section width in feet
	height: number; // Section height in feet
	groundLevel: number; // Y position of ground (0 = bottom)

	elements: SectionElement[];
	labels: SectionLabel[];
	dimensions?: SectionDimension[];
}

// ============================================================================
// ELEVATION VIEW TYPES
// ============================================================================

export interface ElevationElement {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	type: 'wall' | 'roof' | 'window' | 'door' | 'column' | 'grade';
	filled?: boolean;
}

export interface ElevationWindow {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ElevationData {
	name: string;
	direction: 'north' | 'south' | 'east' | 'west';
	width: number;
	height: number;
	groundLevel: number;

	elements: ElevationElement[];
	windows?: ElevationWindow[];
	labels?: SectionLabel[]; // Reuse section labels
	dimensions?: SectionDimension[];
}

// ============================================================================
// SITE PLAN TYPES
// ============================================================================

export interface SiteFeature {
	x: number;
	y: number;
	width: number;
	height: number;
	type: 'building' | 'driveway' | 'patio' | 'pool' | 'garden' | 'tree';
	label?: string;
}

export interface SetbackLine {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	label?: string;
}

export interface SitePlanData {
	name: string;
	width: number; // Property width in feet
	depth: number; // Property depth in feet

	propertyLines: Wall[]; // Reuse Wall type for property boundary
	setbacks?: SetbackLine[];
	features: SiteFeature[];
	labels?: SectionLabel[];
}

// ============================================================================
// ROOF PLAN TYPES
// ============================================================================

export interface RoofSlope {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
}

export interface RoofDrain {
	x: number;
	y: number;
}

export interface RoofPlanData {
	name: string;
	width: number;
	depth: number;

	outline: Wall[]; // Roof edge
	slopes: RoofSlope[];
	drains?: RoofDrain[];
	overhangs?: Overhang[];
	labels?: SectionLabel[];
}

// ============================================================================
// MEP SYSTEMS TYPES (Mechanical, Electrical, Plumbing)
// ============================================================================

export type HVACEquipmentType = 'air_handler' | 'condenser' | 'mini_split' | 'thermostat';
export type PlumbingFixtureType = 'water_heater' | 'main_shutoff' | 'hose_bib';
export type ElectricalEquipmentType = 'panel' | 'subpanel' | 'meter';

export interface HVACEquipment {
	x: number;
	y: number;
	type: HVACEquipmentType;
	label?: string;
}

export interface HVACZone {
	x: number;
	y: number;
	width: number;
	height: number;
	name: string;
}

export interface DuctRun {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	type: 'supply' | 'return';
}

export interface PlumbingFixture {
	x: number;
	y: number;
	type: PlumbingFixtureType;
	label?: string;
}

export interface PipeRun {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	type: 'supply' | 'drain' | 'vent';
}

export interface ElectricalEquipment {
	x: number;
	y: number;
	type: ElectricalEquipmentType;
	label?: string;
}

export interface CircuitZone {
	x: number;
	y: number;
	width: number;
	height: number;
	circuit: string; // e.g., "Kitchen 20A", "Bedroom 15A"
}

export interface SystemsData {
	name: string;
	width: number;
	depth: number;

	// HVAC
	hvacEquipment: HVACEquipment[];
	hvacZones?: HVACZone[];
	ducts?: DuctRun[];

	// Plumbing
	plumbingFixtures: PlumbingFixture[];
	pipes?: PipeRun[];

	// Electrical
	electricalEquipment: ElectricalEquipment[];
	circuits?: CircuitZone[];

	labels?: SectionLabel[];
}

export type DoorOrientation = 'horizontal' | 'vertical';

export interface Door {
	x: number;
	y: number;
	width: number;
	orientation: DoorOrientation;
}

export interface FloorPlanWindow {
	x: number;
	y: number;
	width: number;
	orientation: DoorOrientation; // Which way the wall runs
}

export interface FloorPlanData {
	name: string;
	location?: string;
	width: number;
	depth: number;
	bedrooms?: number;
	bathrooms?: number;
	features?: string;

	zones: Zone[];
	walls: Wall[];
	rooms: Room[];
	doors?: Door[];
	windows?: FloorPlanWindow[];
	columns?: Column[];
	overhangs?: Overhang[];
	entry?: EntryPoint;
	materials?: MaterialsSummary;
}

/**
 * Create a zone helper
 */
export function zone(
	x: number,
	y: number,
	width: number,
	height: number,
	type: ThresholdZone
): Zone {
	return { x, y, width, height, type };
}

/**
 * Create a wall helper
 */
export function wall(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	exterior: boolean = false
): Wall {
	return { x1, y1, x2, y2, exterior };
}

/**
 * Create a room label helper
 */
export function room(x: number, y: number, name: string, small: boolean = false): Room {
	return { x, y, name, small };
}

/**
 * Create a door helper
 * x, y: door position (center of opening)
 * width: door width in feet
 * orientation: 'horizontal' or 'vertical' (which way the wall runs)
 */
export function door(
	x: number,
	y: number,
	width: number,
	orientation: DoorOrientation = 'horizontal'
): Door {
	return { x, y, width, orientation };
}

/**
 * Create a window helper
 * x, y: window position (center)
 * width: window width in feet
 * orientation: 'horizontal' or 'vertical' (which way the wall runs)
 */
export function floorPlanWindow(
	x: number,
	y: number,
	width: number,
	orientation: DoorOrientation = 'vertical'
): FloorPlanWindow {
	return { x, y, width, orientation };
}

/**
 * Create an overhang helper (covered outdoor areas)
 * Rendered with dashed lines to indicate roof without walls
 */
export function overhang(
	x: number,
	y: number,
	width: number,
	height: number,
	label?: string
): Overhang {
	return { x, y, width, height, label };
}

// ============================================================================
// SECTION HELPERS
// ============================================================================

/**
 * Create a section element (wall, floor, ceiling, roof, grade)
 */
export function sectionElement(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	type: SectionElement['type'],
	filled: boolean = false
): SectionElement {
	return { x1, y1, x2, y2, type, filled };
}

/**
 * Create a section label
 */
export function sectionLabel(x: number, y: number, text: string, small: boolean = false): SectionLabel {
	return { x, y, text, small };
}

/**
 * Create a section dimension (vertical measurement)
 */
export function sectionDimension(x: number, y1: number, y2: number, label: string): SectionDimension {
	return { x, y1, y2, label };
}

// ============================================================================
// ELEVATION HELPERS
// ============================================================================

export function elevationElement(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	type: ElevationElement['type'],
	filled: boolean = false
): ElevationElement {
	return { x1, y1, x2, y2, type, filled };
}

export function elevationWindow(x: number, y: number, width: number, height: number): ElevationWindow {
	return { x, y, width, height };
}

// ============================================================================
// SITE PLAN HELPERS
// ============================================================================

export function siteFeature(
	x: number,
	y: number,
	width: number,
	height: number,
	type: SiteFeature['type'],
	label?: string
): SiteFeature {
	return { x, y, width, height, type, label };
}

export function setbackLine(x1: number, y1: number, x2: number, y2: number, label?: string): SetbackLine {
	return { x1, y1, x2, y2, label };
}

// ============================================================================
// ROOF PLAN HELPERS
// ============================================================================

export function roofSlope(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	direction: RoofSlope['direction']
): RoofSlope {
	return { x1, y1, x2, y2, direction };
}

export function roofDrain(x: number, y: number): RoofDrain {
	return { x, y };
}
