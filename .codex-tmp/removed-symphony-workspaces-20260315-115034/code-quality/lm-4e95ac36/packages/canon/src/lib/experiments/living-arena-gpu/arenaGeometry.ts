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

// Arena dimensions (800x600 matching our simulation space)
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const CENTER_X = 400;
const CENTER_Y = 300;

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
 * Generate court/center area walls (with gaps for player access)
 * Court bounds (300, 220) to (500, 380)
 */
function generateCourtWalls(): WallSegment[] {
	return [
		// Top wall (full)
		{ x1: 300, y1: 220, x2: 500, y2: 220 },
		// Right wall with gap for away bench
		{ x1: 500, y1: 220, x2: 500, y2: 260 },
		{ x1: 500, y1: 340, x2: 500, y2: 380 },
		// Bottom wall (full - scorer's table side)
		{ x1: 500, y1: 380, x2: 300, y2: 380 },
		// Left wall with gap for home bench
		{ x1: 300, y1: 380, x2: 300, y2: 340 },
		{ x1: 300, y1: 260, x2: 300, y2: 220 }
	];
}

/**
 * Generate bench walls (keep fans away from player areas)
 */
function generateBenchWalls(): WallSegment[] {
	return [
		// Home bench barrier (left side)
		{ x1: 275, y1: 260, x2: 275, y2: 340 },
		// Away bench barrier (right side)
		{ x1: 525, y1: 260, x2: 525, y2: 340 }
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
 * Note: Arena perimeter is handled by ellipse math in shader, not wall segments
 */
export function getWallSegments(): WallSegment[] {
	// Internal obstacles - court and bench walls
	// Perimeter is handled by shader's ellipse boundary
	return [
		...generateCourtWalls(),
		...generateBenchWalls()
	];
}

/**
 * Gate definitions (800x600 coordinates)
 */
export const gates: Gate[] = [
	{ id: 'north', x: CENTER_X, y: 25, width: 70, direction: 'north' },
	{ id: 'south', x: CENTER_X, y: 575, width: 70, direction: 'south' },
	{ id: 'west', x: 25, y: CENTER_Y, width: 50, direction: 'west' },
	{ id: 'east', x: 775, y: CENTER_Y, width: 50, direction: 'east' }
];

/**
 * Target zone definitions by scenario (800x600 coordinates)
 */
const scenarioTargets: Record<number, TargetZone[]> = {
	// 0: Gate crowding - entering through north
	0: [
		{ x: CENTER_X, y: 100, radius: 60, weight: 1.0 }, // Moving into arena
		{ x: CENTER_X - 80, y: 150, radius: 50, weight: 0.5 }, // Spread left
		{ x: CENTER_X + 80, y: 150, radius: 50, weight: 0.5 } // Spread right
	],

	// 1: VIP arrival - south entrance
	1: [
		{ x: CENTER_X, y: 500, radius: 40, weight: 1.0 }, // South VIP entrance
		{ x: CENTER_X, y: CENTER_Y, radius: 80, weight: 0.3 } // VIP area
	],

	// 2: Halftime - dispersing to concessions/restrooms
	2: [
		{ x: 150, y: 150, radius: 40, weight: 1.0 }, // Food NW
		{ x: 650, y: 150, radius: 40, weight: 1.0 }, // Food NE
		{ x: 150, y: 450, radius: 40, weight: 1.0 }, // Food SW
		{ x: 650, y: 450, radius: 40, weight: 1.0 }, // Food SE
		{ x: 300, y: 80, radius: 30, weight: 0.6 }, // Restroom N-left
		{ x: 500, y: 80, radius: 30, weight: 0.6 }, // Restroom N-right
		{ x: 300, y: 520, radius: 30, weight: 0.6 }, // Restroom S-left
		{ x: 500, y: 520, radius: 30, weight: 0.6 } // Restroom S-right
	],

	// 3: Weather incoming - sheltering inside
	3: [
		{ x: 150, y: 200, radius: 80, weight: 1.0 }, // Covered area NW
		{ x: 650, y: 200, radius: 80, weight: 1.0 }, // Covered area NE
		{ x: CENTER_X, y: CENTER_Y, radius: 120, weight: 0.5 } // Center
	],

	// 4: Emergency - evacuating to all exits
	4: [
		{ x: CENTER_X, y: 580, radius: 60, weight: 1.5 }, // South exit (primary)
		{ x: CENTER_X, y: 20, radius: 60, weight: 1.0 }, // North exit
		{ x: 20, y: CENTER_Y, radius: 40, weight: 0.8 }, // West exit
		{ x: 780, y: CENTER_Y, radius: 40, weight: 0.8 } // East exit
	],

	// 5: Game end - everyone exiting
	5: [
		{ x: CENTER_X, y: 20, radius: 80, weight: 1.0 }, // North exit
		{ x: CENTER_X, y: 580, radius: 80, weight: 1.0 }, // South exit
		{ x: 20, y: CENTER_Y, radius: 50, weight: 0.7 }, // West exit
		{ x: 780, y: CENTER_Y, radius: 50, weight: 0.7 } // East exit
	],

	// 6: Overnight - maintenance patrol
	6: [
		{ x: CENTER_X, y: CENTER_Y, radius: 150, weight: 0.3 }, // Court area
		{ x: 150, y: 150, radius: 60, weight: 0.2 }, // Patrol NW
		{ x: 650, y: 150, radius: 60, weight: 0.2 }, // Patrol NE
		{ x: 150, y: 450, radius: 60, weight: 0.2 }, // Patrol SW
		{ x: 650, y: 450, radius: 60, weight: 0.2 } // Patrol SE
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
		{ x: CENTER_X - 100, y: -50, width: 200, height: 50 }, // North parking approach
		{ x: -50, y: CENTER_Y - 50, width: 50, height: 100 }, // West parking
		{ x: ARENA_WIDTH, y: CENTER_Y - 50, width: 50, height: 100 } // East parking
	],

	vip: [{ x: CENTER_X - 40, y: ARENA_HEIGHT, width: 80, height: 30 }],

	dispersing: [
		{ x: CENTER_X - 120, y: CENTER_Y - 80, width: 240, height: 160 } // Seating area
	],

	sheltering: [
		{ x: 80, y: 80, width: ARENA_WIDTH - 160, height: ARENA_HEIGHT - 160 } // Inside arena
	],

	evacuating: [
		{ x: CENTER_X + 40, y: CENTER_Y + 40, width: 150, height: 100 } // Section area
	],

	exiting: [
		{ x: CENTER_X - 150, y: CENTER_Y - 100, width: 300, height: 200 } // Seating area
	],

	empty: [
		{ x: 300, y: 220, width: 200, height: 160 } // Court area for maintenance
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
