import { fail } from '@sveltejs/kit';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { Actions } from './$types';

const metricFields = [
	'linkedin_impressions',
	'linkedin_reach',
	'linkedin_followers',
	'linkedin_follower_delta',
	'linkedin_engagements',
	'linkedin_profile_views',
	'website_visits',
	'website_unique_visitors',
	'content_downloads',
	'discovery_calls_scheduled',
	'discovery_calls_completed',
	'proposals_sent',
	'deals_closed',
	'revenue_closed'
] as const;

export const actions: Actions = {
	default: async ({ request, fetch, cookies, platform }) => {
		await requireAgencyOperator({ cookies, platform });
		const form = await request.formData();
		const date = text(form, 'date');
		if (!date) {
			return fail(400, { success: false, error: 'Choose a metrics date.' });
		}

		const metrics = Object.fromEntries(
			metricFields.flatMap((field) => {
				const value = optionalNumber(form, field);
				return value === undefined ? [] : [[field, value]];
			})
		);
		const response = await fetch('/api/funnel', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				date,
				...metrics,
				notes: text(form, 'notes') || undefined
			})
		});
		const payload = (await response.json().catch(() => null)) as {
			success?: boolean;
			date?: string;
			message?: string;
		} | null;

		if (!response.ok || !payload?.success) {
			return fail(response.status >= 400 ? response.status : 500, {
				success: false,
				error: payload?.message ?? 'The metrics could not be saved.'
			});
		}

		return { success: true, date: payload.date ?? date };
	}
};

function text(form: FormData, key: string): string {
	const value = form.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

function optionalNumber(form: FormData, key: string): number | undefined {
	const value = text(form, key);
	if (!value) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}
