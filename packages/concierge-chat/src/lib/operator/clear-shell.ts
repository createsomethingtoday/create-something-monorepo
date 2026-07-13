import type { NextStepRecommendation } from '$chat/next-step';
import type { ThreadStatus } from '$chat/message-types';
import type { ConciergeThread } from '$chat/thread-store';

type OperatorTone = 'good' | 'warn' | 'danger';

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
	tone: OperatorTone;
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

export interface OperatorCommandMetric {
	label: string;
	value: string;
	tone: OperatorTone;
	detail: string;
}

export interface OperatorCommandProof {
	label: string;
	value: string;
	tone: OperatorTone;
	detail?: string;
}

export interface OperatorCommandCheck {
	label: string;
	status: string;
	tone: OperatorTone;
	detail: string;
}

export interface OperatorCommandCenter {
	headline: string;
	stateReason: string;
	nextActionOwner: string;
	nextActionLabel: string;
	nextActionDetail: string;
	policyRef: string;
	metrics: OperatorCommandMetric[];
	proofInventory: OperatorCommandProof[];
	checks: OperatorCommandCheck[];
}

export const operatorMode = {
	label: 'Abundance Operator Chat',
	productLine: 'CREATE SOMETHING concierge-chat',
	runtime: 'Owned state on Cloudflare with OpenAI intelligence',
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
		owner: 'Owned agent runtime',
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
	'Translate provider events into owned operator states instead of exposing raw model mechanics.'
] as const;

