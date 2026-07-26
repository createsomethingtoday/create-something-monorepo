import { canonActionDefinitions, canonControlContext, type CanonActionDefinition } from './control';
import type {
	AccessLaneItem,
	ActionExecutionItem,
	ActivityEventItem,
	ApprovalQueueItem,
	ArtifactItem,
	BusinessContextItem,
	CheckStatus,
	DecisionItem,
	EngagementAccess,
	EngagementMeta,
	EvidenceItem,
	HandoffPackageItem,
	OperatingLayer,
	ReviewItem,
	RunbookCommand,
	RuntimeCheck,
	SourceStatusItem,
	WorkflowAgent,
	WorkflowApproval,
	WorkflowMetricItem,
	WorkflowRuntime
} from '@create-something/delivery-schema';

// Canonical shapes live in @create-something/delivery-schema (shared with the
// Webflow control components). The Canon* aliases preserve this module's
// existing import surface. See docs/DELIVERY_SURFACE_SPEC.md.
export type CanonRuntimeStatus = CheckStatus;
export type CanonWorkflowSource = 'd1' | 'fallback';
export type CanonRuntimeCheck = RuntimeCheck;
export type CanonWorkflowRuntime = WorkflowRuntime;
export type CanonWorkflowLayer = OperatingLayer;
export type CanonWorkflowEvidenceItem = EvidenceItem;
export type CanonWorkflowDecisionItem = DecisionItem;
export type CanonWorkflowArtifactItem = ArtifactItem;
export type CanonWorkflowApproval = WorkflowApproval;
export type CanonWorkflowAgent = WorkflowAgent;
export type CanonWorkflowBusinessContext = BusinessContextItem;
export type CanonWorkflowMetric = WorkflowMetricItem;
export type CanonWorkflowSourceStatus = SourceStatusItem;
export type CanonWorkflowApprovalQueueItem = ApprovalQueueItem;
export type CanonWorkflowExecutionQueueItem = ActionExecutionItem;
export type CanonWorkflowActivityEvent = ActivityEventItem;

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
	businessContexts: CanonWorkflowBusinessContext[];
	activeBusinessContextId: string;
	metrics: CanonWorkflowMetric[];
	sourceStatuses: CanonWorkflowSourceStatus[];
	approvalQueue: CanonWorkflowApprovalQueueItem[];
	executionQueue: CanonWorkflowExecutionQueueItem[];
	activityEvents: CanonWorkflowActivityEvent[];
	guardrails: string[];
	// Engagement extensions (docs/DELIVERY_SURFACE_SPEC.md, step 3). Optional so
	// the governed-console context and older D1 rows remain valid.
	engagement?: EngagementMeta;
	handoffPackage?: HandoffPackageItem[];
	runbookCommands?: RunbookCommand[];
	accessLanes?: AccessLaneItem[];
	reviews?: ReviewItem[];
	access?: EngagementAccess;
}

interface CanonWorkflowContextRow {
	context_id: string;
	title: string;
	summary: string;
	workflow_json: string;
	updated_at: string | null;
}

interface CanonWorkflowApprovalRow {
	approval_id: string;
	action_id: string | null;
	title: string;
	requester: string | null;
	required_approver: string;
	status: 'review' | 'approved' | 'blocked';
	risk: 'low' | 'medium' | 'high' | null;
	due_at: string | null;
	evidence_json: string;
	policy_checks_json: string;
	updated_by: string | null;
	updated_at: string | null;
}

interface CanonWorkflowActivityRow {
	event_id: string;
	event_type: CanonWorkflowActivityEvent['eventType'];
	label: string;
	detail: string | null;
	actor: string | null;
	tone: CanonWorkflowActivityEvent['tone'] | null;
	created_at: string | null;
}

interface CanonWorkflowContextOverlays {
	approvalQueue?: CanonWorkflowApprovalQueueItem[];
	activityEvents?: CanonWorkflowActivityEvent[];
}

export const DEFAULT_CANON_WORKFLOW_CONTEXT_ID = 'create-something-governed-workflow-console';

