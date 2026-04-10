import { getDeliverySharePath, getDeliveryWorkspace } from '$lib/server/delivery-os-store';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
	const operator = await requireAgencyOperator({ cookies, platform });
	const workspace = await getDeliveryWorkspace(url.searchParams.get('engagement') ?? undefined);

	return {
		...workspace,
		selectedSharePath: workspace.selectedEngagement
			? getDeliverySharePath(workspace.selectedEngagement)
			: null,
		operator: {
			email: operator.email
		},
		chatEnabled: Boolean(platform?.env?.OPENAI_API_KEY),
		sourceMode: 'seed'
	};
};
