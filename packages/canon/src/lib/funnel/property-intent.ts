export type FunnelProperty = 'ltd' | 'io' | 'lms' | 'space' | 'agency';
export type FunnelStage = 'discover' | 'understand' | 'learn' | 'practice' | 'qualify' | 'book';
export type FunnelActionType = 'cta' | 'nav' | 'action';
export type FunnelLane = 'canon' | 'research' | 'guided_practice' | 'runtime_validation' | 'policy_os' | 'workflow_infrastructure';

export interface PropertyFunnelStep {
	id: FunnelProperty;
	label: string;
	role: string;
	href: string;
	summary: string;
}

export interface PropertyFunnelAction {
	label: string;
	href: string;
	cta: string;
	type: FunnelActionType;
	intent: string;
	stage: FunnelStage;
	lane: FunnelLane;
}

export interface JourneyContext {
	journeyId: string;
	source: FunnelProperty;
	intent: string;
	stage: FunnelStage;
	lane: FunnelLane;
}

export const PROPERTY_FUNNEL_STEPS: PropertyFunnelStep[] = [
	{
		id: 'ltd',
		label: '.ltd',
		role: 'Canon',
		href: 'https://createsomething.ltd',
		summary: 'Clarify the principles, standards, and judgment that should guide the work.'
	},
	{
		id: 'io',
		label: '.io',
		role: 'Research',
		href: 'https://createsomething.io',
		summary: 'Inspect the evidence, field reports, and operating notes behind the claim.'
	},
	{
		id: 'lms',
		label: '.learn',
		role: 'School',
		href: 'https://learn.createsomething.space',
		summary: 'Follow a guided path and leave with an inspectable working artifact.'
	},
	{
		id: 'space',
		label: '.space',
		role: 'Workbench',
		href: 'https://createsomething.space',
		summary: 'Run the tools and rehearse the behavior before the pattern becomes delivery.'
	},
	{
		id: 'agency',
		label: '.agency',
		role: 'Build',
		href: 'https://createsomething.agency',
		summary: 'Map one workflow, qualify the control boundary, and choose the delivery path.'
	}
];

const PROPERTY_FUNNEL_ACTIONS: Record<FunnelProperty, PropertyFunnelAction[]> = {
	ltd: [
		{
			label: 'Read the research',
			href: 'https://createsomething.io',
			cta: 'property-funnel-next-io',
			type: 'nav',
			intent: 'canon-to-evidence',
			stage: 'understand',
			lane: 'research'
		},
		{
			label: 'Apply the canon to one workflow',
			href: 'https://createsomething.agency/practice',
			cta: 'property-funnel-practice-ltd',
			type: 'cta',
			intent: 'canon-to-practice',
			stage: 'qualify',
			lane: 'policy_os'
		}
	],
	io: [
		{
			label: 'Try the workbench',
			href: 'https://createsomething.space',
			cta: 'property-funnel-next-space',
			type: 'nav',
			intent: 'research-to-runtime',
			stage: 'practice',
			lane: 'runtime_validation'
		},
		{
			label: 'Follow a guided practicum',
			href: 'https://learn.createsomething.space',
			cta: 'property-funnel-next-learn',
			type: 'nav',
			intent: 'research-to-learning',
			stage: 'learn',
			lane: 'guided_practice'
		},
		{
			label: 'Map the researched workflow',
			href: 'https://createsomething.agency/practice',
			cta: 'property-funnel-practice-io',
			type: 'cta',
			intent: 'research-to-practice',
			stage: 'qualify',
			lane: 'workflow_infrastructure'
		}
	],
	lms: [
		{
			label: 'Open the workbench',
			href: 'https://createsomething.space',
			cta: 'property-funnel-next-space',
			type: 'nav',
			intent: 'learning-to-runtime',
			stage: 'practice',
			lane: 'runtime_validation'
		},
		{
			label: 'Review the canon',
			href: 'https://createsomething.ltd',
			cta: 'property-funnel-depth-ltd',
			type: 'nav',
			intent: 'learning-to-canon',
			stage: 'understand',
			lane: 'canon'
		},
		{
			label: 'Use this learning in a workflow',
			href: 'https://createsomething.agency/practice',
			cta: 'property-funnel-practice-learn',
			type: 'cta',
			intent: 'learning-to-practice',
			stage: 'qualify',
			lane: 'policy_os'
		}
	],
	space: [
		{
			label: 'Map what you validated',
			href: 'https://createsomething.agency/practice',
			cta: 'property-funnel-practice-space',
			type: 'cta',
			intent: 'runtime-to-practice',
			stage: 'qualify',
			lane: 'workflow_infrastructure'
		},
		{
			label: 'Review the evidence',
			href: 'https://createsomething.io',
			cta: 'property-funnel-depth-io',
			type: 'nav',
			intent: 'runtime-to-evidence',
			stage: 'understand',
			lane: 'research'
		}
	],
	agency: [
		{
			label: 'Map one workflow',
			href: '/practice',
			cta: 'property-funnel-practice-agency',
			type: 'action',
			intent: 'workflow-practice',
			stage: 'qualify',
			lane: 'workflow_infrastructure'
		},
		{
			label: 'Review the operating model',
			href: '/services',
			cta: 'property-funnel-services-agency',
			type: 'nav',
			intent: 'services-evaluation',
			stage: 'understand',
			lane: 'policy_os'
		},
		{
			label: 'Talk through one mapped workflow',
			href: '/book',
			cta: 'property-funnel-book-agency',
			type: 'cta',
			intent: 'workflow-mapping',
			stage: 'book',
			lane: 'workflow_infrastructure'
		}
	]
};

export function getPropertyFunnelActions(property: FunnelProperty): PropertyFunnelAction[] {
	return PROPERTY_FUNNEL_ACTIONS[property];
}

export function isJourneyId(value: string | null | undefined): value is string {
	return typeof value === 'string' && /^s_[a-z0-9]{6,32}_[a-z0-9]{4,16}$/i.test(value);
}

function isBoundedSlug(value: string): boolean {
	return /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value);
}

export function getJourneyIdFromUrl(url: string): string | null {
	try {
		const value = new URL(url).searchParams.get('journey');
		return isJourneyId(value) ? value : null;
	} catch {
		return null;
	}
}

export function withJourneyContext(href: string, context: JourneyContext): string {
	const url = new URL(href, 'https://createsomething.agency');
	if (isJourneyId(context.journeyId)) {
		url.searchParams.set('journey', context.journeyId);
	}
	url.searchParams.set('source', context.source);
	if (isBoundedSlug(context.intent)) url.searchParams.set('intent', context.intent);
	url.searchParams.set('stage', context.stage);
	url.searchParams.set('lane', context.lane);
	return url.toString();
}
