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
 */

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
	GONE: 10
} as const;

export type DirectiveType = (typeof Directive)[keyof typeof Directive];

/** Agent's complete state on CPU side */
export interface AgentDirectiveState {
	directive: DirectiveType;
	seatSection: number; // 0-11 (matching 12 sections)
	seatPosition: { x: number; y: number };
	timer: number; // Time spent in current directive
	activityCooldown: number; // Time until next activity check
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

	// Court/center area (agents avoid during event)
	court: { x: 400, y: 300, width: 200, height: 160 }
};

/**
 * Get seating position for a section (0-11)
 * Sections are arranged radially around the arena
 */
function getSeatPosition(section: number): { x: number; y: number } {
	const angle = ((section * 30 - 90) * Math.PI) / 180; // Start from top
	const radiusFactor = 0.5 + Math.random() * 0.35; // 50-85% from center

	return {
		x: ARENA.centerX + Math.cos(angle) * ARENA.rx * radiusFactor,
		y: ARENA.centerY + Math.sin(angle) * ARENA.ry * radiusFactor
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
			// Small random movement around seat
			return {
				x: state.seatPosition.x + (Math.random() - 0.5) * 10,
				y: state.seatPosition.y + (Math.random() - 0.5) * 10
			};

		case Directive.GOING_TO_RESTROOM:
		case Directive.AT_RESTROOM: {
			// Pick nearest restroom
			const restroom = LOCATIONS.restrooms[Math.floor(Math.random() * LOCATIONS.restrooms.length)];
			return {
				x: restroom.x + (Math.random() - 0.5) * restroom.radius,
				y: restroom.y + (Math.random() - 0.5) * restroom.radius
			};
		}

		case Directive.GOING_TO_FOOD:
		case Directive.AT_FOOD: {
			// Pick nearest food stand
			const food = LOCATIONS.food[Math.floor(Math.random() * LOCATIONS.food.length)];
			return {
				x: food.x + (Math.random() - 0.5) * food.radius,
				y: food.y + (Math.random() - 0.5) * food.radius
			};
		}

		case Directive.EXITING: {
			// Move toward exit (prefer south for main exit)
			const exitGates = ['south', 'north', 'east', 'west'];
			const exitWeights = [0.5, 0.25, 0.125, 0.125];
			let r = Math.random();
			let exitGate = 'south';
			for (let i = 0; i < exitGates.length; i++) {
				r -= exitWeights[i];
				if (r <= 0) {
					exitGate = exitGates[i];
					break;
				}
			}
			const gate = LOCATIONS.gates[exitGate as keyof typeof LOCATIONS.gates];
			return { x: gate.x, y: gate.y };
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
 */
export function initializeAgentDirectives(
	agentCount: number,
	eventPhase: EventPhaseType
): AgentDirectiveState[] {
	const states: AgentDirectiveState[] = [];

	for (let i = 0; i < agentCount; i++) {
		const section = Math.floor(Math.random() * 12);
		const seatPosition = getSeatPosition(section);

		let directive: DirectiveType;
		let timer = Math.random() * 5; // Stagger initial timers

		// Initial directive based on event phase
		switch (eventPhase) {
			case EventPhase.PRE_EVENT:
				// Mix of arriving and already seated
				directive = Math.random() < 0.7 ? Directive.ARRIVING : Directive.SEATED;
				break;
			case EventPhase.EVENT_START:
			case EventPhase.SECOND_HALF:
				// Most already seated
				directive = Math.random() < 0.9 ? Directive.SEATED : Directive.ARRIVING;
				break;
			case EventPhase.HALFTIME:
				// Mix of seated, food, restroom
				const roll = Math.random();
				if (roll < 0.5) directive = Directive.SEATED;
				else if (roll < 0.7) directive = Directive.GOING_TO_FOOD;
				else if (roll < 0.85) directive = Directive.GOING_TO_RESTROOM;
				else directive = Directive.AT_FOOD;
				break;
			case EventPhase.EVENT_END:
				directive = Directive.EXITING;
				break;
			default:
				directive = Directive.SEATED;
		}

		states.push({
			directive,
			seatSection: section,
			seatPosition,
			timer,
			activityCooldown: 10 + Math.random() * 30
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
			const restroom = LOCATIONS.restrooms[Math.floor(Math.random() * LOCATIONS.restrooms.length)];
			return {
				x: restroom.x + (Math.random() - 0.5) * restroom.radius * 2,
				y: restroom.y + (Math.random() - 0.5) * restroom.radius * 2
			};
		}

		case Directive.GOING_TO_FOOD:
		case Directive.AT_FOOD: {
			const food = LOCATIONS.food[Math.floor(Math.random() * LOCATIONS.food.length)];
			return {
				x: food.x + (Math.random() - 0.5) * food.radius * 2,
				y: food.y + (Math.random() - 0.5) * food.radius * 2
			};
		}

		case Directive.EXITING:
			// Near an exit
			return {
				x: 400 + (Math.random() - 0.5) * 200,
				y: 500 + Math.random() * 50
			};

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
