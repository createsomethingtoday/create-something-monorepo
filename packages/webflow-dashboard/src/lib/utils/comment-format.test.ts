import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCommentBody, type Block, type Inline, type ListBlock } from './comment-format';

const text = (value: string): Inline => ({ type: 'text', text: value });
const link = (url: string, host: string, ...children: Inline[]): Inline => ({ type: 'link', url, host, children });

/** The inline nodes of a one-paragraph body. */
function inline(body: string): Inline[] {
	const blocks = parseCommentBody(body);
	expect(blocks).toHaveLength(1);
	const [block] = blocks;
	if (block.type !== 'paragraph') throw new Error(`expected a paragraph, got ${block.type}`);
	return block.children;
}

function inlineText(nodes: Inline[]): string {
	return nodes.map((node) => ('text' in node ? node.text : inlineText(node.children))).join('');
}

function links(nodes: Inline[]): string[] {
	return nodes.flatMap((node) =>
		node.type === 'link' ? [node.url] : 'children' in node ? links(node.children) : []
	);
}

function listText(list: ListBlock): string[] {
	return list.items.flatMap((item) => [inlineText(item.children), ...item.lists.flatMap(listText)]);
}

/** Every word a reader gets, block by block. */
function shown(blocks: Block[]): string[] {
	return blocks.flatMap((block) => {
		if (block.type === 'rule') return [];
		if (block.type === 'list') return listText(block);
		return [inlineText(block.children)];
	});
}

describe('links', () => {
	it('turns a labelled link into a link that keeps its label', () => {
		expect(inline('See the ([screenshot](https://www.loom.com/i/abc123)).')).toEqual([
			text('See the ('),
			link('https://www.loom.com/i/abc123', 'www.loom.com', text('screenshot')),
			text(').')
		]);
	});

	it('links bare addresses, angle-bracket addresses and email addresses', () => {
		const nodes = inline('Read https://webflow.com/templates. Or <https://example.com/a_b>, or write to help@example.com.');
		expect(links(nodes)).toEqual([
			'https://webflow.com/templates',
			'https://example.com/a_b',
			'mailto:help@example.com'
		]);
		expect(inlineText(nodes)).toBe(
			'Read https://webflow.com/templates. Or https://example.com/a_b, or write to help@example.com.'
		);
	});

	it('keeps brackets that belong to the sentence out of a bare address', () => {
		expect(links(inline('(see https://example.com/page)'))).toEqual(['https://example.com/page']);
		expect(links(inline('https://en.wikipedia.org/wiki/Grid_(layout)'))).toEqual([
			'https://en.wikipedia.org/wiki/Grid_(layout)'
		]);
	});

	it('keeps a mark at the end of a bare address unless it closes formatting', () => {
		expect(links(inline('Get https://example.com/download?signature=abc_ today'))).toEqual([
			'https://example.com/download?signature=abc_'
		]);
		expect(links(inline('Get https://example.com/a~ and https://example.com/b*'))).toEqual([
			'https://example.com/a~',
			'https://example.com/b*'
		]);
		expect(inline('**See https://example.com/a_b.** _Or https://example.com/c_d_')).toEqual([
			{ type: 'bold', children: [text('See '), link('https://example.com/a_b', 'example.com', text('https://example.com/a_b')), text('.')] },
			text(' '),
			{ type: 'italic', children: [text('Or '), link('https://example.com/c_d', 'example.com', text('https://example.com/c_d'))] }
		]);
	});

	it('shows an image as a link and never as an image', () => {
		expect(inline('![Hero section](https://example.com/hero.png)')).toEqual([
			link('https://example.com/hero.png', 'example.com', text('Hero section'))
		]);
	});

	it('leaves a target that is not a web or email address as typed text', () => {
		for (const body of [
			'[click](javascript:alert(1))',
			'[click](data:text/html,x)',
			'[click](//example.com)',
			'[click](https://user:secret@example.com)',
			'<javascript:alert(1)>'
		]) {
			const nodes = inline(body);
			expect(links(nodes)).toEqual([]);
			expect(inlineText(nodes)).toBe(body);
		}
	});

	it('does not hide another host behind a label that reads as an address', () => {
		const nodes = inline('[https://webflow.com/login](https://example.net/login)');
		// Both addresses stay on the page, and each link opens the address it shows.
		expect(links(nodes)).toEqual(['https://webflow.com/login', 'https://example.net/login']);
		expect(inlineText(nodes)).toBe('[https://webflow.com/login](https://example.net/login)');
		expect(links(inline('[webflow.com](https://www.webflow.com/)'))).toEqual(['https://www.webflow.com/']);
	});

	it('reads the label as the reader does when it looks for another host', () => {
		for (const body of [
			'[**https://webflow.com/login**](https://example.net/login)',
			'[`https://webflow.com/login`](https://example.net/login)',
			'[~~webflow.com~~](https://example.net/login)',
			'[*webflow*.com](https://example.net/login)',
			'[webflow.com?x=1](https://example.net/login)',
			'[webflow.com:443#top](https://example.net/login)',
			'[Sign in at webflow.com now](https://example.net/login)',
			'[web\u200bflow.com](https://example.net/login)',
			'[help@webflow.com](mailto:help@example.net)'
		]) {
			// No link shows a webflow.com label and opens example.net.
			const hidden = (nodes: Inline[]): boolean =>
				nodes.some(
					(node) =>
						(node.type === 'link' && /example\.net/.test(node.host) && /flow/.test(inlineText(node.children))) ||
						('children' in node && hidden(node.children))
				);
			expect(hidden(inline(body))).toBe(false);
		}
	});

	it('links a label that names the host the link opens, or a parent of it', () => {
		for (const [body, url] of [
			['[webflow.com/templates](https://webflow.com/templates)', 'https://webflow.com/templates'],
			['[Read it on webflow.com](https://university.webflow.com/lesson)', 'https://university.webflow.com/lesson'],
			['[help@example.com](mailto:help@example.com)', 'mailto:help@example.com'],
			['[the 2.0 release notes](https://example.com/notes)', 'https://example.com/notes']
		]) {
			const nodes = inline(body);
			expect(nodes).toHaveLength(1);
			expect(links(nodes)).toEqual([url]);
		}
	});

	it('does not link a label that holds text-direction characters', () => {
		expect(inline('[‮moc.elpmaxe](https://example.net)').some((node) => node.type === 'link' && inlineText(node.children) !== 'https://example.net')).toBe(false);
	});
});

