#!/usr/bin/env tsx

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nowIso, parseCliArgs, printJson } from './partner-cli-utils';

type CheckResult = {
	id: string;
	ok: boolean;
	details: string[];
};

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const POLICY_IDS = [
	'policy.partner-auth-governance.v1',
	'policy.mcp-credential-delivery.v1',
	'policy.legacy-compat-sunset.v1',
];

function main(): void {
	const args = parseCliArgs(process.argv.slice(2));
	const strict = args.strict !== false;

	const results: CheckResult[] = [];
	for (const policyId of POLICY_IDS) {
		results.push(checkPolicyArtifacts(policyId));
	}
	results.push(checkOnboardingDocForPlaintextSecrets());

	const failed = results.filter((result) => !result.ok);
	const passed = failed.length === 0;

	printJson({
		audit: {
			command: 'partner:policy:conformance',
			timestamp: nowIso(),
			passed,
			strict,
		},
		results,
	});

	if (strict && !passed) {
		process.exit(1);
	}
}

function checkPolicyArtifacts(policyId: string): CheckResult {
	const jsonPath = resolve(ROOT, `docs/policies/v1/${policyId}.json`);
	const mdPath = resolve(ROOT, `docs/policies/v1/${policyId}.md`);
	const details: string[] = [];
	let ok = true;

	if (!existsSync(jsonPath)) {
		ok = false;
		details.push(`Missing JSON artifact: ${jsonPath}`);
	} else {
		try {
			const parsed = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, unknown>;
			if (parsed.policy_id !== policyId) {
				ok = false;
				details.push(`policy_id mismatch in ${jsonPath}`);
			}
			const status = typeof parsed.status === 'string' ? parsed.status : null;
			if (!status || (status !== 'draft' && status !== 'active' && status !== 'deprecated')) {
				ok = false;
				details.push(`status missing or invalid in ${jsonPath}`);
			}
		} catch (error) {
			ok = false;
			details.push(`Invalid JSON in ${jsonPath}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	if (!existsSync(mdPath)) {
		ok = false;
		details.push(`Missing markdown artifact: ${mdPath}`);
	} else {
		const content = readFileSync(mdPath, 'utf8');
		if (!content.includes(`# ${policyId}`)) {
			ok = false;
			details.push(`Missing heading "# ${policyId}" in ${mdPath}`);
		}
		if (!content.includes('## Policy Statements')) {
			ok = false;
			details.push(`Missing "## Policy Statements" section in ${mdPath}`);
		}
	}

	return { id: policyId, ok, details };
}

function checkOnboardingDocForPlaintextSecrets(): CheckResult {
	const filePath = resolve(ROOT, 'docs/DM_HUB_CLIENT_ONBOARDING.md');
	const details: string[] = [];
	let ok = true;

	if (!existsSync(filePath)) {
		return {
			id: 'dm_onboarding_secret_scan',
			ok: false,
			details: [`Missing file: ${filePath}`],
		};
	}

	const content = readFileSync(filePath, 'utf8');
	const secretRegex = /Bearer\s+[A-Za-z0-9]{24,}/g;
	if (secretRegex.test(content)) {
		ok = false;
		details.push('Detected plaintext bearer-like value in DM onboarding doc.');
	}

	if (!content.toLowerCase().includes('controlled delivery')) {
		ok = false;
		details.push('Expected "controlled delivery" guidance is missing in DM onboarding doc.');
	}

	return { id: 'dm_onboarding_secret_scan', ok, details };
}

main();
