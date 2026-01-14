/**
 * Agent Registry
 *
 * Maps verticals to their available WORKWAY workflows (agents).
 * This is the source of truth for the "Apps + Agents" positioning.
 *
 * Each vertical comes with a set of agents that keep working after launch.
 * Generation is table stakes; ongoing automation is the moat.
 */

export interface Agent {
	/** Unique identifier matching WORKWAY workflow ID */
	id: string;
	/** Human-readable name */
	name: string;
	/** What outcome this agent delivers */
	outcome: string;
	/** Brief description */
	description: string;
	/** Measurable value delivered */
	valueMetric?: string;
	/** Which tier includes this agent */
	tier: 'free' | 'pro' | 'enterprise';
	/** WORKWAY integrations used */
	integrations: string[];
}

export interface Vertical {
	/** Unique slug */
	slug: string;
	/** Display name */
	name: string;
	/** Short tagline */
	tagline: string;
	/** Category */
	category: 'healthcare' | 'professional-services' | 'hospitality' | 'retail' | 'operations';
	/** Agents included with this vertical */
	agents: Agent[];
	/** Template demo URL */
	demoUrl?: string;
	/** Icon (emoji) */
	icon: string;
}

/**
 * Healthcare Verticals
 */
const dentalPractice: Vertical = {
	slug: 'dental-practice',
	name: 'Dental Practice',
	tagline: 'Appointments that book themselves',
	category: 'healthcare',
	icon: '🦷',
	demoUrl: 'https://dental-practice.createsomething.space',
	agents: [
		{
			id: 'dental-no-show-recovery',
			name: 'No-Show Recovery',
			outcome: 'Recovered revenue from missed appointments',
			description:
				'Detects no-shows → matches waitlist patients → sends offers → books confirmed slots',
			valueMetric: '$2,000-5,000/month recovered',
			tier: 'pro',
			integrations: ['nexhealth', 'weave', 'twilio'],
		},
		{
			id: 'dental-insurance-verification',
			name: 'Insurance Verification',
			outcome: 'Coverage confirmed before visits',
			description:
				'Verifies insurance eligibility 48 hours before appointments → alerts staff to issues',
			valueMetric: '90%+ verification rate',
			tier: 'pro',
			integrations: ['nexhealth', 'sikka'],
		},
		{
			id: 'dental-recall-reminders',
			name: 'Recall Automation',
			outcome: 'Patients re-engaged automatically',
			description:
				'Identifies overdue patients → sends personalized recall reminders → tracks conversions',
			valueMetric: '15-25% recall conversion',
			tier: 'pro',
			integrations: ['nexhealth', 'weave'],
		},
		{
			id: 'dental-review-requests',
			name: 'Review Requests',
			outcome: 'More 5-star reviews',
			description: 'Sends review requests after completed appointments → routes to Google/Yelp',
			valueMetric: '3x review volume',
			tier: 'pro',
			integrations: ['weave'],
		},
	],
};

const medicalPractice: Vertical = {
	slug: 'medical-practice',
	name: 'Medical Practice',
	tagline: 'Patient care, not paperwork',
	category: 'healthcare',
	icon: '🏥',
	demoUrl: 'https://medical-practice.createsomething.space',
	agents: [
		{
			id: 'medical-appointment-reminders',
			name: 'Appointment Reminders',
			outcome: 'Reduced no-shows',
			description: 'Multi-channel reminders (SMS, email, voice) with confirmation tracking',
			valueMetric: '40% reduction in no-shows',
			tier: 'pro',
			integrations: ['nexhealth', 'weave'],
		},
		{
			id: 'medical-intake-automation',
			name: 'Intake Automation',
			outcome: 'Paperwork completed before visits',
			description: 'Digital forms sent before appointments → auto-populate patient records',
			valueMetric: '80% pre-visit completion',
			tier: 'pro',
			integrations: ['nexhealth'],
		},
		{
			id: 'medical-referral-tracking',
			name: 'Referral Tracking',
			outcome: 'No lost referrals',
			description: 'Tracks referrals from receipt to scheduled appointment → follows up automatically',
			tier: 'enterprise',
			integrations: ['nexhealth'],
		},
	],
};

