/**
 * Agent Directive System
 *
 * Manages individual agent lifecycles through a live event:
 * - ARRIVING: Walking from parking/entrance toward the arena
 * - ENTERING: Moving through gate corridors into the arena
 * - FINDING_SEAT: Navigating to their assigned seating section
 * - SEATED: Watching the event (stationary with small movements)
 * - GOING_TO_RESTROOM: Leaving seat for restroom
 * - AT_RESTROOM: Waiting in restroom area
 * - GOING_TO_FOOD: Leaving seat for concessions
 * - AT_FOOD: Waiting at food stand
 * - RETURNING: Going back to their seat
 * - EXITING: Leaving the arena at end of event
 * - GONE: Agent has left the arena (inactive)
 * 
 * Special roles:
 * - PLAYER: On court or bench (can access court)
 * - STAFF: Officials, coaches (can access court)
 * - FAN: Regular attendee (cannot access court except post-game celebration)
 */

/** Agent role enum */
export const AgentRole = {
	FAN: 0,
	PLAYER: 1,
	STAFF: 2
} as const;

export type AgentRoleType = (typeof AgentRole)[keyof typeof AgentRole];

/** Agent directive enum */
export const Directive = {
	ARRIVING: 0,
	ENTERING: 1,
	FINDING_SEAT: 2,
	SEATED: 3,
	GOING_TO_RESTROOM: 4,
	AT_RESTROOM: 5,
	GOING_TO_FOOD: 6,
	AT_FOOD: 7,
	RETURNING: 8,
	EXITING: 9,
	GONE: 10,
	// Player/staff specific
	ON_COURT: 11,
	ON_BENCH: 12,
	CELEBRATING: 13
} as const;

export type DirectiveType = (typeof Directive)[keyof typeof Directive];

/** Agent's complete state on CPU side */
export interface AgentDirectiveState {
	directive: DirectiveType;
	role: AgentRoleType;
	seatSection: number; // 0-11 (matching 12 sections)
	seatRow: number; // Row within section (0 = front, higher = back)
	seatNumber: number; // Seat number within row
	seatPosition: { x: number; y: number }; // Exact seat coordinates
	timer: number; // Time spent in current directive
	activityCooldown: number; // Time until next activity check
	teamId: number; // 0 or 1 for players (which team)
	groupId: number; // 0 = no group, 1-255 = group identifier for cohesion
}

/** Event phase affects agent behavior probabilities */
export const EventPhase = {
	PRE_EVENT: 0, // Agents arriving, finding seats
	EVENT_START: 1, // Most agents seated
	HALFTIME: 2, // High activity - restroom, food
	SECOND_HALF: 3, // Back to seats
	EVENT_END: 4, // Everyone exiting
	POST_EVENT: 5 // Cleanup, few agents
} as const;

export type EventPhaseType = (typeof EventPhase)[keyof typeof EventPhase];

/** Arena layout constants (800x600 coordinate system) */
const ARENA = {
	centerX: 400,
	centerY: 300,
	rx: 380,
	ry: 280
};

/** Location definitions */
const LOCATIONS = {
	// Parking areas (outside arena)
	parking: {
		north: { x: 400, y: -50, radius: 100 },
		south: { x: 400, y: 650, radius: 80 },
		east: { x: 850, y: 300, radius: 60 },
		west: { x: -50, y: 300, radius: 60 }
	},

	// Gate positions
	gates: {
		north: { x: 400, y: 30, width: 80 },
		south: { x: 400, y: 570, width: 80 },
		east: { x: 770, y: 300, width: 50 },
		west: { x: 30, y: 300, width: 50 }
	},

	// Concession stands (inside arena, near perimeter)
	food: [
		{ x: 150, y: 150, radius: 30 }, // NW
		{ x: 650, y: 150, radius: 30 }, // NE
		{ x: 150, y: 450, radius: 30 }, // SW
		{ x: 650, y: 450, radius: 30 } // SE
	],

	// Restrooms (inside arena, near gates)
	restrooms: [
		{ x: 300, y: 80, radius: 25 }, // North
		{ x: 500, y: 80, radius: 25 }, // North
		{ x: 300, y: 520, radius: 25 }, // South
		{ x: 500, y: 520, radius: 25 } // South
	],

	// Court/center area (only players/staff allowed)
	court: { x: 300, y: 220, width: 200, height: 160, centerX: 400, centerY: 300 },

	// Team benches (alongside court)
	benches: {
		home: { x: 280, y: 300, width: 15, height: 80 }, // Left side
		away: { x: 505, y: 300, width: 15, height: 80 } // Right side
	},

	// Scorer's table
	scorersTable: { x: 360, y: 385, width: 80, height: 10 }
};

