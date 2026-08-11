import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the customer Arc is mounted inside the existing password-gated admin boundary', async () => {
	const [page, server, publicPage, packageJson] = await Promise.all([
		readFile(path.join(packageRoot, 'src/routes/admin/arcs/app-review-governance/+page.svelte'), 'utf8'),
		readFile(
			path.join(packageRoot, 'src/routes/admin/arcs/app-review-governance/+page.server.ts'),
			'utf8'
		),
		readFile(path.join(packageRoot, 'src/routes/+page.svelte'), 'utf8'),
		readFile(path.join(packageRoot, 'package.json'), 'utf8')
	]);

	assert.match(server, /requireAdmin\(locals, url\)/);
	assert.match(page, /import \{ ArcDeck \} from '@create-something\/arc'/);
	assert.match(page, /APP_REVIEW_GOVERNANCE_COMPOSITION/);
	assert.match(packageJson, /"@create-something\/arc": "workspace:\*"/);
	assert.doesNotMatch(publicPage, /ArcDeck|APP_REVIEW_GOVERNANCE_COMPOSITION/);
});
