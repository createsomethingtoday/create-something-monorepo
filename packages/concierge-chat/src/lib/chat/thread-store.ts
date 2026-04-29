import type { ChatArtifact } from './artifact-model';
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

export interface HandoffPacket {
	queueName: string;
	eta: string;
	reasonCodes: string[];
	summary: string;
	operatorBrief: string;
	pendingTasks: string[];
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
	handoff?: HandoffPacket;
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
