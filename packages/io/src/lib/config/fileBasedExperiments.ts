/**
 * File-Based Experiments Configuration
 *
 * Metadata for experiments that exist as Svelte component files
 * rather than database entries. These experiments can import and use
 * Svelte components for interactive visualizations.
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
}

export const fileBasedExperiments: FileBasedExperiment[] = [
	{
		id: 'file-agentic-viz',
		slug: 'agentic-visualization',
		title: 'Agentic Visualization: Autonomous UI Components Embodying Tufte\'s Principles',
		description: 'Research experiment demonstrating autonomous UI components that embody expert knowledge and make intelligent decisions about data presentation.',
		excerpt_short: 'Autonomous UI components that embody Edward Tufte\'s visualization principles',
		excerpt_long: 'This paper presents agentic visualization: autonomous UI components that embody expert knowledge and make intelligent decisions about data presentation. We demonstrate how Edward Tufte\'s principles for displaying quantitative information can be encoded into self-governing components.',
		category: 'Research',
		tags: ['Visualization', 'Components', 'Tufte', 'Agentic Design', 'Research Paper'],
		created_at: '2025-01-23T00:00:00Z',
		updated_at: '2025-01-23T00:00:00Z',
		reading_time_minutes: 15,
		difficulty: 'advanced',
		is_file_based: true
	},
	{
		id: 'file-data-patterns',
		slug: 'data-patterns',
		title: 'Revealing Data Patterns Through Agentic Components',
		description: 'Demonstration of how agentic visualization components automatically reveal patterns, trends, and anomalies without manual analysis.',
		excerpt_short: 'How visualization components reveal patterns automatically',
		excerpt_long: 'A concise demonstration showing how @create-something/tufte components automatically reveal performance degradation, service health comparisons, and error distributions without requiring manual data analysis.',
		category: 'Tutorial',
		tags: ['Visualization', 'Data Analysis', 'Patterns', 'Tutorial'],
		created_at: '2025-01-23T00:00:00Z',
		updated_at: '2025-01-23T00:00:00Z',
		reading_time_minutes: 5,
		difficulty: 'beginner',
		is_file_based: true
	}
];

/**
 * Get all file-based experiments
 */
export function getFileBasedExperiments(): FileBasedExperiment[] {
	return fileBasedExperiments;
}

/**
 * Get a file-based experiment by slug
 */
export function getFileBasedExperiment(slug: string): FileBasedExperiment | undefined {
	return fileBasedExperiments.find(exp => exp.slug === slug);
}

/**
 * Check if a slug corresponds to a file-based experiment
 */
export function isFileBasedExperiment(slug: string): boolean {
	return fileBasedExperiments.some(exp => exp.slug === slug);
}
