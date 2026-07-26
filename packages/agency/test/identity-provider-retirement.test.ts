import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = `${directory}/${entry}`;
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return /\.(?:svelte|ts)$/.test(entry) ? [path] : [];
	});
}

test('active Agency surfaces and operator commands use CREATE SOMETHING Identity', () => {
	const packageRoot = fileURLToPath(new URL('../', import.meta.url));
	const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
	const activeAuth0Files = sourceFiles(`${packageRoot}src`)
		.filter((path) => /auth0/i.test(readFileSync(path, 'utf8')))
		.map((path) => path.slice(packageRoot.length));
	const operatorDocPaths = [
		`${packageRoot}README.md`,
		`${packageRoot}AGENTS.md`,
		`${packageRoot}static/images/stack/README.md`,
	];
	const auth0OperatorDocs = operatorDocPaths
		.filter((path) => /auth0/i.test(readFileSync(path, 'utf8')))
		.map((path) => path.slice(packageRoot.length));
	const operatorDocs = operatorDocPaths.map((path) => readFileSync(path, 'utf8')).join('\n');
	const currentIdentityPolicyPaths = [
		`${repoRoot}docs/AGENCY_USER_PROVISIONING_POLICY.md`,
		`${repoRoot}docs/guides/CHATGPT_MCP_OAUTH_MANAGED_BEARER.md`,
		`${repoRoot}docs/policies/v1/policy.identity-subject-rebind-governance.v1.md`,
		`${repoRoot}docs/policies/v1/policy.identity-subject-rebind-governance.v1.json`,
		`${repoRoot}docs/policies/v1/policy.mcp-credential-delivery.v1.md`,
		`${repoRoot}docs/policies/v1/policy.mcp-oauth-password-governance.v1.md`,
		`${repoRoot}docs/policies/v1/policy.mcp-oauth-password-governance.v1.json`,
		`${repoRoot}docs/policies/v1/policy.user-bearer-token-governance.v1.md`,
		`${repoRoot}docs/policies/v1/policy.user-bearer-token-governance.v1.json`,
		`${repoRoot}docs/IDENTITY_SUBJECT_REBIND_RUNBOOK.md`,
	];
	const auth0CurrentPolicies = currentIdentityPolicyPaths
		.filter((path) => !existsSync(path) || /auth0/i.test(readFileSync(path, 'utf8')))
		.map((path) => path.slice(repoRoot.length));
	const packageJson = readFileSync(`${repoRoot}package.json`, 'utf8');

	assert.deepEqual(activeAuth0Files, []);
	assert.deepEqual(auth0OperatorDocs, []);
	assert.deepEqual(auth0CurrentPolicies, []);
	assert.doesNotMatch(packageJson, /"agency:auth0:/i);
	assert.equal(existsSync(`${repoRoot}scripts/agency-auth0-seed-infisical.sh`), false);
	assert.equal(existsSync(`${repoRoot}scripts/agency-pages-sync-auth0-from-infisical.sh`), false);
	assert.equal(existsSync(`${packageRoot}static/images/stack/auth0.svg`), false);
	assert.match(operatorDocs, /CREATE SOMETHING Identity/);
});
