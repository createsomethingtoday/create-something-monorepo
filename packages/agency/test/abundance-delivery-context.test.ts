import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { abundanceWorkflowContext } from '../src/lib/delivery/abundance-context.ts';
import { canAccessNpgHealthcareAnalyst } from '../src/lib/server/abundance-client-access.ts';
import { isAgencyProtectedPath } from '../src/lib/server/protected-routes.ts';
import { GET as openHealthcareAnalyst } from '../src/routes/delivery/abundance/healthcare-analyst/+server.ts';

const HEALTHCARE_ANALYST_URL = 'https://udify.app/agent/test-private-target';
const HEALTHCARE_ANALYST_ACCESS_PATH = '/delivery/abundance/healthcare-analyst';

test('the NPG client delivery exposes the enabled healthcare coverage analyst', () => {
	const analyst = abundanceWorkflowContext.artifacts.find(
		(artifact) => artifact.title === 'NPG Healthcare Coverage Analyst'
	);

	assert.ok(analyst, 'expected the healthcare analyst in the client delivery artifacts');
	assert.equal(analyst.href, HEALTHCARE_ANALYST_ACCESS_PATH);
	assert.equal(analyst.visibility, 'public');
	assert.match(analyst.type ?? '', /coverage/i);
	assert.equal(isAgencyProtectedPath(analyst.href), true);
	assert.equal(canAccessNpgHealthcareAnalyst('operator@thenursepractitionergroup.com', undefined), true);
	assert.equal(canAccessNpgHealthcareAnalyst('operator@thenpgroup.com', undefined), true);
	assert.equal(canAccessNpgHealthcareAnalyst(' OPERATOR@THENPGROUP.COM ', undefined), true);
	assert.equal(canAccessNpgHealthcareAnalyst('owner@createsomething.io', 'owner@createsomething.io'), true);
	assert.equal(canAccessNpgHealthcareAnalyst('operator@sub.thenpgroup.com', undefined), false);
	assert.equal(canAccessNpgHealthcareAnalyst('unrelated@example.com', 'owner@createsomething.io'), false);
	assert.throws(
		() =>
			openHealthcareAnalyst({
				locals: { user: { email: 'operator@thenursepractitionergroup.com' } },
				platform: { env: { NPG_HEALTHCARE_ANALYST_URL: HEALTHCARE_ANALYST_URL } }
			} as Parameters<typeof openHealthcareAnalyst>[0]),
		(error: unknown) =>
			typeof error === 'object' &&
			error !== null &&
			'status' in error &&
			'location' in error &&
			error.status === 303 &&
			error.location === HEALTHCARE_ANALYST_URL
	);
});

test('the forward migration publishes the same analyst into the D1-backed delivery context', () => {
	const directory = mkdtempSync(join(tmpdir(), 'abundance-healthcare-analyst-'));
	const database = join(directory, 'test.sqlite');

	try {
		const schema = readFileSync(new URL('../migrations/0021_canon_workflow_contexts.sql', import.meta.url), 'utf8');
		const migration = readFileSync(
			new URL('../migrations/0047_abundance_healthcare_analyst_client_access.sql', import.meta.url),
			'utf8'
		);
		execFileSync('sqlite3', [database], { input: `${schema}\n${migration}` });

		const href = execFileSync(
			'sqlite3',
			[
				database,
				`SELECT json_extract(value, '$.href')
				 FROM canon_workflow_contexts, json_each(workflow_json, '$.artifacts')
				 WHERE context_id = 'abundance-npg-delivery'
				   AND json_extract(value, '$.title') = 'NPG Healthcare Coverage Analyst';`
			],
			{ encoding: 'utf8' }
		).trim();

		assert.equal(href, HEALTHCARE_ANALYST_ACCESS_PATH);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
});
