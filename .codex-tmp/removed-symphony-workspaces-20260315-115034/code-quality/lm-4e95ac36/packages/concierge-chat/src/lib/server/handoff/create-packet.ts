import type { ConciergeThread } from '$chat/thread-store';

export interface HandoffPacketView {
	queueName: string;
	eta: string;
	reasonCodes: string[];
	summary: string;
	operatorBrief: string;
	pendingTasks: string[];
	profileCompletion: number;
	confirmedFieldCount: number;
	artifactTitles: string[];
}

export function createHandoffPacket(thread: ConciergeThread): HandoffPacketView {
	const fallbackPacket = thread.handoff ?? {
		queueName: 'Optional concierge escalation',
		eta: 'On request',
		reasonCodes: ['user_requested_handoff'],
		summary: 'A human operator can review the thread if the user asks for help or policy requires it.',
		operatorBrief: 'Summarize blockers and the current profile state before handoff.',
		pendingTasks: ['Review thread summary.', 'Confirm blocked fields.', 'Re-enter chat if needed.']
	};

	return {
		...fallbackPacket,
		profileCompletion: thread.profile.completion,
		confirmedFieldCount: thread.profile.confirmedCount,
		artifactTitles: thread.artifacts.map((artifact) => artifact.title)
	};
}
