import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getLead, isFunnelStage, updateLead } from '$lib/server/funnel-leads';
import {
	listFunnelAutomationEventsByLead,
	runFunnelLeadAutomation
} from '$lib/server/funnel-automation';
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

	const automationEvents = await listFunnelAutomationEventsByLead(db, params.id);

	return {
		operator_email: operator.email,
		lead,
		automationEvents
	};
};

export const actions: Actions = {
	save: async ({ params, request, cookies, platform }) => {
		await requireAgencyOperator({ cookies, platform });

		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable' });
		}

		const existing = await getLead(db, params.id);
		if (!existing) {
			return fail(404, { error: 'Lead not found' });
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

		const stageChanged = existing.stage !== updated.stage;
		if (stageChanged) {
			const automationPromise = runFunnelLeadAutomation({
				db,
				env: platform.env,
				lead: updated,
				previousLead: existing,
				trigger: 'stage_changed'
			}).catch((automationError) => {
				console.error('Funnel lead detail stage automation failed:', automationError);
				return null;
			});

			if (platform.context) {
				platform.context.waitUntil(automationPromise);
			} else {
				await automationPromise;
			}
		}

		return {
			success: true,
			lead_id: updated.id,
			lead_stage: updated.stage,
			automation_queued: stageChanged
		};
	},

	automate: async ({ params, cookies, platform }) => {
		await requireAgencyOperator({ cookies, platform });

		const db = platform?.env?.DB;
		if (!db) {
			return fail(503, { error: 'Database is unavailable' });
		}

		const lead = await getLead(db, params.id);
		if (!lead) {
			return fail(404, { error: 'Lead not found' });
		}

		const result = await runFunnelLeadAutomation({
			db,
			env: platform.env,
			lead,
			trigger: 'manual',
			force: true
		});

		if (!result.enabled || result.configuredDestinations.length === 0) {
			return fail(400, { error: 'Funnel automation is not configured in this environment.' });
		}

		const failed = result.events.filter((event) => event.status === 'failed').length;
		const succeeded = result.events.filter((event) => event.status === 'succeeded').length;
		const skipped = result.events.filter((event) => event.status === 'skipped').length;

		return {
			automation_success: failed === 0,
			automation_attempted: result.events.length,
			automation_succeeded: succeeded,
			automation_failed: failed,
			automation_skipped: skipped
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
