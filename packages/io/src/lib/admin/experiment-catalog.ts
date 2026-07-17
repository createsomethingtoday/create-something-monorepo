export interface AdminExperimentSource {
	id: string;
	slug: string;
	title: string;
	description?: string | null;
	category?: string | null;
	featured?: boolean | number | null;
	created_at?: string | null;
	updated_at?: string | null;
	route?: string | null;
}

export interface AdminExperimentRecord {
	id: string;
	slug: string;
	title: string;
	description: string;
	category: string;
	featured: boolean;
	updatedAt: string | null;
	publicPath: string;
}

export type AdminExperimentCatalogState =
	| { status: 'ready'; experiments: AdminExperimentRecord[] }
	| { status: 'unavailable'; message: string };

export function createAdminExperimentCatalog(
	experiments: AdminExperimentSource[]
): AdminExperimentCatalogState {
	return {
		status: 'ready',
		experiments: experiments.map((experiment) => ({
			id: experiment.id,
			slug: experiment.slug,
			title: experiment.title,
			description: experiment.description || '',
			category: experiment.category || 'uncategorized',
			featured: Boolean(experiment.featured),
			updatedAt: experiment.updated_at || experiment.created_at || null,
			publicPath: experiment.route || `/experiments/${experiment.slug}`
		}))
	};
}

export function createUnavailableExperimentCatalog(
	message = 'The repository-owned experiment catalog is unavailable.'
): AdminExperimentCatalogState {
	return { status: 'unavailable', message };
}

export function getAdminExperimentCatalogStats(state: AdminExperimentCatalogState) {
	if (state.status !== 'ready') {
		return { total: null, featured: null };
	}

	return {
		total: state.experiments.length,
		featured: state.experiments.filter((experiment) => experiment.featured).length
	};
}
