export type DelegationPracticeStageId =
	| 'enter'
	| 'claim'
	| 'map'
	| 'bound'
	| 'rehearse'
	| 'operate'
	| 'prove'
	| 'advance'
	| 'defend'
	| 'practice';

export interface DelegationPracticeStage {
	id: DelegationPracticeStageId;
	label: string;
	question: string;
	artifact: string;
	outcome: string;
}

export type EarnedAuthorityState =
	| 'observe'
	| 'recommend'
	| 'prepare'
	| 'execute_with_approval'
	| 'execute_within_bounds'
	| 'steward';

export type EarnedAuthorityDecision =
	| 'expand'
	| 'preserve'
	| 'narrow'
	| 'suspend'
	| 'revoke'
	| 'recertify';

export interface EarnedAuthorityEvidence {
	currentState: EarnedAuthorityState;
	receiptPresent: boolean;
	policyCurrent: boolean;
	criticalBoundaryBreach: boolean;
	calibrationFailure: boolean;
	promotionEvidenceComplete: boolean;
	ownerApproved: boolean;
}

export interface EarnedAuthorityResult {
	decision: EarnedAuthorityDecision;
	nextState: EarnedAuthorityState;
	reason: string;
}

export const DELEGATION_PRACTICE_SESSION_VERSION = 1 as const;
export const DELEGATION_PRACTICE_STORAGE_VERSION = 1 as const;
export const DELEGATION_PRACTICE_STORAGE_KEY = 'create-something.delegation-practice.preview.v1';
export const DELEGATION_PRACTICE_PREVIEW_LABELS = [
	'Internal preview',
	'Not certification'
] as const;

export interface DelegationPracticeSession {
	version: typeof DELEGATION_PRACTICE_SESSION_VERSION;
	operatorName: string;
	workflowName: string;
	accountableOwner: string;
	stakes: string;
	thesisClaim: string;
	systemMap: string;
	allowedActions: string;
	forbiddenActions: string;
	policyVersion: string;
	verifier: string;
	rollbackTrigger: string;
	goldenTask: string;
	fieldObservation: string;
	evidenceReceipt: string;
	authorityDecisionRationale: string;
	affectedParty: string;
	noticePlan: string;
	appealPath: string;
	unresolvedConcern: string;
	nextReviewDate: string;
	authorityEvidence: EarnedAuthorityEvidence;
}

export interface DelegationPracticePersistedState {
	version: typeof DELEGATION_PRACTICE_STORAGE_VERSION;
	session: DelegationPracticeSession;
	receiptIssuedAt: string | null;
}

export type DelegationPracticeRequiredField = Exclude<
	keyof DelegationPracticeSession,
	'version' | 'authorityEvidence'
>;

export interface DelegationPracticeReceipt {
	id: string;
	labels: [
		(typeof DELEGATION_PRACTICE_PREVIEW_LABELS)[0],
		(typeof DELEGATION_PRACTICE_PREVIEW_LABELS)[1]
	];
	issuedAt: string;
	operatorName: string;
	workflowName: string;
	accountableOwner: string;
	stakes: string;
	policyVersion: string;
	verifier: string;
	evidenceReceipt: string;
	authorityDecisionRationale: string;
	authority: EarnedAuthorityResult;
	governance: {
		allowedActions: string;
		forbiddenActions: string;
		rollbackTrigger: string;
	};
	affectedParty: {
		name: string;
		noticePlan: string;
		appealPath: string;
	};
	artifacts: Record<DelegationPracticeStageId, string[]>;
	unresolvedConcern: string;
	nextReviewDate: string;
}

export type BuildPracticeReceiptResult =
	| { ok: true; receipt: DelegationPracticeReceipt }
	| { ok: false; missingFields: DelegationPracticeRequiredField[] };

const earnedAuthorityStates: EarnedAuthorityState[] = [
	'observe',
	'recommend',
	'prepare',
	'execute_with_approval',
	'execute_within_bounds',
	'steward'
];

