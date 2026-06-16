import type { PageServerLoad } from './$types';
import { loadCanonWorkflowContext } from '$lib/canon/workflow-context';
import { SHIVWORKS_CONTEXT_ID, shivworksWorkflowContext } from '$lib/delivery/shivworks-context';

export const load: PageServerLoad = async ({ platform }) => {
	const context = await loadCanonWorkflowContext(
		platform?.env?.DB,
		SHIVWORKS_CONTEXT_ID,
		shivworksWorkflowContext
	);

	return { context };
};