/** 
 * Basketball possession state - alternates to simulate gameplay
 * 0 = home team has ball (offense), 1 = away team has ball
 */
let currentPossession = 0;
let possessionTimer = 0;
const POSSESSION_DURATION = 8; // Seconds per possession

/**
 * Update possession (called from simulation loop)
 */
export function updatePossession(deltaTime: number): void {
	possessionTimer += deltaTime;
	if (possessionTimer > POSSESSION_DURATION) {
		possessionTimer = 0;
		currentPossession = currentPossession === 0 ? 1 : 0;
	}
}

export function getCurrentPossession(): number {
	return currentPossession;
}

/** 
 * Get player position on court based on offense/defense
 * 5 players per team during gameplay
 * 
 * Zone offense: 1-3-1 or 2-3 formation
 * Zone defense: 2-3 zone
 */
function getCourtPosition(teamId: number, playerIndex: number): { x: number; y: number } {
	const court = LOCATIONS.court;
	const centerX = court.centerX;
	const centerY = court.centerY;
	
	// Handle staff (teamId = 2) - they have fixed positions
	if (teamId === 2 || teamId > 1) {
		// Staff positions (refs, officials)
		const staffPositions = [
			{ x: centerX, y: centerY - 50 }, // Lead ref
			{ x: centerX - 40, y: centerY + 20 }, // Trail ref
			{ x: centerX + 40, y: centerY + 20 }, // Slot ref
			{ x: centerX, y: centerY + 85 } // Scorer's table
		];
		return staffPositions[playerIndex % staffPositions.length];
	}
	
	// Determine if this team is on offense or defense
	const isOnOffense = teamId === currentPossession;
	
	// Court sides: Team 0 defends left basket, Team 1 defends right basket
	// When on offense, you attack the OPPOSITE basket
	
	// Add slight randomness for natural movement
	const jitter = () => (Math.random() - 0.5) * 8;
	
	if (isOnOffense) {
		// OFFENSIVE positions (2-3 formation attacking opponent's basket)
		if (teamId === 0) {
			// Home team attacking RIGHT side
			const offensePositions = [
				{ x: centerX + 30 + jitter(), y: centerY + jitter() },      // Point guard (top of key)
				{ x: centerX + 60 + jitter(), y: centerY - 45 + jitter() }, // Shooting guard (wing)
				{ x: centerX + 60 + jitter(), y: centerY + 45 + jitter() }, // Small forward (wing)
				{ x: centerX + 75 + jitter(), y: centerY - 20 + jitter() }, // Power forward (elbow)
				{ x: centerX + 75 + jitter(), y: centerY + 20 + jitter() }  // Center (post)
			];
			return offensePositions[playerIndex % 5];
		} else {
			// Away team attacking LEFT side
			const offensePositions = [
				{ x: centerX - 30 + jitter(), y: centerY + jitter() },      // Point guard
				{ x: centerX - 60 + jitter(), y: centerY - 45 + jitter() }, // Shooting guard
				{ x: centerX - 60 + jitter(), y: centerY + 45 + jitter() }, // Small forward
				{ x: centerX - 75 + jitter(), y: centerY - 20 + jitter() }, // Power forward
				{ x: centerX - 75 + jitter(), y: centerY + 20 + jitter() }  // Center
			];
			return offensePositions[playerIndex % 5];
		}
	} else {
		// DEFENSIVE positions (2-3 zone protecting own basket)
		if (teamId === 0) {
			// Home team defending LEFT side (their basket)
			const defensePositions = [
				{ x: centerX - 45 + jitter(), y: centerY - 30 + jitter() }, // Guard (top left)
				{ x: centerX - 45 + jitter(), y: centerY + 30 + jitter() }, // Guard (top right)
				{ x: centerX - 70 + jitter(), y: centerY - 35 + jitter() }, // Forward (wing)
				{ x: centerX - 70 + jitter(), y: centerY + 35 + jitter() }, // Forward (wing)
				{ x: centerX - 80 + jitter(), y: centerY + jitter() }       // Center (paint)
			];
			return defensePositions[playerIndex % 5];
		} else {
			// Away team defending RIGHT side (their basket)
			const defensePositions = [
				{ x: centerX + 45 + jitter(), y: centerY - 30 + jitter() }, // Guard
				{ x: centerX + 45 + jitter(), y: centerY + 30 + jitter() }, // Guard
				{ x: centerX + 70 + jitter(), y: centerY - 35 + jitter() }, // Forward
				{ x: centerX + 70 + jitter(), y: centerY + 35 + jitter() }, // Forward
				{ x: centerX + 80 + jitter(), y: centerY + jitter() }       // Center
			];
			return defensePositions[playerIndex % 5];
		}
	}
}