export const delegationPracticeStages: DelegationPracticeStage[] = [
	{
		id: 'enter',
		label: 'Enter',
		question: 'What work am I responsible for?',
		artifact: 'Delegation Card',
		outcome: 'Name one workflow, owner, stakes, and current pain.'
	},
	{
		id: 'claim',
		label: 'Claim',
		question: 'Why does this need a governed system?',
		artifact: 'Thesis conditions',
		outcome: 'See connectivity, execution, and judgment as one operating problem.'
	},
	{
		id: 'map',
		label: 'Map',
		question: 'What actors, systems, artifacts, tasks, and constraints exist?',
		artifact: 'Atlas map',
		outcome: 'Replace a vague automation request with a typed workflow model.'
	},
	{
		id: 'bound',
		label: 'Bound',
		question: 'What may run, wait, or stop, and who decides?',
		artifact: 'Authority boundary',
		outcome: 'Make authority explicit before capability expands.'
	},
	{
		id: 'rehearse',
		label: 'Rehearse',
		question: 'How will the system be tested before live work?',
		artifact: 'Golden task',
		outcome: 'Define observable action, wait, stop, failure, and recovery behavior.'
	},
	{
		id: 'operate',
		label: 'Operate',
		question: 'What happens under representative pressure?',
		artifact: 'Field case',
		outcome: 'Inspect a governed run without implying public production authority.'
	},
	{
		id: 'prove',
		label: 'Prove',
		question: 'What evidence connects policy, decision, action, and outcome?',
		artifact: 'Proof receipt',
		outcome: 'Distinguish a claim from evidence that can change a decision.'
	},
	{
		id: 'advance',
		label: 'Advance',
		question: 'What may this worker do next?',
		artifact: 'Earned Authority transition',
		outcome: 'Widen, preserve, narrow, suspend, revoke, or recertify authority.'
	},
	{
		id: 'defend',
		label: 'Defend',
		question: 'What remains weak, contested, or falsifiable?',
		artifact: 'Defense note',
		outcome: 'Expose uncertainty and make revision part of the method.'
	},
	{
		id: 'practice',
		label: 'Practice',
		question: 'How do I apply this to my own work?',
		artifact: 'Practice Receipt',
		outcome: 'Leave with a next exercise, primitive, or mapping session.'
	}
];

export interface DelegationPracticeArtifactField {
	name: DelegationPracticeRequiredField;
	label: string;
	hint: string;
	control: 'text' | 'textarea' | 'date';
	placeholder?: string;
}

export const delegationPracticeArtifactFields: Record<
	DelegationPracticeStageId,
	DelegationPracticeArtifactField[]
