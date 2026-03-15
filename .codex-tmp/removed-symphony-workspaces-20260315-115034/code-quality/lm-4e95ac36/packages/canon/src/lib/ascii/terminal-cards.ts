/**
 * Terminal ASCII Card Utilities
 *
 * Shared utilities for creating ASCII art cards in terminal-style interfaces.
 * Used by the terminal API endpoints across .io and .agency.
 */

/**
 * Paper item for terminal card display
 */
export interface TerminalPaperItem {
	title: string;
	category?: string | null;
	reading_time?: number | null;
	difficulty_level?: string | null;
}

/**
 * ASCII art patterns for card headers
 */
export const CARD_PATTERNS = [
	['░░░░░░░░░░░░░░░░░░░', '░░░ PLACEHOLDER ░░░', '░░░░░░░░░░░░░░░░░░░'],
	['▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓', '▓▓▓ PLACEHOLDER ▓▓▓', '▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓'],
	['███████████████████', '███ PLACEHOLDER ███', '███████████████████'],
	['▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒', '▒▒▒ PLACEHOLDER ▒▒▒', '▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒']
] as const;

/**
 * Create an ASCII card for a paper item
 *
 * @param paper - The paper item to display
 * @param index - The index in the list (0-based)
 * @param offset - Optional string offset for indentation (e.g., '    ')
 * @returns Array of strings representing the card lines
 *
 * @example
 * const card = createTerminalCard(paper, 0, '');
 * console.log(card.join('\n'));
 */
export function createTerminalCard(
	paper: TerminalPaperItem,
	index: number,
	offset: string = ''
): string[] {
	const num = index + 1;
	const title = paper.title.substring(0, 19).padEnd(19, ' ');
	const category = (paper.category || 'Unknown').substring(0, 14);
	const time = (paper.reading_time || '?') + 'min';
	const categoryTime = `${category} • ${time}`.substring(0, 19).padEnd(19, ' ');

	// Handle difficulty_level which might be number or string
	const difficultyStr = paper.difficulty_level?.toString() || 'N/A';
	const difficulty = `Difficulty: ${difficultyStr.substring(0, 8)}`.substring(0, 19).padEnd(19, ' ');

	const pattern = CARD_PATTERNS[index % CARD_PATTERNS.length];

	return [
		`${offset}┌───────────────────────┐`,
		`${offset}│  ${pattern[0]}  │`,
		`${offset}│  ${pattern[1]}  │`,
		`${offset}│  ${pattern[2]}  │`,
		`${offset}├───────────────────────┤`,
		`${offset}│ ${num}. ${title} │`,
		`${offset}│ ${categoryTime} │`,
		`${offset}│ ${difficulty} │`,
		`${offset}└───────────────────────┘`
	];
}

/**
 * Create a header box for terminal output
 *
 * @param title - The title to display
 * @param width - Total width of the box (default: 65)
 */
export function createTerminalHeader(title: string, width: number = 65): string[] {
	const innerWidth = width - 2; // Account for border characters
	const paddedTitle = title.substring(0, innerWidth).padStart((innerWidth + title.length) / 2).padEnd(innerWidth);

	return [
		'╔' + '═'.repeat(innerWidth) + '╗',
		'║' + paddedTitle + '║',
		'╚' + '═'.repeat(innerWidth) + '╝'
	];
}

/**
 * Create cards in a 2-column layout with optional rotation effect
 *
 * @param papers - Array of paper items
 * @param rotationOffset - Whether to indent alternating rows (default: true)
 */
export function createTerminalCardGrid(
	papers: TerminalPaperItem[],
	rotationOffset: boolean = true
): string[] {
	const outputLines: string[] = [];

	for (let i = 0; i < papers.length; i += 2) {
		const leftPaper = papers[i];
		const rightPaper = papers[i + 1];

		// Determine offset for rotation effect
		const isOffsetRow = Math.floor(i / 2) % 2 === 1;
		const rowOffset = rotationOffset && isOffsetRow ? '    ' : '';

		const leftCard = createTerminalCard(leftPaper, i, rowOffset);

		if (rightPaper) {
			// Two cards side by side
			const rightCard = createTerminalCard(rightPaper, i + 1, rowOffset);
			for (let j = 0; j < leftCard.length; j++) {
				outputLines.push(leftCard[j] + '  ' + rightCard[j].trim());
			}
		} else {
			// Single card (odd number of papers)
			outputLines.push(...leftCard);
		}

		outputLines.push(''); // Spacing between rows
	}

	return outputLines;
}
