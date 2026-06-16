import type { ThreadStatus } from '$chat/message-types';

export type OperatorStateKind =
	| 'ready'
	| 'needs_auth'
	| 'waiting_on_approval'
	| 'preview_blocked'
	| 'eval_stale'
	| 'production_verified';

export interface OperatorStateDefinition {
	kind: OperatorStateKind;
	label: string;
	tone: 'good' | 'warn' | 'danger';
	summary: string;
	operatorCopy: string;
}

export interface OperatorShellPlane {
	id: 'context' | 'conversation' | 'proof';
	label: string;
	owner: string;
	purpose: string;
	requiredSignals: string[];
}

export const operatorMode = {
	label: 'Ona Operator Chat',
	productLine: 'CREATE SOMETHING concierge-chat',
	runtime: 'Dify Service API through a CREATE SOMETHING server proxy',
	promise: 'Clear state, clear next action, clear proof before any governed write.'
} as const;

export const operatorStateDefinitions = [
	{
		kind: 'ready',
		label: 'Ready',
		tone: 'good',
		summary: 'The thread can continue without operator intervention.',
		operatorCopy: 'Continue the conversation or approve a low-risk next step.'
	},
	{
		kind: 'needs_auth',
		label: 'Needs auth',
		tone: 'warn',
		summary: 'A downstream tool cannot run until a credential is reconnected.',
		operatorCopy: 'Send the operator to the reconnect path before retrying the tool.'
	},
	{
		kind: 'waiting_on_approval',
		label: 'Waiting on approval',
		tone: 'warn',
		summary: 'A human decision is required before the workflow moves forward.',
		operatorCopy: 'Show the exact field, policy, and action being held.'
	},
	{
		kind: 'preview_blocked',
		label: 'Preview blocked',
		tone: 'danger',
		summary: 'The system has enough intent, but not enough verified evidence to act.',
		operatorCopy: 'Keep the action disabled until proof or confirmation arrives.'
	},
	{
		kind: 'eval_stale',
		label: 'Eval stale',
		tone: 'warn',
		summary: 'The live agent or prompt changed after the last evaluation.',
		operatorCopy: 'Run the current smoke or eval before calling the agent production-ready.'
	},
	{
		kind: 'production_verified',
		label: 'Production verified',
		tone: 'good',
		summary: 'The current path has live runtime evidence attached.',
		operatorCopy: 'Keep the evidence visible next to the claim.'
	}
] satisfies OperatorStateDefinition[];

export const operatorShellPlanes = [
	{
		id: 'context',
		label: 'Context rail',
		owner: 'Operator',
		purpose: 'Names the client, lane, agent, state, blockers, and credential health before a turn is taken.',
		requiredSignals: ['agent', 'lane', 'credential state', 'blockers']
	},
	{
		id: 'conversation',
		label: 'Chat rail',
		owner: 'Dify-backed agent',
		purpose: 'Keeps the primary conversation focused while widgets interrupt only for confirmation, consent, or evidence.',
		requiredSignals: ['assistant response', 'inline widget', 'composer state']
	},
	{
		id: 'proof',
		label: 'Proof and actions rail',
		owner: 'CREATE SOMETHING',
		purpose: 'Keeps artifacts, tool calls, approvals, handoff packets, and Linear/eval evidence next to each claim.',
		requiredSignals: ['artifacts', 'tool status', 'policy reference', 'handoff packet']
	}
] satisfies OperatorShellPlane[];

export const clearCommunicationRules = [
	'Use direct action language: say what is blocked, who owns it, and what happens next.',
	'Put proof beside the claim, not in a separate report.',
	'Show inferred fields as inferred until a user or operator confirms them.',
	'Disable governed writes until consent, credential health, and policy checks are visible.',
	'Translate Dify runtime events into operator states instead of exposing raw provider mechanics.'
] as const;

export const difyRuntimeBoundary = {
	browser: [
		'No Dify API key in public env vars.',
		'No direct browser calls to Dify Service API.',
		'Only bounded widgets and operator states reach the client.'
	],
	server: [
		'Resolve app id, app key, and API URL from server-side configuration.',
		'Call Dify chat-messages through the orchestration layer.',
		'Persist Dify conversation ids and map stream/tool events to chat artifacts.'
	],
	operator: [
		'See agent state, proof, and next action in CREATE SOMETHING language.',
		'Approve, reconnect, hand off, or retry from governed UI controls.',
		'Use Dify as runtime plumbing, not as the operator-facing product.'
	]
} as const;

export function selectOperatorState(input: {
	threadStatus: ThreadStatus;
	hasActionRequiredTool?: boolean;
	hasBlockedArtifact?: boolean;
	hasHandoff?: boolean;
}): OperatorStateDefinition {
	if (input.hasActionRequiredTool) {
		return operatorStateDefinitions.find((state) => state.kind === 'needs_auth')!;
	}

	if (input.threadStatus === 'handoff_ready' || input.hasHandoff) {
		return operatorStateDefinitions.find((state) => state.kind === 'waiting_on_approval')!;
	}

	if (input.hasBlockedArtifact) {
		return operatorStateDefinitions.find((state) => state.kind === 'preview_blocked')!;
	}

	return operatorStateDefinitions.find((state) => state.kind === 'ready')!;
}
