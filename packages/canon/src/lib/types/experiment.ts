import type { Paper } from './paper.js';

export type PublicationFlag = boolean | number;

export type FileBasedPublicationState = {
	published?: PublicationFlag;
	is_hidden?: PublicationFlag;
	hidden?: boolean;
	archived?: PublicationFlag;
};

function publicationFlagToNumber(flag: PublicationFlag | undefined, defaultValue: 0 | 1): 0 | 1 {
	if (flag === undefined) return defaultValue;
	if (typeof flag === 'boolean') return flag ? 1 : 0;
	return Number(flag) === 1 ? 1 : 0;
}

function hiddenFlagToNumber(
	isHidden: PublicationFlag | undefined,
	hidden: boolean | undefined
): 0 | 1 {
	if (isHidden !== undefined) return publicationFlagToNumber(isHidden, 0);
	return hidden ? 1 : 0;
}

export function isPublicFileBasedContent(content: FileBasedPublicationState): boolean {
	return (
		publicationFlagToNumber(content.published, 1) === 1 &&
		hiddenFlagToNumber(content.is_hidden, content.hidden) === 0 &&
		publicationFlagToNumber(content.archived, 0) === 0
	);
}

/**
 * File-Based Experiment Type
 *
 * Shared interface for experiments that exist as Svelte component files
 * rather than database entries. Used by both .io and .space.
 *
 * DRY: Single source of truth for experiment metadata.
 *
 * ASCII Art Visual Dialects:
 * --------------------------
 * .space (Practice) uses simple ASCII: +-|
 *   → Portable, terminal-friendly, emphasizes simplicity
 *
 * .io (Research) uses Unicode box-drawing: ╔═╗║╚╝┌─┐│└┘
 *   → Richer visual, publication-quality, emphasizes rigor
 *
 * This distinction is intentional: each property speaks
 * in a visual register appropriate to its purpose.
 */

export interface FileBasedExperiment extends FileBasedPublicationState {
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
	featured?: number; // Featured priority (optional, defaults to 0)
	ascii_art?: string;
	// Hermeneutic Circle: Which principles does this experiment test?
	// Note: Some experiments have QUALITATIVE evidence (existence proves principle)
	// rather than quantitative metrics
	tests_principles?: string[];
	// Optional: Override default route (default: /experiments/{slug})
	route?: string;
}

export type FileBasedExperimentPaper = Paper & {
	is_file_based: true;
	tests_principles?: string[];
	route: string;
};

/**
 * Transform a FileBasedExperiment to match Paper interface fields
 */
export function transformExperimentToPaper(exp: FileBasedExperiment): FileBasedExperimentPaper {
	const { reading_time_minutes, difficulty, tags, published, is_hidden, hidden, archived, ...rest } =
		exp;

	return {
		...rest,
		reading_time: reading_time_minutes,
		published_at: exp.created_at,
		difficulty_level: difficulty,
		published: publicationFlagToNumber(published, 1),
		is_hidden: hiddenFlagToNumber(is_hidden, hidden),
		archived: publicationFlagToNumber(archived, 0),
		featured: exp.featured || 0,
		tags: tags.map((tag) => ({
			id: tag.toLowerCase().replace(/\s+/g, '-'),
			name: tag,
			slug: tag.toLowerCase().replace(/\s+/g, '-')
		})),
		// Route override: use exp.route if set, otherwise default to /experiments/{slug}
		route: exp.route || `/experiments/${exp.slug}`
	};
}

/**
 * File-Based Research Paper Type
 *
 * Formal academic research papers that provide theoretical grounding.
 * Distinguished from experiments by their mode of Being:
 * - Papers = Vorhandenheit (present-at-hand) - theoretical analysis
 * - Experiments = Zuhandenheit (ready-to-hand) - practical demonstration
 *
 * Both contribute to the hermeneutic circle, but in different ways:
 * - Papers DESCRIBE the circle (detached observation)
 * - Experiments DEMONSTRATE the circle (absorbed engagement)
 */
export interface FileBasedPaper extends FileBasedPublicationState {
	id: string;
	slug: string;
	title: string;
	subtitle?: string;
	authors: string[];
	abstract: string;
	keywords: string[];
	description: string;
	excerpt_short: string;
	excerpt_long: string;
	category: 'research' | 'methodology' | 'case-study' | 'white-paper';
	created_at: string;
	updated_at: string;
	reading_time_minutes: number;
	difficulty: 'intermediate' | 'advanced';
	is_file_based: true;
	// Hermeneutic Circle: Which principles does this paper validate?
	tests_principles: string[];
	// Related experiments that demonstrate the paper's findings
	related_experiments?: string[];
	// Source markdown file path (relative to monorepo root)
	source_path: string;
	// ASCII art header (Unicode box-drawing for publication quality)
	ascii_art?: string;
}

/**
 * Transform a FileBasedPaper to match Paper interface fields
 */
export function transformResearchPaperToPaper(paper: FileBasedPaper) {
	const { published, is_hidden, hidden, archived, ...rest } = paper;

	return {
		...rest,
		tags: paper.keywords.map(k => ({ id: k, name: k, slug: k.toLowerCase().replace(/\s+/g, '-') })),
		reading_time: paper.reading_time_minutes,
		published_at: paper.created_at,
		difficulty_level: paper.difficulty,
		published: publicationFlagToNumber(published, 1),
		is_hidden: hiddenFlagToNumber(is_hidden, hidden),
		archived: publicationFlagToNumber(archived, 0),
		route: `/papers/${paper.slug}`
	};
}
