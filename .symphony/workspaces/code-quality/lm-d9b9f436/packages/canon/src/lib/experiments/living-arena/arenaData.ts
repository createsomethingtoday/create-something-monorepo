/**
 * Living Arena - Static Data
 * 
 * Scenario definitions, reasoning examples, and configuration
 * for the arena visualization experiment.
 */

import type {
	IntelligenceScenario,
	ReasoningExample,
	HolisticUpdate,
	IncidentTemplate,
	ScenarioEffect,
	EventPhase,
	ScenarioMessage,
	HvacZone,
	Notification,
	Incident
} from './arenaTypes';

// Cross-system intelligence scenarios - demonstrating emergent behaviors
export const intelligenceScenarios: IntelligenceScenario[] = [
	{
		id: 'gate-crowding',
		trigger: 'Getting crowded at Gate A',
		phase: 'Pre-Game',
		responses: [
			{ system: 'Security', action: 'Opens another screening lane' },
			{ system: 'Lighting', action: 'Brightens the path to Gate B' },
			{ system: 'HVAC', action: 'Cools down the area people are heading to' },
			{ system: 'Signs', action: 'Gently suggests the shorter line at Gate B' }
		],
		humanLoop: 'Security supervisor gets a heads up—can change the plan anytime',
		insight: 'People move faster. Lines stay safe. Nobody had to radio anyone.',
		visualCue: 'Watch: Crowds flowing from parking toward north entrance'
	},
	{
		id: 'vip-arrival',
		trigger: 'VIP motorcade approaching south entrance',
		phase: 'Pre-Game',
		responses: [
			{ system: 'Security', action: 'Clears path, activates VIP lane cameras' },
			{ system: 'Lighting', action: 'Illuminates private entrance corridor' },
			{ system: 'Parking', action: 'Reserves spots in Lot C, guides regular traffic around' },
			{ system: 'Elevator', action: 'Holds suite-level car, bypasses other calls' }
		],
		humanLoop: 'VIP liaison confirms guest preferences from app check-in',
		insight: 'The guest just... walks in. Everything was ready.',
		visualCue: 'Watch: Vehicles arriving at south VIP lot'
	},
	{
		id: 'halftime',
		trigger: 'Halftime starts',
		phase: 'Halftime',
		responses: [
			{ system: 'Lighting', action: 'Brightens walkways, dims the court' },
			{ system: 'HVAC', action: 'Pushes fresh air where people are heading' },
			{ system: 'Security', action: 'Shifts attention to concession areas' },
			{ system: 'Scheduling', action: "Lets cleaning crews know it's time" }
		],
		humanLoop: 'Ops manager sees the summary—crews tap "on my way" on their phones',
		insight: "The building was ready before the buzzer. That's the point.",
		visualCue: 'Watch: Crowd spreading from seats to concourse'
	},
	{
		id: 'weather-incoming',
		trigger: 'Storm approaching in 45 minutes',
		phase: 'Third Quarter',
		responses: [
			{ system: 'HVAC', action: 'Closes exterior vents, increases interior circulation' },
			{ system: 'Lighting', action: 'Checks backup generators, pre-stages emergency lights' },
			{ system: 'Parking', action: 'Alerts: covered lot filling fast' },
			{ system: 'Comms', action: 'Queues weather advisory for end-of-game announcement' }
		],
		humanLoop: 'Facilities manager reviews plan, approves early roof closure',
		insight: 'When the rain hits, nobody scrambles. It was handled an hour ago.',
		visualCue: 'Watch: Parking activity shifts to covered areas'
	},
	{
		id: 'emergency',
		trigger: "Something's wrong in Section 112",
		phase: 'Fourth Quarter',
		responses: [
			{ system: 'Security', action: 'Team heading there now' },
			{ system: 'Lighting', action: 'Exit paths light up' },
			{ system: 'HVAC', action: 'Keeps air flowing toward exits' },
			{ system: 'Speakers', action: 'Calm voice, clear directions, just that section' }
		],
		humanLoop: 'A person decides what happens next. Always.',
		humanLoopCritical: true,
		insight: 'The system helps. A human chooses.',
		visualCue: 'Watch: Evacuation flow toward south exit'
	},
	{
		id: 'game-end',
		trigger: 'Final buzzer—game over',
		phase: 'Post-Game',
		responses: [
			{ system: 'Lighting', action: 'Full brightness on all exit paths' },
			{ system: 'HVAC', action: 'Max airflow in exit corridors' },
			{ system: 'Parking', action: 'Staggered lot release to prevent gridlock' },
			{ system: 'Transit', action: 'Shuttles staged, departures every 3 minutes' }
		],
		humanLoop: 'Traffic control officers coordinate with city signals',
		insight: '19,000 people exit in 25 minutes. Nobody honks.',
		visualCue: 'Watch: Mass movement toward all exits and parking'
	},
	{
		id: 'overnight',
		trigger: 'Venue empty—maintenance window',
		phase: 'Overnight',
		responses: [
			{ system: 'Lighting', action: 'Work lights only where crews are active' },
			{ system: 'HVAC', action: 'Energy-saving mode, deeper clean in empty zones' },
			{ system: 'Security', action: 'Perimeter patrol mode, interior sensors heightened' },
			{ system: 'Scheduling', action: 'Maintenance bots deployed for floor cleaning' }
		],
		humanLoop: 'Night supervisor monitors from home, alerts for anomalies only',
		insight: "The building takes care of itself. Tomorrow, it's ready again.",
		visualCue: 'Watch: Minimal activity, perimeter security active'
	}
];

