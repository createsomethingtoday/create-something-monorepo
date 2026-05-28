import { createAuthenticatedPageLoader } from '@create-something/canon/auth';
import type { PageServerLoad } from './$types';
import { getAirtableClient } from '$lib/server/airtable';
import { requireTemplateAssetAccess } from '$lib/server/template-access';

export const load: PageServerLoad = async (event) => {
	const base = await createAuthenticatedPageLoader()(event);
	const { locals, platform } = event;

	try {
		await requireTemplateAssetAccess(locals.user!.email, platform?.env);
		const airtable = getAirtableClient(platform?.env);
		const userEmail = locals.user!.email.toLowerCase();

		// Load user's own templates so we can mark them in results and enable Quick Validate.
		// Category performance gives us ranked category pills.
		const [assetsResult, categoryResult] = await Promise.all([
			airtable.getAssetsByEmail(userEmail),
			airtable.getCategoryPerformance()
		]);

		const userPreviewUrls = new Map(
			assetsResult
				.filter((a) => a.type === 'Template')
				.map((a) => [
					a.name.toLowerCase().trim(),
					{
						previewUrl: a.previewUrl ?? a.websiteUrl ?? null,
						marketplaceUrl: a.marketplaceUrl ?? null,
						status: a.status
					}
				])
		);

		// Distinct top-level categories ranked by revenue for the filter bar
		const categoryGroups = Array.from(
			new Map(
				categoryResult.records.map((c) => [c.category, { name: c.category, revenueRank: c.revenueRank }])
			).values()
		).sort((a, b) => a.revenueRank - b.revenueRank);

		const workerConfigured = Boolean(
			(platform?.env as Record<string, string> | undefined)?.TEMPLATE_SEARCH_WORKER_URL
		);

		return {
			...base,
			userPreviewUrls: Object.fromEntries(userPreviewUrls),
			categoryGroups,
			workerConfigured
		};
	} catch {
		return {
			...base,
			userPreviewUrls: {},
			categoryGroups: [],
			workerConfigured: false
		};
	}
};
