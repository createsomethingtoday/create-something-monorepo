import type { PageServerLoad } from './$types';
import { loadCanonWorkflowContext } from '$lib/canon/workflow-context';
import { ABUNDANCE_CONTEXT_ID, abundanceWorkflowContext } from '$lib/delivery/abundance-context';

export const load: PageServerLoad = async ({ platform }) => {
	const context = await loadCanonWorkflowContext(
		platform?.env?.DB,
		ABUNDANCE_CONTEXT_ID,
		abundanceWorkflowContext
	);

	return { context };
};