/**
 * Get bench position for player
 */
function getBenchPosition(teamId: number, benchIndex: number): { x: number; y: number } {
	// Staff (teamId = 2) go to scorer's table area
	if (teamId === 2 || teamId > 1) {
		return {
			x: LOCATIONS.scorersTable.x + 20 + benchIndex * 20,
			y: LOCATIONS.scorersTable.y + 5
		};
	}
	
	const bench = teamId === 0 ? LOCATIONS.benches.home : LOCATIONS.benches.away;
	const spacing = bench.height / 8; // Space for ~8 bench players
	return {
		x: bench.x + bench.width / 2,
		y: bench.y - bench.height / 2 + spacing * (benchIndex + 0.5)
	};
}

/**
 * Get specific seat position within a section
 * Sections are arranged radially around the arena
 * Each section has rows (distance from court) and seat numbers (along the arc)
 */
function getSeatPosition(
	section: number,
	row: number,
	seatNumber: number
): { x: number; y: number } {
	// Section angle (30 degrees each, starting from top)
	const sectionAngle = ((section * 30 - 90) * Math.PI) / 180;
	
	// Row determines distance from center (0 = closest to court, ~15 = furthest)
	const minRadius = 0.35; // Inner edge of seating
	const maxRadius = 0.92; // Outer edge (near arena boundary)
	const rowCount = 15;
	const radiusFactor = minRadius + (row / rowCount) * (maxRadius - minRadius);
	
	// Seat number determines position along the section arc
	const seatsPerRow = 20;
	const sectionSpread = (25 * Math.PI) / 180; // ~25 degrees per section (with gaps)
	const seatAngleOffset = ((seatNumber - seatsPerRow / 2) / seatsPerRow) * sectionSpread;
	
	const finalAngle = sectionAngle + seatAngleOffset;
	
	return {
		x: ARENA.centerX + Math.cos(finalAngle) * ARENA.rx * radiusFactor,
		y: ARENA.centerY + Math.sin(finalAngle) * ARENA.ry * radiusFactor
	};
}

/**
 * Get spawn position for arriving agent
 */
