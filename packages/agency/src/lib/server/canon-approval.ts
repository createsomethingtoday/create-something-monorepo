import type { CanonApprovalUpdateBody } from '$lib/canon/control';
import {
	loadCanonWorkflowContext,
	sanitizeCanonContextId,
	type CanonWorkflowActivityEvent,
	type CanonWorkflowApprovalQueueItem
} from '$lib/canon/workflow-context';

const approvalStatuses = ['review', 'approved', 'blocked'] as const;

type ApprovalStatus = (typeof approvalStatuses)[number];

export type CanonApprovalUpdateResult =
	| {
			ok: true;
			body: {
				contextId: string;
				contextSource: string;
				approval: CanonWorkflowApprovalQueueItem;
				event: CanonWorkflowActivityEvent;
				guardrails: string[];
			};
	  }
	| {
			ok: false;
			status: number;
			body: { error: string };
	  };

export async function persistCanonApprovalUpdate(input: {
	db: D1Database;
	body: CanonApprovalUpdateBody;
	actorFallback?: string;
	actorOverride?: string;
}): Promise<CanonApprovalUpdateResult> {
	const contextId = sanitizeCanonContextId(input.body.contextId);
	const approvalId = sanitizeShortText(input.body.approvalId, 96);
	const status = normalizeApprovalStatus(input.body.status);
	const actor = sanitizeShortText(input.actorOverride ?? input.body.actor ?? input.actorFallback, 96) || 'Operator';
	const note = sanitizeShortText(input.body.note, 280);

	if (!approvalId) {
		return { ok: false, status: 400, body: { error: 'Missing approvalId.' } };
	}

	if (!status) {
		return { ok: false, status: 400, body: { error: 'Status must be review, approved, or blocked.' } };
	}

	const context = await loadCanonWorkflowContext(input.db, contextId);
	const approval = context.approvalQueue.find((item) => item.id === approvalId);

	if (!approval) {
		return { ok: false, status: 404, body: { error: 'Approval not found for this context.' } };
	}

	const updatedAt = new Date().toISOString();
	const updatedApproval: CanonWorkflowApprovalQueueItem = {
		...approval,
		status,
		updatedBy: actor,
		updatedAt
	};
	const event: CanonWorkflowActivityEvent = {
		id: `event-${crypto.randomUUID()}`,
		eventType: 'approval',
		label: `Approval ${readableStatus(status)}`,
		detail: note || `${approval.title} moved to ${readableStatus(status)}.`,
		actor,
		timestamp: updatedAt,
		tone: status === 'approved' ? 'success' : status === 'blocked' ? 'danger' : 'warning'
	};

	await input.db.batch([
		input.db
			.prepare(
				`INSERT INTO canon_workflow_approvals (
				   approval_id, context_id, action_id, title, requester, required_approver, status, risk,
				   due_at, evidence_json, policy_checks_json, updated_by, updated_at
				 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
				 ON CONFLICT(approval_id) DO UPDATE SET
				   context_id = excluded.context_id,
				   action_id = excluded.action_id,
				   title = excluded.title,
				   requester = excluded.requester,
				   required_approver = excluded.required_approver,
				   status = excluded.status,
				   risk = excluded.risk,
				   due_at = excluded.due_at,
				   evidence_json = excluded.evidence_json,
				   policy_checks_json = excluded.policy_checks_json,
				   updated_by = excluded.updated_by,
				   updated_at = datetime('now')`
			)
			.bind(
				updatedApproval.id,
				context.contextId,
				updatedApproval.actionId ?? null,
				updatedApproval.title,
				updatedApproval.requester ?? null,
				updatedApproval.requiredApprover,
				updatedApproval.status,
				updatedApproval.risk ?? null,
				updatedApproval.due ?? null,
				JSON.stringify(updatedApproval.evidence ?? []),
				JSON.stringify(updatedApproval.policyChecks ?? []),
				actor
			),
		input.db
			.prepare(
				`INSERT INTO canon_workflow_activity (
				   event_id, context_id, event_type, label, detail, actor, tone, metadata_json, created_at
				 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
			)
			.bind(
				event.id,
				context.contextId,
				event.eventType,
				event.label,
				event.detail ?? null,
				event.actor ?? null,
				event.tone ?? null,
				JSON.stringify({ approvalId: updatedApproval.id, status: updatedApproval.status })
			)
	]);

	return {
		ok: true,
		body: {
			contextId: context.contextId,
			contextSource: context.source,
			approval: updatedApproval,
			event,
			guardrails: context.guardrails
		}
	};
}

function normalizeApprovalStatus(value: unknown): ApprovalStatus | null {
	return typeof value === 'string' && approvalStatuses.includes(value as ApprovalStatus) ? (value as ApprovalStatus) : null;
}

function sanitizeShortText(value: unknown, maxLength: number): string {
	return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function readableStatus(status: ApprovalStatus) {
	return status.replace(/_/g, ' ');
}
