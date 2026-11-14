import type { Principal } from './domain-types';
export interface SharedPrincipal extends Principal {
  connectionId?: string;
  clientId?: string;
}
export type SharedCapability = 'read' | 'post' | 'work';
export interface SharedAgent {
  id: string;
  owner_subject: string;
  name: string;
  paused: number;
  deleted_at: number | null;
  created_at: number;
}
export interface SharedInbox {
  id: string;
  owner_subject: string;
  name: string;
  state: 'active' | 'archived' | 'closed';
  policy_version: number;
  created_at: number;
}
export interface SharedMembership {
  inbox_id: string;
  agent_id: string;
  generation: number;
  state: string;
  capabilities: string;
  admission_cursor: number;
  created_at: number;
}
export interface SharedConnection {
  id: string;
  owner_subject: string;
  label: string;
  client_id: string | null;
  agent_id: string | null;
  state: string;
  created_at: number;
}
export interface SharedInvitation {
  id: string;
  inbox_id: string;
  agent_id: string;
  owner_subject: string;
  capabilities: string;
  state: string;
  expires_at: number;
  created_at: number;
  admission_cursor: number | null;
}
export interface SharedMessage {
  cursor: number;
  id: string;
  inbox_id: string;
  author_agent_id: string | null;
  author_kind: string;
  author_name: string;
  kind: 'conversation' | 'request' | 'notice';
  text: string;
  assignee_agent_id: string | null;
  assignment_version: number;
  state: string;
  created_at: number;
  expires_at: number;
  actionable_until: number | null;
  claim_token?: string | null;
  claim_connection_id?: string | null;
  claim_generation?: number | null;
  claim_until?: number | null;
}
export interface SharedContext {
  id: string;
  inbox_id: string;
  cursor: number;
  title: string;
  text: string;
  created_at: number;
  expires_at: number;
  sha256: string;
}
export interface SharedPage<T> {
  items: T[];
  nextAfter: number | null;
  hasMore: boolean;
  truncated: boolean;
}
export interface SharedSendInput {
  text: string;
  kind?: 'conversation' | 'request';
  assigneeAgentId?: string;
  idempotencyKey: string;
}
export const SHARED_POLICY = Object.freeze({
  version: 2,
  maxAgentsPerOwner: 20,
  maxInboxesPerOwner: 20,
  maxMembers: 50,
  maxPendingInvitations: 100,
  maxTextBytes: 16384,
  maxContextBytes: 65536,
  maxContextPerInbox: 100,
  maxMessagesPerDay: 1000,
  maxPage: 100,
  retentionMs: 30 * 86400000,
  invitationMs: 7 * 86400000,
  claimLeaseMs: 300000
});
