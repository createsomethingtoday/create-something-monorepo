/**
 * Renderer-independent motion intent contracts.
 *
 * Intent describes the user-visible meaning and semantic targets of a sequence.
 * Browser runtimes such as CSS, the View Transitions API, GSAP, or a canvas
 * renderer remain adapters and must not become the source of truth.
 */

export const semanticColorRoles = [
	'performance.ink',
	'performance.growth',
	'performance.signal',
	'performance.pressure',
	'performance.risk',
	'performance.gold'
] as const;

export type SemanticColorRole = (typeof semanticColorRoles)[number];

export type MotionChannel =
	| 'background-color'
	| 'border-color'
	| 'color'
	| 'opacity'
	| 'scale'
	| 'transform';

export type MotionInterruptionPolicy = 'replace' | 'queue' | 'ignore';
export type ReducedMotionPolicy = 'settle-immediately' | 'preserve-essential-fades';
export type MotionRuntime = 'gsap' | 'instant' | 'native';

export type MotionStage = {
	id: string;
	label: string;
	intent: 'apply' | 'update' | 'pressure' | 'validate' | 'settle';
	target: string;
	durationMs: number;
	channels: MotionChannel[];
	colorRole: SemanticColorRole;
	announce: string;
};

export type MotionIntent = {
	version: 1;
	id: string;
	event: string;
	interruption: MotionInterruptionPolicy;
	reducedMotion: ReducedMotionPolicy;
	stages: MotionStage[];
};

export type MotionIntentValidation = {
	ok: boolean;
	issues: string[];
};

const semanticColorRoleSet = new Set<string>(semanticColorRoles);
const performanceLabStageOrder = [
	'policy-applied',
	'metrics-moved',
	'pressure-visible',
	'validation-adjusted',
	'receipt-settled'
] as const;

export function validateMotionIntent(intent: MotionIntent): MotionIntentValidation {
	const issues: string[] = [];
	const stageIds = new Set<string>();

	if (intent.version !== 1) issues.push('Motion intent version must be 1.');
	if (!intent.id.trim()) issues.push('Motion intent id is required.');
	if (!intent.event.trim()) issues.push('Motion intent event is required.');
	if (intent.stages.length === 0) issues.push('Motion intent requires at least one stage.');

	for (const stage of intent.stages) {
		if (!stage.id.trim()) issues.push('Every motion stage requires an id.');
		if (stageIds.has(stage.id)) issues.push(`Duplicate motion stage id: ${stage.id}.`);
		stageIds.add(stage.id);

		if (!stage.target.trim()) issues.push(`Motion stage ${stage.id} requires a semantic target.`);
		if (!stage.announce.trim()) issues.push(`Motion stage ${stage.id} requires announcement copy.`);
		if (stage.durationMs < 0 || stage.durationMs > 2_000) {
			issues.push(`Motion stage ${stage.id} duration must be between 0 and 2000 ms.`);
		}
		if (!semanticColorRoleSet.has(stage.colorRole)) {
			issues.push(`Motion stage ${stage.id} must use a semantic color role.`);
		}
	}

	if (
		intent.id === 'performance-lab-policy-resolution' &&
		intent.stages.map((stage) => stage.id).join('|') !== performanceLabStageOrder.join('|')
	) {
		issues.push('Performance Lab motion stages must preserve their causal order.');
	}

	return { ok: issues.length === 0, issues };
}

export function resolveMotionStages(
	intent: MotionIntent,
	options: { reducedMotion: boolean }
): MotionStage[] {
	const validation = validateMotionIntent(intent);
	if (!validation.ok) {
		throw new Error(`Invalid motion intent: ${validation.issues.join(' ')}`);
	}

	if (!options.reducedMotion) {
		return intent.stages.map((stage) => ({ ...stage, channels: [...stage.channels] }));
	}

	if (intent.reducedMotion === 'settle-immediately') {
		const settled = intent.stages.at(-1);
		return settled ? [{ ...settled, channels: [...settled.channels], durationMs: 0 }] : [];
	}

	return intent.stages.map((stage) => ({
		...stage,
		channels: stage.channels.filter((channel) =>
			['background-color', 'border-color', 'color', 'opacity'].includes(channel)
		),
		durationMs: Math.min(stage.durationMs, 120)
	}));
}

export function selectMotionRuntime(
	intent: MotionIntent,
	capabilities: { gsap: boolean; reducedMotion: boolean }
): MotionRuntime {
	const validation = validateMotionIntent(intent);
	if (!validation.ok) {
		throw new Error(`Invalid motion intent: ${validation.issues.join(' ')}`);
	}
	if (capabilities.reducedMotion && intent.reducedMotion === 'settle-immediately') return 'instant';
	if (capabilities.gsap && intent.stages.length > 1) return 'gsap';
	return 'native';
}

export const PERFORMANCE_LAB_SEQUENCE: MotionIntent = {
	version: 1,
	id: 'performance-lab-policy-resolution',
	event: 'performance-lab.policy.applied',
	interruption: 'replace',
	reducedMotion: 'settle-immediately',
	stages: [
		{
			id: 'policy-applied',
			label: 'Policy applied',
			intent: 'apply',
			target: 'performance-lab.policy',
			durationMs: 220,
			channels: ['border-color', 'background-color', 'scale'],
			colorRole: 'performance.ink',
			announce: 'Policy applied.'
		},
		{
			id: 'metrics-moved',
			label: 'Metrics moved',
			intent: 'update',
			target: 'performance-lab.metrics',
			durationMs: 260,
			channels: ['border-color', 'color', 'transform'],
			colorRole: 'performance.growth',
			announce: 'Metrics updated.'
		},
		{
			id: 'pressure-visible',
			label: 'Pressure visible',
			intent: 'pressure',
			target: 'performance-lab.pressure',
			durationMs: 260,
			channels: ['border-color', 'background-color', 'opacity'],
			colorRole: 'performance.pressure',
			announce: 'Resource pressure visible.'
		},
		{
			id: 'validation-adjusted',
			label: 'Validation adjusted',
			intent: 'validate',
			target: 'performance-lab.validation',
			durationMs: 300,
			channels: ['border-color', 'color', 'scale'],
			colorRole: 'performance.risk',
			announce: 'Validation adjusted the score.'
		},
		{
			id: 'receipt-settled',
			label: 'Receipt settled',
			intent: 'settle',
			target: 'performance-lab.receipt',
			durationMs: 340,
			channels: ['border-color', 'background-color', 'opacity'],
			colorRole: 'performance.gold',
			announce: 'Decision receipt settled.'
		}
	]
};