// Particle colors by scenario
export const particleColors = [
	'var(--color-data-4)', // 0: entering - yellow/gold
	'var(--color-accent)', // 1: VIP - accent
	'var(--color-data-2)', // 2: halftime - green
	'var(--color-data-3)', // 3: weather - blue
	'var(--color-error)', // 4: emergency - red
	'var(--color-data-1)', // 5: exiting - cyan
	'var(--color-fg-muted)' // 6: overnight - gray
];

// AI Reasoning examples - showing how the system thinks, not just acts
export const reasoningExamples: ReasoningExample[] = [
	{
		situation: 'Upper Bowl getting warm',
		thinking: [
			'Temperature rising in Zone 2 (currently 76°F, target 72°F)',
			'Crowd density: 94% occupied',
			'Game phase: 3rd quarter (high energy)',
			'Weather outside: 85°F, sunny',
			'Similar past events: cooling takes ~8 minutes to feel'
		],
		decision: "Start cooling now—by the time people feel it, it'll be right",
		confidence: 87,
		alternative: 'Could wait, but past patterns show complaints start at 77°F'
	},
	{
		situation: 'Unusual crowd movement near Exit 7',
		thinking: [
			'Movement speed: faster than normal',
			'Direction: toward exit (not concessions)',
			'Time: not halftime or end of game',
			'Nearby events: nothing scheduled',
			'Camera check: no visible emergency'
		],
		decision: "Alert security to observe, but don't escalate yet",
		confidence: 62,
		alternative: 'Confidence below 70%—flagging for human review in 30 seconds if unchanged'
	},
	{
		situation: 'VIP suite requests "cooler"',
		thinking: [
			'Current temp: 70°F (at target)',
			'Guest preference history: likes it cold',
			'Adjacent suites: occupied, set to 70°F',
			'HVAC capacity: can isolate this zone',
			'Impact on neighbors: minimal with zone isolation'
		],
		decision: 'Lower to 68°F for this suite only',
		confidence: 94,
		alternative: 'Guest history makes this low-risk. No need to confirm.'
	}
];

