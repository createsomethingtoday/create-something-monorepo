import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	canonCorsHeaders,
	type CanonActionPreviewBody
} from '$lib/canon/control';
import { loadCanonWorkflowContext, selectCanonWorkflowAction } from '$lib/canon/workflow-context';

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: canonCorsHeaders });
};

export const POST: RequestHandler = async ({ request, platform }) => {
	let body: CanonActionPreviewBody;

	try {
		body = (await request.json()) as CanonActionPreviewBody;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400, headers: canonCorsHeaders });
	}

	const context = await loadCanonWorkflowContext(platform?.env?.DB, body.contextId);
	const actionId = typeof body.actionId === 'string' && body.actionId.trim() ? body.actionId.trim() : 'draft-operator-brief';
	const approvalState = typeof body.approvalState === 'string' ? body.approvalState : 'review';
	const action = selectCanonWorkflowAction(context, actionId);
	const approved = approvalState === 'approved';
	const status = action.status === 'blocked' ? 'blocked' : action.status === 'requires_approval' && !approved ? 'requires_approval' : 'allowed';

	return json(
		{
			actionId: action.id,
			label: action.label,
			status,
			risk: action.risk,
			summary:
				status === 'blocked'
					? action.summary
					: approved
						? `${action.summary} The preview has approval context, but this route still does not execute external mutations.`
						: action.summary,
			policyChecks: [
				...action.policyChecks,
				...context.guardrails.slice(1, 3)
			],
			evidence: action.evidence,
			allowedNextActions: action.allowedNextActions,
			contextId: context.contextId,
			contextSource: context.source,
			guardrails: context.guardrails
		},
		{ headers: canonCorsHeaders }
	);
};
