export const AGENCY_MARKETING_COPY_EXPERIMENT = {
	id: 'agency-marketing-copy-2026-03-15',
	variant: 'ops-revops-clarity-v2',
	surface: 'agency-marketing-core',
	version: '2026-03-15.2',
	paths: [
		'/',
		'/services',
		'/about',
		'/book',
		'/products',
		'/methodology',
		'/contact'
	],
} as const;

const EXPERIMENT_PATHS = new Set<string>(AGENCY_MARKETING_COPY_EXPERIMENT.paths);

export function getAgencyMarketingExperimentMetadata(
	pathname: string
): Record<string, unknown> | undefined {
	if (!EXPERIMENT_PATHS.has(pathname)) {
		return undefined;
	}

	return {
		experimentId: AGENCY_MARKETING_COPY_EXPERIMENT.id,
		experimentVariant: AGENCY_MARKETING_COPY_EXPERIMENT.variant,
		experimentSurface: AGENCY_MARKETING_COPY_EXPERIMENT.surface,
		experimentVersion: AGENCY_MARKETING_COPY_EXPERIMENT.version,
		experimentPath: pathname,
	};
}
