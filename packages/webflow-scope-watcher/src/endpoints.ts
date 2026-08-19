import { fetchRepoFile, ghHeaders, type GithubEnv } from './github';
import type { GuardedRoute, ScopeEndpoints } from './types';

/**
 * Scope → endpoint lookup: which routes does a scope actually guard?
 *
 * Routes declare their guard by referencing the scope constant
 * (`middleware.oauth.restrictScopes([SCOPES.X])`, or wrappers like
 * `restrictPublicChatScopes([SCOPES.X])`), so a code search for the constant
 * plus per-registration segmentation of each hit recovers the guarded
 * method+path pairs. Registration shapes handled:
 *   app.get('/api/x', ...)                         — plain string
 *   app.get(['/beta/sites/:id/branches'], ...)     — array of paths
 *   app.post({ path: '/api/ai/...', routers }, …)  — object config
 */

/** Cap on files fetched per scope — code search is 10 req/min and alerts are rare. */
const MAX_FILES = 6;

function isIgnoredPath(path: string): boolean {
	return (
		path.endsWith('oauth/scopes.ts') ||
		path.includes('/test/') ||
		path.includes('_test.') ||
		path.includes('.mocha.') ||
		path.includes('.spec.')
	);
}

export async function searchScopeUsages(env: GithubEnv, constant: string): Promise<string[]> {
	const q = encodeURIComponent(`SCOPES.${constant} repo:${env.GITHUB_REPO}`);
	const res = await fetch(`https://api.github.com/search/code?q=${q}&per_page=20`, {
		headers: ghHeaders(env),
	});
	if (!res.ok) throw new Error(`GitHub code search ${res.status}`);
	const json = (await res.json()) as { items: Array<{ path: string }> };
	return json.items.map((i) => i.path).filter((p) => !isIgnoredPath(p));
}

const ROUTE_START_RE = /\bapp\s*\.\s*(get|post|put|patch|delete|head|all)\s*\(/g;

function extractPath(registrationHead: string): string | null {
	// Object config: the path property names the route explicitly.
	const objPath = registrationHead.match(/path:\s*(['"`])([^'"`]+)\1/);
	if (objPath) return objPath[2];
	// String or array shape: the first quoted string starting with '/'.
	const firstStr = registrationHead.match(/(['"`])(\/[^'"`]*)\1/);
	return firstStr ? firstStr[2] : null;
}

/**
 * Splits a route file into registration segments (one per app.<method>( call)
 * and returns the method+path of every segment that references the constant.
 */
export function extractGuardedRoutes(
	source: string,
	constant: string,
	file: string
): GuardedRoute[] {
	const scopeRe = new RegExp(`SCOPES\\.${constant}\\b`);
	const starts = [...source.matchAll(ROUTE_START_RE)];
	const routes: GuardedRoute[] = [];
	for (let i = 0; i < starts.length; i++) {
		const start = starts[i].index;
		const end = i + 1 < starts.length ? starts[i + 1].index : source.length;
		const segment = source.slice(start, end);
		if (!scopeRe.test(segment)) continue;
		const path = extractPath(segment.slice(0, 400));
		if (path) {
			routes.push({ method: starts[i][1].toUpperCase(), path, file });
		}
	}
	return routes;
}

/**
 * Best-effort endpoint map for one scope constant. Files that reference the
 * constant but yield no extractable route (MCP tools, shared middleware,
 * helper arrays) land in `otherFiles` rather than being guessed at.
 */
export async function lookupScopeEndpoints(
	env: GithubEnv,
	constant: string
): Promise<ScopeEndpoints> {
	try {
		const paths = (await searchScopeUsages(env, constant)).slice(0, MAX_FILES);
		const routes: GuardedRoute[] = [];
		const otherFiles: string[] = [];
		for (const path of paths) {
			try {
				const { content } = await fetchRepoFile(env, path);
				const found = extractGuardedRoutes(content, constant, path);
				if (found.length > 0) routes.push(...found);
				else otherFiles.push(path);
			} catch {
				otherFiles.push(path);
			}
		}
		return { constant, routes, otherFiles };
	} catch {
		return { constant, routes: [], otherFiles: [], searchFailed: true };
	}
}