export function sanitizeCanonContextId(value: unknown): string {
	const raw = typeof value === 'string' ? value.trim() : '';
	if (!raw) return DEFAULT_CANON_WORKFLOW_CONTEXT_ID;
	return raw.replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 96) || DEFAULT_CANON_WORKFLOW_CONTEXT_ID;
}

export async function loadCanonWorkflowContext(
	db: D1Database | null | undefined,
	rawContextId: unknown,
	customFallback?: CanonWorkflowContext
): Promise<CanonWorkflowContext> {
	const contextId = sanitizeCanonContextId(rawContextId);
	const fallback = customFallback ?? buildFallbackCanonWorkflowContext(contextId);

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

		const overlays = await loadCanonWorkflowContextOverlays(db, contextId);

		return mergeCanonWorkflowContext(row, fallback, overlays);
	} catch {
		return fallback;
	}
}

export function selectCanonWorkflowAction(context: CanonWorkflowContext, actionId: string): CanonActionDefinition {
	return context.actions.find((action) => action.id === actionId) ?? context.actions[0] ?? canonActionDefinitions[0];
}

function mergeCanonWorkflowContext(
	row: CanonWorkflowContextRow,
	fallback: CanonWorkflowContext,
	overlays: CanonWorkflowContextOverlays = {}
): CanonWorkflowContext {
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
		businessContexts: normalizeArray<CanonWorkflowBusinessContext>(parsed.businessContexts, fallback.businessContexts),
		activeBusinessContextId:
			typeof parsed.activeBusinessContextId === 'string'
				? parsed.activeBusinessContextId
				: fallback.activeBusinessContextId,
		metrics: normalizeArray<CanonWorkflowMetric>(parsed.metrics, fallback.metrics),
		sourceStatuses: normalizeArray<CanonWorkflowSourceStatus>(parsed.sourceStatuses, fallback.sourceStatuses),
		approvalQueue:
			overlays.approvalQueue && overlays.approvalQueue.length > 0
				? overlays.approvalQueue
				: normalizeArray<CanonWorkflowApprovalQueueItem>(parsed.approvalQueue, fallback.approvalQueue),
		executionQueue: normalizeArray<CanonWorkflowExecutionQueueItem>(parsed.executionQueue, fallback.executionQueue),
		activityEvents:
			overlays.activityEvents && overlays.activityEvents.length > 0
				? overlays.activityEvents
				: normalizeArray<CanonWorkflowActivityEvent>(parsed.activityEvents, fallback.activityEvents),
		guardrails: normalizeStringArray(parsed.guardrails, fallback.guardrails),
		engagement: normalizeOptionalRecord<EngagementMeta>(parsed.engagement, fallback.engagement),
		handoffPackage: normalizeOptionalArray<HandoffPackageItem>(parsed.handoffPackage, fallback.handoffPackage),
		runbookCommands: normalizeOptionalArray<RunbookCommand>(parsed.runbookCommands, fallback.runbookCommands),
		accessLanes: normalizeOptionalArray<AccessLaneItem>(parsed.accessLanes, fallback.accessLanes),
		reviews: normalizeOptionalArray<ReviewItem>(parsed.reviews, fallback.reviews),
		access: normalizeOptionalRecord<EngagementAccess>(parsed.access, fallback.access)
	};
}

function normalizeOptionalRecord<T>(value: unknown, fallback: T | undefined): T | undefined {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as T;
	}
	return fallback;
}