export const agentRuntimeBoundary = {
	browser: [
		'No model-provider key in public env vars.',
		'No direct browser calls to a model provider.',
		'Only bounded widgets and operator states reach the client.'
	],
	server: [
		'Resolve agent policy, model access, and tool contracts from server-side configuration.',
		'Call the owned agent runtime through CREATE SOMETHING contracts.',
		'Persist owned conversation ids and map stream/tool events to chat artifacts.'
	],
	operator: [
		'See agent state, proof, and next action in CREATE SOMETHING language.',
		'Approve, reconnect, hand off, or retry from governed UI controls.',
		'Keep Cloudflare infrastructure and OpenAI intelligence behind the owned workflow boundary.'
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

function pluralize(count: number, singular: string, plural = `${singular}s`) {
	return `${count} ${count === 1 ? singular : plural}`;
}

function getNextActionOwner(intent: NextStepRecommendation['intent']) {
	switch (intent) {
		case 'confirm_fields':
		case 'correct_fields':
		case 'upload_documents':
		case 'book_appointment':
			return 'Candidate';
		case 'complete_review':
		case 'start_staffing_outreach':
		case 'submit_to_facility':
		case 'record_facility_response':
		case 'confirm_placement':
		case 'start_onboarding':
		case 'complete_onboarding':
		case 'reconnect_tool':
			return 'Operator';
		case 'wait_for_review':
		case 'wait_for_staffing':
			return 'External queue';
		case 'ready':
			return 'System';
	}
}

export function buildOperatorCommandCenter(input: {
	thread: ConciergeThread;
	nextStep: NextStepRecommendation;
	operatorState: OperatorStateDefinition;
	inlineWidgetCount: number;
	railWidgetCount: number;
	hasHandoff: boolean;
}): OperatorCommandCenter {
	const { thread, nextStep } = input;
	const actionRequiredTools = thread.connectedTools.filter((tool) => tool.status === 'action_required');
	const connectedTools = thread.connectedTools.filter((tool) => tool.status === 'connected');
	const queuedTools = thread.connectedTools.filter((tool) => tool.status === 'queued');
	const blockedArtifacts = thread.artifacts.filter((artifact) => artifact.status === 'blocked');
	const pendingArtifacts = thread.artifacts.filter((artifact) => artifact.status === 'pending');
	const readyArtifacts = thread.artifacts.filter((artifact) => artifact.status === 'ready');
	const latestArtifact = [...thread.artifacts].sort((left, right) =>
		right.createdAt.localeCompare(left.createdAt)
	)[0];
	const latestEvidenceMessage = [...thread.messages]
		.reverse()
		.find((message) => message.evidence && message.evidence.length > 0);
	const latestEvidence = latestEvidenceMessage?.evidence?.slice(-1)[0] ?? null;
	const nextActionOwner = getNextActionOwner(nextStep.intent);
	const widgetCount = input.inlineWidgetCount + input.railWidgetCount;
	const blockerSignalCount =
		thread.turn.blockers.length +
		blockedArtifacts.length +
		actionRequiredTools.length +
		(nextStep.blocked ? 1 : 0);
	const toolTotal = thread.connectedTools.length;
	const toolHealthTone: OperatorTone =
		actionRequiredTools.length > 0 ? 'danger' : queuedTools.length > 0 ? 'warn' : 'good';
	const artifactTone: OperatorTone =
		blockedArtifacts.length > 0 ? 'danger' : pendingArtifacts.length > 0 ? 'warn' : 'good';
	const evidenceCount =
		readyArtifacts.length +
		thread.messages.filter((message) => message.evidence && message.evidence.length > 0).length;

	let stateReason =
		thread.turn.blockers.length > 0
			? `${nextActionOwner} owns ${nextStep.label.toLowerCase()}; ${pluralize(
					thread.turn.blockers.length,
					'open signal'
				)} still need attention.`
			: `No active blockers. ${nextActionOwner} owns ${nextStep.label.toLowerCase()}.`;

	if (actionRequiredTools.length > 0) {
		stateReason = `${actionRequiredTools
			.map((tool) => tool.name)
			.join(', ')} needs reconnect before the next governed action.`;
	} else if (input.hasHandoff && thread.handoff) {
		stateReason = `${thread.handoff.queueName} is waiting for operator review: ${thread.handoff.summary}`;
	} else if (blockedArtifacts.length > 0) {
		stateReason = `${blockedArtifacts[0].title} is blocked until proof or confirmation arrives.`;
	} else if (nextStep.blocked && thread.turn.blockers.length > 0) {
		stateReason = thread.turn.blockers[0];
	} else if (nextStep.blocked) {
		stateReason = `${nextStep.label} is blocked until the required proof is visible.`;
	}

	return {
		headline: `${input.operatorState.label}: ${nextStep.label}`,
		stateReason,
		nextActionOwner,
		nextActionLabel: nextStep.label,
		nextActionDetail: nextStep.description,
		policyRef: nextStep.policyRef,
		metrics: [
			{
				label: 'Open signals',
				value: String(blockerSignalCount),
				tone: blockerSignalCount > 0 ? (nextStep.blocked ? 'danger' : 'warn') : 'good',
				detail:
					blockerSignalCount > 0
						? 'Resolve or collect these before calling the path complete.'
						: 'No blocker signals on this turn.'
			},
			{
				label: 'Tool health',
				value: toolTotal === 0 ? '0 tools' : `${connectedTools.length}/${toolTotal}`,
				tone: toolHealthTone,
				detail:
					actionRequiredTools.length > 0
						? `${pluralize(actionRequiredTools.length, 'tool')} need reconnect.`
						: queuedTools.length > 0
							? `${pluralize(queuedTools.length, 'tool')} queued.`
							: 'All listed tools are connected.'
			},
			{
				label: 'Evidence',
				value: String(evidenceCount),
				tone: evidenceCount > 0 ? 'good' : 'warn',
				detail:
					evidenceCount > 0
						? 'Proof is attached to messages or artifacts.'
						: 'No proof has been attached yet.'
			},
			{
				label: 'Widgets',
				value: String(widgetCount),
				tone: widgetCount > 0 ? 'good' : 'warn',
				detail:
					widgetCount > 0
						? 'Inline or rail actions are available.'
						: 'The next action is chat-only right now.'
			},
			{
				label: 'Profile',
				value: `${thread.profile.completion}%`,
				tone: thread.profile.completion >= 80 ? 'good' : 'warn',
				detail: 'Candidate profile completion captured by the conversation.'
			}
		],
		proofInventory: [
			{
				label: 'Policy reference',
				value: nextStep.policyRef,
				tone: 'good'
			},
			{
				label: 'Latest proof',
				value: latestEvidence ?? latestArtifact?.title ?? 'No proof attached yet',
				tone: latestEvidence || latestArtifact ? 'good' : 'warn',
				detail: latestArtifact?.summary
			},
			{
				label: 'Artifacts',
				value: `${readyArtifacts.length} ready / ${pendingArtifacts.length} pending / ${blockedArtifacts.length} blocked`,
				tone: artifactTone
			},
			{
				label: 'Handoff',
				value:
					input.hasHandoff && thread.handoff
						? `${thread.handoff.queueName}: ${thread.handoff.eta}`
						: 'No active handoff',
				tone: input.hasHandoff ? 'warn' : 'good'
			}
		],
		checks: [
			{
				label: 'Credential health',
				status: actionRequiredTools.length > 0 ? 'Needs reconnect' : 'Clear',
				tone: actionRequiredTools.length > 0 ? 'danger' : 'good',
				detail:
					actionRequiredTools.length > 0
						? actionRequiredTools.map((tool) => tool.note).join(' ')
						: 'No downstream credential blocker is visible.'
			},
			{
				label: 'Governed write readiness',
				status: nextStep.blocked ? 'Blocked' : 'Ready',
				tone: nextStep.blocked ? 'warn' : 'good',
				detail: nextStep.description
			},
			{
				label: 'Evidence posture',
				status: evidenceCount > 0 ? 'Proof visible' : 'Needs proof',
				tone: evidenceCount > 0 ? 'good' : 'warn',
				detail:
					evidenceCount > 0
						? 'Operator claims have adjacent proof in this thread.'
						: 'Keep the action low-risk until proof arrives.'
			},
			{
				label: 'Conversation state',
				status: thread.status.replace('_', ' '),
				tone: thread.status === 'handoff_ready' ? 'warn' : 'good',
				detail: `${pluralize(thread.messages.length, 'message')} in the current thread.`
			}
		]
	};
}
