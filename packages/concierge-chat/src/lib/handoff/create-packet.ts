import type {
	ConciergeThread,
	HandoffKind,
	OnboardingQueueStatus,
	StaffingQueueStatus
} from '$chat/thread-store';
import { hasHandoffPacket } from '$chat/workflow';

export interface HandoffPacketView {
	kind: HandoffKind;
	tone: 'danger' | 'good';
	statusLabel: string;
	queueName: string;
	eta: string;
	reasonCodes: string[];
	summary: string;
	briefLabel: string;
	operatorBrief: string;
	pendingTasksLabel: string;
	pendingTasks: string[];
	artifactsLabel: string;
	actionLabel: string;
	profileCompletion: number;
	confirmedFieldCount: number;
	artifactTitles: string[];
}

function getHandoffStatusLabel(
	kind: HandoffKind,
	queueStatus?: StaffingQueueStatus,
	onboardingStatus?: OnboardingQueueStatus
) {
	if (kind === 'staffing_queue') {
		switch (queueStatus) {
			case 'outreach_started':
				return 'Coordinator outreach active';
			case 'submitted':
				return 'Submitted to facility';
			case 'interview_requested':
				return 'Interview requested';
			case 'placement_confirmed':
				return 'Placement confirmed';
			case 'closed':
				return 'Request closed';
			default:
				return 'Queued for outreach';
		}
	}

	if (kind === 'onboarding_queue') {
		switch (onboardingStatus) {
			case 'in_progress':
				return 'Onboarding active';
			case 'completed':
				return 'Start ready';
			default:
				return 'Ready for onboarding';
		}
	}

	return 'Review queued';
}

function getHandoffLabels(kind: HandoffKind) {
	if (kind === 'staffing_queue') {
		return {
			tone: 'good' as const,
			briefLabel: 'Submission Brief',
			pendingTasksLabel: 'Queue Checklist',
			artifactsLabel: 'Packet Contents',
			actionLabel: 'Open staffing packet'
		};
	}

	if (kind === 'onboarding_queue') {
		return {
			tone: 'good' as const,
			briefLabel: 'Onboarding Brief',
			pendingTasksLabel: 'Launch Checklist',
			artifactsLabel: 'Onboarding Packet',
			actionLabel: 'Open onboarding packet'
		};
	}

	return {
		tone: 'danger' as const,
		briefLabel: 'Operator Brief',
		pendingTasksLabel: 'Pending Tasks',
		artifactsLabel: 'Attached Artifacts',
		actionLabel: 'Open handoff packet'
	};
}

export function createHandoffPacket(thread: ConciergeThread): HandoffPacketView | null {
	if (!hasHandoffPacket(thread) || !thread.handoff) {
		return null;
	}

	const labels = getHandoffLabels(thread.handoff.kind);

	return {
		...thread.handoff,
		...labels,
		statusLabel: getHandoffStatusLabel(
			thread.handoff.kind,
			thread.handoff.queueStatus,
			thread.handoff.onboardingStatus
		),
		profileCompletion: thread.profile.completion,
		confirmedFieldCount: thread.profile.confirmedCount,
		artifactTitles: thread.artifacts.map((artifact) => artifact.title)
	};
}
