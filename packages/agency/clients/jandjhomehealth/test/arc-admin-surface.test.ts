import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the customer Arc product is mounted inside the existing password-gated admin boundary', async () => {
	const [page, server, studio, mcp, exportRoute, publicPage, packageJson] = await Promise.all([
		readFile(path.join(packageRoot, 'src/routes/admin/arcs/app-review-governance/+page.svelte'), 'utf8'),
		readFile(
			path.join(packageRoot, 'src/routes/admin/arcs/app-review-governance/+page.server.ts'),
			'utf8'
		),
		readFile(path.join(packageRoot, 'src/routes/admin/arcs/app-review-governance/[view]/+page.svelte'), 'utf8'),
		readFile(path.join(packageRoot, 'src/routes/api/arcs/mcp/+server.ts'), 'utf8'),
		readFile(path.join(packageRoot, 'src/routes/api/arcs/[id]/export/[format]/+server.ts'), 'utf8'),
		readFile(path.join(packageRoot, 'src/routes/+page.svelte'), 'utf8'),
		readFile(path.join(packageRoot, 'package.json'), 'utf8')
	]);

	assert.match(server, /requireAdmin\(locals, url\)/);
	assert.match(server, /getOrCreateAppReviewArc/);
	assert.match(page, /ArcDeck, visibleComposition/);
	assert.match(studio, /ArcStudio/);
	assert.match(studio, /playbook/);
	assert.match(studio, /runbook/);
	assert.match(mcp, /Admin login required/);
	assert.match(mcp, /agents propose; a human accepts, approves, and publishes/i);
	assert.match(mcp, /I am the human reviewer/);
	assert.match(mcp, /I approve publication/);
	assert.doesNotMatch(mcp, /OPENAI_API_KEY|ANTHROPIC_API_KEY/);
	assert.match(exportRoute, /text\/html/);
	assert.match(exportRoute, /application\/pdf/);
	assert.match(packageJson, /"@create-something\/arc": "workspace:\*"/);
	assert.doesNotMatch(publicPage, /ArcDeck|APP_REVIEW_GOVERNANCE_COMPOSITION/);
});
