import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffInventories } from '../src/diff';
import { ParseError, parseScopesFile } from '../src/parser';
import { formatMessage } from '../src/slack';

const fixture = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'scopes-snapshot-2026-08-18.ts.txt'),
	'utf-8'
);

describe('parseScopesFile', () => {
	const { scopes, categories } = parseScopesFile(fixture);

	it('parses the full registry (47 scopes, 25 categories as of Aug 2026)', () => {
		expect(Object.keys(scopes)).toHaveLength(47);
		expect(Object.keys(categories)).toHaveLength(25);
	});

	it('parses a plain scope', () => {
		expect(scopes['agent_instructions:read']).toMatchObject({
			constant: 'AGENT_INSTRUCTIONS_READ',
			category: 'AGENT_INSTRUCTIONS',
			description: 'Read Agent Instructions data',
			resourceTypes: ['Site'],
			featureFlag: null,
		});
	});

	it('parses a multi-line description and multiple resource types', () => {
		expect(scopes['ai:write']).toMatchObject({
			description: 'Use AI-powered features (LLM chat and generation) through the API',
			resourceTypes: ['Workspace', 'Site'],
			featureFlag: null,
		});
	});

	it('parses feature-flag gating', () => {
		expect(scopes['site_access:read']?.featureFlag).toBe('PUBLIC_MEMBERSHIP_APIS');
		expect(scopes['workspace_members:write']?.featureFlag).toBe('PUBLIC_MEMBERSHIP_APIS');
	});

	it('parses all six branch scopes', () => {
		const branchKeys = Object.keys(scopes).filter((k) => k.startsWith('branches:'));
		expect(branchKeys.sort()).toEqual([
			'branches:create',
			'branches:delete',
			'branches:merge',
			'branches:publish',
			'branches:read',
			'branches:update',
		]);
	});

	it('parses a double-quoted category description with an apostrophe', () => {
		expect(categories.WORKSPACE_ACTIVITY?.description).toBe(
			"Review your team's activity across the Workspace."
		);
	});

	it('does not confuse descriptionLink with description', () => {
		expect(categories.CODE_COMPONENTS?.description).toBe(
			'Import React components from an external codebase.'
		);
	});

	it('fails loudly on a truncated file instead of diffing to zero', () => {
		expect(() => parseScopesFile(fixture.slice(0, 500))).toThrow(ParseError);
	});
});

describe('diffInventories', () => {
	const { scopes, categories } = parseScopesFile(fixture);

	it('reports no changes for identical inventories', () => {
		expect(diffInventories({ scopes, categories }, { scopes, categories })).toEqual([]);
	});

	it('detects an added scope and its new category', () => {
		const prevScopes = { ...scopes };
		delete prevScopes['ai:write'];
		const prevCategories = { ...categories };
		delete prevCategories.AI;
		const changes = diffInventories(
			{ scopes: prevScopes, categories: prevCategories },
			{ scopes, categories }
		);
		expect(changes.map((c) => c.type).sort()).toEqual(['category_added', 'scope_added']);
		expect(changes.find((c) => c.type === 'scope_added')?.key).toBe('ai:write');
	});

	it('detects un-gating (flag removed = GA moment)', () => {
		const prevScopes = {
			...scopes,
			'ai:write': { ...scopes['ai:write'], featureFlag: 'AI_API' },
		};
		const changes = diffInventories({ scopes: prevScopes, categories }, { scopes, categories });
		expect(changes).toHaveLength(1);
		expect(changes[0]).toMatchObject({ type: 'scope_ungated', key: 'ai:write' });
	});

	it('detects a removed scope', () => {
		const nextScopes = { ...scopes };
		delete nextScopes['page_client:write'];
		const changes = diffInventories({ scopes, categories }, { scopes: nextScopes, categories });
		expect(changes).toEqual([
			expect.objectContaining({ type: 'scope_removed', key: 'page_client:write' }),
		]);
	});
});

describe('formatMessage', () => {
	it('renders scope, gating, PR link, and Linear ticket link', () => {
		const { scopes, categories } = parseScopesFile(fixture);
		const text = formatMessage(
			[{ type: 'scope_added', key: 'ai:write', detail: '', scope: scopes['ai:write'] }],
			[
				{
					sha: 'abc',
					date: '2026-08-13',
					author: 'Mark Ethan Trostler',
					title:
						'[PION-768] Add POST /api/ai/v1/chat/completions OpenAI-compatible public LLM proxy endpoint (#117046)',
					prNumber: 117046,
					tickets: ['PION-768'],
				},
			],
			categories,
			'webflow/webflow',
			'entrypoints/server/lib/logic/oauth/scopes.ts'
		);
		expect(text).toContain('`ai:write`');
		expect(text).toContain('GA immediately (no feature flag)');
		expect(text).toContain('https://github.com/webflow/webflow/pull/117046');
		expect(text).toContain('https://linear.app/webflow/issue/PION-768');
	});
});