function getArrivalPosition(): { x: number; y: number; nearestGate: string } {
	const gates = ['north', 'south', 'east', 'west'];
	const weights = [0.4, 0.3, 0.15, 0.15]; // North is main entrance

	let r = Math.random();
	let gate = 'north';
	for (let i = 0; i < gates.length; i++) {
		r -= weights[i];
		if (r <= 0) {
			gate = gates[i];
			break;
		}
	}

	const parking = LOCATIONS.parking[gate as keyof typeof LOCATIONS.parking];
	return {
		x: parking.x + (Math.random() - 0.5) * parking.radius * 2,
		y: parking.y + (Math.random() - 0.5) * parking.radius * 2,
		nearestGate: gate
	};
}

/**
 * Get target position based on directive
 */
export function getDirectiveTarget(
	state: AgentDirectiveState,
	nearestGate: string = 'north'
): { x: number; y: number } {
	switch (state.directive) {
		case Directive.ARRIVING: {
			// Move toward nearest gate
			const gate = LOCATIONS.gates[nearestGate as keyof typeof LOCATIONS.gates];
			return {
				x: gate.x + (Math.random() - 0.5) * gate.width,
				y: gate.y
			};
		}

		case Directive.ENTERING:
		case Directive.FINDING_SEAT:
		case Directive.RETURNING:
			// Move toward assigned seat
			return state.seatPosition;

		case Directive.SEATED:
			// Stay at exact seat position (small jitter for realism)
			return {
				x: state.seatPosition.x + (Math.random() - 0.5) * 3,
				y: state.seatPosition.y + (Math.random() - 0.5) * 3
			};

		case Directive.GOING_TO_RESTROOM:
		case Directive.AT_RESTROOM: {
			// Pick nearest restroom based on section
			const restroomIndex = state.seatSection < 6 ? 
				(state.seatSection < 3 ? 0 : 1) : // Top restrooms
				(state.seatSection < 9 ? 2 : 3);  // Bottom restrooms
			const restroom = LOCATIONS.restrooms[restroomIndex];
			return {
				x: restroom.x + (Math.random() - 0.5) * restroom.radius,
				y: restroom.y + (Math.random() - 0.5) * restroom.radius
			};
		}

		case Directive.GOING_TO_FOOD:
		case Directive.AT_FOOD: {
			// Pick nearest food stand based on section
			const foodIndex = state.seatSection < 3 ? 0 : // NW
				state.seatSection < 6 ? 1 : // NE
				state.seatSection < 9 ? 3 : 2; // SE or SW
			const food = LOCATIONS.food[foodIndex];
			return {
				x: food.x + (Math.random() - 0.5) * food.radius,
				y: food.y + (Math.random() - 0.5) * food.radius
			};
		}

		case Directive.EXITING: {
			// Move toward exit (prefer nearest based on section)
			const exitGate = state.seatSection < 3 ? 'north' :
				state.seatSection < 6 ? 'east' :
				state.seatSection < 9 ? 'south' : 'west';
			const gate = LOCATIONS.gates[exitGate as keyof typeof LOCATIONS.gates];
			return { x: gate.x, y: gate.y };
		}

		// Player/staff specific directives
		case Directive.ON_COURT: {
			// Get court position based on team and player index
			const playerIndex = state.seatNumber % 5; // Use seatNumber as player index
			return getCourtPosition(state.teamId, playerIndex);
		}

		case Directive.ON_BENCH: {
			// Get bench position
			const benchIndex = state.seatNumber % 8;
			return getBenchPosition(state.teamId, benchIndex);
		}

		case Directive.CELEBRATING: {
			// Rush onto court for celebration
			const court = LOCATIONS.court;
			return {
				x: court.centerX + (Math.random() - 0.5) * court.width * 0.8,
				y: court.centerY + (Math.random() - 0.5) * court.height * 0.8
			};
		}

		case Directive.GONE:
		default:
			return { x: -1000, y: -1000 }; // Off-screen
	}
}

/**
 * Activity probabilities by event phase
 */