/**
 * Professional Services Verticals
 */
const lawFirm: Vertical = {
	slug: 'law-firm',
	name: 'Law Firm',
	tagline: 'Clients that convert themselves',
	category: 'professional-services',
	icon: '⚖️',
	demoUrl: 'https://law-firm.createsomething.space',
	agents: [
		{
			id: 'legal-consultation-booking',
			name: 'Consultation Booking',
			outcome: 'Consultations scheduled 24/7',
			description:
				'Website visitors book consultations → calendar synced → intake forms sent automatically',
			valueMetric: '2x consultation volume',
			tier: 'pro',
			integrations: ['calendly', 'clio', 'hubspot'],
		},
		{
			id: 'legal-lead-qualification',
			name: 'Lead Qualification',
			outcome: 'High-value cases prioritized',
			description: 'Scores incoming leads based on case type, urgency, and value → routes to attorneys',
			tier: 'pro',
			integrations: ['clio', 'hubspot'],
		},
		{
			id: 'legal-deadline-tracking',
			name: 'Deadline Tracking',
			outcome: 'Never miss a filing deadline',
			description: 'Monitors case deadlines → sends reminders → escalates when approaching',
			tier: 'enterprise',
			integrations: ['clio'],
		},
		{
			id: 'legal-client-followup',
			name: 'Client Follow-up',
			outcome: 'Clients stay informed',
			description: 'Sends case updates at milestones → handles common questions automatically',
			tier: 'pro',
			integrations: ['clio', 'slack'],
		},
	],
};

const personalInjury: Vertical = {
	slug: 'personal-injury',
	name: 'Personal Injury',
	tagline: 'Cases that intake themselves',
	category: 'professional-services',
	icon: '🏛️',
	demoUrl: 'https://personal-injury.createsomething.space',
	agents: [
		{
			id: 'pi-intake-automation',
			name: 'PI Intake Automation',
			outcome: 'Cases captured 24/7',
			description:
				'Captures accident details → qualifies case value → routes to appropriate attorney',
			valueMetric: '3x intake capacity',
			tier: 'pro',
			integrations: ['clio', 'hubspot'],
		},
		{
			id: 'pi-medical-records',
			name: 'Medical Records Tracker',
			outcome: 'Records requested automatically',
			description: 'Tracks medical appointments → requests records → monitors for completion',
			tier: 'enterprise',
			integrations: ['clio'],
		},
	],
};

/**
 * Hospitality Verticals
 */
const restaurant: Vertical = {
	slug: 'restaurant',
	name: 'Restaurant',
	tagline: 'Tables that fill themselves',
	category: 'hospitality',
	icon: '🍽️',
	demoUrl: 'https://restaurant.createsomething.space',
	agents: [
		{
			id: 'restaurant-reservation-reminders',
			name: 'Reservation Reminders',
			outcome: 'Reduced no-shows',
			description: 'Sends confirmation requests → tracks responses → releases unclaimed tables',
			valueMetric: '50% no-show reduction',
			tier: 'pro',
			integrations: ['opentable', 'resy', 'twilio'],
		},
		{
			id: 'restaurant-review-requests',
			name: 'Review Requests',
			outcome: 'More positive reviews',
			description: 'Sends review requests after dining → routes satisfied guests to review sites',
			tier: 'pro',
			integrations: ['twilio'],
		},
	],
};

/**
 * Retail Verticals
 */
const fashionBoutique: Vertical = {
	slug: 'fashion-boutique',
	name: 'Fashion Boutique',
	tagline: 'Orders that process themselves',
	category: 'retail',
	icon: '👗',
	agents: [
		{
			id: 'fashion-order-notifications',
			name: 'Order Notifications',
			outcome: 'Customers always informed',
			description: 'Order confirmation → shipping updates → delivery notification',
			tier: 'pro',
			integrations: ['stripe', 'sendgrid'],
		},
		{
			id: 'fashion-inventory-alerts',
			name: 'Inventory Alerts',
			outcome: 'Never out of stock',
			description: 'Monitors inventory levels → alerts when low → suggests reorder quantities',
			tier: 'enterprise',
			integrations: ['shopify', 'airtable'],
		},
	],
};

