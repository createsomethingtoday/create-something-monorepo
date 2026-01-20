/**
 * Arena Geometry Module
 *
 * Defines the physical layout of the arena:
 * - Wall segments (perimeter, seating sections, obstacles)
 * - Gate positions (entry/exit points)
 * - Target zones (seats, concessions, exits)
 *
 * Coordinates match the original SVG viewBox: 0-1200 x 0-900
 * with some offset for surrounding areas.
 */

/** Wall segment definition */
export interface WallSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

/** Target zone definition */
export interface TargetZone {
	x: number;
	y: number;
	radius: number;
	weight: number; // Higher weight = more agents target this
}

/** Gate definition */
export interface Gate {
	id: string;
	x: number;
	y: number;
	width: number;
	direction: 'north' | 'south' | 'east' | 'west';
}

// Arena dimensions (matching expanded SVG viewBox)
const ARENA_WIDTH = 1200;
const ARENA_HEIGHT = 900;
const CENTER_X = ARENA_WIDTH / 2;
const CENTER_Y = ARENA_HEIGHT / 2;

// Arena ellipse parameters
const ARENA_RX = 380; // Horizontal radius
const ARENA_RY = 280; // Vertical radius

/**
 * Generate arena perimeter wall segments
 * Approximates the elliptical arena with line segments
 */
function generateArenaPerimeter(): WallSegment[] {
	const segments: WallSegment[] = [];
	const numSegments = 32;

	for (let i = 0; i < numSegments; i++) {
		const angle1 = (i / numSegments) * Math.PI * 2;
		const angle2 = ((i + 1) / numSegments) * Math.PI * 2;

		segments.push({
			x1: CENTER_X + Math.cos(angle1) * ARENA_RX,
			y1: CENTER_Y + Math.sin(angle1) * ARENA_RY,
			x2: CENTER_X + Math.cos(angle2) * ARENA_RX,
			y2: CENTER_Y + Math.sin(angle2) * ARENA_RY
		});
	}

	return segments;
}

/**
 * Generate court/center area walls
 */
function generateCourtWalls(): WallSegment[] {
	// Court bounds (300, 220) to (500, 380)
	return [
		{ x1: 300, y1: 220, x2: 500, y2: 220 }, // Top
		{ x1: 500, y1: 220, x2: 500, y2: 380 }, // Right
		{ x1: 500, y1: 380, x2: 300, y2: 380 }, // Bottom
		{ x1: 300, y1: 380, x2: 300, y2: 220 } // Left
	];
}

/**
 * Generate seating section dividers
 */
function generateSectionDividers(): WallSegment[] {
	const segments: WallSegment[] = [];

	// Radial dividers for seating sections
	for (let i = 0; i < 12; i++) {
		const angle = (i * 30 * Math.PI) / 180;
		segments.push({
			x1: CENTER_X + Math.cos(angle) * 180,
			y1: CENTER_Y + Math.sin(angle) * 130,
			x2: CENTER_X + Math.cos(angle) * 320,
			y2: CENTER_Y + Math.sin(angle) * 240
		});
	}

	return segments;
}

/**
 * Get all wall segments
 */
export function getWallSegments(): WallSegment[] {
	return [
		...generateArenaPerimeter(),
		...generateCourtWalls()
		// Note: Section dividers omitted to allow agent flow
	];
}

/**
 * Gate definitions
 */
export const gates: Gate[] = [
	{ id: 'north', x: CENTER_X, y: 35, width: 60, direction: 'north' },
	{ id: 'south', x: CENTER_X, y: 575, width: 60, direction: 'south' },
	{ id: 'west', x: 35, y: CENTER_Y, width: 40, direction: 'west' },
	{ id: 'east', x: 785, y: CENTER_Y, width: 40, direction: 'east' }
];

/**
 * Target zone definitions by scenario
 */
