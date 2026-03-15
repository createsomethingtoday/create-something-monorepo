/**
 * Miesian Family Pavilion
 * Johnson Residence · Grandview, Texas
 *
 * 65′-0″ × 35′-0″ · 12′-0″ Ceilings · 20K5 Joists @ 24″ O.C.
 *
 * This example demonstrates the Architectural Triad Audit
 * validating threshold zone flow and access patterns.
 *
 * "Weniger, aber besser" - Dieter Rams
 */

import type { FloorPlan, Room, Door } from '../types/architecture.js';
import { createRoom, createDoor } from '../types/architecture.js';
import { collectArchitectureHeideggerMetrics, generateFlowASCII } from '../collectors/architecture-collector.js';

// =============================================================================
// FLOOR PLAN DEFINITION (Corrected Layout)
// =============================================================================

/**
 * East side restacking (south to north):
 *   y=0-6:   Dog Utility (kennel access)
 *   y=6-13:  Primary Bath (living access, private)
 *   y=13-20: Hallway/Entry zone (entry arrives HERE)
 *   y=20-35: BR3 (private)
 */
export const MIESIAN_PAVILION: FloorPlan = {
	name: 'Miesian Family Pavilion',
	dimensions: {
		width: 65,
		depth: 35,
		ceiling: 12
	},
	rooms: [
		// PRIVATE ZONE - Bedrooms (north, y=20-35)
		createRoom('br1', 'Bedroom 1', 'private', 0, 20, 18, 15),
		createRoom('br2', 'Bedroom 2 (Primary)', 'private', 18, 20, 21, 15),
		createRoom('br3', 'Bedroom 3', 'private', 39, 20, 26, 15),

		// SERVICE ZONE - West side
		createRoom('pantry', 'Pantry', 'service', 0, 0, 12, 6),
		createRoom('guest-bath', 'Guest Bath', 'public', 0, 6, 12, 9),
		createRoom('laundry', 'Laundry', 'service', 0, 15, 10, 5),

		// SERVICE ZONE - East side (CORRECTED: bath is SOUTH of entry zone)
		createRoom('dog-utility', 'Dog Utility', 'service', 55, 0, 10, 6),
		createRoom('primary-bath', 'Primary Bath', 'private', 55, 6, 10, 7), // y=6-13

		// PUBLIC ZONE - Hallway (y=13-20)
		createRoom('hallway', 'Hallway', 'public', 12, 13, 43, 7),

		// OPEN ZONE - Living spaces (south center)
		createRoom('kitchen', 'Kitchen', 'open', 12, 0, 15, 13),
		createRoom('dining', 'Dining', 'open', 27, 0, 13, 13),
		createRoom('living', 'Living', 'open', 40, 0, 15, 13)
	],
	doors: [
		// Entry threshold (east - arrival sequence)
		createDoor('entry', 65, 17, 3, 'W', 'entry', 'exterior', 'hallway'),
		createDoor('kennel-access', 65, 3, 2.5, 'W', 'exterior', 'exterior', 'dog-utility'),

		// Private zone access (from hallway)
		createDoor('br1-door', 9, 20, 2.5, 'N', 'interior', 'hallway', 'br1'),
		createDoor('br2-door', 28, 20, 2.5, 'N', 'interior', 'hallway', 'br2'),
		createDoor('br3-door', 48, 20, 2.5, 'N', 'interior', 'hallway', 'br3'),

		// Service access - West
		createDoor('pantry-door', 8, 6, 2.5, 'N', 'interior', 'kitchen', 'pantry'),
		createDoor('guest-bath-door', 8, 15, 2.5, 'N', 'interior', 'hallway', 'guest-bath'),
		createDoor('laundry-door', 6, 15, 2, 'E', 'interior', 'hallway', 'laundry'),

		// Service access - East (bath now at y=6-13)
		createDoor('dog-utility-door', 55, 4, 2.5, 'W', 'interior', 'living', 'dog-utility'),
		createDoor('primary-bath-door', 55, 9, 2.5, 'W', 'interior', 'living', 'primary-bath'),

		// Open flow (no doors, just openings)
		createDoor('hallway-to-living', 33, 13, 5, 'S', 'interior', 'hallway', 'living')
	],
	walls: [], // Simplified - walls can be derived from rooms
	entry: 'entry',
	columns: [
		{ x: 10, y: 3 },
		{ x: 32.5, y: 3 },
		{ x: 55, y: 3 },
		{ x: 10, y: 32 },
		{ x: 32.5, y: 32 },
		{ x: 55, y: 32 }
	],
	materials: [
		'Polished Concrete',
		'Western Red Cedar',
		'Black Steel',
		'Floor-to-Ceiling Glass',
		'White Drywall',
		'Texas Limestone',
		'TPO Membrane'
	]
};

