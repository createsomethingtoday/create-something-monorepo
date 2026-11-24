/**
 * Formatting for review comments.
 *
 * A comment body is plain text that may hold a small Markdown subset: the
 * review team's feedback comes from an Airtable rich text field, which writes
 * `**bold**`, `[label](url)` and numbered lines. This module turns that text
 * into a small tree. The page renders the tree as elements and text nodes, so
 * a body never becomes markup.
 *
 * Supported: bold, italic, strikethrough, inline code, links (labelled,
 * `<url>`, bare web addresses, email addresses), numbered and bulleted lists
 * with one nested level, section labels (`# Heading` or a short ALL-CAPS
 * line) and dividers. All other syntax stays on the page as it was typed.
 * Images are not loaded: `![alt](url)` becomes a link.
 *
 * Two copies of this file must stay the same, because the app review portal
 * is outside the workspace and cannot import from it:
 *   packages/webflow-dashboard/src/lib/utils/comment-format.ts
 *   packages/webflow-app-review-portal/lib/comment-format.ts
 * A test in each package fails when they differ.
 */

export type Inline =
	| { type: 'text'; text: string }
	| { type: 'code'; text: string }
	| { type: 'link'; url: string; host: string; children: Inline[] }
	| { type: 'bold' | 'italic' | 'strike'; children: Inline[] };

export interface ListItem {
	/** The number the writer typed; null in a bulleted list. */
	value: number | null;
	children: Inline[];
	lists: ListBlock[];
}

export interface ListBlock {
	type: 'list';
	ordered: boolean;
	items: ListItem[];
}

export type Block =
	| { type: 'paragraph'; children: Inline[] }
	| { type: 'label'; children: Inline[] }
	| { type: 'rule' }
	| ListBlock;