const scenarioTargets: Record<number, TargetZone[]> = {
	// 0: Gate crowding - entering
	0: [
		{ x: CENTER_X, y: 80, radius: 80, weight: 1.0 }, // North gate
		{ x: CENTER_X - 100, y: 120, radius: 60, weight: 0.5 }, // Spread left
		{ x: CENTER_X + 100, y: 120, radius: 60, weight: 0.5 } // Spread right
	],

	// 1: VIP arrival
	1: [
		{ x: CENTER_X, y: 560, radius: 50, weight: 1.0 }, // South VIP entrance
		{ x: CENTER_X, y: CENTER_Y, radius: 100, weight: 0.3 } // VIP suites area
	],

	// 2: Halftime - dispersing to concessions
	2: [
		{ x: 200, y: 180, radius: 60, weight: 1.0 }, // Concession NW
		{ x: 600, y: 180, radius: 60, weight: 1.0 }, // Concession NE
		{ x: 200, y: 420, radius: 60, weight: 1.0 }, // Concession SW
		{ x: 600, y: 420, radius: 60, weight: 1.0 }, // Concession SE
		{ x: CENTER_X, y: 100, radius: 40, weight: 0.5 }, // Restrooms N
		{ x: CENTER_X, y: 500, radius: 40, weight: 0.5 } // Restrooms S
	],

	// 3: Weather incoming - sheltering
	3: [
		{ x: 100, y: 200, radius: 100, weight: 1.0 }, // Covered area NW
		{ x: 700, y: 200, radius: 100, weight: 1.0 }, // Covered area NE
		{ x: CENTER_X, y: CENTER_Y, radius: 150, weight: 0.5 } // Stay inside
	],

	// 4: Emergency - evacuating
	4: [
		{ x: CENTER_X, y: 600, radius: 100, weight: 1.5 }, // South exit (primary)
		{ x: CENTER_X, y: 50, radius: 80, weight: 1.0 }, // North exit
		{ x: 50, y: CENTER_Y, radius: 60, weight: 0.8 }, // West exit
		{ x: 750, y: CENTER_Y, radius: 60, weight: 0.8 } // East exit
	],

	// 5: Game end - exiting
	5: [
		{ x: CENTER_X, y: 50, radius: 100, weight: 1.0 }, // North exit
		{ x: CENTER_X, y: 600, radius: 100, weight: 1.0 }, // South exit
		{ x: 50, y: CENTER_Y, radius: 80, weight: 0.7 }, // West exit
		{ x: 750, y: CENTER_Y, radius: 80, weight: 0.7 } // East exit
	],

	// 6: Overnight - maintenance
	6: [
		{ x: CENTER_X, y: CENTER_Y, radius: 200, weight: 0.3 }, // Central area
		{ x: 200, y: 200, radius: 80, weight: 0.2 }, // Patrol point 1
		{ x: 600, y: 200, radius: 80, weight: 0.2 }, // Patrol point 2
		{ x: 200, y: 400, radius: 80, weight: 0.2 }, // Patrol point 3
		{ x: 600, y: 400, radius: 80, weight: 0.2 } // Patrol point 4
	]
};

/**
 * Get target zones for a scenario
 */
export function getScenarioTargets(scenarioIndex: number): TargetZone[] {
	return scenarioTargets[scenarioIndex] || scenarioTargets[0];
}

/**
 * Spawn zone definitions by crowd flow type
 */
export interface SpawnZone {
	x: number;
	y: number;
	width: number;
	height: number;
}

const spawnZones: Record<string, SpawnZone[]> = {
	entering: [
		{ x: CENTER_X - 200, y: -100, width: 400, height: 100 }, // North parking approach
		{ x: -100, y: 100, width: 100, height: 200 }, // West parking
		{ x: ARENA_WIDTH, y: 100, width: 100, height: 200 } // East parking
	],

	vip: [{ x: CENTER_X - 50, y: ARENA_HEIGHT, width: 100, height: 50 }],

	dispersing: [
		{ x: CENTER_X - 150, y: CENTER_Y - 100, width: 300, height: 200 } // Seating area
	],

	sheltering: [
		{ x: 100, y: 100, width: ARENA_WIDTH - 200, height: ARENA_HEIGHT - 200 } // Whole arena
	],

	evacuating: [
		{ x: CENTER_X + 50, y: CENTER_Y + 50, width: 200, height: 150 } // Section 112 area
	],

	exiting: [
		{ x: CENTER_X - 200, y: CENTER_Y - 150, width: 400, height: 300 } // Seating area
	],

	empty: [
		{ x: 200, y: 200, width: 400, height: 200 } // Minimal maintenance area
	]
};

/**
 * Get spawn zones for a crowd flow type
 */
export function getSpawnZones(crowdFlow: string): SpawnZone[] {
	return spawnZones[crowdFlow] || spawnZones['dispersing'];
}

/**
 * Check if a point is inside the arena bounds
 */
export function isInsideArena(x: number, y: number): boolean {
	// Check if point is inside the ellipse
	const dx = (x - CENTER_X) / ARENA_RX;
	const dy = (y - CENTER_Y) / ARENA_RY;
	return dx * dx + dy * dy <= 1;
}

/**
 * Get arena center coordinates
 */
export function getArenaCenter(): { x: number; y: number } {
	return { x: CENTER_X, y: CENTER_Y };
}

/**
 * Get arena dimensions
 */
export function getArenaDimensions(): {
	width: number;
	height: number;
	rx: number;
	ry: number;
} {
	return {
		width: ARENA_WIDTH,
		height: ARENA_HEIGHT,
		rx: ARENA_RX,
		ry: ARENA_RY
	};
}
