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

import { validManifest, sha256, validArtifactSetSha256, writeRepresentativePackage, validVerificationReceipt, validAcceptanceReceipt, validHandoffReceipt } from './build-release.fixture.js';

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

test('Build v2 requires a runtime binding covered by the accepted artifact-set digest', () => {
  const legacy = parseBuildReleaseManifest(validManifest());
  const before = buildReleaseArtifactSetSha256(legacy.artifacts);
  const runtime_binding = {path:'artifacts/runtime-binding.json',sha256:'1'.repeat(64)};
  const next = parseBuildReleaseManifest({...legacy,schema:'create-something/build-release-manifest@2',artifacts:{...legacy.artifacts,runtime_binding}});
  assert.notEqual(buildReleaseArtifactSetSha256(next.artifacts),before);
  assert.notEqual(buildReleaseArtifactSetSha256({...next.artifacts,runtime_binding:{...runtime_binding,sha256:'2'.repeat(64)}}),buildReleaseArtifactSetSha256(next.artifacts));
  assert.equal(buildReleaseArtifactSetSha256(parseBuildReleaseManifest(legacy).artifacts),before);
  assert.throws(()=>parseBuildReleaseManifest({...legacy,schema:'create-something/build-release-manifest@2'}));
  assert.throws(()=>parseBuildReleaseManifest({...legacy,artifacts:{...legacy.artifacts,runtime_binding}}));
});

// Compiler signature verification remains an independent registration gate.
test('Build package inspection verifies runtime binding bytes after acceptance', () => {
  const digest='sha256:'+'a'.repeat(64);
  const binding={schema:'create-something/build-runtime-binding@1',buildReleaseId:'release_example_001',contractSha256:digest,runtimePolicySha256:digest,
    artifactManifestSha256:digest,runtimeManifestSha256:digest,workflowId:'marketplace',workflowVersion:'1',definitionHash:digest,compilerVersion:'compiler',
    runtimeManifestSchema:'workflow_runtime_manifest.v0.2',attestationKeyId:'signer',attestationPublicKeyFingerprint:digest,artifactPrefix:'workflow-artifacts/'+'a'.repeat(64)+'/'};
  const fixture = writeRepresentativePackage({runtimeBinding:JSON.stringify(binding)});
  assert.deepEqual(inspectBuildReleasePackage(fixture.manifestPath).runtimeBinding,binding);
  for (const value of [{...binding,buildReleaseId:'other'}, {...binding,unknown:true}, {}]) {
    const invalid=writeRepresentativePackage({runtimeBinding:JSON.stringify(value)});
    const result=inspectBuildReleasePackage(invalid.manifestPath);
    assert.equal(result.evidenceValid,false);
    assert.equal(result.runtimeBinding,undefined);
    assert.ok(result.issues.some(issue=>issue.code==='runtime_binding_invalid'));
  }
  assert.equal(inspectBuildReleasePackage(fixture.manifestPath).evidenceValid,true);
  writeFileSync(join(fixture.root,'artifacts/runtime-binding.json'),'changed');
  const result = inspectBuildReleasePackage(fixture.manifestPath);
  assert.equal(result.evidenceValid,false);
  assert.ok(result.issues.some(issue=>issue.code==='artifact_hash_mismatch'));
});


test('inspection reports the exact manifest byte digest and rejects malformed encoding', () => {
  const {manifestPath} = writeRepresentativePackage();
  const bytes = readFileSync(manifestPath);
  const inspected = inspectBuildReleasePackage(manifestPath);
  assert.equal(inspected.releaseReady, true);
  assert.equal(inspected.manifestSha256, createHash('sha256').update(bytes).digest('hex'));
  writeFileSync(manifestPath, Buffer.concat([bytes, Buffer.from([0xff])]));
  const invalid = inspectBuildReleasePackage(manifestPath);
  assert.equal(invalid.releaseReady, false);
  assert.equal(invalid.manifestSha256, undefined);
});
