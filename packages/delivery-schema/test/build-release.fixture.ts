import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReleaseArtifactSetSha256 } from '../src/build-release.js';

export function validManifest(): unknown {
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

export function sha256(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}

export function validArtifactSetSha256(): string {
	return buildReleaseArtifactSetSha256(
		(validManifest() as { artifacts: Parameters<typeof buildReleaseArtifactSetSha256>[0] })
			.artifacts,
	);
}

export function writeRepresentativePackage(overrides?: {
	runtimeBinding?: string;
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
	if (overrides?.runtimeBinding !== undefined) {
		manifest.schema = 'create-something/build-release-manifest@2';
		manifest.artifacts.runtime_binding = {path:'artifacts/runtime-binding.json',sha256:sha256(overrides.runtimeBinding)};
		writeFileSync(join(root,'artifacts/runtime-binding.json'),overrides.runtimeBinding);
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

export function validVerificationReceipt(kind: 'staging' | 'uat'): unknown {
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

export function validAcceptanceReceipt(): unknown {
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

export function validHandoffReceipt(): unknown {
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

