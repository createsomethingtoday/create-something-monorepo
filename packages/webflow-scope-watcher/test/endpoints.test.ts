import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractGuardedRoutes } from '../src/endpoints';
import { formatMessage } from '../src/slack';
import type { ScopeChange } from '../src/types';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const branchesRoute = readFileSync(join(fixturesDir, 'branches-route-snapshot.ts.txt'), 'utf-8');
const aiRoute = readFileSync(join(fixturesDir, 'ai-route-snapshot.ts.txt'), 'utf-8');

describe('extractGuardedRoutes', () => {
	it('extracts array-shape paths and associates them per registration segment', () => {
		const read = extractGuardedRoutes(branchesRoute, 'BRANCHES_READ', 'branches.ts');
		expect(read.map((r) => `${r.method} ${r.path}`).sort()).toEqual([
			'GET /beta/sites/:site_id/branches',
			'GET /beta/sites/:site_id/branches/:branch_id',
			'GET /beta/sites/:site_id/branches/:branch_id/conflicts',
			'GET /beta/sites/:site_id/branches/tasks/:task_id',
		]);
	});

	it('does not leak routes guarded by sibling scopes in the same file', () => {
		const merge = extractGuardedRoutes(branchesRoute, 'BRANCHES_MERGE', 'branches.ts');
		expect(merge).toEqual([
			{ method: 'POST', path: '/beta/sites/:site_id/branches/:branch_id/merge', file: 'branches.ts' },
		]);
	});

	it('extracts object-config paths (path: property) and wrapper guards', () => {
		const ai = extractGuardedRoutes(aiRoute, 'AI_WRITE', 'publicLlmChatCompletions.ts');
		expect(ai).toEqual([
			{ method: 'POST', path: '/api/ai/v1/chat/completions', file: 'publicLlmChatCompletions.ts' },
		]);
	});

	it('extracts plain string paths', () => {
		const src = `
export default function (app) {
  app.put(
    '/api/workspaces/:ws/applications/:id',
    middleware.oauth.restrictScopes([SCOPES.FAKE_SCOPE]),
    handler
  );
}`;
		expect(extractGuardedRoutes(src, 'FAKE_SCOPE', 'f.ts')).toEqual([
			{ method: 'PUT', path: '/api/workspaces/:ws/applications/:id', file: 'f.ts' },
		]);
	});

	it('returns nothing when the constant is absent (no substring false positives)', () => {
		expect(extractGuardedRoutes(branchesRoute, 'BRANCHES_REA', 'branches.ts')).toEqual([]);
		expect(extractGuardedRoutes(aiRoute, 'PAGE_CLIENT_WRITE', 'ai.ts')).toEqual([]);
	});
});

describe('formatMessage with endpoint maps', () => {
	it('renders the guards line under an added scope', () => {
		const change: ScopeChange = {
			type: 'scope_added',
			key: 'ai:write',
			detail: '',
			scope: {
				constant: 'AI_WRITE',
				key: 'ai:write',
				category: 'AI',
				description: 'Use AI-powered features (LLM chat and generation) through the API',
				resourceTypes: ['Workspace', 'Site'],
				featureFlag: null,
			},
			endpoints: {
				constant: 'AI_WRITE',
				routes: [
					{
						method: 'POST',
						path: '/api/ai/v1/chat/completions',
						file: 'entrypoints/server/routes/api/ai/publicLlmChatCompletions.ts',
					},
				],
				otherFiles: ['packages/systems/page-automation/wfs/public-mcp/migration.ts'],
			},
		};
		const text = formatMessage(
			[change],
			[],
			{ AI: { key: 'AI', name: 'AI', description: 'Use AI-powered features through the API' } },
			'webflow/webflow',
			'entrypoints/server/lib/logic/oauth/scopes.ts'
		);
		expect(text).toContain('↳ guards: `POST /api/ai/v1/chat/completions`');
		expect(text).toContain(
			'https://github.com/webflow/webflow/blob/dev/entrypoints/server/routes/api/ai/publicLlmChatCompletions.ts'
		);
		expect(text).toContain('↳ also referenced in');
	});

	it('renders the no-usages hint when lookup ran but found nothing', () => {
		const change: ScopeChange = {
			type: 'scope_ungated',
			key: 'site_access:read',
			detail: 'was gated by Statsig `PUBLIC_MEMBERSHIP_APIS`, now GA for all developers',
			scope: {
				constant: 'SITE_ACCESS_READ',
				key: 'site_access:read',
				category: 'SITE_ACCESS',
				description: 'Read Site Access data',
				resourceTypes: ['Workspace'],
				featureFlag: null,
			},
			endpoints: { constant: 'SITE_ACCESS_READ', routes: [], otherFiles: [] },
		};
		const text = formatMessage([change], [], {}, 'webflow/webflow', 'x');
		expect(text).toContain('no route usages found yet');
	});
});
