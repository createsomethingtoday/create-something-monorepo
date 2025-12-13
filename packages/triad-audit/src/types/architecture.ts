/**
 * Architectural Audit Types
 *
 * Subtractive Triad applied to physical space:
 * - DRY (Implementation): "Have I built this room before?" → Unify
 * - Rams (Artifact): "Does this space earn its existence?" → Remove
 * - Heidegger (System): "Does this serve dwelling?" → Reconnect
 *
 * "Weniger, aber besser" - Dieter Rams
 * Applied to architecture: Every room, wall, door must justify its existence.
 *
 * @see Heidegger's "Building Dwelling Thinking" (1951)
 */

import type { Severity, Violation } from './index.js';

// =============================================================================
// SPATIAL PRIMITIVES
// =============================================================================

/**
 * A point in 2D space
 * All coordinates in feet from southwest corner
 */
export interface Point {
	x: number;
	y: number;
}

/**
 * A room or space within the dwelling
 */
export interface Room {
	id: string;
	name: string;
	zone: ThresholdZone;
	bounds: {
		x: number;
		y: number;
		width: number;
		depth: number;
	};
	sf: number; // Square footage
	doors: string[]; // IDs of doors providing access
	adjacentTo?: string[]; // IDs of adjacent rooms
}

/**
 * A door or opening
 */
export interface Door {
	id: string;
	position: Point;
	width: number;
	direction: 'N' | 'S' | 'E' | 'W';
	type: 'entry' | 'interior' | 'exterior';
	connects: [string, string]; // [from room/exterior, to room]
}

/**
 * A wall segment
 */
export interface Wall {
	id: string;
	start: Point;
	end: Point;
	type: 'exterior' | 'interior' | 'glass';
}

// =============================================================================
// HEIDEGGER'S THRESHOLD ZONES
// =============================================================================

/**
 * Threshold Zones (Heidegger)
 *
 * Dwelling occurs through graduated transition from outer to inner world.
 * Each zone represents a phenomenological register of being-at-home.
 *
 * OUTER → SERVICE → PUBLIC → PRIVATE → OPEN
 *
 * - OUTER: Kennel, parking, exterior covered spaces
 * - SERVICE: Utility rooms supporting daily practices (dog wash, laundry)
 * - PUBLIC: Guest-accessible spaces (entry, guest bath)
 * - PRIVATE: Personal/family spaces (bedrooms, primary bath)
 * - OPEN: Core dwelling space (kitchen/dining/living)
 */
export type ThresholdZone = 'outer' | 'service' | 'public' | 'private' | 'open';

/**
 * Zone hierarchy for validation
 * Entry path should follow this progression (can skip, but not reverse)
 */
export const ZONE_HIERARCHY: ThresholdZone[] = ['outer', 'service', 'public', 'private', 'open'];

/**
 * Zone adjacency rules
 * Which zones can be directly accessed from which
 */
export const ZONE_ADJACENCY: Record<ThresholdZone, ThresholdZone[]> = {
	outer: ['service', 'public'],
	service: ['outer', 'public', 'private', 'open'],
	public: ['outer', 'service', 'open', 'private'],
	private: ['service', 'public', 'open', 'private'],
	open: ['service', 'public', 'private']
};

// =============================================================================
// FLOOR PLAN DEFINITION
// =============================================================================

/**
 * Complete floor plan definition
 */
export interface FloorPlan {
	name: string;
	dimensions: {
		width: number;
		depth: number;
		ceiling: number;
	};
	rooms: Room[];
	doors: Door[];
	walls: Wall[];
	entry: string; // ID of entry door
	columns?: Point[];
	materials?: string[];
}

// =============================================================================
// AUDIT RESULTS
// =============================================================================

/**
 * DRY Metrics for Architecture
 * "Have I built this before?"
 */
export interface ArchitectureDRYMetrics {
	duplicateRooms: { type: string; instances: string[] }[];
	redundantWalls: { id: string; reason: string }[];
	score: number;
	violations: Violation[];
}

/**
 * Rams Metrics for Architecture
 * "Does this earn its existence?"
 */
export interface ArchitectureRamsMetrics {
	deadEndRooms: { id: string; reason: string }[];
	unusedSpace: { location: Point; sf: number }[];
	oversizedCirculation: { hallwaySF: number; dwellingSF: number; ratio: number }[];
	score: number;
	violations: Violation[];
}

/**
 * Heidegger Metrics for Architecture
 * "Does this serve dwelling?"
 */
export interface ArchitectureHeideggerMetrics {
	accessViolations: AccessViolation[];
	zoneCoherence: ZoneCoherenceResult;
	flowAnalysis: FlowAnalysis;
	score: number;
	violations: Violation[];
}

/**
 * Access violation - path through inappropriate space
 */
export interface AccessViolation {
	from: string;
	to: string;
	passesThrough: string;
	reason: string;
	severity: Severity;
}

/**
 * Zone coherence analysis
 */
export interface ZoneCoherenceResult {
	entryZone: ThresholdZone;
	isValid: boolean;
	violations: {
		room: string;
		expectedZones: ThresholdZone[];
		actualZone: ThresholdZone;
		adjacentTo: string[];
	}[];
}

/**
 * Phenomenological flow analysis
 */
export interface FlowAnalysis {
	entrySequence: string[]; // Path from entry to open dwelling
	privateAccessible: boolean; // Can reach private zones from entry
	serviceAccessible: boolean; // Can reach service zones
	dwellingReachable: boolean; // Can reach open dwelling
	pathAnalysis: {
		from: string;
		to: string;
		path: string[];
		zonesTraversed: ThresholdZone[];
		isValid: boolean;
	}[];
}

/**
 * Complete Architectural Audit Result
 */
export interface ArchitectureAuditResult {
	timestamp: string;
	project: string;
	floorPlan: string;
	scores: {
		dry: number;
		rams: number;
		heidegger: number;
		overall: number;
	};
	dry: ArchitectureDRYMetrics;
	rams: ArchitectureRamsMetrics;
	heidegger: ArchitectureHeideggerMetrics;
	summary: {
		totalViolations: number;
		criticalCount: number;
		highCount: number;
		mediumCount: number;
		lowCount: number;
	};
	ascii?: string;
}

// =============================================================================
// BUILDER HELPERS
// =============================================================================

/**
 * Create a room with defaults
 */
export function createRoom(
	id: string,
	name: string,
	zone: ThresholdZone,
	x: number,
	y: number,
	width: number,
	depth: number
): Room {
	return {
		id,
		name,
		zone,
		bounds: { x, y, width, depth },
		sf: width * depth,
		doors: []
	};
}

/**
 * Create a door connecting two spaces
 */
export function createDoor(
	id: string,
	x: number,
	y: number,
	width: number,
	direction: Door['direction'],
	type: Door['type'],
	from: string,
	to: string
): Door {
	return {
		id,
		position: { x, y },
		width,
		direction,
		type,
		connects: [from, to]
	};
}

/**
 * Create a wall segment
 */
export function createWall(
	id: string,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	type: Wall['type'] = 'interior'
): Wall {
	return {
		id,
		start: { x: x1, y: y1 },
		end: { x: x2, y: y2 },
		type
	};
}