// Holistic update example - showing how one change ripples through everything
export const holisticUpdate: HolisticUpdate = {
	trigger: 'Weather forecast changed: thunderstorm in 2 hours',
	timestamp: '18:45:00',
	systemUpdates: [
		{
			system: 'Scheduling',
			before: 'Roof open for sunset view',
			after: 'Roof closing at 19:30 (30 min before storm)',
			reason: 'Guest comfort + equipment protection'
		},
		{
			system: 'HVAC',
			before: 'Natural ventilation mode',
			after: 'Switch to AC at 19:15',
			reason: 'Humidity will spike when roof closes'
		},
		{
			system: 'Lighting',
			before: 'Sunset ambiance scheduled',
			after: 'Indoor event lighting ready',
			reason: 'Natural light will decrease faster than planned'
		},
		{
			system: 'Parking',
			before: 'Standard exit flow',
			after: 'Alert: covered parking fills first post-game',
			reason: 'People will want shelter'
		},
		{
			system: 'Concessions',
			before: 'Normal staffing',
			after: 'Extra staff for indoor rush',
			reason: 'Fewer people will want to leave during storm'
		},
		{
			system: 'Communications',
			before: 'No alerts needed',
			after: 'Gentle announcement at 19:00 about roof closing',
			reason: 'No surprises—people appreciate knowing'
		}
	],
	humanApproval:
		'Ops manager reviewed full plan in 45 seconds, approved with one change: earlier announcement',
	totalTime: '12 seconds to generate plan, 45 seconds for human review'
};

// Incident templates for simulation
export const incidentTypes: IncidentTemplate[] = [
	{
		type: 'success',
		system: 'HVAC',
		event: 'Cooled the section before the crowd arrived',
		resolution: "Nobody noticed. That's the goal.",
		learned: 'This timing works. Keep doing it.'
	},
	{
		type: 'override',
		system: 'Scheduling',
		event: 'AI wanted to close concessions early',
		resolution: 'Manager said no—VIP event running late. Concessions stayed open.',
		learned: 'VIP events need a human to decide timing.'
	},
	{
		type: 'failure',
		system: 'Lighting',
		event: 'A light in Section 205 went out',
		resolution: 'Nearby lights got brighter. Repair scheduled.',
		learned: 'Always have a backup plan for important areas.'
	}
];

// Scenario-specific arena states
export const scenarioEffects: ScenarioEffect[] = [
	{
		// 0: Gate crowding
		zones: ['gate-a', 'concourse-north'],
		entry: 'north',
		securityStatus: 'monitoring',
		lightingMode: 'event',
		crowdFlow: 'entering',
		attendance: 8_420
	},
	{
		// 1: VIP arrival
		zones: ['vip-entrance', 'lot-c'],
		entry: 'south',
		securityStatus: 'monitoring',
		lightingMode: 'event',
		crowdFlow: 'vip',
		attendance: 12_500
	},
	{
		// 2: Halftime
		zones: ['concourse', 'concessions'],
		entry: null,
		securityStatus: 'monitoring',
		lightingMode: 'ambient',
		crowdFlow: 'dispersing',
		attendance: 18_902
	},
	{
		// 3: Weather incoming
		zones: ['covered-areas', 'parking-north'],
		entry: 'west',
		securityStatus: 'monitoring',
		lightingMode: 'event',
		crowdFlow: 'sheltering',
		attendance: 18_756
	},
	{
		// 4: Emergency
		zones: ['section-112', 'exit-paths'],
		entry: 'south',
		securityStatus: 'alert',
		lightingMode: 'emergency',
		crowdFlow: 'evacuating',
		attendance: 18_123
	},
	{
		// 5: Game end
		zones: ['all-exits', 'parking-all'],
		entry: null,
		securityStatus: 'monitoring',
		lightingMode: 'event',
		crowdFlow: 'exiting',
		attendance: 19_200
	},
	{
		// 6: Overnight
		zones: ['perimeter'],
		entry: null,
		securityStatus: 'patrol',
		lightingMode: 'minimal',
		crowdFlow: 'empty',
		attendance: 45
	}
];

