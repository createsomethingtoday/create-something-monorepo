/**
 * Living Arena - Complete System
 * 
 * SVG-based arena simulation with crowd dynamics.
 * Status: 1 of 1 (experiment-specific)
 * 
 * Graduation: If arena simulation is reused,
 * generalize to `@create-something/canon/components/simulation`
 */

// Types
export type {
	SecurityStatus,
	LightingMode,
	Particle,
	Incident,
	HvacZone,
	Notification,
	ReasoningExample
} from './arenaTypes.js';

// Data and utilities
export {
	intelligenceScenarios,
	particleColors,
	reasoningExamples,
	holisticUpdate,
	incidentTypes,
	scenarioEffects,
	scenarioMessages,
	createInitialHvacZones,
	createInitialNotifications,
	createInitialIncidentLog
} from './arenaData.js';

// Particle system
export { generateParticles, updateParticles } from './arenaParticles.js';