function normalizeOptionalArray<T>(value: unknown, fallback: T[] | undefined): T[] | undefined {
	if (Array.isArray(value)) {
		return value as T[];
	}
	return fallback;
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
				{
					label: 'Cloudflare routes',
					status: 'ok',
					detail: 'Workflow context, agent, approval, and action preview routes are available.'
				},
				{
					label: 'D1 workflow state',
					status: 'ok',
					detail: 'Sanitized business-management context is loaded by context ID.'
				},
				{
					label: 'MCP fleet',
					status: 'warning',
					detail: 'Fleet posture is visible; endpoint health remains governed by the registry and runbooks.'
				},
				{
					label: 'Agents and workflows',
					status: 'ok',
					detail: 'Agent answers are bounded by approved context and guardrails.'
				},
				{
					label: 'Dify intake',
					status: 'warning',
					detail: 'Dify candidates are tracked as intake and promotion state, not direct browser actions.'
				},
				{
					label: 'Composio connectors',
					status: 'warning',
					detail: 'SaaS connector execution remains brokered and approval-gated.'
				},
				{ label: 'Action execution', status: 'idle', detail: 'Preview-only in v1; no external mutation is executed.' },
				{ label: 'Policy boundary', status: 'ok', detail: 'Human approval remains required for mutations.' }
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
			},
			{
				label: 'MCP fleet registry',
				detail: 'The console tracks which MCPs are active, brokered, direct, or awaiting promotion.',
				source: 'Repo registry',
				tone: 'info'
			},
			{
				label: 'Connector boundary',
				detail:
					'Dify and Composio remain managed connector surfaces, not browser-exposed credentials or direct public writes.',
				source: 'Integration policy',
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
			},
			{
				title: 'Review MCP fleet posture',
				description: 'Confirm which MCP servers are active, brokered, Dify-direct candidates, or parked.',
				owner: 'Operator',
				state: 'review',
				tier: 'Automation'
			},
			{
				title: 'Promote connector execution',
				description: 'Decide whether any Dify or Composio connector may move beyond preview-only behavior.',
				owner: 'Senior operator',
				state: 'blocked',
				tier: 'Judgment'
			},
			{
				title: 'Confirm agent workflow ownership',
				description: 'Name the operator responsible for agent answers, workflow handoff, and approval records.',
				owner: 'Delivery lead',
				state: 'open',
				tier: 'Judgment'
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
			},
			{
				title: 'MCP Fleet Registry',
				type: 'Operations',
				description: 'Inventory and posture for CREATE SOMETHING MCP endpoints, bundles, and brokered tool access.',
				visibility: 'internal',
				tone: 'info'
			},
			{
				title: 'Dify Intake Manifest',
				type: 'Connector Intake',
				description: 'Dify app and MCP intake state used to decide what is direct, brokered, or not yet production-ready.',
				visibility: 'internal',
				tone: 'warning'
			},
			{
				title: 'Composio Connector Boundary',
				type: 'Connector Policy',
				description:
					'Rules for when Composio-backed SaaS actions stay brokered, require approval, or can move toward execution.',
				visibility: 'internal',
				tone: 'warning'
			}
		],
		agent: {
			title: 'Ask Control',
			placeholder: 'Ask what is approved, private, or ready to preview...',
			suggestedPrompts: [
				{ label: 'Explain the workflow', prompt: 'Explain how the database, automation, and judgment layers work together.' },
				{ label: 'What needs approval?', prompt: 'What decision needs approval before this action can run?' },
				{ label: 'What is private?', prompt: 'What should stay out of the public surface?' },
				{ label: 'Which MCPs matter?', prompt: 'Summarize the MCP fleet posture and what needs operator review.' },
				{ label: 'Connector readiness', prompt: 'Explain the Dify and Composio boundary before any connector execution.' },
				{ label: 'Cloudflare state', prompt: 'What does Cloudflare own in this console?' }
			],
			initialMessages: [
				{
					role: 'agent',
					body: 'I can answer from the approved Canon control context and keep private source material out of the response.',
					grounding: ['Governance rule', 'Evidence trail']
				}
			]
		},
		businessContexts: [
			{
				id: 'cs-ops-core',
				client: 'CREATE SOMETHING',
				project: 'Governed Workflow Console',
				workflow: 'Webflow + Cloudflare delivery',
				environment: 'Production preview',
				status: 'active',
				owner: 'Operator',
				detail: 'Console state is scoped to the CREATE SOMETHING operating layer.'
			},
			{
				id: 'mcp-agent-operations',
				client: 'CREATE SOMETHING',
				project: 'MCP and agent operations',
				workflow: 'MCP fleet + agent workflow review',
				environment: 'Internal',
				status: 'review',
				owner: 'Engineering',
				detail: 'Tracks active MCP surfaces, agent routes, workflow handoffs, and which actions stay approval-gated.'
			},
			{
				id: 'connector-governance',
				client: 'CREATE SOMETHING',
				project: 'Dify and Composio connector governance',
				workflow: 'Connector intake, brokerage, and approval',
				environment: 'Internal',
				status: 'review',
				owner: 'Senior operator',
				detail: 'Keeps Dify and Composio useful without letting connector credentials or write actions leak into Webflow.'
			}
		],
		activeBusinessContextId: 'cs-ops-core',
		metrics: [
			{
				label: 'Business surfaces',
				value: '9',
				detail: 'MCPs, agents, workflows, Dify, Composio, Cloudflare, Linear, Infisical, Webflow',
				tone: 'info'
			},
			{ label: 'Pending approvals', value: '5', detail: 'Named approver required for promotion and execution', tone: 'warning' },
			{ label: 'Runtime posture', value: 'Preview', detail: 'No external mutation in v1', tone: 'success' },
			{ label: 'Connector posture', value: 'Brokered', detail: 'Dify and Composio stay behind policy boundaries', tone: 'warning' },
			{ label: 'Private boundary', value: 'Enforced', detail: 'Secrets and raw records stay out of Webflow', tone: 'success' },
			{
				label: 'Evidence model',
				value: 'Artifact-backed',
				detail: 'Linear, docs, registry, and D1 context provide review evidence',
				tone: 'success'
			}
		],
		sourceStatuses: [
			{
				system: 'Cloudflare Workers, Pages, and D1',
				status: 'ok',
				detail: 'The runtime owns workflow state, preview routes, approval persistence, and production deployment.',
				lastSynced: 'Runtime read',
				owner: 'Engineering',
				tier: 'Database'
			},
			{
				system: 'MCP Hub and fleet registry',
				status: 'warning',
				detail: 'MCP inventory and brokered access are visible for operator review; execution remains policy-bound.',
				lastSynced: 'Repo registry',
				owner: 'Engineering',
				tier: 'Automation'
			},
			{
				system: 'Agents and workflows',
				status: 'ok',
				detail: 'Agent answers and workflow previews are bounded by sanitized context and approval rules.',
				lastSynced: 'Cloudflare route',
				owner: 'Engineering',
				tier: 'Automation'
			},
			{
				system: 'Dify',
				status: 'warning',
				detail: 'Dify MCP coverage is tracked as intake and promotion state before production use.',
				lastSynced: 'Inventory artifact',
				owner: 'Operator',
				tier: 'Automation'
			},
			{
				system: 'Composio',
				status: 'warning',
				detail: 'Composio remains a brokered connector layer; no browser-exposed credentials or direct public writes.',
				lastSynced: 'Connector policy',
				owner: 'Engineering',
				tier: 'Automation'
			},
			{
				system: 'Webflow Components',
				status: 'ok',
				detail: 'Reusable components hydrate from the workflow context.',
				lastSynced: 'Library share',
				owner: 'Design systems',
				tier: 'Automation'
			},
			{
				system: 'Linear',
				status: 'ok',
				detail: 'Tracked work, ownership, deployment evidence, and follow-up decisions live outside the public page.',
				lastSynced: 'Issue evidence',
				owner: 'Operator',
				tier: 'Database'
			},
			{
				system: 'Infisical',
				status: 'idle',
				detail: 'Secrets remain out of component props, D1 public context, and Webflow browser code.',
				lastSynced: 'Secret boundary',
				owner: 'Engineering',
				tier: 'Judgment'
			},
			{
				system: 'Approval Policy',
				status: 'warning',
				detail: 'External mutations require a named human approval path.',
				lastSynced: 'Policy artifact',
				owner: 'Operator',
				tier: 'Judgment'
			}
		],
		approvalQueue: [
			{
				id: 'approval-action-boundary',
				actionId: 'request-approval',
				title: 'Approve action boundary',
				requester: 'Delivery system',
				requiredApprover: 'Named operator',
				status: 'review',
				risk: 'medium',
				due: 'Before connector execution',
				evidence: ['Approval boundary', 'Policy rules'],
				policyChecks: ['Named approver required', 'No external mutation before approval']
			},
			{
				id: 'approval-external-execution',
				actionId: 'execute-external-action',
				title: 'External execution contract',
				requester: 'Runtime system',
				requiredApprover: 'Senior operator',
				status: 'blocked',
				risk: 'high',
				due: 'After production connector contract',
				evidence: ['Runtime contract', 'Governance rule'],
				policyChecks: ['Production connector contract required', 'Rollback note required']
			},
			{
				id: 'approval-mcp-fleet-posture',
				actionId: 'review-mcp-fleet',
				title: 'MCP fleet posture review',
				requester: 'Operations system',
				requiredApprover: 'Operator',
				status: 'review',
				risk: 'medium',
				due: 'Before promoting new tool access',
				evidence: ['MCP fleet registry', 'Dify coverage', 'Hub control plane'],
				policyChecks: ['Classify direct vs brokered access', 'Confirm tenant boundary', 'Record owner before promotion']
			},
			{
				id: 'approval-agent-workflow-handoff',
				actionId: 'prepare-agent-workflow-handoff',
				title: 'Agent workflow handoff',
				requester: 'Agent runtime',
				requiredApprover: 'Delivery lead',
				status: 'review',
				risk: 'medium',
				due: 'Before client-facing use',
				evidence: ['Agent prompts', 'Workflow route', 'Decision queue'],
				policyChecks: ['Use sanitized context only', 'Name operator owner', 'Keep private source material out of replies']
			},
			{
				id: 'approval-dify-composio-promotion',
				actionId: 'promote-connector-action',
				title: 'Dify and Composio promotion',
				requester: 'Connector system',
				requiredApprover: 'Senior operator',
				status: 'blocked',
				risk: 'high',
				due: 'After connector contract and rollback plan',
				evidence: ['Dify intake manifest', 'Composio connector boundary', 'Approval policy'],
				policyChecks: ['No token-bearing endpoints in Webflow', 'Require rollback note', 'Require production connector contract']
			}
		],
		executionQueue: [
			{
				id: 'execution-draft-brief',
				actionId: 'draft-operator-brief',
				title: 'Draft operator brief',
				status: 'preview',
				owner: 'Operator',
				system: 'Cloudflare route',
				risk: 'low',
				rollback: 'Discard generated draft before publication.',
				lastUpdated: 'Preview ready'
			},
			{
				id: 'execution-external-action',
				actionId: 'execute-external-action',
				title: 'Execute external action',
				status: 'blocked',
				owner: 'Senior operator',
				system: 'External connector',
				risk: 'high',
				rollback: 'Define rollback before enabling connector execution.',
				lastUpdated: 'Blocked in v1'
			},
			{
				id: 'execution-mcp-fleet-review',
				actionId: 'review-mcp-fleet',
				title: 'Review MCP fleet posture',
				status: 'queued',
				owner: 'Engineering',
				system: 'MCP Hub',
				risk: 'medium',
				rollback: 'Keep new tool access disabled until review evidence is recorded.',
				lastUpdated: 'Awaiting operator review'
			},
			{
				id: 'execution-agent-workflow-handoff',
				actionId: 'prepare-agent-workflow-handoff',
				title: 'Prepare agent workflow handoff',
				status: 'preview',
				owner: 'Delivery lead',
				system: 'Agent route',
				risk: 'medium',
				rollback: 'Revert to static guidance and keep agent route bounded to read-only answers.',
				lastUpdated: 'Preview ready'
			},
			{
				id: 'execution-connector-promotion',
				actionId: 'promote-connector-action',
				title: 'Promote Dify or Composio connector action',
				status: 'blocked',
				owner: 'Senior operator',
				system: 'Dify / Composio',
				risk: 'high',
				rollback: 'Disable connector execution and leave only preview/intake state visible.',
				lastUpdated: 'Blocked pending contract'
			}
		],
		activityEvents: [
			{
				id: 'event-context-ready',
				eventType: 'context',
				label: 'Workflow context ready',
				detail: 'The console can render from sanitized workflow state.',
				actor: 'Cloudflare',
				timestamp: 'Runtime read',
				tone: 'success'
			},
			{
				id: 'event-policy-boundary',
				eventType: 'approval',
				label: 'Approval boundary active',
				detail: 'External mutations require named approval and an execution contract.',
				actor: 'Policy',
				timestamp: 'Policy artifact',
				tone: 'warning'
			},
			{
				id: 'event-business-scope-expanded',
				eventType: 'context',
				label: 'Business-management scope expanded',
				detail:
					'The console tracks MCPs, agents, workflows, Dify, Composio, Cloudflare, Linear, Infisical, and Webflow.',
				actor: 'Operator',
				timestamp: 'Production readiness pass',
				tone: 'info'
			},
			{
				id: 'event-mcp-fleet-visible',
				eventType: 'evidence',
				label: 'MCP fleet visible',
				detail: 'MCP posture is represented as source status, decisions, approvals, and execution queue state.',
				actor: 'Repository',
				timestamp: 'Registry review',
				tone: 'success'
			},
			{
				id: 'event-connectors-held',
				eventType: 'approval',
				label: 'Connector writes held',
				detail:
					'Dify and Composio connector promotion remains blocked until approval, contract, and rollback evidence exist.',
				actor: 'Policy',
				timestamp: 'Guardrail',
				tone: 'warning'
			}
		],
		guardrails: canonControlContext.guardrails
	};
}

