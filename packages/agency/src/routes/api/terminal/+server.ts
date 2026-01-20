import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Paper } from '@create-something/components/types';
import { generateCorrelationId, logError } from '@create-something/components/utils';
import {
	createTerminalHeader,
	createTerminalCardGrid,
	type TerminalPaperItem
} from '@create-something/components/ascii';

interface TerminalRequest {
	command: string;
	args: string;
	path: string;
}

/**
 * Subset of Paper for detail view (read command)
 */
type PaperDetail = Pick<Paper, 'id' | 'title' | 'category' | 'reading_time' | 'difficulty_level' | 'excerpt_short' | 'excerpt_long'>;

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

				const paperList = papers.results as unknown as TerminalPaperItem[];
				const header = createTerminalHeader('TECHNICAL PAPERS LIBRARY');
				const cards = createTerminalCardGrid(paperList, true);

				const outputLines = [
					'',
					...header,
					'',
					...cards,
					'',
					'Type "read <number>" to read a paper',
					''
				];

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
					SELECT id, title, category, reading_time, difficulty_level, excerpt_short, excerpt_long
					FROM papers
					WHERE published = 1
					ORDER BY created_at DESC
					LIMIT 1 OFFSET ?
				`).bind(paperNum - 1).first<PaperDetail>();

				if (!paper) {
					return json({
						output: `Paper #${paperNum} not found`,
						type: 'error'
					});
				}

				const output = [
					'',
					'╔════════════════════════════════════════════════════════════════════╗',
					`║ ${paper.title.padEnd(66, ' ').substring(0, 66)} ║`,
					'╚════════════════════════════════════════════════════════════════════╝',
					'',
					`Category: ${paper.category}`,
					`Reading Time: ${paper.reading_time || '?'} minutes`,
					`Difficulty: ${paper.difficulty_level || 'N/A'}`,
					'',
					'────────────────────────────────────────────────────────────────────',
					'',
					paper.excerpt_long || paper.excerpt_short || 'No description available.',
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

				const searchResults = results.results as unknown as TerminalPaperItem[];
				const output = [
					'',
					`Search results for "${args}":`,
					'',
					...searchResults.map((p, i) =>
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
					).first<{ count: number }>();

					return json({
						output: `papers/
└── [${paperCount?.count || 0} technical papers]`,
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
	} catch (err) {
		const correlationId = generateCorrelationId();
		logError('Terminal command', err, correlationId);
		return json({
			output: `Error processing command. (Ref: ${correlationId})`,
			type: 'error',
			correlationId
		}, { status: 500 });
	}
};
