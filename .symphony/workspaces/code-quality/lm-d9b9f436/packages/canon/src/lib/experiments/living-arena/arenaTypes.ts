/**
 * Living Arena - Type Definitions
 * 
 * Types for the arena visualization experiment demonstrating
 * AI-native automation coordination across venue systems.
 */

export type SecurityStatus = 'armed' | 'monitoring' | 'alert' | 'patrol';
export type LightingMode = 'event' | 'ambient' | 'emergency' | 'minimal';
export type CrowdFlow = 'entering' | 'vip' | 'dispersing' | 'sheltering' | 'evacuating' | 'exiting' | 'empty';
export type IncidentType = 'success' | 'failure' | 'override' | 'escalation';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface HvacZone {
	id: number;
	name: string;
	temp: number;
	target: number;
	active: boolean;
}

export interface CurrentEvent {
	name: string;
	phase: string;
	attendance: number;
	capacity: number;
}

export interface Notification {
	id: number;
	system: string;
	message: string;
	time: string;
	priority: NotificationPriority;
}

export interface ScenarioResponse {
	system: string;
	action: string;
}

export interface IntelligenceScenario {
	id: string;
	trigger: string;
	phase: string;
	responses: ScenarioResponse[];
	humanLoop: string;
	humanLoopCritical?: boolean;
	insight: string;
	visualCue: string;
}

export interface ReasoningExample {
	situation: string;
	thinking: string[];
	decision: string;
	confidence: number;
	alternative: string;
}

export interface SystemUpdate {
	system: string;
	before: string;
	after: string;
	reason: string;
}

export interface HolisticUpdate {
	trigger: string;
	timestamp: string;
	systemUpdates: SystemUpdate[];
	humanApproval: string;
	totalTime: string;
}

export interface Incident {
	id: number;
	timestamp: string;
	type: IncidentType;
	system: string;
	event: string;
	resolution: string;
	learned: string;
	humanInvolved: boolean;
}

export interface IncidentTemplate {
	type: string;
	system: string;
	event: string;
	resolution: string;
	learned: string;
}

export interface Particle {
	id: number;
	x: number;
	y: number;
	targetX: number;
	targetY: number;
	speed: number;
	size: number;
}

export interface ScenarioEffect {
	zones: string[];
	entry: string | null;
	securityStatus: SecurityStatus;
	lightingMode: LightingMode;
	crowdFlow: CrowdFlow;
	attendance: number;
}

export interface EventPhase {
	phase: string;
	attendance: number;
}

export interface ScenarioMessage {
	system: string;
	message: string;
}
