import { createGovernanceSignal, type GovernanceSignal } from './governance-runtime';

export type GovernanceSourceUpdateClassification = {
	requires_documentation_review: boolean;
	requires_reviewer_process_review: boolean;
	reasons: string[];
};

export type GovernanceSourceUpdateInput = {
	sourceType?: string | null;
	source?: string | null;
	channel?: string | null;
	sourceUrl?: string | null;
	atlasCanvasId?: string | null;
	atlasNodeId?: string | null;
	title?: string | null;
	summary?: string | null;
	text?: string | null;
	payload?: Record<string, unknown>;
};

export type GovernanceSourceUpdateIntakeResult =
	| {
			action: 'signal_created';
			classification: GovernanceSourceUpdateClassification;
			signal: GovernanceSignal;
	  }
	| {
			action: 'ignored';
			classification: GovernanceSourceUpdateClassification;
			signal: null;
	  };

type NormalizedGovernanceSourceUpdateInput = {
	sourceType: string;
	source: string;
	channel: string | null;
	sourceUrl: string | null;
	atlasCanvasId: string;
	atlasNodeId: string;
	title: string;
	summary: string;
	text: string;
	payload?: Record<string, unknown>;
};

interface D1PreparedStatementLike {
	bind(...values: unknown[]): D1PreparedStatementLike;
	all<T = unknown>(): Promise<{ results?: T[] }>;
	first<T = unknown>(): Promise<T | null>;
	run(): Promise<unknown>;
}

interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatementLike;
}

const DEFAULT_ATLAS_CANVAS_ID = 'governance_source_updates';
const DEFAULT_ATLAS_NODE_ID = 'watched_source_updates';

const DOCUMENTATION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
	{ pattern: /\b(api|endpoint|route|webhook|sdk|graphql|rest)\b/i, reason: 'API surface changed' },
	{ pattern: /\b(parameter|param|field|schema|payload|request|response|enum|header)\b/i, reason: 'Contract shape changed' },
	{ pattern: /\b(documentation|docs|reference|guide|changelog|openapi)\b/i, reason: 'Documentation was mentioned' },
	{ pattern: /\b(deprecat(?:e|ed|ion)|breaking|rename(?:d)?|removed?|beta|version(?:ed)?)\b/i, reason: 'Release semantics changed' }
];

const REVIEWER_PROCESS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
	{ pattern: /\b(review(?:er)?|approval|approve|checklist|qa|policy|process)\b/i, reason: 'Reviewer workflow was mentioned' },
	{ pattern: /\b(required|required|must|block(?:er|ing)?|compliance|exception)\b/i, reason: 'Review requirement changed' },
	{ pattern: /\b(marketplace|template review|app review|submission)\b/i, reason: 'Review surface was mentioned' }
];

export async function intakeGovernanceSourceUpdate(
	db: D1DatabaseLike,
	input: GovernanceSourceUpdateInput
): Promise<GovernanceSourceUpdateIntakeResult> {
	const normalized = normalizeSourceUpdateInput(input);
	const classification = classifyGovernanceSourceUpdate(normalized);

	if (!classification.requires_documentation_review && !classification.requires_reviewer_process_review) {
		return {
			action: 'ignored',
			classification,
			signal: null
		};
	}

	const signal = await createGovernanceSignal(db, {
		atlasCanvasId: normalized.atlasCanvasId,
		atlasNodeId: normalized.atlasNodeId,
		source: normalized.source,
		sourceUrl: normalized.sourceUrl,
		title: normalized.title,
		summary: normalized.summary,
		payload: {
			...(normalized.payload ?? {}),
			source_update: {
				source_type: normalized.sourceType,
				channel: normalized.channel,
				text: normalized.text
			},
			classification
		}
	});

	return {
		action: 'signal_created',
		classification,
		signal
	};
}

export function normalizeSourceUpdateRequestBody(
	body: Record<string, unknown>
): GovernanceSourceUpdateInput {
	return {
		sourceType: stringFromBody(body, 'source_type', 'sourceType'),
		source: stringFromBody(body, 'source'),
		channel: stringFromBody(body, 'channel'),
		sourceUrl: stringFromBody(body, 'source_url', 'sourceUrl') ?? stringFromBody(body, 'message_url', 'messageUrl'),
		atlasCanvasId: stringFromBody(body, 'atlas_canvas_id', 'atlasCanvasId'),
		atlasNodeId: stringFromBody(body, 'atlas_node_id', 'atlasNodeId'),
		title: stringFromBody(body, 'title'),
		summary: stringFromBody(body, 'summary'),
		text: stringFromBody(body, 'text') ?? stringFromBody(body, 'body'),
		payload: objectFromBody(body, 'payload')
	};
}

export function classifyGovernanceSourceUpdate(
	input: GovernanceSourceUpdateInput
): GovernanceSourceUpdateClassification {
	const text = [input.title, input.summary, input.text].filter(Boolean).join('\n');
	const reasons = new Set<string>();
	const requiresDocumentationReview = DOCUMENTATION_PATTERNS.some(({ pattern, reason }) => {
		const matched = pattern.test(text);
		if (matched) reasons.add(reason);
		return matched;
	});
	const requiresReviewerProcessReview = REVIEWER_PROCESS_PATTERNS.some(({ pattern, reason }) => {
		const matched = pattern.test(text);
		if (matched) reasons.add(reason);
		return matched;
	});

	return {
		requires_documentation_review: requiresDocumentationReview,
		requires_reviewer_process_review: requiresReviewerProcessReview,
		reasons: [...reasons]
	};
}

function normalizeSourceUpdateInput(
	input: GovernanceSourceUpdateInput
): NormalizedGovernanceSourceUpdateInput {
	const sourceType = normalizeText(input.sourceType, 80) ?? 'source';
	const channel = normalizeText(input.channel, 120);
	const source = normalizeText(input.source, 160) ?? `${sourceType}${channel ? `:${channel}` : ''}`;
	const text = normalizeText(input.text, 4_000) ?? '';
	const summary =
		normalizeText(input.summary, 2_000) ?? (text || 'Watched source update requires review.');
	const title =
		normalizeText(input.title, 220) ??
		(summary.length > 120 ? `${summary.slice(0, 117).trimEnd()}...` : summary);

	return {
		sourceType,
		source,
		channel,
		sourceUrl: normalizeText(input.sourceUrl, 500),
		atlasCanvasId: normalizeText(input.atlasCanvasId, 160) ?? DEFAULT_ATLAS_CANVAS_ID,
		atlasNodeId: normalizeText(input.atlasNodeId, 160) ?? DEFAULT_ATLAS_NODE_ID,
		title,
		summary,
		text,
		payload: input.payload
	};
}

function normalizeText(value: unknown, maxLength: number): string | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().slice(0, maxLength);
	return normalized || null;
}

function stringFromBody(
	body: Record<string, unknown>,
	primaryKey: string,
	secondaryKey?: string
): string | undefined {
	const value = body[primaryKey] ?? (secondaryKey ? body[secondaryKey] : undefined);
	return typeof value === 'string' ? value : undefined;
}

function objectFromBody(body: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
	const value = body[key];
	if (value == null) return undefined;
	if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
	throw new Error(`${key} must be an object`);
}
