import type { Paper } from '@create-something/canon/types';

/** Motion studies also use topic tags rather than Ive-specific principle IDs. */
export function isMotionExperiment(experiment: Paper): boolean {
	return (experiment.tags || []).some((tag) =>
		['motion', 'animation', 'kinetic'].includes((typeof tag === 'string' ? tag : tag.name).toLowerCase())
	);
}
