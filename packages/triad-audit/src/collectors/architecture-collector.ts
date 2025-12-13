/**
 * Architecture Collector
 *
 * Subtractive Triad applied to physical space.
 *
 * Level: Heidegger (System)
 * Question: "Does this serve dwelling?"
 * Action: Reconnect
 *
 * Detects:
 * - Access violations (entry through private spaces)
 * - Zone coherence failures (threshold progression)
 * - Flow disruptions (phenomenology of movement)
 *
 * Based on Heidegger's "Building Dwelling Thinking" (1951):
 * "The bridge gathers the earth as landscape around the stream."
 * Applied: Entry gathers the dwelling as threshold zones around arrival.
 *
 * @see /packages/triad-audit/src/types/architecture.ts
 */

import type {
	FloorPlan,
	Room,
	Door,
	ThresholdZone,
	AccessViolation,
	ZoneCoherenceResult,
	FlowAnalysis,
	ArchitectureHeideggerMetrics
} from '../types/architecture.js';
import type { Violation, Severity } from '../types/index.js';
import { ZONE_HIERARCHY, ZONE_ADJACENCY } from '../types/architecture.js';

// =============================================================================
// MAIN COLLECTOR
// =============================================================================

export function collectArchitectureHeideggerMetrics(
	floorPlan: FloorPlan
): ArchitectureHeideggerMetrics {
	const violations: Violation[] = [];

	// Build room and door maps for efficient lookup
	const roomMap = new Map(floorPlan.rooms.map((r) => [r.id, r]));
	const doorMap = new Map(floorPlan.doors.map((d) => [d.id, d]));

	// Build adjacency graph from doors
	const adjacencyGraph = buildAdjacencyGraph(floorPlan);

	// 1. Check access violations (entry through private spaces)
	const accessViolations = checkAccessViolations(floorPlan, adjacencyGraph, roomMap);
	for (const av of accessViolations) {
		violations.push({
			type: 'access_violation',
			severity: av.severity,
			message: av.reason,
			file: floorPlan.name,
			suggestion: `Relocate ${av.passesThrough} or add alternative access path to ${av.to}`
		});
	}

	// 2. Check zone coherence
	const zoneCoherence = checkZoneCoherence(floorPlan, adjacencyGraph, roomMap);
	for (const zv of zoneCoherence.violations) {
		violations.push({
			type: 'zone_coherence',
			severity: 'medium',
			message: `Room "${zv.room}" (${zv.actualZone}) is adjacent to incompatible zones`,
			file: floorPlan.name,
			suggestion: `Review zone assignment or add transitional space`
		});
	}

	// 3. Analyze flow (phenomenology of movement)
	const flowAnalysis = analyzeFlow(floorPlan, adjacencyGraph, roomMap);
	if (!flowAnalysis.dwellingReachable) {
		violations.push({
			type: 'flow_broken',
			severity: 'critical',
			message: 'Cannot reach open dwelling space from entry',
			file: floorPlan.name,
			suggestion: 'Ensure entry connects to hallway/open space'
		});
	}

	// Calculate score
	const criticalPenalty = violations.filter((v) => v.severity === 'critical').length * 3;
	const highPenalty = violations.filter((v) => v.severity === 'high').length * 2;
	const mediumPenalty = violations.filter((v) => v.severity === 'medium').length * 1;
	const lowPenalty = violations.filter((v) => v.severity === 'low').length * 0.5;

	const zoneBonus = zoneCoherence.isValid ? 1 : 0;
	const flowBonus = flowAnalysis.dwellingReachable ? 1 : 0;

	const score = Math.max(
		1,
		Math.min(10, 10 - criticalPenalty - highPenalty - mediumPenalty - lowPenalty + zoneBonus + flowBonus)
	);

	return {
		accessViolations,
		zoneCoherence,
		flowAnalysis,
		score: Math.round(score * 10) / 10,
		violations
	};
}

// =============================================================================
// ADJACENCY GRAPH
// =============================================================================

type AdjacencyGraph = Map<string, Set<string>>;

function buildAdjacencyGraph(floorPlan: FloorPlan): AdjacencyGraph {
	const graph: AdjacencyGraph = new Map();

	// Initialize all rooms
	for (const room of floorPlan.rooms) {
		graph.set(room.id, new Set());
	}

	// Add 'exterior' as a pseudo-node
	graph.set('exterior', new Set());

	// Build connections from doors
	for (const door of floorPlan.doors) {
		const [from, to] = door.connects;

		if (!graph.has(from)) graph.set(from, new Set());
		if (!graph.has(to)) graph.set(to, new Set());

		graph.get(from)!.add(to);
		graph.get(to)!.add(from);
	}

	return graph;
}