> = {
	enter: [
		{
			name: 'operatorName',
			label: 'Operator name or role',
			hint: 'Who is completing this practice?',
			control: 'text',
			placeholder: 'Internal marketplace operator'
		},
		{
			name: 'workflowName',
			label: 'Workflow',
			hint: 'Name one bounded workflow, not a department or transformation program.',
			control: 'text',
			placeholder: 'Marketplace review queue'
		},
		{
			name: 'accountableOwner',
			label: 'Accountable owner',
			hint: 'Name the role that owns the consequence and final decision.',
			control: 'text',
			placeholder: 'Marketplace review owner'
		},
		{
			name: 'stakes',
			label: 'Stakes',
			hint: 'What must this workflow protect or improve?',
			control: 'textarea',
			placeholder: 'Prevent unsupported approval while preserving creator recourse.'
		}
	],
	claim: [
		{
			name: 'thesisClaim',
			label: 'Working claim',
			hint: 'State why this workflow needs a governed system.',
			control: 'textarea',
			placeholder: 'Governed delegation should make the review boundary inspectable.'
		}
	],
	map: [
		{
			name: 'systemMap',
			label: 'System map',
			hint: 'List the actors, systems, artifacts, handoffs, and constraints in sequence.',
			control: 'textarea',
			placeholder: 'Submission -> validation -> reviewer decision -> receipt.'
		}
	],
	bound: [
		{
			name: 'allowedActions',
			label: 'Allowed actions',
			hint: 'What may the delegated worker do inside this envelope?',
			control: 'textarea',
			placeholder: 'Validate files, summarize evidence, prepare reviewer questions.'
		},
		{
			name: 'forbiddenActions',
			label: 'Forbidden actions',
			hint: 'What must stop or wait for human judgment?',
			control: 'textarea',
			placeholder: 'Approve, reject, promise timelines, or make unsupported claims.'
		},
		{
			name: 'policyVersion',
			label: 'Policy version',
			hint: 'Bind the boundary to a specific current policy reference.',
			control: 'text',
			placeholder: 'policy.marketplace-review.v1'
		},
		{
			name: 'verifier',
			label: 'Verifier',
			hint: 'Who can independently inspect the evidence and disagreement?',
			control: 'text',
			placeholder: 'Independent marketplace reviewer'
		},
		{
			name: 'rollbackTrigger',
			label: 'Rollback trigger',
			hint: 'Name the condition that narrows, suspends, or revokes authority.',
			control: 'textarea',
			placeholder: 'Missing receipt, stale policy, or unsupported approval.'
		}
	],
	rehearse: [
		{
			name: 'goldenTask',
			label: 'Golden task',
			hint: 'Describe the normal, wait, stop, failure, and recovery paths to test.',
			control: 'textarea',
			placeholder: 'Valid submission, policy ambiguity, missing evidence, and recovery.'
		}
	],
	operate: [
		{
			name: 'fieldObservation',
			label: 'Field observation',
			hint: 'Record what happened under representative pressure without overstating proof.',
			control: 'textarea',
			placeholder: 'Automation prepared evidence; the reviewer retained the decision.'
		}
	],
	prove: [
		{
			name: 'evidenceReceipt',
			label: 'Evidence receipt reference',
			hint: 'Use a non-sensitive local reference that another reviewer can inspect.',
			control: 'text',
			placeholder: 'RECEIPT-LOCAL-001'
		}
	],
	advance: [
		{
			name: 'authorityDecisionRationale',
			label: 'Authority decision rationale',
			hint: 'Explain why the next envelope should preserve, expand, narrow, suspend, revoke, or recertify.',
			control: 'textarea',
			placeholder: 'Preserve preparation authority until independent review evidence exists.'
		}
	],
	defend: [
		{
			name: 'affectedParty',
			label: 'Affected party',
			hint: 'Who bears the consequence if the system is wrong?',
			control: 'text',
			placeholder: 'Template creator'
		},
		{
			name: 'noticePlan',
			label: 'Notice plan',
			hint: 'What evidence, policy basis, and state will the affected party see?',
			control: 'textarea',
			placeholder: 'Show the creator the evidence, policy basis, and review state.'
		},
		{
			name: 'appealPath',
			label: 'Appeal path',
			hint: 'How can the affected party reach a different accountable reviewer?',
			control: 'textarea',
			placeholder: 'Route a disputed decision to a different accountable reviewer.'
		},
		{
			name: 'unresolvedConcern',
			label: 'Unresolved concern',
			hint: 'What still weakens or could falsify this system?',
			control: 'textarea',
			placeholder: 'Authenticated reviewer identity is not yet tested.'
		}
	],
	practice: [
		{
			name: 'nextReviewDate',
			label: 'Next review date',
			hint: 'Set when this policy, evidence, and authority envelope must be reviewed again.',
			control: 'date'
		}
	]
};

export function nextDelegationPracticeStageId(
	currentId: DelegationPracticeStageId
): DelegationPracticeStageId {
	const currentIndex = delegationPracticeStages.findIndex((stage) => stage.id === currentId);
	const nextIndex = Math.min(currentIndex + 1, delegationPracticeStages.length - 1);
	return delegationPracticeStages[nextIndex]?.id ?? 'enter';
}