const ACTIVITY_PROBABILITIES: Record<
	EventPhaseType,
	{
		restroom: number;
		food: number;
		staySeated: number;
	}
> = {
	[EventPhase.PRE_EVENT]: { restroom: 0.02, food: 0.03, staySeated: 0.95 },
	[EventPhase.EVENT_START]: { restroom: 0.01, food: 0.01, staySeated: 0.98 },
	[EventPhase.HALFTIME]: { restroom: 0.15, food: 0.2, staySeated: 0.65 },
	[EventPhase.SECOND_HALF]: { restroom: 0.02, food: 0.02, staySeated: 0.96 },
	[EventPhase.EVENT_END]: { restroom: 0.0, food: 0.0, staySeated: 0.0 }, // Everyone exits
	[EventPhase.POST_EVENT]: { restroom: 0.0, food: 0.0, staySeated: 1.0 }
};

/**
 * Update agent directive based on current state and event phase
 */
export function updateDirective(
	state: AgentDirectiveState,
	eventPhase: EventPhaseType,
	deltaTime: number
): AgentDirectiveState {
	const newState = { ...state };
	newState.timer += deltaTime;

	// Check for activity cooldown
	newState.activityCooldown -= deltaTime;
	const canDoActivity = newState.activityCooldown <= 0;

	switch (state.directive) {
		case Directive.ARRIVING:
			// After some time, transition to entering
			if (state.timer > 2 + Math.random() * 3) {
				newState.directive = Directive.ENTERING;
				newState.timer = 0;
			}
			break;

		case Directive.ENTERING:
			// After entering gate, find seat
			if (state.timer > 1 + Math.random() * 2) {
				newState.directive = Directive.FINDING_SEAT;
				newState.timer = 0;
			}
			break;

		case Directive.FINDING_SEAT:
			// After reaching seat area, become seated
			if (state.timer > 3 + Math.random() * 5) {
				newState.directive = Directive.SEATED;
				newState.timer = 0;
				newState.activityCooldown = 10 + Math.random() * 20; // Wait before activities
			}
			break;

		case Directive.SEATED:
			// Event end triggers exit
			if (eventPhase === EventPhase.EVENT_END) {
				newState.directive = Directive.EXITING;
				newState.timer = 0;
				break;
			}

			// Check for activities during halftime or randomly
			if (canDoActivity) {
				const probs = ACTIVITY_PROBABILITIES[eventPhase];
				const roll = Math.random();

				if (roll < probs.restroom) {
					newState.directive = Directive.GOING_TO_RESTROOM;
					newState.timer = 0;
				} else if (roll < probs.restroom + probs.food) {
					newState.directive = Directive.GOING_TO_FOOD;
					newState.timer = 0;
				}

				// Reset cooldown
				newState.activityCooldown = 15 + Math.random() * 30;
			}
			break;

		case Directive.GOING_TO_RESTROOM:
			if (state.timer > 4 + Math.random() * 4) {
				newState.directive = Directive.AT_RESTROOM;
				newState.timer = 0;
			}
			break;

		case Directive.AT_RESTROOM:
			// Spend time at restroom, then return
			if (state.timer > 5 + Math.random() * 10) {
				newState.directive = Directive.RETURNING;
				newState.timer = 0;
			}
			break;

		case Directive.GOING_TO_FOOD:
			if (state.timer > 4 + Math.random() * 4) {
				newState.directive = Directive.AT_FOOD;
				newState.timer = 0;
			}
			break;

		case Directive.AT_FOOD:
			// Spend time at food, then return
			if (state.timer > 8 + Math.random() * 15) {
				newState.directive = Directive.RETURNING;
				newState.timer = 0;
			}
			break;

		case Directive.RETURNING:
			if (state.timer > 4 + Math.random() * 6) {
				newState.directive = Directive.SEATED;
				newState.timer = 0;
				newState.activityCooldown = 20 + Math.random() * 40;
			}
			break;

		case Directive.EXITING:
			// After reaching exit, become gone
			if (state.timer > 5 + Math.random() * 10) {
				newState.directive = Directive.GONE;
				newState.timer = 0;
			}
			break;
	}

	return newState;
}