// Event phases that cycle
export const eventPhases: EventPhase[] = [
	{ phase: 'Pre-Game', attendance: 8_420 },
	{ phase: 'First Quarter', attendance: 16_234 },
	{ phase: 'Second Quarter', attendance: 18_847 },
	{ phase: 'Halftime', attendance: 18_902 },
	{ phase: 'Third Quarter', attendance: 18_756 },
	{ phase: 'Fourth Quarter', attendance: 18_123 },
	{ phase: 'Post-Game', attendance: 12_456 }
];

// Scenario-specific notification messages
export const scenarioMessages: ScenarioMessage[][] = [
	[
		{ system: 'Security', message: 'Gate A density: 87% capacity' },
		{ system: 'Wayfinding', message: 'Redirecting 23 guests to Gate B' },
		{ system: 'HVAC', message: 'Pre-cooling Section 104-108' }
	],
	[
		{ system: 'Lighting', message: 'Concourse at full brightness' },
		{ system: 'Scheduling', message: 'Cleaning crews deployed' },
		{ system: 'Concessions', message: 'Rush hour staffing active' }
	],
	[
		{ system: 'Security', message: 'Response team en route' },
		{ system: 'Lighting', message: 'Emergency paths illuminated' },
		{ system: 'HVAC', message: 'Positive pressure in corridors' }
	]
];

// Initial state factories
export function createInitialHvacZones(): HvacZone[] {
	return [
		{ id: 1, name: 'Main Floor', temp: 72, target: 72, active: true },
		{ id: 2, name: 'Upper Bowl', temp: 74, target: 72, active: true },
		{ id: 3, name: 'Concourse', temp: 71, target: 70, active: true },
		{ id: 4, name: 'VIP Suites', temp: 70, target: 70, active: true }
	];
}

export function createInitialNotifications(): Notification[] {
	return [
		{ id: 1, system: 'Security', message: 'Perimeter scan complete', time: '2s ago', priority: 'low' },
		{ id: 2, system: 'HVAC', message: 'Zone 2 adjusting +2°', time: '15s ago', priority: 'medium' },
		{ id: 3, system: 'Lighting', message: 'Court lights at 100%', time: '30s ago', priority: 'low' }
	];
}

export function createInitialIncidentLog(): Incident[] {
	return [
		{
			id: 1,
			timestamp: '19:42:15',
			type: 'failure',
			system: 'HVAC',
			event: 'Zone 3 sensor reported -40°F (impossible reading)',
			resolution: 'Auto-flagged as sensor malfunction • Maintenance dispatched',
			learned: 'Added plausibility bounds to sensor readings',
			humanInvolved: true
		},
		{
			id: 2,
			timestamp: '19:38:22',
			type: 'override',
			system: 'Lighting',
			event: 'System suggested dimming for "intimate moment" during timeout',
			resolution: 'Security supervisor overrode: visibility required for crowd monitoring',
			learned: 'Security constraints now override ambiance suggestions',
			humanInvolved: true
		},
		{
			id: 3,
			timestamp: '19:31:07',
			type: 'success',
			system: 'Security',
			event: 'Unusual movement pattern detected near VIP entrance',
			resolution: 'Alert sent to nearest officer • Verified as lost child reunited with parent',
			learned: 'Pattern logged for future training (not a threat)',
			humanInvolved: true
		},
		{
			id: 4,
			timestamp: '19:24:51',
			type: 'failure',
			system: 'Wayfinding',
			event: 'Digital sign #47 unresponsive to redirect command',
			resolution: 'Fallback: Adjacent signs compensated • Hardware ticket created',
			learned: 'Added redundancy check before committing to single-sign strategies',
			humanInvolved: false
		},
		{
			id: 5,
			timestamp: '19:15:33',
			type: 'escalation',
			system: 'Security',
			event: 'AI confidence below threshold for crowd behavior classification',
			resolution: 'Escalated to human operator who identified flash mob (harmless)',
			learned: 'New pattern category added: coordinated harmless gatherings',
			humanInvolved: true
		}
	];
}
