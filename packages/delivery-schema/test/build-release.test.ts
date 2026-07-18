import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
	BuildReleaseValidationError,
	inspectBuildReleasePackage,
	parseBuildAcceptanceReceipt,
	parseMapBuildHandoffReceipt,
	parseBuildReleaseManifest,
} from '../src/build-release.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function validManifest(): unknown {
	return {
		schema: 'create-something/build-release-manifest@1',
		releaseId: 'release_example_001',
		createdAt: '2026-07-18T12:00:00.000Z',
		handoff: {
			receiptPath: 'receipts/map-handoff.json',
			receiptSha256: 'f'.repeat(64),
			handoffId: 'handoff_example_001',
			mapId: 'map_example_001',
			mapVersion: 3,
			accountId: 'account_example',
			workspaceAccountId: 'workspace_example',
		},
		artifacts: {
			mcp_contract: { path: 'artifacts/mcp_contract.yaml', sha256: 'a'.repeat(64) },
			agent_contract: { path: 'artifacts/agent_contract.yaml', sha256: 'b'.repeat(64) },
			outcome_contract: { path: 'artifacts/outcome_contract.md', sha256: 'c'.repeat(64) },
			golden_tasks: { path: 'artifacts/golden_tasks.yaml', sha256: 'd'.repeat(64) },
			runbook: { path: 'artifacts/runbook.md', sha256: 'e'.repeat(64) },
		},
		verification: {
			staging: {
				status: 'passed',
				command: 'pnpm test:staging',
				completedAt: '2026-07-18T12:10:00.000Z',
				evidence: ['receipt://staging/example-001'],
			},
			uat: {
				status: 'passed',
				command: 'pnpm test:uat',
				completedAt: '2026-07-18T12:20:00.000Z',
				evidence: ['receipt://uat/example-001'],
			},
		},
		release: {
			environment: 'staging',
			target: 'example-build-staging',
			sourceSha: '1'.repeat(40),
			deployId: 'deploy_example_001',
			rollback: {
				command: 'deploy rollback deploy_example_001',
				artifact: 'artifact://example-build/previous',
			},
		},
		owners: {
			operator: 'operator@example.test',
			support: 'support@example.test',
		},
		acceptance: {
			receiptPath: 'receipts/build-acceptance.json',
			receiptSha256: '0'.repeat(64),
			receiptId: 'acceptance_example_001',
			status: 'accepted',
		},
	};
}

function sha256(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}

function writeRepresentativePackage(overrides?: {
	handoffStatus?: 'prepared' | 'accepted' | 'cancelled';
	accountId?: string;
	stagingStatus?: 'passed' | 'failed';
	acceptanceStatus?: 'accepted' | 'rejected';
}) {
	const root = mkdtempSync(join(tmpdir(), 'build-release-'));
	mkdirSync(join(root, 'artifacts'));
	mkdirSync(join(root, 'receipts'));

	const artifactContent = {
		mcp_contract: 'version: "1.0"\ncontract_type: "mcp_contract"\n',
		agent_contract: 'version: "1.0"\ncontract_type: "agent_contract"\n',
		outcome_contract: '# Outcome contract\n',
		golden_tasks: 'version: "1.0"\nartifact_type: "golden_tasks"\n',
		runbook: '# Runbook\n',
	};
	const artifactFiles = {
		mcp_contract: 'mcp_contract.yaml',
		agent_contract: 'agent_contract.yaml',
		outcome_contract: 'outcome_contract.md',
		golden_tasks: 'golden_tasks.yaml',
		runbook: 'runbook.md',
	};
	for (const name of Object.keys(artifactContent) as Array<keyof typeof artifactContent>) {
		writeFileSync(join(root, 'artifacts', artifactFiles[name]), artifactContent[name]);
	}

	const receipt = validHandoffReceipt() as Record<string, unknown>;
	receipt.status = overrides?.handoffStatus ?? 'accepted';
	if (receipt.status === 'prepared') {
		receipt.resolvedAt = null;
		receipt.resolvedBy = null;
		receipt.resolutionNote = null;
	}
	const receiptJson = `${JSON.stringify(receipt, null, 2)}\n`;
	writeFileSync(join(root, 'receipts', 'map-handoff.json'), receiptJson);
	const acceptanceReceipt = validAcceptanceReceipt() as Record<string, unknown>;
	acceptanceReceipt.status = overrides?.acceptanceStatus ?? 'accepted';
	const acceptanceJson = `${JSON.stringify(acceptanceReceipt, null, 2)}\n`;
	writeFileSync(join(root, 'receipts', 'build-acceptance.json'), acceptanceJson);

	const manifest = validManifest() as Record<string, any>;
	manifest.handoff.receiptSha256 = sha256(receiptJson);
	manifest.handoff.accountId = overrides?.accountId ?? 'account_example';
	manifest.verification.staging.status = overrides?.stagingStatus ?? 'passed';
	manifest.acceptance.status = overrides?.acceptanceStatus ?? 'accepted';
	manifest.acceptance.receiptSha256 = sha256(acceptanceJson);
	for (const name of Object.keys(artifactContent) as Array<keyof typeof artifactContent>) {
		manifest.artifacts[name].sha256 = sha256(artifactContent[name]);
	}
	const manifestPath = join(root, 'build-release.json');
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

	return { root, manifestPath };
}