export function evaluateEarnedAuthority(evidence: EarnedAuthorityEvidence): EarnedAuthorityResult {
	if (evidence.criticalBoundaryBreach) {
		return {
			decision: 'revoke',
			nextState: 'observe',
			reason: 'A critical boundary breach invalidates the current authority envelope.'
		};
	}

	if (!evidence.receiptPresent) {
		return {
			decision: 'suspend',
			nextState: evidence.currentState,
			reason: 'The affected action stops until its proof receipt can be produced and linked.'
		};
	}

	if (!evidence.policyCurrent) {
		return {
			decision: 'recertify',
			nextState: evidence.currentState,
			reason: 'The evidence is bound to stale policy and must be recertified before execution.'
		};
	}

	if (evidence.calibrationFailure) {
		const currentIndex = earnedAuthorityStates.indexOf(evidence.currentState);
		return {
			decision: 'narrow',
			nextState: earnedAuthorityStates[Math.max(currentIndex - 1, 0)] ?? 'observe',
			reason: 'Unsupported confidence requires a narrower authority state and renewed calibration.'
		};
	}

	if (evidence.promotionEvidenceComplete && evidence.ownerApproved) {
		const currentIndex = earnedAuthorityStates.indexOf(evidence.currentState);
		return {
			decision: 'expand',
			nextState:
				earnedAuthorityStates[Math.min(currentIndex + 1, earnedAuthorityStates.length - 1)] ??
				evidence.currentState,
			reason: 'Current evidence and accountable-owner approval support one bounded expansion.'
		};
	}

	return {
		decision: 'preserve',
		nextState: evidence.currentState,
		reason: 'The current authority remains in force without evidence for a bounded change.'
	};
}

export const delegationPracticeRequiredFields: DelegationPracticeRequiredField[] = [
	'operatorName',
	'workflowName',
	'accountableOwner',
	'stakes',
	'thesisClaim',
	'systemMap',
	'allowedActions',
	'forbiddenActions',
	'policyVersion',
	'verifier',
	'rollbackTrigger',
	'goldenTask',
	'fieldObservation',
	'evidenceReceipt',
	'authorityDecisionRationale',
	'affectedParty',
	'noticePlan',
	'appealPath',
	'unresolvedConcern',
	'nextReviewDate'
];

export function createEmptyPracticeSession(): DelegationPracticeSession {
	return {
		version: DELEGATION_PRACTICE_SESSION_VERSION,
		operatorName: '',
		workflowName: '',
		accountableOwner: '',
		stakes: '',
		thesisClaim: '',
		systemMap: '',
		allowedActions: '',
		forbiddenActions: '',
		policyVersion: '',
		verifier: '',
		rollbackTrigger: '',
		goldenTask: '',
		fieldObservation: '',
		evidenceReceipt: '',
		authorityDecisionRationale: '',
		affectedParty: '',
		noticePlan: '',
		appealPath: '',
		unresolvedConcern: '',
		nextReviewDate: '',
		authorityEvidence: {
			currentState: 'prepare',
			receiptPresent: false,
			policyCurrent: true,
			criticalBoundaryBreach: false,
			calibrationFailure: false,
			promotionEvidenceComplete: false,
			ownerApproved: false
		}
	};
}

export function validatePracticeSession(
	session: DelegationPracticeSession
): DelegationPracticeRequiredField[] {
	return delegationPracticeRequiredFields.filter((field) => session[field].trim().length === 0);
}

export function serializePracticeSession(session: DelegationPracticeSession): string {
	return JSON.stringify(session);
}

