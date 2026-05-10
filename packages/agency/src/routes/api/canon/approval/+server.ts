import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canonCorsHeaders, type CanonApprovalUpdateBody } from '$lib/canon/control';
import { constantTimeEqual } from '$lib/server/mcp-entitlements';
import {
	loadCanonWorkflowContext,
	sanitizeCanonContextId,
	type CanonWorkflowApprovalQueueItem,
	type CanonWorkflowActivityEvent
} from '$lib/canon/workflow-context';

const approvalStatuses = ['review', 'approved', 'blocked'] as const;

type ApprovalStatus = (typeof approvalStatuses)[number];

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: canonCorsHeaders });
};

export const POST: RequestHandler = async ({ request, platform }) => {
	let body: CanonApprovalUpdateBody;

	try {
		body = (await request.json()) as CanonApprovalUpdateBody;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400, headers: canonCorsHeaders });
	}

	if (!platform?.env?.DB) {
		return json({ error: 'Approval updates require the Cloudflare D1 binding.' }, { status: 503, headers: canonCorsHeaders });
	}

	const expectedKey = platform.env.AGENCY_INTERNAL_API_KEY?.trim();
	if (!expectedKey) {
		return json({ error: 'Approval updates require AGENCY_INTERNAL_API_KEY.' }, { status: 503, headers: canonCorsHeaders });
	}

	const providedKey = parseInternalCredential(request);
	if (!providedKey || !constantTimeEqual(expectedKey, providedKey)) {
		return json({ error: 'Missing or invalid approval credential.' }, { status: 401, headers: canonCorsHeaders });
	}

	const contextId = sanitizeCanonContextId(body.contextId);
	const approvalId = sanitizeShortText(body.approvalId, 96);
	const status = normalizeApprovalStatus(body.status);
	const actor = sanitizeShortText(body.actor, 96) || 'Operator';
	const note = sanitizeShortText(body.note, 280);

	if (!approvalId) {
		return json({ error: 'Missing approvalId.' }, { status: 400, headers: canonCorsHeaders });
	}

	if (!status) {
		return json({ error: 'Status must be review, approved, or blocked.' }, { status: 400, headers: canonCorsHeaders });
	}

	const context = await loadCanonWorkflowContext(platform.env.DB, contextId);
	const approval = context.approvalQueue.find((item) => item.id === approvalId);

	if (!approval) {
		return json({ error: 'Approval not found for this context.' }, { status: 404, headers: canonCorsHeaders });
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

	await platform.env.DB.batch([
		platform.env.DB
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
		platform.env.DB
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

	return json(
		{
			contextId: context.contextId,
			contextSource: context.source,
			approval: updatedApproval,
			event,
			guardrails: context.guardrails
		},
		{
			headers: {
				...canonCorsHeaders,
				'cache-control': 'no-store'
			}
		}
	);
};

function normalizeApprovalStatus(value: unknown): ApprovalStatus | null {
	return typeof value === 'string' && approvalStatuses.includes(value as ApprovalStatus) ? (value as ApprovalStatus) : null;
}

function sanitizeShortText(value: unknown, maxLength: number): string {
	return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function parseInternalCredential(request: Request): string | null {
	return (
		request.headers.get('X-API-Key')?.trim() ??
		request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ??
		null
	);
}

function readableStatus(status: ApprovalStatus) {
	return status.replace(/_/g, ' ');
}
