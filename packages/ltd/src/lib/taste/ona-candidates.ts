import type { ArenaBlock } from '$lib/integrations/arena';

export const DEFAULT_ONA_CANDIDATE_QUERIES = [
	'background agents interface',
	'minimal developer tool interface',
	'mission control software agents',
	'clear product UI',
	'agent workflow proof'
] as const;

export const ONA_OPERATOR_ACTIONS = [
	'approve',
	'reject',
	'redirect',
	'need_evidence'
] as const;

export type OnaOperatorAction = (typeof ONA_OPERATOR_ACTIONS)[number];

export interface OnaCandidateDecision {
	defaultAction: OnaOperatorAction;
	actions: OnaOperatorAction[];
}

export interface OnaCandidateCard {
	id: string;
	arenaId: number;
	title: string;
	class: ArenaBlock['class'];
	score: number;
	url: string;
	sourceUrl: string | null;
	imageUrl: string | null;
	summary: string;
	reasons: string[];
	risks: string[];
	decision: OnaCandidateDecision;
}

interface SignalRule {
	label: string;
	weight: number;
	terms: string[];
}

const ACCEPTED_CLASSES = new Set<ArenaBlock['class']>(['Image', 'Link', 'Media', 'Text']);

const POSITIVE_SIGNALS: SignalRule[] = [
	{
		label: 'literal offer or direct promise',
		weight: 18,
		terms: ['offer', 'build', 'deploy', 'ship', 'create', 'automate', 'platform', 'service']
	},
	{
		label: 'clear outcome language',
		weight: 16,
		terms: ['outcome', 'result', 'proof', 'evidence', 'receipt', 'metric', 'case study']
	},
	{
		label: 'operator or agent workflow',
		weight: 20,
		terms: ['agent', 'operator', 'workflow', 'approval', 'approve', 'review', 'task', 'handoff']
	},
	{
		label: 'compact operational interface',
		weight: 14,
		terms: ['interface', 'dashboard', 'mission control', 'console', 'navigation', 'system', 'panel']
	},
	{
		label: 'restrained visual language',
		weight: 12,
		terms: ['minimal', 'quiet', 'clear', 'simple', 'compact', 'light', 'plain', 'direct']
	},
	{
		label: 'mobile or field-ready operation',
		weight: 10,
		terms: ['mobile', 'phone', 'field', 'pocket', 'remote', 'on the go']
	},
	{
		label: 'visible governance or boundary',
		weight: 10,
		terms: ['guardrail', 'governance', 'policy', 'boundary', 'audit', 'permission', 'secure']
	}
];

const RISK_SIGNALS: SignalRule[] = [
	{
		label: 'decorative or spectacle-led',
		weight: 18,
		terms: ['gradient', 'decorative', 'spectacle', 'abstract', 'mood board', 'atmospheric', 'vibe']
	},
	{
		label: 'unclear business outcome',
		weight: 14,
		terms: ['inspiration', 'aesthetic', 'beautiful', 'visual exploration', 'concept only']
	},
	{
		label: 'asset-copying risk',
		weight: 22,
		terms: ['logo', 'brand mark', 'font file', 'generated css', 'source asset', 'clone', 'copied']
	},
	{
		label: 'heavy marketing without proof',
		weight: 12,
		terms: ['revolutionary', 'next generation', 'game changer', 'viral', 'launch campaign']
	}
];

export function rankOnaCandidates(blocks: ArenaBlock[], limit: number): OnaCandidateCard[] {
	const seen = new Set<number>();

	return blocks
		.filter((block) => {
			if (seen.has(block.id)) return false;
			seen.add(block.id);
			return ACCEPTED_CLASSES.has(block.class);
		})
		.map(scoreOnaCandidate)
		.filter((candidate) => candidate.score > 0 || candidate.reasons.length > 0)
		.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
		.slice(0, limit);
}

export function scoreOnaCandidate(block: ArenaBlock): OnaCandidateCard {
	const text = blockSearchText(block);
	const reasons = collectSignals(text, POSITIVE_SIGNALS);
	const risks = collectSignals(text, RISK_SIGNALS);
	const positiveScore = scoreSignals(reasons, POSITIVE_SIGNALS);
	const riskScore = scoreSignals(risks, RISK_SIGNALS);
	const classScore = classSignal(block);
	const score = clamp(positiveScore + classScore - riskScore, 0, 100);

	return {
		id: `arena-${block.id}`,
		arenaId: block.id,
		title: blockTitle(block),
		class: block.class,
		score,
		url: `https://www.are.na/block/${block.id}`,
		sourceUrl: block.source?.url ?? block.embed?.source_url ?? block.embed?.url ?? null,
		imageUrl:
			block.image?.display?.url ??
			block.image?.large?.url ??
			block.embed?.thumbnail_url ??
			block.image?.thumb?.url ??
			null,
		summary: summarizeBlock(block),
		reasons,
		risks,
		decision: decisionFor(score, risks)
	};
}

function blockTitle(block: ArenaBlock): string {
	return (
		block.title ||
		block.generated_title ||
		block.source?.title ||
		block.embed?.title ||
		`Are.na block ${block.id}`
	).trim();
}

function blockSearchText(block: ArenaBlock): string {
	return [
		block.title,
		block.generated_title,
		block.content,
		block.description,
		block.source?.title,
		block.source?.url,
		block.source?.provider?.name,
		block.embed?.title,
		block.embed?.author_name,
		block.embed?.source_url,
		block.connections?.map((channel) => channel.title).join(' ')
	]
		.filter(Boolean)
		.join(' ')
		.replace(/<[^>]+>/g, ' ')
		.toLowerCase();
}

function summarizeBlock(block: ArenaBlock): string {
	const summary = [
		block.description,
		block.content,
		block.source?.title,
		block.embed?.title,
		block.source?.provider?.name
	]
		.filter(Boolean)
		.join(' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (!summary) return `${block.class} block from Are.na.`;
	return summary.length > 220 ? `${summary.slice(0, 217).trim()}...` : summary;
}

function collectSignals(text: string, rules: SignalRule[]): string[] {
	return rules
		.filter((rule) => rule.terms.some((term) => text.includes(term)))
		.map((rule) => rule.label);
}

function scoreSignals(labels: string[], rules: SignalRule[]): number {
	return labels.reduce((total, label) => {
		const rule = rules.find((candidate) => candidate.label === label);
		return total + (rule?.weight ?? 0);
	}, 0);
}

function classSignal(block: ArenaBlock): number {
	switch (block.class) {
		case 'Link':
			return 8;
		case 'Text':
			return 6;
		case 'Image':
		case 'Media':
			return 4;
		default:
			return 0;
	}
}

function decisionFor(score: number, risks: string[]): OnaCandidateDecision {
	if (risks.includes('asset-copying risk')) {
		return { defaultAction: 'reject', actions: [...ONA_OPERATOR_ACTIONS] };
	}

	if (score >= 70 && risks.length === 0) {
		return { defaultAction: 'approve', actions: [...ONA_OPERATOR_ACTIONS] };
	}

	if (score >= 35) {
		return { defaultAction: 'need_evidence', actions: [...ONA_OPERATOR_ACTIONS] };
	}

	return { defaultAction: 'redirect', actions: [...ONA_OPERATOR_ACTIONS] };
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
