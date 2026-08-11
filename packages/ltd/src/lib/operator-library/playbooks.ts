export type OperatorPlaybook = {
	slug: 'inbound-triage' | 'decision-brief' | 'exception-handoff';
	label: string;
	title: string;
	summary: string;
	whenToUse: string;
	owner: string;
	approvedWork: string;
	waitPoint: string;
	proof: string;
	opposition: { title: string; detail: string }[];
	runbook: string[];
};

export const playbooks: OperatorPlaybook[] = [
	{
		slug: 'inbound-triage',
		label: 'Playbook 01 · Intake',
		title: 'Triage inbound work without losing context',
		summary:
			'Turn an incoming request into a named next action without asking a person to reassemble the story from scratch.',
		whenToUse: 'Use when requests arrive through several tools and the next owner is not always obvious.',
		owner: 'The operator who owns the next work queue.',
		approvedWork: 'Collect the request, source evidence, urgency, and stated outcome into one brief.',
		waitPoint: 'Route only after the required context or an owner is missing.',
		proof: 'A linked source record, chosen lane, named owner, and reason for the decision.',
		opposition: [
			{ title: 'Ambiguity', detail: 'A request arrives without a clear outcome or enough context.' },
			{ title: 'Lost handoff', detail: 'The next person has to reconstruct the request from several tools.' }
		],
		runbook: [
			'Capture the request exactly as it arrived and keep the source link attached.',
			'Classify the requested outcome, urgency, and decision needed.',
			'Name the next owner or mark the handoff as waiting for assignment.',
			'Attach the routing reason so the receiving owner can inspect the decision.'
		]
	},
	{
		slug: 'decision-brief',
		label: 'Playbook 02 · Decision',
		title: 'Build a decision brief from scattered work',
		summary:
			'Give a responsible person the signal, trade-offs, recommendation, and source evidence needed to decide without chasing updates.',
		whenToUse: 'Use when information is distributed across tools and a decision is slowing the work down.',
		owner: 'The named decision owner, with a preparer accountable for the brief.',
		approvedWork: 'Gather approved source records, summarize options, and state what decision is required.',
		waitPoint: 'Do not decide, send, or publish until the named owner has reviewed the brief.',
		proof: 'The source set, recommendation, decision, owner, and dated follow-up.',
		opposition: [
			{ title: 'Scattered signal', detail: 'Relevant facts live in too many threads, records, and tools.' },
			{ title: 'No owner', detail: 'A team has a recommendation but no person accountable for the call.' }
		],
		runbook: [
			'Name the single decision and the person who has authority to make it.',
			'Gather only the source records that change that decision.',
			'Present options, trade-offs, and one recommendation in a short brief.',
			'Record the decision and its follow-up while the context is still available.'
		]
	},
	{
		slug: 'exception-handoff',
		label: 'Playbook 03 · Exception',
		title: 'Hand off an exception before trust is lost',
		summary:
			'Stop unsafe or uncertain work cleanly, give a person the right context, and leave a recovery path another operator can trust.',
		whenToUse: 'Use when an agent, automation, or person reaches a boundary it should not cross alone.',
		owner: 'The named exception owner with authority to review, approve, or stop the work.',
		approvedWork: 'Pause the workflow, preserve context, and prepare the exact decision that needs human judgment.',
		waitPoint: 'Nothing continues until the reviewer resolves the exception or changes the policy.',
		proof: 'The stop reason, evidence set, reviewer decision, and recovery or rollback action.',
		opposition: [
			{ title: 'Mistrust', detail: 'People cannot tell why automation chose an action or where it got its context.' },
			{ title: 'Unreachable AI', detail: 'The agent lacks the approved access or authority required to proceed.' }
		],
		runbook: [
			'Stop the action before it changes a record, sends a message, or commits a decision.',
			'Attach the source evidence, attempted action, policy boundary, and stop reason.',
			'Route the exception to the person with decision authority.',
			'Record the resolution, recovery action, and any policy change before resuming.'
		]
	}
];

export function getPlaybook(slug: string): OperatorPlaybook | undefined {
	return playbooks.find((playbook) => playbook.slug === slug);
}