export function parsePracticeSession(serialized: string): DelegationPracticeSession | null {
	try {
		const candidate: unknown = JSON.parse(serialized);
		if (!isRecord(candidate) || candidate.version !== DELEGATION_PRACTICE_SESSION_VERSION) {
			return null;
		}
		if (!delegationPracticeRequiredFields.every((field) => typeof candidate[field] === 'string')) {
			return null;
		}
		if (!isRecord(candidate.authorityEvidence)) return null;

		const evidence = candidate.authorityEvidence;
		if (!earnedAuthorityStates.includes(evidence.currentState as EarnedAuthorityState)) return null;
		if (
			![
				'receiptPresent',
				'policyCurrent',
				'criticalBoundaryBreach',
				'calibrationFailure',
				'promotionEvidenceComplete',
				'ownerApproved'
			].every((field) => typeof evidence[field] === 'boolean')
		) {
			return null;
		}

		return candidate as unknown as DelegationPracticeSession;
	} catch {
		return null;
	}
}

export function serializePracticeState(state: DelegationPracticePersistedState): string {
	return JSON.stringify(state);
}

export function parsePracticeState(serialized: string): DelegationPracticePersistedState | null {
	try {
		const candidate: unknown = JSON.parse(serialized);
		if (!isRecord(candidate) || candidate.version !== DELEGATION_PRACTICE_STORAGE_VERSION) {
			return null;
		}
		const session = parsePracticeSession(JSON.stringify(candidate.session));
		if (!session) return null;
		if (
			candidate.receiptIssuedAt !== null &&
			(typeof candidate.receiptIssuedAt !== 'string' ||
				Number.isNaN(Date.parse(candidate.receiptIssuedAt)))
		) {
			return null;
		}

		return {
			version: DELEGATION_PRACTICE_STORAGE_VERSION,
			session,
			receiptIssuedAt: candidate.receiptIssuedAt as string | null
		};
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function buildPracticeReceipt(
	session: DelegationPracticeSession,
	issuedAt: string
): BuildPracticeReceiptResult {
	const missingFields = validatePracticeSession(session);
	if (missingFields.length > 0) return { ok: false, missingFields };

	const authority = evaluateEarnedAuthority({
		...session.authorityEvidence,
		receiptPresent: session.evidenceReceipt.trim().length > 0
	});

	return {
		ok: true,
		receipt: {
			id: `PRACTICE-${issuedAt.replace(/[^0-9A-Za-z]/g, '')}`,
			labels: [...DELEGATION_PRACTICE_PREVIEW_LABELS],
			issuedAt,
			operatorName: session.operatorName,
			workflowName: session.workflowName,
			accountableOwner: session.accountableOwner,
			stakes: session.stakes,
			policyVersion: session.policyVersion,
			verifier: session.verifier,
			evidenceReceipt: session.evidenceReceipt,
			authorityDecisionRationale: session.authorityDecisionRationale,
			authority,
			governance: {
				allowedActions: session.allowedActions,
				forbiddenActions: session.forbiddenActions,
				rollbackTrigger: session.rollbackTrigger
			},
			affectedParty: {
				name: session.affectedParty,
				noticePlan: session.noticePlan,
				appealPath: session.appealPath
			},
			artifacts: {
				enter: [session.operatorName, session.workflowName, session.accountableOwner, session.stakes],
				claim: [session.thesisClaim],
				map: [session.systemMap],
				bound: [
					session.allowedActions,
					session.forbiddenActions,
					session.policyVersion,
					session.verifier,
					session.rollbackTrigger
				],
				rehearse: [session.goldenTask],
				operate: [session.fieldObservation],
				prove: [session.evidenceReceipt],
				advance: [
					session.authorityDecisionRationale,
					authority.decision,
					authority.nextState,
					authority.reason
				],
				defend: [
					session.affectedParty,
					session.noticePlan,
					session.appealPath,
					session.unresolvedConcern
				],
				practice: [session.nextReviewDate]
			},
			unresolvedConcern: session.unresolvedConcern,
			nextReviewDate: session.nextReviewDate
		}
	};
}
