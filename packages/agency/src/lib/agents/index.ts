/**
 * Agents Module
 *
 * The "Apps + Agents" positioning for .agency
 *
 * Templates provide the App. WORKWAY provides the Agents.
 * This module maps them together.
 */

export {
	type Agent,
	type Vertical,
	verticals,
	getVertical,
	getVerticalsByCategory,
	getAllAgents,
	getAgentsForVertical,
	getAgent,
	getAgentsByTier,
	countAgents,
	getExampleOutcomes,
} from './registry.js';
