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
	buildReleaseArtifactSetSha256,
	inspectBuildReleasePackage,
	parseBuildAcceptanceReceipt,
	parseBuildVerificationReceipt,
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
				receiptPath: 'receipts/staging-verification.json',
				receiptSha256: '2'.repeat(64),
				receiptId: 'verification_staging_example_001',
				status: 'passed',
			},
			uat: {
				receiptPath: 'receipts/uat-verification.json',
				receiptSha256: '3'.repeat(64),
				receiptId: 'verification_uat_example_001',
				status: 'passed',
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

function validArtifactSetSha256(): string {
	return buildReleaseArtifactSetSha256(
		(validManifest() as { artifacts: Parameters<typeof buildReleaseArtifactSetSha256>[0] })
			.artifacts,
	);
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

	const manifest = validManifest() as Record<string, any>;
	manifest.handoff.receiptSha256 = sha256(receiptJson);
	manifest.handoff.accountId = overrides?.accountId ?? 'account_example';
	manifest.verification.staging.status = overrides?.stagingStatus ?? 'passed';
	manifest.acceptance.status = overrides?.acceptanceStatus ?? 'accepted';
	for (const name of Object.keys(artifactContent) as Array<keyof typeof artifactContent>) {
		manifest.artifacts[name].sha256 = sha256(artifactContent[name]);
	}
	const artifactSetSha256 = buildReleaseArtifactSetSha256(manifest.artifacts);

	const stagingReceipt = validVerificationReceipt('staging') as Record<string, unknown>;
	stagingReceipt.status = overrides?.stagingStatus ?? 'passed';
	stagingReceipt.handoffReceiptSha256 = manifest.handoff.receiptSha256;
	stagingReceipt.artifactSetSha256 = artifactSetSha256;
	const stagingJson = `${JSON.stringify(stagingReceipt, null, 2)}\n`;
	writeFileSync(join(root, 'receipts', 'staging-verification.json'), stagingJson);
	const uatReceipt = validVerificationReceipt('uat') as Record<string, unknown>;
	uatReceipt.handoffReceiptSha256 = manifest.handoff.receiptSha256;
	uatReceipt.artifactSetSha256 = artifactSetSha256;
	const uatJson = `${JSON.stringify(uatReceipt, null, 2)}\n`;
	writeFileSync(join(root, 'receipts', 'uat-verification.json'), uatJson);

	manifest.verification.staging.receiptSha256 = sha256(stagingJson);
	manifest.verification.uat.receiptSha256 = sha256(uatJson);
	const acceptanceReceipt = validAcceptanceReceipt() as Record<string, unknown>;
	acceptanceReceipt.status = overrides?.acceptanceStatus ?? 'accepted';
	acceptanceReceipt.handoffReceiptSha256 = manifest.handoff.receiptSha256;
	acceptanceReceipt.artifactSetSha256 = artifactSetSha256;
	acceptanceReceipt.stagingReceiptSha256 = manifest.verification.staging.receiptSha256;
	acceptanceReceipt.uatReceiptSha256 = manifest.verification.uat.receiptSha256;
	const acceptanceJson = `${JSON.stringify(acceptanceReceipt, null, 2)}\n`;
	writeFileSync(join(root, 'receipts', 'build-acceptance.json'), acceptanceJson);
	manifest.acceptance.receiptSha256 = sha256(acceptanceJson);
	const manifestPath = join(root, 'build-release.json');
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

	return { root, manifestPath };
}

function validVerificationReceipt(kind: 'staging' | 'uat'): unknown {
	return {
		schema: 'create-something/build-verification-receipt@1',
		receiptId: `verification_${kind}_example_001`,
		releaseId: 'release_example_001',
		handoffId: 'handoff_example_001',
		accountId: 'account_example',
		workspaceAccountId: 'workspace_example',
		environment: 'staging',
		target: 'example-build-staging',
		sourceSha: '1'.repeat(40),
		deployId: 'deploy_example_001',
		handoffReceiptSha256: 'f'.repeat(64),
		artifactSetSha256: validArtifactSetSha256(),
		kind,
		status: 'passed',
		command: `pnpm test:${kind}`,
		completedAt: kind === 'staging' ? '2026-07-18T12:10:00.000Z' : '2026-07-18T12:20:00.000Z',
		evidence: [`receipt://${kind}/example-001`],
	};
}

function validAcceptanceReceipt(): unknown {
	return {
		schema: 'create-something/build-acceptance-receipt@1',
		receiptId: 'acceptance_example_001',
		releaseId: 'release_example_001',
		handoffId: 'handoff_example_001',
		accountId: 'account_example',
		workspaceAccountId: 'workspace_example',
		environment: 'staging',
		target: 'example-build-staging',
		sourceSha: '1'.repeat(40),
		deployId: 'deploy_example_001',
		handoffReceiptSha256: 'f'.repeat(64),
		artifactSetSha256: validArtifactSetSha256(),
		stagingReceiptSha256: '2'.repeat(64),
		uatReceiptSha256: '3'.repeat(64),
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

	const resolvedBeforeCreation = validHandoffReceipt() as Record<string, unknown>;
	resolvedBeforeCreation.resolvedAt = '2026-07-18T10:59:59.000Z';
	assert.throws(
		() => parseMapBuildHandoffReceipt(resolvedBeforeCreation),
		BuildReleaseValidationError,
	);
});

test('parseBuildAcceptanceReceipt requires a strict terminal receipt', () => {
	assert.equal(parseBuildAcceptanceReceipt(validAcceptanceReceipt()).status, 'accepted');

	const pending = validAcceptanceReceipt() as Record<string, unknown>;
	pending.status = 'pending';
	assert.throws(() => parseBuildAcceptanceReceipt(pending), BuildReleaseValidationError);
});

test('parseBuildVerificationReceipt requires a strict staging or UAT receipt', () => {
	assert.equal(parseBuildVerificationReceipt(validVerificationReceipt('staging')).kind, 'staging');

	const unknown = validVerificationReceipt('uat') as Record<string, unknown>;
	unknown.kind = 'production';
	assert.throws(() => parseBuildVerificationReceipt(unknown), BuildReleaseValidationError);
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

	const normalizedImpossibleDate = validManifest() as Record<string, any>;
	normalizedImpossibleDate.createdAt = '2026-02-31T12:00:00.000Z';
	assert.throws(
		() => parseBuildReleaseManifest(normalizedImpossibleDate),
		(error: unknown) =>
			error instanceof BuildReleaseValidationError &&
			error.issues.some((issue) => issue.path === '$.createdAt' && issue.code === 'invalid_value'),
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

test('inspectBuildReleasePackage rejects evidence replaced after verification or acceptance', () => {
	const replacedArtifact = writeRepresentativePackage();
	const replacementRunbook = '# Replaced after verification\n';
	writeFileSync(join(replacedArtifact.root, 'artifacts', 'runbook.md'), replacementRunbook);
	const artifactManifest = JSON.parse(
		readFileSync(replacedArtifact.manifestPath, 'utf8'),
	) as Record<string, any>;
	artifactManifest.artifacts.runbook.sha256 = sha256(replacementRunbook);
	writeFileSync(
		replacedArtifact.manifestPath,
		`${JSON.stringify(artifactManifest, null, 2)}\n`,
	);
	const replacedArtifactResult = inspectBuildReleasePackage(replacedArtifact.manifestPath);
	assert.equal(replacedArtifactResult.evidenceValid, false);
	assert.equal(replacedArtifactResult.releaseReady, false);
	assert.ok(
		replacedArtifactResult.issues.some((issue) => issue.code === 'verifier_identity_mismatch'),
	);
	assert.ok(
		replacedArtifactResult.issues.some((issue) => issue.code === 'acceptance_identity_mismatch'),
	);

	const replacedVerifier = writeRepresentativePackage();
	const uatReceiptPath = join(replacedVerifier.root, 'receipts', 'uat-verification.json');
	const replacementUat = JSON.parse(readFileSync(uatReceiptPath, 'utf8')) as Record<
		string,
		unknown
	>;
	replacementUat.evidence = ['replacement evidence after acceptance'];
	const replacementUatJson = `${JSON.stringify(replacementUat, null, 2)}\n`;
	writeFileSync(uatReceiptPath, replacementUatJson);
	const verifierManifest = JSON.parse(
		readFileSync(replacedVerifier.manifestPath, 'utf8'),
	) as Record<string, any>;
	verifierManifest.verification.uat.receiptSha256 = sha256(replacementUatJson);
	writeFileSync(
		replacedVerifier.manifestPath,
		`${JSON.stringify(verifierManifest, null, 2)}\n`,
	);
	const replacedVerifierResult = inspectBuildReleasePackage(replacedVerifier.manifestPath);
	assert.equal(replacedVerifierResult.evidenceValid, false);
	assert.equal(replacedVerifierResult.releaseReady, false);
	assert.ok(
		replacedVerifierResult.issues.some((issue) => issue.code === 'acceptance_identity_mismatch'),
	);
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

	const selfAssertedVerifier = writeRepresentativePackage({ stagingStatus: 'failed' });
	const verifierManifest = JSON.parse(
		readFileSync(selfAssertedVerifier.manifestPath, 'utf8'),
	) as Record<string, any>;
	verifierManifest.verification.staging.status = 'passed';
	writeFileSync(
		selfAssertedVerifier.manifestPath,
		`${JSON.stringify(verifierManifest, null, 2)}\n`,
	);
	const unverifiedPass = inspectBuildReleasePackage(selfAssertedVerifier.manifestPath);
	assert.equal(unverifiedPass.releaseReady, false);
	assert.ok(unverifiedPass.issues.some((issue) => issue.code === 'verifier_identity_mismatch'));

	const changedVerifier = writeRepresentativePackage();
	writeFileSync(
		join(changedVerifier.root, 'receipts', 'staging-verification.json'),
		`${JSON.stringify(
			{
				...(validVerificationReceipt('staging') as Record<string, unknown>),
				evidence: ['self-asserted-after-verification'],
			},
			null,
			2,
		)}\n`,
	);
	const invalidVerifierHash = inspectBuildReleasePackage(changedVerifier.manifestPath);
	assert.equal(invalidVerifierHash.releaseReady, false);
	assert.ok(invalidVerifierHash.issues.some((issue) => issue.code === 'verifier_hash_mismatch'));

	const changedRevision = writeRepresentativePackage();
	const revisionManifest = JSON.parse(readFileSync(changedRevision.manifestPath, 'utf8')) as Record<
		string,
		any
	>;
	revisionManifest.release.sourceSha = '9'.repeat(40);
	writeFileSync(changedRevision.manifestPath, `${JSON.stringify(revisionManifest, null, 2)}\n`);
	const unverifiedRevision = inspectBuildReleasePackage(changedRevision.manifestPath);
	assert.equal(unverifiedRevision.releaseReady, false);
	assert.ok(unverifiedRevision.issues.some((issue) => issue.code === 'verifier_identity_mismatch'));
	assert.ok(
		unverifiedRevision.issues.some((issue) => issue.code === 'acceptance_identity_mismatch'),
	);

	const prematureAcceptance = writeRepresentativePackage();
	const prematureReceiptPath = join(
		prematureAcceptance.root,
		'receipts',
		'build-acceptance.json',
	);
	const prematureReceipt = JSON.parse(readFileSync(prematureReceiptPath, 'utf8')) as Record<
		string,
		unknown
	>;
	prematureReceipt.decidedAt = '2026-07-18T12:15:00.000Z';
	const prematureReceiptJson = `${JSON.stringify(prematureReceipt, null, 2)}\n`;
	writeFileSync(prematureReceiptPath, prematureReceiptJson);
	const prematureManifest = JSON.parse(
		readFileSync(prematureAcceptance.manifestPath, 'utf8'),
	) as Record<string, any>;
	prematureManifest.acceptance.receiptSha256 = sha256(prematureReceiptJson);
	writeFileSync(
		prematureAcceptance.manifestPath,
		`${JSON.stringify(prematureManifest, null, 2)}\n`,
	);
	const premature = inspectBuildReleasePackage(prematureAcceptance.manifestPath);
	assert.equal(premature.evidenceValid, false);
	assert.equal(premature.releaseReady, false);
	assert.ok(premature.issues.some((issue) => issue.code === 'acceptance_sequence_invalid'));

	const retroactiveHandoff = writeRepresentativePackage();
	const retroactiveHandoffPath = join(
		retroactiveHandoff.root,
		'receipts',
		'map-handoff.json',
	);
	const retroactiveReceipt = JSON.parse(
		readFileSync(retroactiveHandoffPath, 'utf8'),
	) as Record<string, unknown>;
	retroactiveReceipt.resolvedAt = '2026-07-18T12:25:00.000Z';
	const retroactiveReceiptJson = `${JSON.stringify(retroactiveReceipt, null, 2)}\n`;
	writeFileSync(retroactiveHandoffPath, retroactiveReceiptJson);
	const retroactiveManifest = JSON.parse(
		readFileSync(retroactiveHandoff.manifestPath, 'utf8'),
	) as Record<string, any>;
	retroactiveManifest.handoff.receiptSha256 = sha256(retroactiveReceiptJson);
	writeFileSync(
		retroactiveHandoff.manifestPath,
		`${JSON.stringify(retroactiveManifest, null, 2)}\n`,
	);
	const retroactive = inspectBuildReleasePackage(retroactiveHandoff.manifestPath);
	assert.equal(retroactive.evidenceValid, false);
	assert.equal(retroactive.releaseReady, false);
	assert.ok(retroactive.issues.some((issue) => issue.code === 'verifier_sequence_invalid'));

	const reversedGates = writeRepresentativePackage();
	const reversedUatPath = join(reversedGates.root, 'receipts', 'uat-verification.json');
	const reversedUat = JSON.parse(readFileSync(reversedUatPath, 'utf8')) as Record<
		string,
		unknown
	>;
	reversedUat.completedAt = '2026-07-18T12:05:00.000Z';
	const reversedUatJson = `${JSON.stringify(reversedUat, null, 2)}\n`;
	writeFileSync(reversedUatPath, reversedUatJson);
	const reversedManifest = JSON.parse(
		readFileSync(reversedGates.manifestPath, 'utf8'),
	) as Record<string, any>;
	reversedManifest.verification.uat.receiptSha256 = sha256(reversedUatJson);
	writeFileSync(reversedGates.manifestPath, `${JSON.stringify(reversedManifest, null, 2)}\n`);
	const reversed = inspectBuildReleasePackage(reversedGates.manifestPath);
	assert.equal(reversed.evidenceValid, false);
	assert.equal(reversed.releaseReady, false);
	assert.ok(reversed.issues.some((issue) => issue.code === 'verifier_sequence_invalid'));

	const rejected = inspectBuildReleasePackage(
		writeRepresentativePackage({ acceptanceStatus: 'rejected' }).manifestPath,
	);
	assert.equal(rejected.evidenceValid, true);
	assert.equal(rejected.releaseReady, false);
	assert.ok(rejected.issues.some((issue) => issue.code === 'release_rejected'));

	const earlyRejected = writeRepresentativePackage({ acceptanceStatus: 'rejected' });
	const earlyRejectedReceiptPath = join(
		earlyRejected.root,
		'receipts',
		'build-acceptance.json',
	);
	const earlyRejectedReceipt = JSON.parse(
		readFileSync(earlyRejectedReceiptPath, 'utf8'),
	) as Record<string, unknown>;
	earlyRejectedReceipt.decidedAt = '2026-07-18T12:00:00.000Z';
	const earlyRejectedJson = `${JSON.stringify(earlyRejectedReceipt, null, 2)}\n`;
	writeFileSync(earlyRejectedReceiptPath, earlyRejectedJson);
	const earlyRejectedManifest = JSON.parse(
		readFileSync(earlyRejected.manifestPath, 'utf8'),
	) as Record<string, any>;
	earlyRejectedManifest.acceptance.receiptSha256 = sha256(earlyRejectedJson);
	writeFileSync(
		earlyRejected.manifestPath,
		`${JSON.stringify(earlyRejectedManifest, null, 2)}\n`,
	);
	const validEarlyRejection = inspectBuildReleasePackage(earlyRejected.manifestPath);
	assert.equal(validEarlyRejection.evidenceValid, true);
	assert.equal(validEarlyRejection.releaseReady, false);
	assert.ok(validEarlyRejection.issues.some((issue) => issue.code === 'release_rejected'));
	assert.ok(
		!validEarlyRejection.issues.some((issue) => issue.code === 'acceptance_sequence_invalid'),
	);

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
