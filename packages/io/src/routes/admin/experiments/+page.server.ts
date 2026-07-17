import type { PageServerLoad } from './$types';
import { getCatalogExperimentPapers } from '$lib/config/experimentCatalog';
import {
	createAdminExperimentCatalog,
	createUnavailableExperimentCatalog
} from '$lib/admin/experiment-catalog';

export const load: PageServerLoad = async () => {
	try {
		return { catalog: createAdminExperimentCatalog(getCatalogExperimentPapers()) };
	} catch (error) {
		console.error('Failed to load the repository-owned experiment catalog:', error);
		return { catalog: createUnavailableExperimentCatalog() };
	}
};
