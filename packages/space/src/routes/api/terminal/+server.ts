import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface TerminalRequest {
	command: string;
	args: string;
	path: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	try {
		const body = await request.json() as TerminalRequest;
		const { command, args, path } = body;

		// Access Cloudflare bindings from platform
		const DB = platform?.env?.DB;

		if (!DB) {
			return json({
				output: 'Database not available. Running in development mode.',
				type: 'error'
			});
		}

		switch (command) {
			case 'papers': {
				const papers = await DB.prepare(`
					SELECT id, title, category, reading_time, difficulty_level
					FROM papers
					WHERE published = 1
					ORDER BY created_at DESC
					LIMIT 10
				`).all();

				if (!papers.results.length) {
					return json({
						output: 'No papers found.',
						type: 'info'
					});
				}

				// Helper function to create a card for a paper
				const createCard = (p: any, index: number, offset: string = '') => {
					const num = index + 1;
					const title = p.title.substring(0, 19).padEnd(19, ' ');
					const category = (p.category || 'Unknown').substring(0, 14);
					const time = (p.reading_time || '?') + 'min';
					const categoryTime = `${category} • ${time}`.substring(0, 19).padEnd(19, ' ');
					const difficulty = `Difficulty: ${(p.difficulty_level || 'N/A').substring(0, 8)}`.substring(0, 19).padEnd(19, ' ');

					// Placeholder ASCII art patterns (different for each card)
					const patterns = [
						['░░░░░░░░░░░░░░░░░░░', '░░░ PLACEHOLDER ░░░', '░░░░░░░░░░░░░░░░░░░'],
						['▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓', '▓▓▓ PLACEHOLDER ▓▓▓', '▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓'],
						['███████████████████', '███ PLACEHOLDER ███', '███████████████████'],
						['▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒', '▒▒▒ PLACEHOLDER ▒▒▒', '▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒']
					];
					const pattern = patterns[index % patterns.length];

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
				};

				// Create cards in 2-column layout with rotation effect
				const outputLines: string[] = [
					'',
					'╔═══════════════════════════════════════════════════════════════╗',
					'║                    TECHNICAL PAPERS LIBRARY                   ║',
					'╚═══════════════════════════════════════════════════════════════╝',
					''
				];

				// Process papers in pairs (2 columns)
				for (let i = 0; i < papers.results.length; i += 2) {
					const leftPaper = papers.results[i];
					const rightPaper = papers.results[i + 1];

					// Determine offset for rotation effect
					// Cards in row 2, 4, 6, etc. get indented
					const isOffsetRow = Math.floor(i / 2) % 2 === 1;
					const rowOffset = isOffsetRow ? '    ' : '';

					const leftCard = createCard(leftPaper as any, i, rowOffset);

					if (rightPaper) {
						// Two cards side by side
						const rightCard = createCard(rightPaper as any, i + 1, rowOffset);
						for (let j = 0; j < leftCard.length; j++) {
							outputLines.push(leftCard[j] + '  ' + rightCard[j].trim());
						}
					} else {
						// Single card (odd number of papers)
						outputLines.push(...leftCard);
					}

					outputLines.push(''); // Spacing between rows
				}

				outputLines.push('');
				outputLines.push('Type "read <number>" to read a paper');
				outputLines.push('');

				return json({
					output: outputLines.join('\n'),
					type: 'success'
				});
			}

			case 'read': {
				if (!args) {
					return json({
						output: 'Usage: read <paper-number>',
						type: 'error'
					});
				}

				const paperNum = parseInt(args);
				if (isNaN(paperNum) || paperNum < 1) {
					return json({
						output: 'Please provide a valid paper number',
						type: 'error'
					});
				}

				const paper = await DB.prepare(`
					SELECT * FROM papers
					WHERE published = 1
					ORDER BY created_at DESC
					LIMIT 1 OFFSET ?
				`).bind(paperNum - 1).first();

				if (!paper) {
					return json({
						output: `Paper #${paperNum} not found`,
						type: 'error'
					});
				}

				const output = [
					'',
					'╔════════════════════════════════════════════════════════════════════╗',
					`║ ${(paper as any).title.padEnd(66, ' ').substring(0, 66)} ║`,
					'╚════════════════════════════════════════════════════════════════════╝',
					'',
					`Category: ${(paper as any).category}`,
					`Reading Time: ${(paper as any).reading_time || '?'} minutes`,
					`Difficulty: ${(paper as any).difficulty_level || 'N/A'}`,
					'',
					'────────────────────────────────────────────────────────────────────',
					'',
					(paper as any).excerpt_long || (paper as any).excerpt_short || 'No description available.',
					'',
					'Type "papers" to return to the list',
					''
				].join('\n');

				return json({
					output,
					type: 'success'
				});
			}

			case 'search': {
				if (!args) {
					return json({
						output: 'Usage: search <query>',
						type: 'error'
					});
				}

				const results = await DB.prepare(`
					SELECT id, title, category, excerpt_short
					FROM papers
					WHERE published = 1
					AND (title LIKE ? OR content LIKE ? OR category LIKE ?)
					LIMIT 5
				`).bind(`%${args}%`, `%${args}%`, `%${args}%`).all();

				if (!results.results.length) {
					return json({
						output: `No papers found matching: "${args}"`,
						type: 'info'
					});
				}

				const output = [
					'',
					`Search results for "${args}":`,
					'',
					...results.results.map((p: any, i: number) =>
						`[${i + 1}] ${p.title} (${p.category})\n    ${p.excerpt_short || 'No description'}`
					),
					''
				].join('\n');

				return json({
					output,
					type: 'success'
				});
			}

			case 'ls': {
				if (path === '/' || !path) {
					return json({
						output: `/
├── papers/
│   ├── automation/
│   ├── webflow/
│   ├── development/
│   └── [5 papers]
├── about/
├── contact/
└── help/`,
						type: 'success'
					});
				}

				if (path.includes('papers')) {
					const paperCount = await DB.prepare(
						'SELECT COUNT(*) as count FROM papers WHERE published = 1'
					).first();

					return json({
						output: `papers/
└── [${(paperCount as any)?.count || 0} technical papers]`,
						type: 'success'
					});
				}

				return json({
					output: `Directory not found: ${path}`,
					type: 'error'
				});
			}

			case 'cd': {
				if (!args || args === '~' || args === '/') {
					return json({
						output: '',
						type: 'success',
						newPath: '/'
					});
				}

				if (args === '..') {
					const parentPath = path.split('/').slice(0, -1).join('/') || '/';
					return json({
						output: '',
						type: 'success',
						newPath: parentPath
					});
				}

				const newPath = args.startsWith('/')
					? args
					: path === '/'
					? `/${args}`
					: `${path}/${args}`;

				return json({
					output: '',
					type: 'success',
					newPath
				});
			}

			default:
				return json({
					output: `Command not found: ${command}. Type "help" for available commands.`,
					type: 'error'
				});
		}
	} catch (error) {
		console.error('Terminal command error:', error);
		return json({
			output: `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
			type: 'error'
		}, { status: 500 });
	}
};