function validAcceptanceReceipt(): unknown {
	return {
		schema: 'create-something/build-acceptance-receipt@1',
		receiptId: 'acceptance_example_001',
		releaseId: 'release_example_001',
		handoffId: 'handoff_example_001',
		accountId: 'account_example',
		workspaceAccountId: 'workspace_example',
		status: 'accepted',
		decidedAt: '2026-07-18T12:30:00.000Z',
		decidedBy: 'acceptor@example.test',
		note: 'Representative non-production acceptance.',
	};
}

function validHandoffReceipt(): unknown {
	return {
		schema: 'create-something/map-to-build-handoff-receipt@1',
		handoffId: 'handoff_example_001',
		mapId: 'map_example_001',
		mapVersion: 3,
		accountId: 'account_example',
		workspaceAccountId: 'workspace_example',
		status: 'accepted',
		createdAt: '2026-07-18T11:00:00.000Z',
		createdBy: 'mapper@example.test',
		resolvedAt: '2026-07-18T11:30:00.000Z',
		resolvedBy: 'builder@example.test',
		resolutionNote: 'Build intake verified.',
	};
}

test('parseBuildReleaseManifest accepts the complete versioned contract', () => {
	const parsed = parseBuildReleaseManifest(validManifest());

	assert.equal(parsed.releaseId, 'release_example_001');
	assert.equal(parsed.artifacts.runbook.path, 'artifacts/runbook.md');
	assert.equal(parsed.acceptance.status, 'accepted');
});

test('parseMapBuildHandoffReceipt preserves terminal and nonterminal source status', () => {
	const accepted = parseMapBuildHandoffReceipt(validHandoffReceipt());
	assert.equal(accepted.status, 'accepted');

	const prepared = validHandoffReceipt() as Record<string, unknown>;
	prepared.status = 'prepared';
	prepared.resolvedAt = null;
	prepared.resolvedBy = null;
	prepared.resolutionNote = null;
	assert.equal(parseMapBuildHandoffReceipt(prepared).status, 'prepared');

	const unknown = validHandoffReceipt() as Record<string, unknown>;
	unknown.tenantAlias = 'wrong-account-shortcut';
	assert.throws(() => parseMapBuildHandoffReceipt(unknown), BuildReleaseValidationError);
});

test('parseBuildAcceptanceReceipt requires a strict terminal receipt', () => {
	assert.equal(parseBuildAcceptanceReceipt(validAcceptanceReceipt()).status, 'accepted');

	const pending = validAcceptanceReceipt() as Record<string, unknown>;
	pending.status = 'pending';
	assert.throws(() => parseBuildAcceptanceReceipt(pending), BuildReleaseValidationError);
});

test('parseBuildReleaseManifest rejects unknown and missing fields', () => {
	const unknownField = validManifest() as Record<string, unknown>;
	unknownField.unreviewed = true;
	assert.throws(
		() => parseBuildReleaseManifest(unknownField),
		(error: unknown) =>
			error instanceof BuildReleaseValidationError &&
			error.issues.some((issue) => issue.path === '$.unreviewed' && issue.code === 'unknown_field'),
	);

	const missingArtifact = validManifest() as {
		artifacts: Record<string, unknown>;
	};
	delete missingArtifact.artifacts.runbook;
	assert.throws(
		() => parseBuildReleaseManifest(missingArtifact),
		(error: unknown) =>
			error instanceof BuildReleaseValidationError &&
			error.issues.some(
				(issue) => issue.path === '$.artifacts.runbook' && issue.code === 'missing_field',
			),
	);

	const absentRollback = validManifest() as Record<string, any>;
	delete absentRollback.release.rollback;
	assert.throws(
		() => parseBuildReleaseManifest(absentRollback),
		(error: unknown) =>
			error instanceof BuildReleaseValidationError &&
			error.issues.some(
				(issue) => issue.path === '$.release.rollback' && issue.code === 'missing_field',
			),
	);

	const nonterminalVerifier = validManifest() as Record<string, any>;
	nonterminalVerifier.verification.uat.status = 'pending';
	assert.throws(
		() => parseBuildReleaseManifest(nonterminalVerifier),
		(error: unknown) =>
			error instanceof BuildReleaseValidationError &&
			error.issues.some(
				(issue) => issue.path === '$.verification.uat.status' && issue.code === 'invalid_value',
			),
	);
});