async function loadCanonWorkflowContextOverlays(
	db: D1Database,
	contextId: string
): Promise<CanonWorkflowContextOverlays> {
	const [approvalQueue, activityEvents] = await Promise.all([
		loadCanonWorkflowApprovals(db, contextId),
		loadCanonWorkflowActivityEvents(db, contextId)
	]);

	return {
		approvalQueue,
		activityEvents
	};
}

async function loadCanonWorkflowApprovals(
	db: D1Database,
	contextId: string
): Promise<CanonWorkflowApprovalQueueItem[] | undefined> {
	try {
		const response = await db
			.prepare(
				`SELECT approval_id, action_id, title, requester, required_approver, status, risk, due_at,
				        evidence_json, policy_checks_json, updated_by, updated_at
				 FROM canon_workflow_approvals
				 WHERE context_id = ?
				 ORDER BY
				   CASE status WHEN 'blocked' THEN 0 WHEN 'review' THEN 1 ELSE 2 END,
				   CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
				   due_at ASC,
				   updated_at DESC
				 LIMIT 20`
			)
			.bind(contextId)
			.all<CanonWorkflowApprovalRow>();

		const rows = response.results ?? [];
		if (rows.length === 0) return undefined;

		return rows.map((row) => ({
			id: row.approval_id,
			actionId: row.action_id ?? undefined,
			title: row.title,
			requester: row.requester ?? undefined,
			requiredApprover: row.required_approver,
			status: row.status,
			risk: row.risk ?? undefined,
			due: row.due_at ?? undefined,
			evidence: safeParseStringArray(row.evidence_json),
			policyChecks: safeParseStringArray(row.policy_checks_json),
			updatedBy: row.updated_by ?? undefined,
			updatedAt: row.updated_at ?? undefined
		}));
	} catch {
		return undefined;
	}
}

async function loadCanonWorkflowActivityEvents(
	db: D1Database,
	contextId: string
): Promise<CanonWorkflowActivityEvent[] | undefined> {
	try {
		const response = await db
			.prepare(
				`SELECT event_id, event_type, label, detail, actor, tone, created_at
				 FROM canon_workflow_activity
				 WHERE context_id = ?
				 ORDER BY created_at DESC
				 LIMIT 20`
			)
			.bind(contextId)
			.all<CanonWorkflowActivityRow>();

		const rows = response.results ?? [];
		if (rows.length === 0) return undefined;

		return rows.map((row) => ({
			id: row.event_id,
			eventType: row.event_type,
			label: row.label,
			detail: row.detail ?? undefined,
			actor: row.actor ?? undefined,
			timestamp: row.created_at ?? undefined,
			tone: row.tone ?? undefined
		}));
	} catch {
		return undefined;
	}
}

function safeParseRecord(value: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(value) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function safeParseStringArray(value: string): string[] {
	try {
		const parsed = JSON.parse(value) as unknown;
		return normalizeStringArray(parsed, []);
	} catch {
		return [];
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
