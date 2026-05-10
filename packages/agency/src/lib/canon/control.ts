export type CanonAgentBody = {
	message?: unknown;
	history?: unknown;
	contextId?: unknown;
	surface?: unknown;
};

export type CanonActionPreviewBody = {
	actionId?: unknown;
	contextId?: unknown;
	inputs?: unknown;
	approvalState?: unknown;
};

export type CanonApprovalUpdateBody = {
	approvalId?: unknown;
	contextId?: unknown;
	status?: unknown;
	actor?: unknown;
	note?: unknown;
};

export type CanonHistoryMessage = {
	role: 'agent' | 'client';
	body: string;
};

export type CanonActionStatus = 'allowed' | 'requires_approval' | 'blocked';

export type CanonActionDefinition = {
	id: string;
	label: string;
	description?: string;
	summary: string;
	status: CanonActionStatus;
	risk: 'low' | 'medium' | 'high';
	policyChecks: string[];
	evidence: string[];
	allowedNextActions: string[];
};

export const CANON_MAX_MESSAGE_LENGTH = 900;
export const CANON_MAX_HISTORY_MESSAGES = 8;

export const canonCorsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
	'access-control-allow-headers': 'authorization, content-type, x-api-key'
};

export const canonControlContext = {
	name: 'CREATE SOMETHING Canon Control Panel',
	summary:
		'Webflow renders the operator surface while Cloudflare provides bounded agent answers, action previews, policy checks, and approval-state responses.',
	layers: [
		{
			tier: 'Database',
			label: 'Operational Memory',
			detail: 'Authoritative records, review state, evidence, and private source material stay separated.'
		},
		{
			tier: 'Automation',
			label: 'Callable Runtime',
			detail: 'Cloudflare routes preview governed actions before anything touches a workflow tool or external system.'
		},
		{
			tier: 'Judgment',
			label: 'Approval Boundary',
			detail: 'Policy checks and named human approval decide whether a recommendation can become an action.'
		}
	],
	guardrails: [
		'Answers use the sanitized CREATE SOMETHING business-management context only.',
		'This endpoint does not expose client secrets, credentials, raw source records, private workspace URLs, or token-bearing endpoints.',
		'V1 action routes return previews and policy checks only; they do not execute external mutations.',
		'MCP, Dify, and Composio promotion requires named operator approval, a connector contract, and rollback evidence.'
	]
};

