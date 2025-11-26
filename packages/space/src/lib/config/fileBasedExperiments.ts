/**
 * File-Based Experiments Configuration
 *
 * SEIN: Experiments that exist as Svelte component files
 * rather than database entries. Interactive, executable.
 *
 * "Weniger, aber besser" - Less, but better.
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
	is_file_based: true;
	is_executable: 1;
	ascii_art?: string;
}

export const fileBasedExperiments: FileBasedExperiment[] = [
	{
		id: 'file-motion-ontology',
		slug: 'motion-ontology',
		title: 'Motion Ontology: Phenomenological Animation Analysis',
		description:
			"Extract and interpret web animations through Heidegger's phenomenological lens. Real Puppeteer-based analysis reveals the being of motion.",
		excerpt_short: 'Phenomenological analysis of web animations',
		excerpt_long:
			"Motion Ontology applies Heidegger's phenomenological framework to web animation analysis. Using real Puppeteer-based extraction with page.hover(), we capture animations mid-flight and interpret them through concepts like Zuhandenheit (ready-to-hand) and Vorhandenheit (present-at-hand).",
		category: 'research',
		tags: ['Phenomenology', 'Animation', 'Heidegger', 'Puppeteer', 'Motion Design'],
		created_at: '2025-11-26T00:00:00Z',
		updated_at: '2025-11-26T00:00:00Z',
		reading_time_minutes: 10,
		difficulty: 'advanced',
		is_file_based: true,
		is_executable: 1,
		ascii_art: `
    +-------------------------------------------------+
    |   MOTION ONTOLOGY                               |
    |                                                 |
    |   Zuhandenheit        Vorhandenheit             |
    |   (ready-to-hand)     (present-at-hand)         |
    |                                                 |
    |      [hover]              [inspect]             |
    |        |                      |                 |
    |        v                      v                 |
    |   Transparent           Analyzed                |
    |   engagement            breakdown               |
    |                                                 |
    |   The being of animation revealed               |
    +-------------------------------------------------+
`
	}
];

/**
 * Get all file-based experiments, transformed to match Paper interface
 */
export function getFileBasedExperiments() {
	return fileBasedExperiments.map((exp) => ({
		...exp,
		reading_time: exp.reading_time_minutes,
		published_at: exp.created_at,
		difficulty_level: exp.difficulty,
		published: 1,
		is_hidden: 0,
		archived: 0
	}));
}

/**
 * Get a file-based experiment by slug
 */
export function getFileBasedExperiment(slug: string): FileBasedExperiment | undefined {
	return fileBasedExperiments.find((exp) => exp.slug === slug);
}

/**
 * Check if a slug corresponds to a file-based experiment
 */
export function isFileBasedExperiment(slug: string): boolean {
	return fileBasedExperiments.some((exp) => exp.slug === slug);
}