// =============================================================================
// BROKEN LAYOUT (Entry through bathroom)
// =============================================================================

/**
 * This layout demonstrates the bug we caught:
 * Entry door opens into Primary Bath instead of Hallway
 */
export const BROKEN_PAVILION: FloorPlan = {
	...MIESIAN_PAVILION,
	name: 'Miesian Family Pavilion (BROKEN)',
	rooms: [
		...MIESIAN_PAVILION.rooms.filter((r) => r.id !== 'primary-bath'),
		// BROKEN: Primary Bath at y=13-20 blocks entry
		createRoom('primary-bath', 'Primary Bath', 'private', 55, 13, 10, 7)
	],
	doors: [
		...MIESIAN_PAVILION.doors.filter((d) => d.id !== 'entry' && d.id !== 'primary-bath-door'),
		// BROKEN: Entry opens into bathroom!
		createDoor('entry', 65, 17, 3, 'W', 'entry', 'exterior', 'primary-bath'),
		createDoor('primary-bath-door', 55, 16, 2.5, 'W', 'interior', 'hallway', 'primary-bath')
	]
};

// =============================================================================
// RUN AUDIT
// =============================================================================

export function runArchitectureAudit(floorPlan: FloorPlan = MIESIAN_PAVILION) {
	console.log(`\n╔${'═'.repeat(58)}╗`);
	console.log(`║  SUBTRACTIVE TRIAD: ARCHITECTURE AUDIT${' '.repeat(18)}║`);
	console.log(`╠${'═'.repeat(58)}╣`);
	console.log(`║  ${floorPlan.name.padEnd(56)}║`);
	console.log(`╚${'═'.repeat(58)}╝\n`);

	const result = collectArchitectureHeideggerMetrics(floorPlan);

	// Print violations
	if (result.violations.length > 0) {
		console.log('VIOLATIONS:');
		console.log('─'.repeat(40));
		for (const v of result.violations) {
			const icon =
				v.severity === 'critical'
					? '🔴'
					: v.severity === 'high'
						? '🟠'
						: v.severity === 'medium'
							? '🟡'
							: '🟢';
			console.log(`${icon} [${v.severity.toUpperCase()}] ${v.message}`);
			console.log(`   → ${v.suggestion}`);
			console.log('');
		}
	} else {
		console.log('✓ No violations detected\n');
	}

	// Print flow analysis
	const roomMap = new Map(floorPlan.rooms.map((r) => [r.id, r]));
	console.log(generateFlowASCII(result.flowAnalysis, roomMap));

	// Print score
	console.log('\n' + '─'.repeat(40));
	console.log(`HEIDEGGER SCORE: ${result.score}/10`);
	console.log(`Zone Coherence: ${result.zoneCoherence.isValid ? '✓ Valid' : '✗ Invalid'}`);

	return result;
}

// =============================================================================
// DEMO
// =============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
	console.log('\n=== CORRECTED LAYOUT ===');
	runArchitectureAudit(MIESIAN_PAVILION);

	console.log('\n\n=== BROKEN LAYOUT (Entry through bathroom) ===');
	runArchitectureAudit(BROKEN_PAVILION);
}
