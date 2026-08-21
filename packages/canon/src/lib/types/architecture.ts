/**
 * Architecture Experiment Types
 *
 * Shared type surface used by threshold-dwelling components.
 */

export type ThresholdType = 'entry' | 'transition' | 'passage' | 'arrival';
export type CirculationMode = 'primary' | 'secondary' | 'service';
export type Season = 'summer' | 'equinox' | 'winter';
export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'evening';

type XY = { x: number; y: number };
type XYLine = { x1: number; y1: number; x2: number; y2: number };
type Rect = { x: number; y: number; width: number; height: number };
type LabeledPoint = XY & { text: string; small?: boolean };

export interface FloorPlanData {
	name: string;
	width: number;
	depth: number;
	bedrooms?: number;
	bathrooms?: number;
	features?: string;
	zones: Array<Rect & { id?: string; type: string }>;
	walls: Array<XYLine & { exterior?: boolean }>;
	columns?: XY[];
	doors?: Array<XY & { width: number; orientation: 'horizontal' | 'vertical' }>;
	windows?: Array<XY & { width: number; orientation: 'horizontal' | 'vertical' }>;
	rooms: Array<XY & { name: string; small?: boolean }>;
	entry?: XY;
	overhangs?: Array<Rect & { label?: string }>;
	materials?: {
		totalSF: number;
		costPerSF: number;
		lastUpdated?: string;
		assumptions?: string[];
		lineItems: Array<{
			category: string;
			description: string;
			estimate: number;
			notes?: string;
		}>;
	};
}

export interface CirculationData {
	name: string;
	width: number;
	depth: number;
	zones: Array<Rect & { type: string }>;
	transitions?: Array<XY & { width: number; orientation: 'horizontal' | 'vertical' }>;
	paths: Array<{ mode: CirculationMode; points: XY[] }>;
	thresholds: Array<XY & { type: ThresholdType; label: string; description?: string }>;
	labels?: LabeledPoint[];
}

export interface ElevationData {
	name: string;
	direction: 'north' | 'south' | 'east' | 'west';
	width: number;
	height: number;
	groundLevel: number;
	elements: Array<XYLine & { type: string; filled?: boolean }>;
	windows?: Array<Rect>;
	dimensions?: Array<{ x: number; y1: number; y2: number; label: string }>;
	labels?: LabeledPoint[];
}

export interface RoofPlanData {
	name: string;
	width: number;
	depth: number;
	outline: XYLine[];
	slopes: Array<
		XYLine & {
			direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
		}
	>;
	drains?: XY[];
	overhangs?: Array<Rect & { label?: string }>;
	labels?: LabeledPoint[];
}

export interface SectionData {
	name: string;
	width: number;
	height: number;
	groundLevel: number;
	elements: Array<XYLine & { type: string; filled?: boolean }>;
	dimensions?: Array<{ x: number; y1: number; y2: number; label: string }>;
	labels: Array<{ x: number; y: number; text: string; small?: boolean }>;
	cutLine?: string;
}

export interface SitePlanData {
	name: string;
	width: number;
	depth: number;
	propertyLines: XYLine[];
	setbacks?: Array<XYLine & { label?: string }>;
	features: Array<Rect & { type: string; label?: string }>;
	labels?: LabeledPoint[];
}

export interface SystemsData {
	name: string;
	width: number;
	depth: number;
	hvacZones?: Array<Rect & { name: string }>;
	circuits?: Array<Rect & { circuit: string }>;
	ducts?: Array<XYLine & { type: 'supply' | 'return' }>;
	pipes?: Array<XYLine & { type: 'supply' | 'drain' | 'vent' }>;
	hvacEquipment: Array<XY & { type: string; label?: string }>;
	plumbingFixtures: Array<XY & { type: string; label?: string }>;
	electricalEquipment: Array<XY & { type: string; label?: string }>;
	labels?: LabeledPoint[];
}

export interface LightStudyData {
	name: string;
	width: number;
	depth: number;
	latitude: number;
	orientation: number;
	sunPaths: Array<{
		season: Season;
		shadowLength: number;
		positions: Array<{
			time: TimeOfDay;
			azimuth: number;
			altitude: number;
		}>;
	}>;
	lightZones?: Array<Rect & { quality: string }>;
	glazingLocations?: Array<XY & { width: number; orientation: 'n' | 's' | 'e' | 'w' }>;
	overhangs?: Rect[];
	labels?: LabeledPoint[];
}