/**
 * Operations (Aboard territory + Agents)
 */
const crmOperations: Vertical = {
	slug: 'crm',
	name: 'CRM',
	tagline: 'Leads that follow up themselves',
	category: 'operations',
	icon: '📊',
	agents: [
		{
			id: 'crm-lead-scoring',
			name: 'Lead Scoring',
			outcome: 'Best leads prioritized',
			description:
				'Scores leads based on engagement, fit, and timing → routes to right sales rep',
			tier: 'pro',
			integrations: ['hubspot', 'salesforce'],
		},
		{
			id: 'crm-followup-automation',
			name: 'Follow-up Automation',
			outcome: 'No lead falls through cracks',
			description: 'Sends follow-up sequences → tracks engagement → escalates hot leads',
			tier: 'pro',
			integrations: ['hubspot', 'sendgrid'],
		},
	],
};

const inventoryOperations: Vertical = {
	slug: 'inventory',
	name: 'Inventory Management',
	tagline: 'Stock that orders itself',
	category: 'operations',
	icon: '📦',
	agents: [
		{
			id: 'inventory-reorder',
			name: 'Auto-Reorder',
			outcome: 'Never run out',
			description: 'Monitors stock levels → calculates reorder points → creates purchase orders',
			tier: 'pro',
			integrations: ['airtable', 'quickbooks'],
		},
		{
			id: 'inventory-demand-forecast',
			name: 'Demand Forecasting',
			outcome: 'Right stock at right time',
			description: 'Analyzes historical data → predicts demand → adjusts reorder quantities',
			tier: 'enterprise',
			integrations: ['airtable'],
		},
	],
};

/**
 * All verticals in the registry
 */
export const verticals: Vertical[] = [
	// Healthcare
	dentalPractice,
	medicalPractice,
	// Professional Services
	lawFirm,
	personalInjury,
	// Hospitality
	restaurant,
	// Retail
	fashionBoutique,
	// Operations
	crmOperations,
	inventoryOperations,
];

/**
 * Get vertical by slug
 */
export function getVertical(slug: string): Vertical | undefined {
	return verticals.find((v) => v.slug === slug);
}

/**
 * Get verticals by category
 */
export function getVerticalsByCategory(
	category: Vertical['category']
): Vertical[] {
	return verticals.filter((v) => v.category === category);
}

/**
 * Get all agents across all verticals
 */
export function getAllAgents(): Agent[] {
	return verticals.flatMap((v) => v.agents);
}

/**
 * Get agents for a specific vertical
 */
export function getAgentsForVertical(slug: string): Agent[] {
	const vertical = getVertical(slug);
	return vertical?.agents ?? [];
}

/**
 * Get agent by ID
 */
export function getAgent(id: string): Agent | undefined {
	return getAllAgents().find((a) => a.id === id);
}

/**
 * Get agents by tier
 */
export function getAgentsByTier(tier: Agent['tier']): Agent[] {
	return getAllAgents().filter((a) => a.tier === tier);
}

/**
 * Count total agents
 */
export function countAgents(): number {
	return getAllAgents().length;
}

/**
 * Get example outcomes for marketing
 */
export function getExampleOutcomes(): Array<{ vertical: string; agent: string; outcome: string; metric?: string }> {
	return [
		{
			vertical: 'Dental Practice',
			agent: 'No-Show Recovery',
			outcome: 'Recovered revenue from missed appointments',
			metric: '$2,000-5,000/month',
		},
		{
			vertical: 'Law Firm',
			agent: 'Lead Qualification',
			outcome: 'High-value cases prioritized automatically',
		},
		{
			vertical: 'Restaurant',
			agent: 'Reservation Reminders',
			outcome: '50% fewer no-shows',
			metric: '50% reduction',
		},
		{
			vertical: 'Medical Practice',
			agent: 'Intake Automation',
			outcome: 'Paperwork completed before visits',
			metric: '80% pre-visit completion',
		},
	];
}