/**
 * Initialize directive states for all agents
 * Creates players (26 total: 10 on court, 16 on benches), staff (4), and fans
 */
export function initializeAgentDirectives(
	agentCount: number,
	eventPhase: EventPhaseType
): AgentDirectiveState[] {
	const states: AgentDirectiveState[] = [];
	
	// First, create players (26 = 13 per team)
	const playersPerTeam = 13;
	const activePlayersPerTeam = 5; // On court during play
	
	for (let teamId = 0; teamId < 2; teamId++) {
		for (let playerIdx = 0; playerIdx < playersPerTeam; playerIdx++) {
			const isActive = playerIdx < activePlayersPerTeam;
			
			let directive: DirectiveType;
			if (eventPhase === EventPhase.EVENT_END) {
				directive = Directive.CELEBRATING; // Finals celebration!
			} else if (eventPhase === EventPhase.HALFTIME) {
				directive = Directive.ON_BENCH; // All on bench during halftime
			} else if (isActive && eventPhase !== EventPhase.PRE_EVENT && eventPhase !== EventPhase.POST_EVENT) {
				directive = Directive.ON_COURT;
			} else {
				directive = Directive.ON_BENCH;
			}
			
			const benchPos = getBenchPosition(teamId, playerIdx);
			const courtPos = isActive ? getCourtPosition(teamId, playerIdx) : benchPos;
			
			states.push({
				directive,
				role: AgentRole.PLAYER,
				seatSection: teamId === 0 ? 9 : 3, // Near their bench
				seatRow: 0,
				seatNumber: playerIdx,
				seatPosition: directive === Directive.ON_COURT ? courtPos : benchPos,
				timer: Math.random() * 2,
				activityCooldown: 100, // Players don't do fan activities
				teamId,
				groupId: 0 // Players don't use group cohesion
			});
		}
	}
	
	// Create staff (3 refs on court, 1 scorer at table - scorer doesn't count as "on court")
	for (let staffIdx = 0; staffIdx < 4; staffIdx++) {
		const isRef = staffIdx < 3;
		let pos: { x: number; y: number };
		
		if (isRef) {
			// Referees on court - they move around
			const refPositions = [
				{ x: 400, y: 250 }, // Lead ref (near basket)
				{ x: 350, y: 320 }, // Trail ref
				{ x: 450, y: 320 } // Slot ref
			];
			pos = refPositions[staffIdx];
		} else {
			// Scorer's table - stationary
			pos = { x: LOCATIONS.scorersTable.x + 40, y: LOCATIONS.scorersTable.y };
		}
		
		let directive: DirectiveType;
		if (eventPhase === EventPhase.EVENT_END) {
			directive = isRef ? Directive.CELEBRATING : Directive.ON_BENCH; // Scorer stays at table
		} else if (eventPhase === EventPhase.HALFTIME) {
			directive = Directive.ON_BENCH; // Refs take a break, scorer stays
		} else if (isRef) {
			directive = Directive.ON_COURT; // Refs on court during play
		} else {
			directive = Directive.ON_BENCH; // Scorer at table (not technically "on court")
		}
		
		states.push({
			directive,
			role: AgentRole.STAFF,
			seatSection: 6, // South area
			seatRow: 0,
			seatNumber: staffIdx,
			seatPosition: pos,
			timer: 0,
			activityCooldown: 100,
			teamId: 2, // Neutral
			groupId: 0 // Staff don't use group cohesion
		});
	}
	
	// Track which seats are taken
	const takenSeats = new Set<string>();
	
	// Create fans (remaining agents)
	const fanCount = agentCount - states.length;
	
	// Group assignment tracking
	// About 65% of fans come in groups of 2-6 people
	let currentGroupId = 1;
	let currentGroupSize = 0;
	let targetGroupSize = 0;
	let currentGroupSection = -1;
	let currentGroupRow = -1;
	let currentGroupTeam = 0;
	
	for (let i = 0; i < fanCount; i++) {
		// Determine if this fan should start a new group or be solo
		let groupId = 0;
		
		if (currentGroupSize >= targetGroupSize) {
			// Need to assign to new group or solo
			if (Math.random() < 0.65) {
				// Start a new group (2-6 people)
				targetGroupSize = 2 + Math.floor(Math.random() * 5); // 2-6
				currentGroupSize = 0;
				currentGroupId++;
				currentGroupSection = Math.floor(Math.random() * 12);
				currentGroupRow = Math.floor(Math.random() * 15);
				currentGroupTeam = Math.random() < 0.5 ? 0 : 1;
				groupId = currentGroupId;
			} else {
				// Solo attendee
				groupId = 0;
				targetGroupSize = 0;
			}
		} else {
			// Continue current group
			groupId = currentGroupId;
		}
		
		// Assign a unique seat (group members try to sit near each other)
		let section: number, row: number, seatNum: number;
		let seatKey: string;
		let attempts = 0;
		
		if (groupId > 0 && currentGroupSize > 0) {
			// Group member - try to sit in same section/row as group
			section = currentGroupSection;
			row = currentGroupRow;
			do {
				seatNum = Math.floor(Math.random() * 20);
				seatKey = `${section}-${row}-${seatNum}`;
				attempts++;
				// If can't find seat in same row, try adjacent rows
				if (attempts > 10) {
					row = currentGroupRow + Math.floor(Math.random() * 3) - 1;
					row = Math.max(0, Math.min(14, row));
				}
				if (attempts > 20) {
					// Fall back to any seat in same section
					row = Math.floor(Math.random() * 15);
				}
			} while (takenSeats.has(seatKey) && attempts < 50);
		} else {
			// Solo or first in group - random seat
			do {
				section = groupId > 0 ? currentGroupSection : Math.floor(Math.random() * 12);
				row = groupId > 0 ? currentGroupRow : Math.floor(Math.random() * 15);
				seatNum = Math.floor(Math.random() * 20);
				seatKey = `${section}-${row}-${seatNum}`;
				attempts++;
			} while (takenSeats.has(seatKey) && attempts < 50);
			
			if (groupId > 0) {
				currentGroupSection = section;
				currentGroupRow = row;
			}
		}
		
		takenSeats.add(seatKey);
		if (groupId > 0) {
			currentGroupSize++;
		}
		
		const seatPosition = getSeatPosition(section, row, seatNum);

		let directive: DirectiveType;
		let timer = Math.random() * 5;

		// Initial directive based on event phase
		switch (eventPhase) {
			case EventPhase.PRE_EVENT:
				// Mix of arriving and already seated
				directive = Math.random() < 0.6 ? Directive.ARRIVING : Directive.SEATED;
				break;
			case EventPhase.EVENT_START:
			case EventPhase.SECOND_HALF:
				// Most already seated
				directive = Math.random() < 0.95 ? Directive.SEATED : Directive.ARRIVING;
				break;
			case EventPhase.HALFTIME:
				// High activity - many going to food/restroom
				const roll = Math.random();
				if (roll < 0.4) directive = Directive.SEATED;
				else if (roll < 0.6) directive = Directive.GOING_TO_FOOD;
				else if (roll < 0.75) directive = Directive.GOING_TO_RESTROOM;
				else if (roll < 0.85) directive = Directive.AT_FOOD;
				else directive = Directive.AT_RESTROOM;
				break;
			case EventPhase.EVENT_END:
				// Finals celebration - some fans rush court!
				directive = Math.random() < 0.15 ? Directive.CELEBRATING : Directive.EXITING;
				break;
			default:
				directive = Directive.SEATED;
		}

		// Group members share same team affiliation
		const teamId = groupId > 0 ? currentGroupTeam : (Math.random() < 0.5 ? 0 : 1);

		states.push({
			directive,
			role: AgentRole.FAN,
			seatSection: section,
			seatRow: row,
			seatNumber: seatNum,
			seatPosition,
			timer,
			activityCooldown: 10 + Math.random() * 30,
			teamId,
			groupId
		});
	}

	return states;
}

