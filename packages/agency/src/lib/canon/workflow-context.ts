import { canonActionDefinitions, canonControlContext, type CanonActionDefinition } from './control';

export type CanonRuntimeStatus = 'ok' | 'warning' | 'blocked' | 'idle';
export type CanonWorkflowSource = 'd1' | 'fallback';

export interface CanonRuntimeCheck {
	label: string;
	status?: CanonRuntimeStatus;
	detail?: string;
}

export interface CanonWorkflowRuntime {
	label: string;
	status: CanonRuntimeStatus;
	environment: string;
	lastChecked: string;
	checks: CanonRuntimeCheck[];
}

export interface CanonWorkflowLayer {
	tier: 'Database' | 'Automation' | 'Judgment';
	title: string;
	status: string;
	description: string;
	evidence?: string[];
	tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

export interface CanonWorkflowEvidenceItem {
	id?: string;
	label: string;
	detail?: string;
	source?: string;
	href?: string;
	tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
	timestamp?: string;
}

export interface CanonWorkflowDecisionItem {
	id?: string;
	title: string;
	description?: string;
	owner?: string;
	due?: string;
	state?: 'review' | 'approved' | 'blocked' | 'open' | 'ready';
	tier?: 'Database' | 'Automation' | 'Judgment';
}

export interface CanonWorkflowArtifactItem {
	title: string;
	type?: string;
	description?: string;
	href?: string;
	visibility?: 'public' | 'private' | 'internal';
	tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

export interface CanonWorkflowApproval {
	title: string;
	description: string;
	approvalState: 'review' | 'approved' | 'blocked';
	requiredApprover: string;
	primaryActionLabel: string;
	secondaryActionLabel: string;
}

export interface CanonWorkflowAgent {
	title: string;
	placeholder: string;
	suggestedPrompts: Array<{ label: string; prompt: string }>;
	initialMessages: Array<{ role: 'agent' | 'operator'; body: string; grounding?: string[] }>;
}

export interface CanonWorkflowContext {
	contextId: string;
	title: string;
	summary: string;
	source: CanonWorkflowSource;
	updatedAt: string | null;
	runtime: CanonWorkflowRuntime;
	layers: CanonWorkflowLayer[];
	actions: CanonActionDefinition[];
	approval: CanonWorkflowApproval;
	evidence: CanonWorkflowEvidenceItem[];
	decisions: CanonWorkflowDecisionItem[];
	artifacts: CanonWorkflowArtifactItem[];
	agent: CanonWorkflowAgent;
	guardrails: string[];
}

interface CanonWorkflowContextRow {
	context_id: string;
	title: string;
	summary: string;
	workflow_json: string;
	updated_at: string | null;
}

export const DEFAULT_CANON_WORKFLOW_CONTEXT_ID = 'create-something-governed-workflow-console';

export function sanitizeCanonContextId(value: unknown): string {
	const raw = typeof value === 'string' ? value.trim() : '';
	if (!raw) return DEFAULT_CANON_WORKFLOW_CONTEXT_ID;
	return raw.replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 96) || DEFAULT_CANON_WORKFLOW_CONTEXT_ID;
}

export async function loadCanonWorkflowContext(
	db: D1Database | null | undefined,
	rawContextId: unknown
): Promise<CanonWorkflowContext> {
	const contextId = sanitizeCanonContextId(rawContextId);
	const fallback = buildFallbackCanonWorkflowContext(contextId);

	if (!db) return fallback;

	try {
		const row = await db
			.prepare(
				`SELECT context_id, title, summary, workflow_json, updated_at
				 FROM canon_workflow_contexts
				 WHERE context_id = ? AND visibility IN ('public', 'internal')
				 LIMIT 1`
			)
			.bind(contextId)
			.first<CanonWorkflowContextRow>();

		if (!row) return fallback;

		return mergeCanonWorkflowContext(row, fallback);
	} catch {
		return fallback;
	}
}

export function selectCanonWorkflowAction(context: CanonWorkflowContext, actionId: string): CanonActionDefinition {
	return context.actions.find((action) => action.id === actionId) ?? context.actions[0] ?? canonActionDefinitions[0];
}

function mergeCanonWorkflowContext(row: CanonWorkflowContextRow, fallback: CanonWorkflowContext): CanonWorkflowContext {
	const parsed = safeParseRecord(row.workflow_json);
	const actions = normalizeActions(parsed.actions, fallback.actions);

	return {
		...fallback,
		contextId: row.context_id,
		title: row.title || fallback.title,
		summary: row.summary || fallback.summary,
		source: 'd1',
		updatedAt: row.updated_at ?? fallback.updatedAt,
		runtime: normalizeRuntime(parsed.runtime, fallback.runtime),
		layers: normalizeArray<CanonWorkflowLayer>(parsed.layers, fallback.layers),
		actions,
		approval: normalizeApproval(parsed.approval, fallback.approval),
		evidence: normalizeArray<CanonWorkflowEvidenceItem>(parsed.evidence, fallback.evidence),
		decisions: normalizeArray<CanonWorkflowDecisionItem>(parsed.decisions, fallback.decisions),
		artifacts: normalizeArray<CanonWorkflowArtifactItem>(parsed.artifacts, fallback.artifacts),
		agent: normalizeAgent(parsed.agent, fallback.agent),
		guardrails: normalizeStringArray(parsed.guardrails, fallback.guardrails)
	};
}

function buildFallbackCanonWorkflowContext(contextId: string): CanonWorkflowContext {
	return {
		contextId,
		title: 'CREATE SOMETHING Governed Workflow Console',
		summary:
			'A Webflow operator console backed by Cloudflare workflow state, preview-only actions, evidence, decisions, approval state, and client-safe artifacts.',
		source: 'fallback',
		updatedAt: null,
		runtime: {
			label: 'Canon Runtime',
			status: 'ok',
			environment: 'Webflow + Cloudflare',
			lastChecked: 'Preview ready',
			checks: [
				{ label: 'Cloudflare route', status: 'ok', detail: 'Ready for preview calls' },
				{ label: 'Action execution', status: 'idle', detail: 'Preview-only in v1' },
				{ label: 'Policy boundary', status: 'ok', detail: 'Human approval required for mutations' }
			]
		},
		layers: [
			{
				tier: 'Database',
				title: 'Operational Memory',
				status: 'Structured',
				description: 'The surface separates authoritative records, review state, and evidence so every action can be traced.',
				evidence: ['Source records', 'Review state', 'Evidence IDs'],
				tone: 'info'
			},
			{
				tier: 'Automation',
				title: 'Callable Runtime',
				status: 'Cloudflare-ready',
				description: 'Actions are prepared as previews before they reach workflow tools, MCP servers, or external systems.',
				evidence: ['API route', 'Action contract', 'Runtime checks'],
				tone: 'success'
			},
			{
				tier: 'Judgment',
				title: 'Approval Boundary',
				status: 'Human-gated',
				description: 'Policy checks and operator approval determine whether a recommendation can become an executed action.',
				evidence: ['Policy checks', 'Approval owner', 'Decision log'],
				tone: 'warning'
			}
		],
		actions: canonActionDefinitions.map((action) => ({
			...action,
			description: action.summary
		})),
		approval: {
			title: 'Human Approval Gate',
			description: 'The system can prepare the action, but a named operator approves it before execution.',
			approvalState: 'review',
			requiredApprover: 'Named operator',
			primaryActionLabel: 'Mark approved',
			secondaryActionLabel: 'Keep in review'
		},
		evidence: [
			{
				label: 'Workflow map',
				detail: 'Current workflow, owner, and decision states are captured before automation.',
				source: 'Delivery artifact',
				tone: 'info'
			},
			{
				label: 'Action contract',
				detail: 'Every action has a preview, policy checks, and a human approval state.',
				source: 'Cloudflare route',
				tone: 'success'
			},
			{
				label: 'Private boundary',
				detail: 'Source data, credentials, and raw client records stay outside the public surface.',
				source: 'Governance rule',
				tone: 'warning'
			}
		],
		decisions: [
			{
				title: 'Confirm authoritative data',
				description: 'Name the source of truth before automation reads or writes records.',
				owner: 'Operator',
				state: 'open',
				tier: 'Database'
			},
			{
				title: 'Approve action boundary',
				description: 'Decide which actions can be drafted and which require manual approval.',
				owner: 'Delivery lead',
				state: 'review',
				tier: 'Judgment'
			},
			{
				title: 'Enable runtime smoke',
				description: 'Verify the Cloudflare endpoint and fallback behavior before publishing.',
				owner: 'Engineer',
				state: 'ready',
				tier: 'Automation'
			}
		],
		artifacts: [
			{
				title: 'Operator Brief',
				type: 'Review Packet',
				description: 'A concise handoff that explains the workflow, risks, and next decision.',
				visibility: 'public',
				tone: 'info'
			},
			{
				title: 'Policy Rules',
				type: 'Governance',
				description: 'Rules that decide when an action can be drafted, previewed, approved, or blocked.',
				visibility: 'internal',
				tone: 'warning'
			},
			{
				title: 'Runtime Contract',
				type: 'Cloudflare API',
				description: 'Endpoint shape for bounded agent answers and action previews.',
				visibility: 'public',
				tone: 'success'
			}
		],
		agent: {
			title: 'Ask the Control Layer',
			placeholder: 'Ask what is approved, private, or ready to preview...',
			suggestedPrompts: [
				{ label: 'Explain the workflow', prompt: 'Explain how the database, automation, and judgment layers work together.' },
				{ label: 'What needs approval?', prompt: 'What decision needs approval before this action can run?' },
				{ label: 'What is private?', prompt: 'What should stay out of the public surface?' }
			],
			initialMessages: [
				{
					role: 'agent',
					body: 'I can answer from the approved Canon control context and keep private source material out of the response.',
					grounding: ['Governance rule', 'Evidence trail']
				}
			]
		},
		guardrails: canonControlContext.guardrails
	};
}

function safeParseRecord(value: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(value) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function normalizeArray<T>(value: unknown, fallback: T[]): T[] {
	return Array.isArray(value) && value.length > 0 ? (value as T[]) : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : fallback;
}

function normalizeActions(value: unknown, fallback: CanonActionDefinition[]): CanonActionDefinition[] {
	if (!Array.isArray(value) || value.length === 0) return fallback;

	const actions = value
		.map((entry): CanonActionDefinition | null => {
			if (!entry || typeof entry !== 'object') return null;
			const record = entry as Record<string, unknown>;
			if (typeof record.id !== 'string' || typeof record.label !== 'string') return null;

			const summary =
				typeof record.summary === 'string'
					? record.summary
					: typeof record.description === 'string'
						? record.description
						: record.label;

			return {
				id: record.id,
				label: record.label,
				description: typeof record.description === 'string' ? record.description : summary,
				summary,
				status:
					record.status === 'allowed' || record.status === 'requires_approval' || record.status === 'blocked'
						? record.status
						: 'requires_approval',
				risk: record.risk === 'low' || record.risk === 'medium' || record.risk === 'high' ? record.risk : 'medium',
				policyChecks: normalizeStringArray(record.policyChecks, []),
				evidence: normalizeStringArray(record.evidence, []),
				allowedNextActions: normalizeStringArray(record.allowedNextActions, [])
			};
		})
		.filter((entry): entry is CanonActionDefinition => Boolean(entry));

	return actions.length > 0 ? actions : fallback;
}

function normalizeRuntime(value: unknown, fallback: CanonWorkflowRuntime): CanonWorkflowRuntime {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
	const record = value as Partial<CanonWorkflowRuntime>;
	return {
		...fallback,
		...record,
		checks: normalizeArray<CanonRuntimeCheck>(record.checks, fallback.checks)
	};
}

function normalizeApproval(value: unknown, fallback: CanonWorkflowApproval): CanonWorkflowApproval {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
	return { ...fallback, ...(value as Partial<CanonWorkflowApproval>) };
}

function normalizeAgent(value: unknown, fallback: CanonWorkflowAgent): CanonWorkflowAgent {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
	const record = value as Partial<CanonWorkflowAgent>;
	return {
		...fallback,
		...record,
		suggestedPrompts: normalizeArray(record.suggestedPrompts, fallback.suggestedPrompts),
		initialMessages: normalizeArray(record.initialMessages, fallback.initialMessages)
	};
}
