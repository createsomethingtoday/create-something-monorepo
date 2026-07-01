import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import type { GovernanceProductAttachmentMode, GovernanceProductId } from '@create-something/canon/governance';
import {
	buildGovernanceOperatorReview,
	createGovernanceOperatorAttachmentAction,
	createGovernanceOperatorConnectionAction,
	createGovernanceOperatorDecisionAction,
	createGovernanceOperatorProofAction,
	createGovernanceOperatorReceiptAction,
	createGovernanceOperatorSignalAction,
	emptyGovernanceOperatorReview,
	normalizeGovernanceOperatorFilters
} from '$lib/server/governance-operator';
import type {
	GovernanceConnectionKind,
	GovernanceConnectionStatus,
	GovernanceDecisionState,
	GovernanceDeliveryReceiptStatus,
	GovernanceProofOutcome
} from '$lib/server/governance-runtime';
import { buildGovernanceSlackMonitorReadiness } from '$lib/server/governance-slack-monitor';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
	const filters = normalizeGovernanceOperatorFilters(url.searchParams);
	await requireAgencyOperator({ cookies, platform });

	try {
		const db = platform?.env?.DB;
		if (!db) {
			return {
				review: emptyGovernanceOperatorReview(filters, 'Database is unavailable.'),
				monitor_readiness: null,
				action_result: normalizeActionResult(url.searchParams.get('action_result')),
				error: 'Database is unavailable.'
			};
		}

		return {
			review: await buildGovernanceOperatorReview(db, filters),
			monitor_readiness: await buildGovernanceSlackMonitorReadiness(db, {
				channelsRaw: platform.env.GOVERNANCE_SLACK_CHANNELS,
				slackBotToken: platform.env.SLACK_BOT_TOKEN,
				workspaceUrl: platform.env.GOVERNANCE_SLACK_WORKSPACE_URL
			}),
			action_result: normalizeActionResult(url.searchParams.get('action_result')),
			error: null
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load governance records.';
		return {
			review: emptyGovernanceOperatorReview(filters, message),
			monitor_readiness: null,
			action_result: normalizeActionResult(url.searchParams.get('action_result')),
			error: message
		};
	}
};