export const canonActionDefinitions: CanonActionDefinition[] = [
	{
		id: 'draft-operator-brief',
		label: 'Draft operator brief',
		summary:
			'This action can prepare a client-safe operator brief from approved workflow evidence, open decisions, and governance language.',
		status: 'allowed',
		risk: 'low',
		policyChecks: [
			'Uses approved public or internal-safe evidence only.',
			'Does not include private source records, credentials, or token-bearing URLs.',
			'Produces a draft for operator review before publishing or forwarding.'
		],
		evidence: ['Workflow map', 'Evidence trail', 'Decision queue'],
		allowedNextActions: ['Draft brief', 'Ask for operator review', 'Attach evidence labels']
	},
	{
		id: 'request-approval',
		label: 'Request approval',
		summary:
			'This action can prepare an approval request that names the action, required approver, policy checks, and remaining blockers.',
		status: 'requires_approval',
		risk: 'medium',
		policyChecks: [
			'Requires a named approval owner.',
			'Records the approval state before any external action.',
			'Keeps execution disabled until a human explicitly approves.'
		],
		evidence: ['Approval boundary', 'Policy rules', 'Runtime status'],
		allowedNextActions: ['Prepare approval request', 'Keep action in review', 'Record approval owner']
	},
	{
		id: 'execute-external-action',
		label: 'Execute external action',
		summary:
			'This action is blocked in the Canon Control Panel v1 demo. The route demonstrates the approval boundary without executing external writes.',
		status: 'blocked',
		risk: 'high',
		policyChecks: [
			'External mutation is disabled in v1.',
			'Production connector execution is not configured on this preview route.',
			'Human approval and a dedicated integration contract are required first.'
		],
		evidence: ['Governance rule', 'Approval boundary'],
		allowedNextActions: ['Review policy checks', 'Define connector contract', 'Assign approval owner']
	},
	{
		id: 'review-mcp-fleet',
		label: 'Review MCP fleet',
		summary:
			'This action prepares an operator review of MCP endpoints, brokered access, Dify candidates, and ownership gaps without exposing credentials or private registry details.',
		status: 'requires_approval',
		risk: 'medium',
		policyChecks: [
			'Classifies direct versus brokered MCP access.',
			'Records owner and tenant boundary before promotion.',
			'Keeps credentials, private source records, and token-bearing URLs out of Webflow.'
		],
		evidence: ['MCP fleet registry', 'Hub control plane', 'Dify coverage'],
		allowedNextActions: ['Prepare fleet review', 'Record owner', 'Keep risky tool access in review']
	},
	{
		id: 'prepare-agent-workflow-handoff',
		label: 'Prepare agent workflow handoff',
		summary:
			'This action drafts the operator handoff for agents, workflows, allowed questions, and approval boundaries from approved context.',
		status: 'allowed',
		risk: 'medium',
		policyChecks: [
			'Uses sanitized workflow context only.',
			'Names the approval owner before client-facing use.',
			'Keeps private source material out of agent answers.'
		],
		evidence: ['Agent prompts', 'Workflow route', 'Decision queue'],
		allowedNextActions: ['Draft handoff', 'Ask for operator review', 'Attach decision evidence']
	},
	{
		id: 'promote-connector-action',
		label: 'Promote connector action',
		summary:
			'This action is blocked until a Dify or Composio connector has a production contract, named approval owner, and rollback note.',
		status: 'blocked',
		risk: 'high',
		policyChecks: [
			'Production connector contract required.',
			'Rollback note required before execution.',
			'No token-bearing endpoints or credentials may be placed in browser props.'
		],
		evidence: ['Dify intake manifest', 'Composio connector boundary', 'Approval policy'],
		allowedNextActions: ['Define connector contract', 'Assign senior operator', 'Keep execution blocked']
	}
];

export function sanitizeHistory(value: unknown): CanonHistoryMessage[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.slice(-CANON_MAX_HISTORY_MESSAGES)
		.map((entry): CanonHistoryMessage | null => {
			if (!entry || typeof entry !== 'object') {
				return null;
			}

			const role = 'role' in entry ? entry.role : undefined;
			const body = 'body' in entry ? entry.body : undefined;

			if ((role !== 'agent' && role !== 'client') || typeof body !== 'string') {
				return null;
			}

			return {
				role,
				body: body.slice(0, CANON_MAX_MESSAGE_LENGTH)
			};
		})
		.filter((entry): entry is CanonHistoryMessage => Boolean(entry));
}

export function asksForRestrictedCanonMaterial(message: string) {
	const normalized = message.toLowerCase();
	const revealTerms = ['show', 'send', 'give', 'reveal', 'display', 'list', 'export', 'paste'];
	const privateTerms = [
		'secret',
		'token',
		'credential',
		'api key',
		'private url',
		'raw data',
		'source data',
		'paylocity',
		'notion url',
		'infisical',
		'employee',
		'contact'
	];

	return revealTerms.some((term) => normalized.includes(term)) && privateTerms.some((term) => normalized.includes(term));
}

export function classifyCanonQuestion(message: string) {
	const normalized = message.toLowerCase();

	if (asksForRestrictedCanonMaterial(message)) return 'restricted';
	if (/(database|data|records|source of truth|memory)/i.test(normalized)) return 'database';
	if (/(automation|cloudflare|runtime|api|mcp|tool|endpoint|workflow|dify|composio|connector|agent)/i.test(normalized)) return 'automation';
	if (/(approval|approve|judgment|policy|human|private|boundary|blocked)/i.test(normalized)) return 'judgment';
	if (/(action|preview|execute|send|draft|mutation)/i.test(normalized)) return 'action';
	if (/(evidence|artifact|proof|grounding|review packet)/i.test(normalized)) return 'evidence';
	return 'overview';
}

export function selectCanonAction(actionId: string) {
	return canonActionDefinitions.find((action) => action.id === actionId) ?? canonActionDefinitions[0];
}
