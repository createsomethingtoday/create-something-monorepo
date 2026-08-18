import type { CategoryEntry, ScopeEntry } from './types';

/**
 * Parser for entrypoints/server/lib/logic/oauth/scopes.ts in webflow/webflow.
 *
 * The file is the single source of truth for OAuth scopes (the repo's own
 * authz guidance forbids inventing scope keys anywhere else), so this parser
 * only needs to understand that one file's shape: two deepFreeze({...})
 * object literals with UPPER_SNAKE entries. Sanity thresholds below make a
 * format change fail loudly instead of diffing the registry down to zero.
 */
export class ParseError extends Error {}

/** Minimum plausible sizes — the registry had 47 scopes / 26 categories in Aug 2026. */
const MIN_SCOPES = 30;
const MIN_CATEGORIES = 15;

function extractObjectLiteral(source: string, constName: string): string {
	const marker = `export const ${constName} = deepFreeze({`;
	const start = source.indexOf(marker);
	if (start === -1) {
		throw new ParseError(`missing "export const ${constName} = deepFreeze({"`);
	}
	// Brace-count from the opening '{'. Descriptions contain no braces today;
	// if that changes, the sanity thresholds below catch the breakage.
	const open = start + marker.length - 1;
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		const ch = source[i];
		if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return source.slice(open + 1, i);
		}
	}
	throw new ParseError(`unbalanced braces in ${constName}`);
}

function splitEntries(inner: string): Array<{ name: string; body: string }> {
	const re = /^\s{2}([A-Z][A-Z0-9_]*):\s*\{/gm;
	const starts: Array<{ name: string; index: number }> = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(inner)) !== null) {
		starts.push({ name: m[1], index: m.index });
	}
	return starts.map((s, idx) => ({
		name: s.name,
		body: inner.slice(s.index, idx + 1 < starts.length ? starts[idx + 1].index : inner.length),
	}));
}

/** Matches `field: '...'` or `field: "..."`, tolerating a line break after the colon. */
function matchString(body: string, field: string): string | null {
	const re = new RegExp(`(?:^|[\\s{])${field}:\\s*(['"])([\\s\\S]*?)\\1`);
	const m = body.match(re);
	return m ? m[2] : null;
}

export function parseCategories(source: string): Record<string, CategoryEntry> {
	const inner = extractObjectLiteral(source, 'SCOPE_CATEGORIES');
	const categories: Record<string, CategoryEntry> = {};
	for (const entry of splitEntries(inner)) {
		const name = matchString(entry.body, 'name');
		const description = matchString(entry.body, 'description');
		if (!name || !description) {
			throw new ParseError(`category ${entry.name} missing name/description`);
		}
		categories[entry.name] = { key: entry.name, name, description };
	}
	return categories;
}

export function parseScopes(source: string): Record<string, ScopeEntry> {
	const inner = extractObjectLiteral(source, 'SCOPES');
	const scopes: Record<string, ScopeEntry> = {};
	for (const entry of splitEntries(inner)) {
		const key = matchString(entry.body, 'key');
		const description = matchString(entry.body, 'description');
		const category = entry.body.match(/category:\s*SCOPE_CATEGORIES\.([A-Z0-9_]+)\.key/)?.[1];
		const featureFlag = entry.body.match(/featureFlag:\s*FEATURE_FLAGS\.([A-Z0-9_]+)/)?.[1] ?? null;
		const resourcesBlock = entry.body.match(/authorizationResourceTypes:\s*\[([\s\S]*?)\]/)?.[1] ?? '';
		const resourceTypes = [...resourcesBlock.matchAll(/TokenAuthorizationResource\.(\w+)/g)].map(
			(r) => r[1]
		);
		if (!key || !description || !category) {
			throw new ParseError(`scope ${entry.name} missing key/description/category`);
		}
		scopes[key] = { constant: entry.name, key, category, description, resourceTypes, featureFlag };
	}
	return scopes;
}

export function parseScopesFile(source: string): {
	scopes: Record<string, ScopeEntry>;
	categories: Record<string, CategoryEntry>;
} {
	const categories = parseCategories(source);
	const scopes = parseScopes(source);
	const scopeCount = Object.keys(scopes).length;
	const categoryCount = Object.keys(categories).length;
	if (scopeCount < MIN_SCOPES || categoryCount < MIN_CATEGORIES) {
		throw new ParseError(
			`sanity check failed: parsed ${scopeCount} scopes / ${categoryCount} categories ` +
				`(expected >= ${MIN_SCOPES} / ${MIN_CATEGORIES}) — file format likely changed`
		);
	}
	return { scopes, categories };
}
