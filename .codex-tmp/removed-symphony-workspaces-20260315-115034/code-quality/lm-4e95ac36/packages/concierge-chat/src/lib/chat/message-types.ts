export type MessageRole = 'assistant' | 'user' | 'system';

export type ThreadStatus = 'active' | 'awaiting_user' | 'handoff_ready';

export interface ChatMessage {
	id: string;
	role: MessageRole;
	author: string;
	body: string;
	createdAt: string;
	status?: 'sent' | 'draft' | 'blocked';
	evidence?: string[];
}

export interface ThreadSummary {
	id: string;
	title: string;
	subtitle: string;
	updatedAt: string;
	status: ThreadStatus;
	profileCompletion: number;
	pendingAction: string;
	badges: string[];
}