/**
 * Get initial position for agent based on directive
 */
export function getInitialPosition(state: AgentDirectiveState): { x: number; y: number } {
	switch (state.directive) {
		case Directive.ARRIVING: {
			const arrival = getArrivalPosition();
			return { x: arrival.x, y: arrival.y };
		}

		case Directive.ENTERING:
			// Near a gate
			return {
				x: 400 + (Math.random() - 0.5) * 100,
				y: 50 + Math.random() * 30
			};

		case Directive.FINDING_SEAT:
		case Directive.RETURNING:
			// Inside arena, moving toward seat
			const angle = Math.random() * Math.PI * 2;
			const dist = 0.3 + Math.random() * 0.3;
			return {
				x: ARENA.centerX + Math.cos(angle) * ARENA.rx * dist,
				y: ARENA.centerY + Math.sin(angle) * ARENA.ry * dist
			};

		case Directive.SEATED:
			return state.seatPosition;

		case Directive.GOING_TO_RESTROOM:
		case Directive.AT_RESTROOM: {
			const restroomIndex = state.seatSection < 6 ? 
				(state.seatSection < 3 ? 0 : 1) : (state.seatSection < 9 ? 2 : 3);
			const restroom = LOCATIONS.restrooms[restroomIndex];
			return {
				x: restroom.x + (Math.random() - 0.5) * restroom.radius * 2,
				y: restroom.y + (Math.random() - 0.5) * restroom.radius * 2
			};
		}

		case Directive.GOING_TO_FOOD:
		case Directive.AT_FOOD: {
			const foodIndex = state.seatSection < 3 ? 0 : state.seatSection < 6 ? 1 : 
				state.seatSection < 9 ? 3 : 2;
			const food = LOCATIONS.food[foodIndex];
			return {
				x: food.x + (Math.random() - 0.5) * food.radius * 2,
				y: food.y + (Math.random() - 0.5) * food.radius * 2
			};
		}

		case Directive.EXITING:
			// Start from seat, heading to exit
			return state.seatPosition;

		// Player/staff positions
		case Directive.ON_COURT: {
			const playerIndex = state.seatNumber % 5;
			return getCourtPosition(state.teamId, playerIndex);
		}

		case Directive.ON_BENCH: {
			const benchIndex = state.seatNumber % 8;
			return getBenchPosition(state.teamId, benchIndex);
		}

		case Directive.CELEBRATING: {
			// Start from current position, will move to court
			if (state.role === AgentRole.PLAYER) {
				return getBenchPosition(state.teamId, state.seatNumber % 8);
			}
			return state.seatPosition;
		}

		case Directive.GONE:
		default:
			return { x: -1000, y: -1000 };
	}
}

/**
 * Map event phase to scenario index (for compatibility)
 */
export function eventPhaseToScenario(phase: EventPhaseType): number {
	switch (phase) {
		case EventPhase.PRE_EVENT:
			return 0;
		case EventPhase.EVENT_START:
			return 1;
		case EventPhase.HALFTIME:
			return 2;
		case EventPhase.SECOND_HALF:
			return 3;
		case EventPhase.EVENT_END:
			return 5;
		case EventPhase.POST_EVENT:
			return 6;
		default:
			return 0;
	}
}

/** Export locations for overlay visualization */
export const ARENA_LOCATIONS = LOCATIONS;