/** Characters that reorder text on screen: a link could show one address and open another. */
const BIDI = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
const CONTROL = /[\u0000-\u001f\u007f]/;
const ESCAPABLE = '\\`*_~[]()<>#+-.!|';
const ALNUM = /[\p{L}\p{N}]/u;
const WEB_ADDRESS = /https?:\/\/[^\s<>"`[\]\u200e\u200f\u202a-\u202e\u2066-\u2069]+/iy;
const AUTOLINK = /<(https?:\/\/[^\s<>]+)>/iy;
const EMAIL = /[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){0,8}\.[A-Za-z]{2,24}/y;
const EMAIL_PART = /[A-Za-z0-9._%+@/:-]/;
const URL_LIKE_LABEL = /^\s*(?:https?:\/\/|www\.)\S+\s*$|^\s*[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?\s*$/i;

const MAX_LABEL = 1000;
const MAX_URL = 2048;
const MAX_DEPTH = 6;

const RULE_LINE = /^\s*([-*_])\1{2,}\s*$/;
const HEADING_LINE = /^\s{0,3}#{1,6}\s+(\S.*)$/;
const ORDERED_LINE = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const BULLET_LINE = /^(\s*)[-*+\u2022]\s+(.*)$/;
const CAPS_LABEL_LINE = /^[A-Z0-9 &/():,'-]+:?$/;

/** A link target the page may open, or null. Only web and email addresses pass. */
function safeUrl(raw: string): { url: string; host: string } | null {
	if (!raw || raw.length > MAX_URL || BIDI.test(raw) || CONTROL.test(raw) || /\s/.test(raw)) return null;
	if (!/^(?:https?:\/\/|mailto:)/i.test(raw)) return null;
	try {
		const parsed = new URL(raw);
		if (parsed.protocol === 'mailto:') return { url: parsed.href, host: parsed.pathname };
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
		if (!parsed.hostname || parsed.username || parsed.password) return null;
		return { url: parsed.href, host: parsed.hostname };
	} catch {
		return null;
	}
}

function plainText(nodes: Inline[]): string {
	return nodes.map((node) => ('text' in node ? node.text : plainText(node.children))).join('');
}

/** True when a label reads as a web address on another host than the one the link opens. */
function labelNamesOtherHost(label: string, host: string): boolean {
	if (!URL_LIKE_LABEL.test(label)) return false;
	const text = label.trim();
	const bare = (name: string) => name.replace(/^www\./, '');
	try {
		return bare(new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`).hostname) !== bare(host);
	} catch {
		return true;
	}
}

type Token =
	| { kind: 'node'; node: Inline }
	| { kind: 'delim'; char: string; length: number; canOpen: boolean; canClose: boolean };

const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char);
const isAlnum = (char: string | undefined) => char !== undefined && ALNUM.test(char);

/** The index of the bracket that closes the one at `open`, on the same line, or -1. */
function closingBracket(text: string, open: number, openChar: string, closeChar: string, limit: number): number {
	let depth = 0;
	const end = Math.min(text.length, open + limit);
	for (let i = open; i < end; i++) {
		const char = text[i];
		if (char === '\\') i++;
		else if (char === openChar) depth++;
		else if (char === closeChar && --depth === 0) return i;
	}
	return -1;
}

/**
 * The end of a bare address. Sentence punctuation and an unpaired closing
 * bracket are not part of it. A run of `*`, `_` or `~` is not part of it only
 * when the same mark opened earlier on the line, because an address can end
 * in one of those characters ("?signature=abc_").
 */
function trimAddress(address: string, opened: (mark: string, length: number) => boolean): string {
	let brackets = 0;
	for (const char of address) {
		if (char === '(') brackets++;
		else if (char === ')') brackets--;
	}
	let end = address.length;
	while (end > 0) {
		const last = address[end - 1];
		if (".,;:!?'".includes(last)) {
			end--;
		} else if (last === ')' && brackets < 0) {
			end--;
			brackets++;
		} else if (last === '*' || last === '_' || last === '~') {
			let run = 1;
			while (address[end - 1 - run] === last) run++;
			if (!opened(last, run)) break;
			end -= run;
		} else break;
	}
	return address.slice(0, end);
}

function linkNode(target: { url: string; host: string }, children: Inline[]): Inline {
	return { type: 'link', url: target.url, host: target.host, children };
}

/** One line of text as tokens: finished nodes (text, code, links) and emphasis marks. */
function tokenize(line: string, allowLinks: boolean, depth: number): Token[] {
	const tokens: Token[] = [];
	let text = '';
	const flush = () => {
		if (text) tokens.push({ kind: 'node', node: { type: 'text', text } });
		text = '';
	};
	const push = (node: Inline) => {
		flush();
		tokens.push({ kind: 'node', node });
	};

	let i = 0;
	while (i < line.length) {
		const char = line[i];

		if (char === '\\' && i + 1 < line.length && ESCAPABLE.includes(line[i + 1])) {
			text += line[i + 1];
			i += 2;
			continue;
		}

		if (char === '`') {
			let run = 1;
			while (line[i + run] === '`') run++;
			const fence = '`'.repeat(run);
			let close = line.indexOf(fence, i + run);
			while (close !== -1 && line[close + run] === '`') {
				// A longer run is not this one's end.
				let skip = close;
				while (line[skip] === '`') skip++;
				close = line.indexOf(fence, skip);
			}
			if (close !== -1 && close > i + run) {
				let code = line.slice(i + run, close);
				if (code.length > 2 && code.startsWith(' ') && code.endsWith(' ') && code.trim()) code = code.slice(1, -1);
				push({ type: 'code', text: code });
				i = close + run;
				continue;
			}
			text += fence;
			i += run;
			continue;
		}

		if (allowLinks) {
			if (char === '<') {
				AUTOLINK.lastIndex = i;
				const match = AUTOLINK.exec(line);
				const target = match && safeUrl(match[1]);
				if (match && target) {
					push(linkNode(target, [{ type: 'text', text: match[1] }]));
					i += match[0].length;
					continue;
				}
			}

			const image = char === '!' && line[i + 1] === '[';
			if (char === '[' || image) {
				const open = image ? i + 1 : i;
				const close = closingBracket(line, open, '[', ']', MAX_LABEL);
				if (close !== -1 && line[close + 1] === '(') {
					const end = closingBracket(line, close + 1, '(', ')', MAX_URL);
					const target = end === -1 ? null : safeUrl(line.slice(close + 2, end));
					const label = line.slice(open + 1, close);
					const children = target && label.trim() && !BIDI.test(label) ? parseInline(label, false, depth + 1) : [];
					const seen = plainText(children);
					if (target && !BIDI.test(label) && !labelNamesOtherHost(seen, target.host)) {
						const shown = seen.trim() ? children : [{ type: 'text' as const, text: line.slice(close + 2, end) }];
						push(linkNode(target, shown));
						i = end + 1;
						continue;
					}
				}
			}

			if ((char === 'h' || char === 'H') && !isAlnum(line[i - 1])) {
				WEB_ADDRESS.lastIndex = i;
				const match = WEB_ADDRESS.exec(line);
				const address = match
					? trimAddress(match[0], (mark, length) =>
							tokens.some((t) => t.kind === 'delim' && t.canOpen && t.char === mark && t.length === length)
						)
					: '';
				const target = address ? safeUrl(address) : null;
				if (target) {
					push(linkNode(target, [{ type: 'text', text: address }]));
					i += address.length;
					continue;
				}
			}

			if (/[A-Za-z0-9]/.test(char) && (i === 0 || !EMAIL_PART.test(line[i - 1]))) {
				EMAIL.lastIndex = i;
				const match = EMAIL.exec(line);
				const after = match ? line[i + match[0].length] : undefined;
				const target = match && (after === undefined || !/[A-Za-z0-9@_-]/.test(after)) ? safeUrl(`mailto:${match[0]}`) : null;
				if (match && target) {
					push(linkNode(target, [{ type: 'text', text: match[0] }]));
					i += match[0].length;
					continue;
				}
				// No address starts in this word: move past it in one step.
				let stop = i + 1;
				while (stop < line.length && /[A-Za-z0-9]/.test(line[stop])) stop++;
				text += line.slice(i, stop);
				i = stop;
				continue;
			}
		}

		if (char === '*' || char === '_' || char === '~') {
			let run = 1;
			while (line[i + run] === char) run++;
			const before = line[i - 1];
			const after = line[i + run];
			const usable = char === '~' ? run === 2 : run <= 3;
			// A rich text editor often keeps the space before the closing mark of bold
			// or strikethrough text ("**text **next"), so those may close after a space.
			const strong = run >= 2;
			let canOpen = usable && !isSpace(after);
			let canClose = usable && (strong || !isSpace(before));
			if (char === '_' || !strong) {
				// Inside a word these are part of the text: snake_case, 2*3*4.
				canOpen = canOpen && !isAlnum(before);
				canClose = canClose && !isAlnum(after);
			}
			if (canOpen || canClose) {
				flush();
				tokens.push({ kind: 'delim', char, length: run, canOpen, canClose });
			} else {
				text += char.repeat(run);
			}
			i += run;
			continue;
		}

		text += char;
		i++;
	}
	flush();
	return tokens;
}

function mergeText(nodes: Inline[]): Inline[] {
	const out: Inline[] = [];
	for (const node of nodes) {
		const last = out[out.length - 1];
		if (node.type === 'text' && last?.type === 'text') last.text += node.text;
		else out.push(node);
	}
	return out;
}

/** Pair the emphasis marks of one line. A mark with no partner stays as text. */
function pair(tokens: Token[], depth: number): Inline[] {
	const out: Inline[] = [];
	const literal = (token: Extract<Token, { kind: 'delim' }>) =>
		out.push({ type: 'text', text: token.char.repeat(token.length) });
	// A search that found no closing mark makes every later search for the same mark fail too.
	const noPartner = new Set<string>();

	let i = 0;
	while (i < tokens.length) {
		const token = tokens[i];
		if (token.kind === 'node') {
			out.push(token.node);
			i++;
			continue;
		}
		const key = token.char + token.length;
		let close = -1;
		if (token.canOpen && depth < MAX_DEPTH && !noPartner.has(key)) {
			for (let j = i + 1; j < tokens.length; j++) {
				const other = tokens[j];
				if (other.kind === 'delim' && other.char === token.char && other.length === token.length && other.canClose) {
					close = j;
					break;
				}
			}
			if (close === -1) noPartner.add(key);
		}
		if (close === -1) {
			literal(token);
			i++;
			continue;
		}

		const inner = pair(tokens.slice(i + 1, close), depth + 1);
		// Space before the closing mark goes after the styled text, not inside it.
		let trailing = '';
		const lastInner = inner[inner.length - 1];
		if (lastInner?.type === 'text') {
			const kept = lastInner.text.trimEnd();
			trailing = lastInner.text.slice(kept.length);
			if (kept) lastInner.text = kept;
			else inner.pop();
		}
		if (inner.length === 0) {
			literal(token);
			out.push({ type: 'text', text: trailing });
			literal(token);
		} else {
			const children = mergeText(inner);
			if (token.char === '~') out.push({ type: 'strike', children });
			else if (token.length === 1) out.push({ type: 'italic', children });
			else if (token.length === 2) out.push({ type: 'bold', children });
			else out.push({ type: 'bold', children: [{ type: 'italic', children }] });
			if (trailing) out.push({ type: 'text', text: trailing });
		}
		i = close + 1;
	}
	return mergeText(out);
}

function parseInline(line: string, allowLinks = true, depth = 0): Inline[] {
	if (depth >= MAX_DEPTH) return line ? [{ type: 'text', text: line }] : [];
	return pair(tokenize(line, allowLinks, depth), depth);
}

/** Several lines as one run of inline nodes; the line breaks stay in the text. */
function parseLines(lines: string[]): Inline[] {
	const out: Inline[] = [];
	lines.forEach((line, index) => {
		if (index > 0) out.push({ type: 'text', text: '\n' });
		out.push(...parseInline(line));
	});
	return mergeText(out);
}

function isCapsLabel(line: string): boolean {
	return line.length <= 48 && /[A-Z]{3}/.test(line) && CAPS_LABEL_LINE.test(line);
}

/** Turn a comment body into blocks. Never throws; text it does not understand stays text. */
export function parseCommentBody(body: string): Block[] {
	const blocks: Block[] = [];
	let paragraph: string[] = [];
	// The open list, the indent of its first line, and the item a continuation line joins.
	const state: { open: { block: ListBlock; indent: number; last: ListItem } | null } = { open: null };
	// Item text is parsed when the list ends, after its continuation lines are known.
	const itemLines = new Map<ListItem, string[]>();

	const endParagraph = () => {
		if (paragraph.length) blocks.push({ type: 'paragraph', children: parseLines(paragraph) });
		paragraph = [];
	};
	const endList = () => {
		if (!state.open) return;
		for (const [item, lines] of itemLines) item.children = parseLines(lines);
		itemLines.clear();
		blocks.push(state.open.block);
		state.open = null;
	};

	for (const raw of String(body ?? '').replace(/\r\n?/g, '\n').split('\n')) {
		const line = raw.trimEnd();
		if (!line.trim()) {
			endParagraph();
			endList();
			continue;
		}
		if (RULE_LINE.test(line)) {
			endParagraph();
			endList();
			blocks.push({ type: 'rule' });
			continue;
		}

		const indent = /^\s*/.exec(line)![0].replace(/\t/g, '    ').length;
		const ordered = ORDERED_LINE.exec(line);
		const bullet = ordered ? null : BULLET_LINE.exec(line);
		if (ordered || bullet) {
			endParagraph();
			const isOrdered = ordered !== null;
			// A new marker type at the top level starts a new list. End the open one first:
			// ending it reads and clears the stored lines, and the new item's lines must stay.
			if (state.open && indent < state.open.indent + 2 && state.open.block.ordered !== isOrdered) endList();
			const item: ListItem = { value: ordered ? Number(ordered[2]) : null, children: [], lists: [] };
			itemLines.set(item, [ordered ? ordered[3] : bullet![2]]);

			const list = state.open;
			if (list && indent >= list.indent + 2) {
				// One nested level; deeper lines join it.
				const parent = list.block.items[list.block.items.length - 1];
				const nested = parent.lists[parent.lists.length - 1];
				if (nested && nested.ordered === isOrdered) nested.items.push(item);
				else parent.lists.push({ type: 'list', ordered: isOrdered, items: [item] });
				list.last = item;
				continue;
			}
			if (list) {
				list.block.items.push(item);
				list.last = item;
			} else {
				state.open = { block: { type: 'list', ordered: isOrdered, items: [item] }, indent, last: item };
			}
			continue;
		}

		// An indented line right after a list item continues that item.
		const list = state.open;
		if (list && indent >= 2) {
			itemLines.get(list.last)?.push(line.trim());
			continue;
		}
		endList();

		const heading = HEADING_LINE.exec(line);
		if (heading) {
			endParagraph();
			blocks.push({ type: 'label', children: parseInline(heading[1]) });
			continue;
		}
		if (isCapsLabel(line.trim())) {
			endParagraph();
			blocks.push({ type: 'label', children: [{ type: 'text', text: line.trim() }] });
			continue;
		}
		paragraph.push(line);
	}
	endParagraph();
	endList();
	return blocks;
}