export const actions: Actions = {
	recordSignal: async ({ cookies, platform, request }) => {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable.' });
		}

		const data = await request.formData();
		try {
			await createGovernanceOperatorSignalAction(db, {
				atlasCanvasId: requiredFormText(data, 'atlas_canvas_id'),
				atlasNodeId: optionalFormText(data, 'atlas_node_id'),
				source: optionalFormText(data, 'source'),
				sourceUrl: optionalFormText(data, 'source_url'),
				title: requiredFormText(data, 'title'),
				summary: requiredFormText(data, 'summary'),
				requiresDocumentationReview: checkboxValue(data, 'requires_documentation_review'),
				requiresReviewerProcessReview: checkboxValue(data, 'requires_reviewer_process_review'),
				reasons: optionalFormText(data, 'reasons')
			});
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to record Signal.'
			});
		}

		throw redirect(303, governanceRedirectUrl(data, 'signal_created'));
	},

	recordDecision: async ({ cookies, platform, request }) => {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable.' });
		}

		const data = await request.formData();
		try {
			await createGovernanceOperatorDecisionAction(db, {
				signalId: requiredFormText(data, 'signal_id'),
				decisionState: requiredFormText(data, 'decision_state') as GovernanceDecisionState,
				decisionOwner: requiredFormText(data, 'decision_owner'),
				reason: requiredFormText(data, 'reason')
			});
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to record decision.'
			});
		}

		throw redirect(303, governanceRedirectUrl(data, 'decision_created'));
	},

	recordProof: async ({ cookies, platform, request }) => {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable.' });
		}

		const data = await request.formData();
		try {
			await createGovernanceOperatorProofAction(db, {
				decisionId: requiredFormText(data, 'decision_id'),
				evidence: requiredFormText(data, 'evidence'),
				outcome: optionalFormText(data, 'outcome') as GovernanceProofOutcome | undefined,
				receiptUrl: optionalFormText(data, 'receipt_url'),
				rollbackNote: optionalFormText(data, 'rollback_note')
			});
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to record proof.'
			});
		}

		throw redirect(303, governanceRedirectUrl(data, 'proof_created'));
	},

	recordAttachment: async ({ cookies, platform, request }) => {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable.' });
		}

		const data = await request.formData();
		try {
			await createGovernanceOperatorAttachmentAction(db, {
				sourceProductId: requiredFormText(data, 'source_product_id') as GovernanceProductId,
				sourceRecordId: requiredFormText(data, 'source_record_id'),
				targetProductId: requiredFormText(data, 'target_product_id') as GovernanceProductId,
				targetRecordId: requiredFormText(data, 'target_record_id'),
				atlasCanvasId: requiredFormText(data, 'atlas_canvas_id'),
				atlasNodeId: optionalFormText(data, 'atlas_node_id'),
				mode: optionalFormText(data, 'mode') as GovernanceProductAttachmentMode | undefined,
				label: optionalFormText(data, 'label'),
				required: checkboxValue(data, 'required')
			});
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to record attachment.'
			});
		}

		throw redirect(303, governanceRedirectUrl(data, 'attachment_created'));
	},

	recordConnection: async ({ cookies, platform, request }) => {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable.' });
		}

		const data = await request.formData();
		try {
			await createGovernanceOperatorConnectionAction(db, {
				kind: requiredFormText(data, 'kind') as GovernanceConnectionKind,
				name: requiredFormText(data, 'name'),
				status: optionalFormText(data, 'status') as GovernanceConnectionStatus | undefined,
				atlasCanvasId: requiredFormText(data, 'atlas_canvas_id'),
				atlasNodeId: optionalFormText(data, 'atlas_node_id'),
				endpointUrl: optionalFormText(data, 'endpoint_url'),
				signingSecretName: optionalFormText(data, 'signing_secret_name'),
				eventTypes: optionalFormText(data, 'event_types'),
				owner: optionalFormText(data, 'owner')
			});
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to record connection.'
			});
		}

		throw redirect(303, governanceRedirectUrl(data, `${requiredFormText(data, 'kind')}_created`));
	},

	recordReceipt: async ({ cookies, platform, request }) => {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable.' });
		}

		const data = await request.formData();
		try {
			await createGovernanceOperatorReceiptAction(db, {
				connectionId: requiredFormText(data, 'connection_id'),
				eventType: requiredFormText(data, 'event_type'),
				recordProductId: requiredFormText(data, 'record_product_id') as GovernanceProductId,
				recordId: requiredFormText(data, 'record_id'),
				status: requiredFormText(data, 'status') as GovernanceDeliveryReceiptStatus,
				statusCode: optionalFormText(data, 'status_code'),
				responseExcerpt: optionalFormText(data, 'response_excerpt')
			});
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to record receipt.'
			});
		}

		throw redirect(303, governanceRedirectUrl(data, 'receipt_created'));
	}
};

function requiredFormText(data: FormData, key: string): string {
	const value = optionalFormText(data, key);
	if (!value) {
		throw new Error(`${key} is required`);
	}
	return value;
}

function optionalFormText(data: FormData, key: string): string | undefined {
	const value = data.get(key);
	return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function checkboxValue(data: FormData, key: string): boolean {
	const value = data.get(key);
	return value === 'on' || value === 'true' || value === '1';
}

function governanceRedirectUrl(data: FormData, actionResult: string): string {
	const params = new URLSearchParams();
	const canvas = optionalFormText(data, 'return_atlas_canvas_id');
	const node = optionalFormText(data, 'return_atlas_node_id');
	const limit = optionalFormText(data, 'return_limit');
	if (canvas) params.set('atlas_canvas_id', canvas);
	if (node) params.set('atlas_node_id', node);
	if (limit && limit !== '100') params.set('limit', limit);
	params.set('action_result', actionResult);
	return `/admin/governance?${params.toString()}`;
}

function normalizeActionResult(value: string | null): string {
	if (value === 'signal_created') return 'Signal recorded.';
	if (value === 'decision_created') return 'Decision recorded.';
	if (value === 'proof_created') return 'Proof recorded.';
	if (value === 'attachment_created') return 'Attachment recorded.';
	if (value === 'source_created') return 'Source recorded.';
	if (value === 'subscription_created') return 'Subscription recorded.';
	if (value === 'receipt_created') return 'Receipt recorded.';
	return '';
}
