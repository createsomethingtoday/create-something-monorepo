export const readinessDimensions = [
	{
		id: 'ambiguity',
		question: 'Can you name the one outcome this workflow advances?',
		gap: 'The work is still ambiguous.',
		detail: 'Start with one outcome and the smallest decision that moves it forward.'
	},
	{
		id: 'access',
		question: 'Does the workflow have approved access to the records it needs?',
		gap: 'The required access is not clear.',
		detail: 'Name the system of record, allowed data, and the boundary the workflow cannot cross.'
	},
	{
		id: 'ownership',
		question: 'Is one person accountable for the decision when work pauses?',
		gap: 'No decision owner is named.',
		detail: 'Assign a person who can approve, redirect, or stop the work.'
	},
	{
		id: 'trust',
		question: 'Can a teammate inspect why the workflow acted or stopped?',
		gap: 'The automation is not yet trustworthy.',
		detail: 'Keep the decision reason and source evidence visible at the handoff.'
	},
	{
		id: 'proof',
		question: 'Will the workflow leave a record another operator can review?',
		gap: 'The workflow leaves no proof.',
		detail: 'Define the receipt: source, action, owner, outcome, and recovery path.'
	}
] as const;

export type ReadinessDimensionId = (typeof readinessDimensions)[number]['id'];
export type ReadinessAnswers = Record<ReadinessDimensionId, boolean | undefined>;

export type WorkflowReadiness = {
	state: 'ready' | 'review' | 'blocked';
	gaps: (typeof readinessDimensions)[number][];
	nextAction: { label: string; href: string };
};

export function assessWorkflowReadiness(answers: ReadinessAnswers): WorkflowReadiness {
	const gaps = readinessDimensions.filter((dimension) => answers[dimension.id] !== true);

	if (gaps.length === 0) {
		return {
			state: 'ready',
			gaps,
			nextAction: { label: 'Choose a playbook', href: '/playbooks' }
		};
	}

	const needsExceptionHandoff = gaps.some(
		(dimension) => dimension.id === 'access' || dimension.id === 'trust'
	);
	const needsTriage = gaps.some((dimension) => dimension.id === 'ambiguity');

	return {
		state: gaps.length >= 3 ? 'blocked' : 'review',
		gaps,
		nextAction: needsExceptionHandoff
			? { label: 'Open the exception handoff playbook', href: '/playbooks/exception-handoff' }
			: needsTriage
				? { label: 'Open the inbound triage playbook', href: '/playbooks/inbound-triage' }
				: { label: 'Open the decision brief playbook', href: '/playbooks/decision-brief' }
	};
}