// =============================================================================
// ACCESS VIOLATIONS
// =============================================================================

/**
 * Check for access violations: paths that pass through inappropriate spaces
 *
 * Critical violations:
 * - Entry passes through bathroom
 * - Entry passes through bedroom
 * - Guest access requires passing through private zone
 */
function checkAccessViolations(
	floorPlan: FloorPlan,
	graph: AdjacencyGraph,
	roomMap: Map<string, Room>
): AccessViolation[] {
	const violations: AccessViolation[] = [];

	// Find entry point
	const entryDoor = floorPlan.doors.find((d) => d.id === floorPlan.entry);
	if (!entryDoor) return violations;

	const [entryFrom, entryTo] = entryDoor.connects;
	const entryRoom = roomMap.get(entryTo);

	if (!entryRoom) return violations;

	// CRITICAL: Entry must not pass through private zones
	if (entryRoom.zone === 'private') {
		violations.push({
			from: 'entry',
			to: entryTo,
			passesThrough: entryTo,
			reason: `Entry door opens directly into private space "${entryRoom.name}"`,
			severity: 'critical'
		});
	}

	// HIGH: Entry should not pass through service zones (except utility-as-mudroom)
	if (entryRoom.zone === 'service' && !entryRoom.name.toLowerCase().includes('mudroom')) {
		violations.push({
			from: 'entry',
			to: entryTo,
			passesThrough: entryTo,
			reason: `Entry door opens into service space "${entryRoom.name}" (consider adding mudroom transition)`,
			severity: 'high'
		});
	}

	// Check all paths from entry to critical destinations
	const criticalDestinations = floorPlan.rooms.filter(
		(r) => r.zone === 'open' || (r.zone === 'public' && r.name.toLowerCase().includes('guest'))
	);

	for (const dest of criticalDestinations) {
		const path = findPath(graph, entryTo, dest.id);
		if (path) {
			// Check if path passes through private zones
			for (const nodeId of path.slice(1, -1)) {
				// Exclude start and end
				const room = roomMap.get(nodeId);
				if (room && room.zone === 'private') {
					violations.push({
						from: entryTo,
						to: dest.id,
						passesThrough: nodeId,
						reason: `Access to "${dest.name}" requires passing through private space "${room.name}"`,
						severity: 'high'
					});
				}
			}
		}
	}

	return violations;
}

// =============================================================================
// ZONE COHERENCE
// =============================================================================

/**
 * Check zone coherence: threshold zones should follow Heidegger's progression
 *
 * OUTER → SERVICE → PUBLIC → PRIVATE → OPEN
 *
 * Violations:
 * - Private zone directly adjacent to outer (no transition)
 * - Open dwelling directly accessible from outer (no threshold)
 */
function checkZoneCoherence(
	floorPlan: FloorPlan,
	graph: AdjacencyGraph,
	roomMap: Map<string, Room>
): ZoneCoherenceResult {
	const violations: ZoneCoherenceResult['violations'] = [];

	// Find entry zone
	const entryDoor = floorPlan.doors.find((d) => d.id === floorPlan.entry);
	const entryRoom = entryDoor ? roomMap.get(entryDoor.connects[1]) : undefined;
	const entryZone = entryRoom?.zone || 'public';

	for (const room of floorPlan.rooms) {
		const adjacent = graph.get(room.id);
		if (!adjacent) continue;

		const adjacentRooms = [...adjacent]
			.map((id) => roomMap.get(id))
			.filter((r): r is Room => r !== undefined);

		const adjacentZones = adjacentRooms.map((r) => r.zone);
		const allowedAdjacent = ZONE_ADJACENCY[room.zone];

		for (const adjRoom of adjacentRooms) {
			if (!allowedAdjacent.includes(adjRoom.zone)) {
				violations.push({
					room: room.id,
					expectedZones: allowedAdjacent,
					actualZone: room.zone,
					adjacentTo: adjacentRooms.map((r) => r.id)
				});
				break; // One violation per room is enough
			}
		}
	}

	return {
		entryZone,
		isValid: violations.length === 0,
		violations
	};
}

// =============================================================================
// FLOW ANALYSIS
// =============================================================================

/**
 * Analyze phenomenological flow through the dwelling
 *
 * Entry sequence should provide:
 * - Threshold transition (not abrupt)
 * - Path to open dwelling
 * - Access to private zones (through appropriate transition)
 * - Service access (for daily practices)
 */
