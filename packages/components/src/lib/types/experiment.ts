/**
 * File-Based Experiment Type
 *
 * Shared interface for experiments that exist as Svelte component files
 * rather than database entries. Used by both .io and .space.
 *
 * DRY: Single source of truth for experiment metadata.
 */

export interface FileBasedExperiment {
	id: string;
	slug: string;
	title: string;
	description: string;
	excerpt_short: string;
	excerpt_long: string;
	category: string;
	tags: string[];
	created_at: string;
	updated_at: string;
	reading_time_minutes: number;
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	is_file_based: true; // Marker to distinguish from database experiments
	is_executable?: 0 | 1; // Optional: 1 = interactive, 0 = documentation-only
	ascii_art?: string;
	// Hermeneutic Circle: Which principles does this experiment test?
	// Note: Some experiments have QUALITATIVE evidence (existence proves principle)
	// rather than quantitative metrics
	tests_principles?: string[];
}

/**
 * Transform a FileBasedExperiment to match Paper interface fields
 */
export function transformExperimentToPaper(exp: FileBasedExperiment) {
	return {
		...exp,
		reading_time: exp.reading_time_minutes,
		published_at: exp.created_at,
		difficulty_level: exp.difficulty,
		published: 1,
		is_hidden: 0,
		archived: 0
	};
}