describe('text styles', () => {
	it('reads bold, italic, strikethrough and inline code', () => {
		expect(inline('**Bold**, *italic*, _also italic_, ~~done~~ and `hero-blob.json`.')).toEqual([
			{ type: 'bold', children: [text('Bold')] },
			text(', '),
			{ type: 'italic', children: [text('italic')] },
			text(', '),
			{ type: 'italic', children: [text('also italic')] },
			text(', '),
			{ type: 'strike', children: [text('done')] },
			text(' and '),
			{ type: 'code', text: 'hero-blob.json' },
			text('.')
		]);
	});

	it('accepts the space a rich text editor leaves before a closing mark', () => {
		expect(inline('Note that **all items must be fixed. **We cannot offer more rounds.')).toEqual([
			text('Note that '),
			{ type: 'bold', children: [text('all items must be fixed.')] },
			text(' We cannot offer more rounds.')
		]);
		expect(inline('~~Share the new name. ~~')).toEqual([
			{ type: 'strike', children: [text('Share the new name.')] },
			text(' ')
		]);
	});

	it('styles part of a word in bold and a link inside struck text', () => {
		expect(inline('Professional **Service**s')).toEqual([
			text('Professional '),
			{ type: 'bold', children: [text('Service')] },
			text('s')
		]);
		expect(inline('~~Fix the grid ([screenshot](https://www.loom.com/i/abc))~~')).toEqual([
			{
				type: 'strike',
				children: [text('Fix the grid ('), link('https://www.loom.com/i/abc', 'www.loom.com', text('screenshot')), text(')')]
			}
		]);
	});

	it('leaves marks that are part of the text alone', () => {
		for (const body of [
			'Rename hero_blob_v2.json and the class nav_link_active.',
			'2*3*4 is 24, and 2 * 3 * 4 is too.',
			'The hosts *.webflow.io and *.example.com are allowed.',
			'A lone ** or ~~ or _ changes nothing.',
			'About ~5 minutes.',
			'Use `**` for bold.'
		]) {
			const nodes = inline(body);
			expect(nodes.every((node) => node.type === 'text' || node.type === 'code')).toBe(true);
			expect(inlineText(nodes)).toBe(body.replace(/`/g, ''));
		}
	});

	it('shows an escaped mark as the mark', () => {
		expect(inline('\\*not italic\\* and 1\\. not a list')).toEqual([text('*not italic* and 1. not a list')]);
	});

	it('does not pair marks across lines', () => {
		expect(inline('**first line\nsecond line**')).toEqual([text('**first line\nsecond line**')]);
	});
});

describe('blocks', () => {
	it('keeps the numbers the writer typed', () => {
		const blocks = parseCommentBody('BLOCKING\n1. Add alt text.\n2. Fix the **404** page.\n\nRECOMMENDED\n3. Use variables.');
		expect(blocks.map((block) => block.type)).toEqual(['label', 'list', 'label', 'list']);
		const [, first, , second] = blocks as [Block, ListBlock, Block, ListBlock];
		expect(first.ordered).toBe(true);
		expect(first.items.map((item) => item.value)).toEqual([1, 2]);
		expect(first.items[1].children).toEqual([text('Fix the '), { type: 'bold', children: [text('404')] }, text(' page.')]);
		expect(second.items.map((item) => item.value)).toEqual([3]);
	});

	it('reads bullets, one nested level and continuation lines', () => {
		const [list] = parseCommentBody('- Colors\n  - the sticker positions;\n    - deeper still\n  and more on the nested item\n- Type') as [ListBlock];
		expect(list.ordered).toBe(false);
		expect(list.items).toHaveLength(2);
		expect(list.items[0].lists).toHaveLength(1);
		expect(listText(list)).toEqual(['Colors', 'the sticker positions;', 'deeper still\nand more on the nested item', 'Type']);
	});

	it('starts a new list when the marker type changes, and a paragraph at an unindented line', () => {
		expect(parseCommentBody('1. One\n- Two\nThen text.').map((block) => block.type)).toEqual(['list', 'list', 'paragraph']);
	});

	it('keeps the continuation lines of the first item in a new list', () => {
		const blocks = parseCommentBody('1. One\n- Two\n  Fix the missing permission.\n- Three\n1. Four\n   and more');
		expect(blocks.map((block) => block.type)).toEqual(['list', 'list', 'list']);
		expect(shown(blocks)).toEqual(['One', 'Two\nFix the missing permission.', 'Three', 'Four\nand more']);
	});

	it('reads a heading and a short ALL-CAPS line as a label, and a line of dashes as a divider', () => {
		const blocks = parseCommentBody('### Second review\nText\n\n----------\nFAQ PAGE:\nIt is OK. N/A.');
		expect(blocks.map((block) => block.type)).toEqual(['label', 'paragraph', 'rule', 'label', 'paragraph']);
		expect(shown(blocks)).toEqual(['Second review', 'Text', 'FAQ PAGE:', 'It is OK. N/A.']);
	});

	it('keeps line breaks inside a paragraph', () => {
		expect(inline('Line one\nLine two')).toEqual([text('Line one\nLine two')]);
	});

	it('reads every kind of line break as a line break', () => {
		expect(shown(parseCommentBody('One\r\nTwo\rThree\u2028Four\u2029Five'))).toEqual(['One\nTwo\nThree\nFour\nFive']);
		expect(parseCommentBody('1. One\u20282. Two').map((block) => block.type)).toEqual(['list']);
	});

	it('leaves syntax it does not support as typed', () => {
		const body = '> a quote\n| a | table |\n<b>tag</b> <script>alert(1)</script>\n```\ncode fence\n```\n- [ ] checkbox';
		const blocks = parseCommentBody(body);
		expect(shown(blocks).join('\n')).toBe(body.replace('- [ ] checkbox', '[ ] checkbox'));
	});

	it('returns no blocks for an empty body', () => {
		expect(parseCommentBody('')).toEqual([]);
		expect(parseCommentBody(' \n\n ')).toEqual([]);
		expect(parseCommentBody(undefined as unknown as string)).toEqual([]);
	});
});

describe('large and hostile bodies', () => {
	it('finishes fast on a body made to slow it down', () => {
		const bodies = [
			'['.repeat(20000),
			'*a '.repeat(6600),
			'**a __b '.repeat(2500),
			'*_'.repeat(5000) + 'x' + '_*'.repeat(5000),
			'`'.repeat(20000),
			'a@'.repeat(10000),
			'[a](https://example.com/'.repeat(800),
			'1. item\n'.repeat(2500),
			'https://a.example/' + ')'.repeat(19000),
			'https://a.example/' + '.'.repeat(19000),
			'# a' + ' '.repeat(19000) + 'b',
			'1. a' + ' '.repeat(19000) + 'b',
			'a' + ' '.repeat(19000) + 'b ' + '#'.repeat(900),
			'1. ' + ' '.repeat(19900) + 'x\u2028y',
			'- ' + ' '.repeat(19900) + 'x\u2029y',
			'# ' + ' '.repeat(19900) + 'x\u2028y',
			' '.repeat(19900) + '1.\u2028x',
			'*a https://a.example/' + '*_'.repeat(9000),
			'[' + 'a.'.repeat(480) + '](https://a.example/) '.repeat(20),
			'_a '.repeat(6600) + 'z_',
			'` a '.repeat(5000),
			'**a *b ~~c __d '.repeat(1300)
		];
		const started = performance.now();
		for (const body of bodies) {
			const blocks = parseCommentBody(body);
			expect(blocks.length).toBeGreaterThan(0);
		}
		expect(performance.now() - started).toBeLessThan(1000);
	});
});

describe('the app review portal copy', () => {
	it('is the same file', () => {
		const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
		expect(read('../../../../webflow-app-review-portal/lib/comment-format.ts')).toBe(read('./comment-format.ts'));
	});
});
