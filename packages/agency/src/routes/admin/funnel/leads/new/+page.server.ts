import { fail } from '@sveltejs/kit';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, fetch, cookies, platform }) => {
		await requireAgencyOperator({ cookies, platform });
		const form = await request.formData();
		const name = requiredText(form, 'name');
		const source = requiredText(form, 'source');

		if (!name || !source) {
			return fail(400, { success: false, error: 'Name and source are required.' });
		}

		const response = await fetch('/api/funnel/leads', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name,
				source,
				email: optionalText(form, 'email'),
				company: optionalText(form, 'company'),
				role: optionalText(form, 'role'),
				linkedin_url: optionalText(form, 'linkedin_url'),
				source_detail: optionalText(form, 'source_detail'),
				campaign: optionalText(form, 'campaign'),
				stage: optionalText(form, 'stage') ?? 'awareness',
				estimated_value: optionalNumber(form, 'estimated_value'),
				service_interest: optionalText(form, 'service_interest'),
				notes: optionalText(form, 'notes')
			})
		});
		const payload = (await response.json().catch(() => null)) as {
			id?: string;
			stage?: string;
			message?: string;
		} | null;

		if (!response.ok || !payload?.id) {
			return fail(response.status >= 400 ? response.status : 500, {
				success: false,
				error: payload?.message ?? 'The lead record could not be created.'
			});
		}

		return {
			success: true,
			id: payload.id,
			stage: payload.stage ?? 'awareness'
		};
	}
};

function requiredText(form: FormData, key: string): string {
	const value = form.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

function optionalText(form: FormData, key: string): string | undefined {
	return requiredText(form, key) || undefined;
}

function optionalNumber(form: FormData, key: string): number | undefined {
	const value = optionalText(form, key);
	if (value === undefined) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}
