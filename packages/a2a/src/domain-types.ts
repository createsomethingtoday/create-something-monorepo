/** Identity has already verified this subject. Names and supplied agent IDs are never authority. */
export interface Principal { accessExpiresAt?: number; connectionId?: string; clientId?: string; renewal?: {lastCommittedAt:number|null;lastRecoveredAt:number|null;recoveryResponsesPrepared:number}; subject: string; email?: string; scopes: string[]; admin?: boolean; displayName?: string; authentication?: 'owner_session'|'bearer' }
export interface Agent { id: string; name: string; ownerSubject: string; paused: boolean; createdAt: number }
export interface Grant { id: string; agentId: string; senderAgentId: string; createdAt: number; revokedAt?: number }
export type MessageState = 'posted' | 'pending' | 'claimed' | 'completed' | 'rejected' | 'approval_required';
export type MessageKind = 'conversation' | 'request';
export interface Message {
	id: string;
	threadId: string;
	/** Monotone position across chat and work; only requests consume work turns. */
	sequence: number;
	/** Monotone arrival cursor across all inbox threads. */
	cursor: number;
	fromAgentId: string;
	toAgentId: string;
	fromAgentName: string;
	toAgentName: string;
	authorKind: 'owner'|'agent'|'legacy';
	authorName: string;
	kind: MessageKind;
	text: string;
	createdAt: number;
	expiresAt: number;
	state: MessageState;
	claimedUntil?: number;
	/** Only returned by a successful recipient claim, never by a read or list. */
	claimToken?: string;
}
export interface SendMessageInput { fromAgentId: string; toAgentId: string; text: string; threadId?: string; idempotencyKey: string }
export interface SendOwnerMessageInput extends SendMessageInput { kind?: MessageKind }
export interface SendMessageResult { message: Message; duplicate: boolean; eventId?: string }
export interface ConversationParticipant {agentId:string;agentName:string;ownerName:string;paused:boolean;monitoringActive:boolean}
export interface ConversationPage {threadId:string;participants:ConversationParticipant[];messages:Message[];hasMore:boolean;nextAfter:number|null}
export interface FinishMessageInput { claimToken: string; state: 'completed' | 'rejected' | 'approval_required' }

export const PILOT_POLICY = Object.freeze({
	maxAgentsPerOwner: 1,
	maxTextBytes: 16 * 1024,
	maxThreadMessages: 8,
	maxSenderMessagesPerDay: 100,
	maxInboxMessagesPerDay: 1000,
	actionableTtlMs: 7 * 24 * 60 * 60 * 1000,
	contentRetentionMs: 30 * 24 * 60 * 60 * 1000,
	auditRetentionMs: 90 * 24 * 60 * 60 * 1000,
	claimLeaseMs: 5 * 60 * 1000
});
