import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getLead, isFunnelStage, updateLead } from '$lib/server/funnel-leads';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const load: PageServerLoad = async ({ params, cookies, platform }) => {
	const operator = await requireAgencyOperator({ cookies, platform });
	const db = platform?.env?.DB;

	if (!db) {
		throw error(503, 'Database is unavailable');
	}

	const lead = await getLead(db, params.id);
	if (!lead) {
		throw error(404, 'Lead not found');
	}

	return {
		operator_email: operator.email,
		lead
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies, platform }) => {
		await requireAgencyOperator({ cookies, platform });

		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable' });
		}

		const formData = await request.formData();
		const stage = String(formData.get('stage') ?? '').trim();
		if (!isFunnelStage(stage)) {
			return fail(400, { error: 'A valid stage is required' });
		}

		const updated = await updateLead(db, params.id, {
			stage,
			estimated_value: parseNullableNumber(formData.get('estimated_value')),
			actual_value: parseNullableNumber(formData.get('actual_value')),
			service_interest: parseNullableString(formData.get('service_interest')),
			notes: parseNullableString(formData.get('notes'))
		});

		if (!updated) {
			return fail(404, { error: 'Lead not found' });
		}

		return {
			success: true,
			lead_id: updated.id,
			lead_stage: updated.stage
		};
	}
};

function parseNullableString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized ? normalized : null;
}

function parseNullableNumber(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	if (!normalized) {
		return null;
	}

	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}
