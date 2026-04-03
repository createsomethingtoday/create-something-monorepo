import type { ChatArtifact } from './artifact-model';
import type { MatchingState } from './matching-model';
import type { ChatMessage, ThreadStatus, ThreadSummary } from './message-types';
import type { TurnState } from './turn-state';
import type { ProfileSnapshot } from '$lib/profile/types';
import type { ConciergeWidget } from '$widgets/types';

export interface ConnectedToolStatus {
	name: string;
	status: 'connected' | 'action_required' | 'queued';
	note: string;
	actionHref?: string;
}

export interface ThreadIntegrationRefs {
	indeed?: {
		source: 'indeed_apply' | 'abundance_publish';
		accountId?: string;
		localApplicationId?: string;
		localJobId?: string;
		referenceNumber?: string;
		indeedApplyId?: string;
		applicantEmail?: string;
		applicantPhone?: string;
		resumeArtifactRef?: string | null;
		dispositionStatus?: string | null;
		dispositionSyncState:
			| 'not_linked'
			| 'job_published'
			| 'application_received'
			| 'claimed_in_abundance'
			| 'recorded_local_only'
			| 'synced_remote'
			| 'sync_error';
		webhookReceivedAt?: string;
		claimedAt?: string;
		lastSyncedAt?: string;
		lastError?: string | null;
	};
}

export type HandoffKind = 'escalation' | 'staffing_queue' | 'onboarding_queue';
export type StaffingQueueStatus =
	| 'queued'
	| 'outreach_started'
	| 'submitted'
	| 'interview_requested'
	| 'placement_confirmed'
	| 'closed';
export type OnboardingQueueStatus = 'queued' | 'in_progress' | 'completed';

export interface HandoffPacket {
	kind: HandoffKind;
	queueName: string;
	eta: string;
	reasonCodes: string[];
	summary: string;
	operatorBrief: string;
	pendingTasks: string[];
	queueStatus?: StaffingQueueStatus;
	onboardingStatus?: OnboardingQueueStatus;
	coordinatorName?: string;
	onboardingOwnerName?: string;
	roleTitle?: string;
	facility?: string;
	startDate?: string;
}

export interface ConciergeThread {
	id: string;
	title: string;
	subtitle: string;
	userName: string;
	updatedAt: string;
	status: ThreadStatus;
	pendingAction: string;
	badges: string[];
	messages: ChatMessage[];
	widgets: ConciergeWidget[];
	profile: ProfileSnapshot;
	artifacts: ChatArtifact[];
	turn: TurnState;
	connectedTools: ConnectedToolStatus[];
	matching?: MatchingState;
	handoff?: HandoffPacket;
	integrationRefs?: ThreadIntegrationRefs;
}

export interface ThreadStore {
	list(): ThreadSummary[];
	get(id: string): ConciergeThread | undefined;
	latest(): ConciergeThread | undefined;
}

export function toThreadSummary(thread: ConciergeThread): ThreadSummary {
	return {
		id: thread.id,
		title: thread.title,
		subtitle: thread.subtitle,
		updatedAt: thread.updatedAt,
		status: thread.status,
		profileCompletion: thread.profile.completion,
		pendingAction: thread.pendingAction,
		badges: thread.badges
	};
}

export function createThreadStore(seed: ConciergeThread[]): ThreadStore {
	const ordered = [...seed].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
	const byId = new Map(ordered.map((thread) => [thread.id, thread]));

	return {
		list() {
			return ordered.map(toThreadSummary);
		},
		get(id: string) {
			return byId.get(id);
		},
		latest() {
			return ordered[0];
		}
	};
}