function analyzeFlow(
	floorPlan: FloorPlan,
	graph: AdjacencyGraph,
	roomMap: Map<string, Room>
): FlowAnalysis {
	const entryDoor = floorPlan.doors.find((d) => d.id === floorPlan.entry);
	if (!entryDoor) {
		return {
			entrySequence: [],
			privateAccessible: false,
			serviceAccessible: false,
			dwellingReachable: false,
			pathAnalysis: []
		};
	}

	const entryRoomId = entryDoor.connects[1];

	// Find path to open dwelling
	const openRooms = floorPlan.rooms.filter((r) => r.zone === 'open');
	const privateRooms = floorPlan.rooms.filter((r) => r.zone === 'private');
	const serviceRooms = floorPlan.rooms.filter((r) => r.zone === 'service');

	// Entry sequence to first open dwelling
	let entrySequence: string[] = [];
	let dwellingReachable = false;

	for (const open of openRooms) {
		const path = findPath(graph, entryRoomId, open.id);
		if (path) {
			entrySequence = path;
			dwellingReachable = true;
			break;
		}
	}

	// Check if private zones are accessible
	const privateAccessible = privateRooms.some((r) => {
		const path = findPath(graph, entryRoomId, r.id);
		return path !== null;
	});

	// Check if service zones are accessible
	const serviceAccessible = serviceRooms.some((r) => {
		const path = findPath(graph, entryRoomId, r.id);
		return path !== null;
	});

	// Analyze specific paths
	const pathAnalysis: FlowAnalysis['pathAnalysis'] = [];

	// Entry to each bedroom
	for (const room of privateRooms) {
		const path = findPath(graph, entryRoomId, room.id);
		if (path) {
			const zonesTraversed = path
				.map((id) => roomMap.get(id)?.zone)
				.filter((z): z is ThresholdZone => z !== undefined);

			// Check if zones follow valid progression
			const isValid = validateZoneProgression(zonesTraversed);

			pathAnalysis.push({
				from: entryRoomId,
				to: room.id,
				path,
				zonesTraversed,
				isValid
			});
		}
	}

	return {
		entrySequence,
		privateAccessible,
		serviceAccessible,
		dwellingReachable,
		pathAnalysis
	};
}

/**
 * Validate that zone progression doesn't reverse
 * (Can skip zones, but shouldn't go backwards)
 */
function validateZoneProgression(zones: ThresholdZone[]): boolean {
	let maxIndex = -1;

	for (const zone of zones) {
		const index = ZONE_HIERARCHY.indexOf(zone);
		// Allow staying same or moving forward, not backward
		if (index < maxIndex && zone !== 'service') {
			// Service can be accessed from anywhere
			return false;
		}
		maxIndex = Math.max(maxIndex, index);
	}

	return true;
}

// =============================================================================
// PATH FINDING
// =============================================================================

/**
 * BFS to find shortest path between two nodes
 */
function findPath(graph: AdjacencyGraph, from: string, to: string): string[] | null {
	if (from === to) return [from];

	const visited = new Set<string>();
	const queue: { node: string; path: string[] }[] = [{ node: from, path: [from] }];

	while (queue.length > 0) {
		const { node, path } = queue.shift()!;

		if (node === to) return path;

		if (visited.has(node)) continue;
		visited.add(node);

		const neighbors = graph.get(node);
		if (neighbors) {
			for (const neighbor of neighbors) {
				if (!visited.has(neighbor)) {
					queue.push({ node: neighbor, path: [...path, neighbor] });
				}
			}
		}
	}

	return null;
}

// =============================================================================
// ASCII OUTPUT
// =============================================================================

/**
 * Generate ASCII flow diagram
 * Uses .space dialect: simple ASCII +-|
 */
export function generateFlowASCII(flowAnalysis: FlowAnalysis, roomMap: Map<string, Room>): string {
	const lines: string[] = [];

	lines.push('DWELLING FLOW ANALYSIS');
	lines.push('='.repeat(40));
	lines.push('');

	lines.push('Entry Sequence:');
	if (flowAnalysis.entrySequence.length > 0) {
		const path = flowAnalysis.entrySequence
			.map((id) => {
				const room = roomMap.get(id);
				return room ? `${room.name} (${room.zone})` : id;
			})
			.join(' → ');
		lines.push(`  ${path}`);
	} else {
		lines.push('  [NO PATH TO DWELLING]');
	}

	lines.push('');
	lines.push('Accessibility:');
	lines.push(`  [${flowAnalysis.dwellingReachable ? '✓' : '✗'}] Open dwelling reachable`);
	lines.push(`  [${flowAnalysis.privateAccessible ? '✓' : '✗'}] Private zones accessible`);
	lines.push(`  [${flowAnalysis.serviceAccessible ? '✓' : '✗'}] Service zones accessible`);

	lines.push('');
	lines.push('Threshold Zone Legend:');
	lines.push('  OUTER → SERVICE → PUBLIC → PRIVATE → OPEN');

	return lines.join('\n');
}