test('inspectBuildReleasePackage verifies the exact accepted handoff and artifact set', () => {
	const valid = writeRepresentativePackage();
	const result = inspectBuildReleasePackage(valid.manifestPath);
	assert.equal(result.evidenceValid, true);
	assert.equal(result.releaseReady, true);
	assert.deepEqual(result.issues, []);

	writeFileSync(join(valid.root, 'artifacts', 'runbook.md'), '# Changed after acceptance\n');
	const changed = inspectBuildReleasePackage(valid.manifestPath);
	assert.equal(changed.evidenceValid, false);
	assert.equal(changed.releaseReady, false);
	assert.ok(changed.issues.some((issue) => issue.code === 'artifact_hash_mismatch'));
});

test('inspectBuildReleasePackage fails closed on handoff and decision boundaries', () => {
	const crossAccount = inspectBuildReleasePackage(
		writeRepresentativePackage({ accountId: 'account_other' }).manifestPath,
	);
	assert.equal(crossAccount.evidenceValid, false);
	assert.ok(crossAccount.issues.some((issue) => issue.code === 'handoff_identity_mismatch'));

	const prepared = inspectBuildReleasePackage(
		writeRepresentativePackage({ handoffStatus: 'prepared' }).manifestPath,
	);
	assert.equal(prepared.evidenceValid, false);
	assert.ok(prepared.issues.some((issue) => issue.code === 'handoff_not_accepted'));

	const failedVerifier = inspectBuildReleasePackage(
		writeRepresentativePackage({ stagingStatus: 'failed' }).manifestPath,
	);
	assert.equal(failedVerifier.evidenceValid, true);
	assert.equal(failedVerifier.releaseReady, false);
	assert.ok(failedVerifier.issues.some((issue) => issue.code === 'verifier_failed'));

	const rejected = inspectBuildReleasePackage(
		writeRepresentativePackage({ acceptanceStatus: 'rejected' }).manifestPath,
	);
	assert.equal(rejected.evidenceValid, true);
	assert.equal(rejected.releaseReady, false);
	assert.ok(rejected.issues.some((issue) => issue.code === 'release_rejected'));

	const selfAsserted = writeRepresentativePackage({ acceptanceStatus: 'rejected' });
	const manifest = JSON.parse(readFileSync(selfAsserted.manifestPath, 'utf8')) as Record<
		string,
		any
	>;
	manifest.acceptance.status = 'accepted';
	writeFileSync(selfAsserted.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	const tampered = inspectBuildReleasePackage(selfAsserted.manifestPath);
	assert.equal(tampered.releaseReady, false);
	assert.ok(tampered.issues.some((issue) => issue.code === 'acceptance_identity_mismatch'));

	const changedReceipt = writeRepresentativePackage();
	writeFileSync(
		join(changedReceipt.root, 'receipts', 'build-acceptance.json'),
		`${JSON.stringify(
			{
				...(validAcceptanceReceipt() as Record<string, unknown>),
				note: 'Changed after acceptance.',
			},
			null,
			2,
		)}\n`,
	);
	const invalidReceiptHash = inspectBuildReleasePackage(changedReceipt.manifestPath);
	assert.equal(invalidReceiptHash.releaseReady, false);
	assert.ok(invalidReceiptHash.issues.some((issue) => issue.code === 'acceptance_hash_mismatch'));
});

test('a second operator can run the repository CLI from a clean package path', () => {
	const fixture = writeRepresentativePackage();
	const output = execFileSync(
		'pnpm',
		['exec', 'tsx', 'scripts/build-release-check.ts', fixture.manifestPath],
		{ cwd: REPO_ROOT, encoding: 'utf8' },
	);

	assert.match(output, /Evidence package: VALID/);
	assert.match(output, /Release readiness: READY/);
	assert.match(output, /does not deploy or replace promotion approval/);
});

test('the repository representative package remains internally coherent', () => {
	const result = inspectBuildReleasePackage(
		join(REPO_ROOT, 'config/delivery/build-releases/example-non-production/build-release.json'),
	);

	assert.equal(result.evidenceValid, true);
	assert.equal(result.releaseReady, true);
	assert.equal(result.manifest?.release.environment, 'staging');
	assert.match(result.acceptanceReceipt?.note ?? '', /not a customer decision/);
});
