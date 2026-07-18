import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, resolve, sep } from 'node:path';

export const BUILD_RELEASE_SCHEMA = 'create-something/build-release-manifest@1' as const;
export const MAP_BUILD_HANDOFF_RECEIPT_SCHEMA =
	'create-something/map-to-build-handoff-receipt@1' as const;

export const BUILD_RELEASE_ARTIFACTS = [
	'mcp_contract',
	'agent_contract',
	'outcome_contract',
	'golden_tasks',
	'runbook',
] as const;

export type BuildReleaseArtifactName = (typeof BUILD_RELEASE_ARTIFACTS)[number];
export type BuildReleaseVerifierStatus = 'passed' | 'failed';
export type BuildReleaseAcceptanceStatus = 'accepted' | 'rejected';

export interface BuildReleaseArtifactReference {
	path: string;
	sha256: string;
}

export interface BuildReleaseVerifierResult {
	status: BuildReleaseVerifierStatus;
	command: string;
	completedAt: string;
	evidence: string[];
}

export interface BuildReleaseManifest {
	schema: typeof BUILD_RELEASE_SCHEMA;
	releaseId: string;
	createdAt: string;
	handoff: {
		receiptPath: string;
		receiptSha256: string;
		handoffId: string;
		mapId: string;
		mapVersion: number;
		accountId: string;
		workspaceAccountId: string;
	};
	artifacts: Record<BuildReleaseArtifactName, BuildReleaseArtifactReference>;
	verification: {
		staging: BuildReleaseVerifierResult;
		uat: BuildReleaseVerifierResult;
	};
	release: {
		environment: 'staging' | 'production';
		target: string;
		sourceSha: string;
		deployId: string;
		rollback: {
			command: string;
			artifact: string;
		};
	};
	owners: {
		operator: string;
		support: string;
	};
	acceptance: {
		receiptId: string;
		status: BuildReleaseAcceptanceStatus;
		decidedAt: string;
		decidedBy: string;
		note: string;
	};
}

export interface MapBuildHandoffReceipt {
	schema: typeof MAP_BUILD_HANDOFF_RECEIPT_SCHEMA;
	handoffId: string;
	mapId: string;
	mapVersion: number;
	accountId: string;
	workspaceAccountId: string;
	status: 'prepared' | 'accepted' | 'cancelled';
	createdAt: string;
	createdBy: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	resolutionNote: string | null;
}

export type BuildReleaseInspectionIssueCode =
	| 'manifest_invalid'
	| 'receipt_missing'
	| 'receipt_hash_mismatch'
	| 'receipt_invalid'
	| 'handoff_not_accepted'
	| 'handoff_identity_mismatch'
	| 'artifact_missing'
	| 'artifact_path_mismatch'
	| 'artifact_hash_mismatch'
	| 'package_path_escape'
	| 'verifier_failed'
	| 'release_rejected';

export interface BuildReleaseInspectionIssue {
	code: BuildReleaseInspectionIssueCode;
	category: 'integrity' | 'readiness';
	path: string;
	message: string;
}

export interface BuildReleaseInspection {
	manifest: BuildReleaseManifest | null;
	handoffReceipt: MapBuildHandoffReceipt | null;
	evidenceValid: boolean;
	releaseReady: boolean;
	issues: BuildReleaseInspectionIssue[];
}

export type BuildReleaseValidationIssueCode =
	| 'invalid_type'
	| 'invalid_value'
	| 'missing_field'
	| 'unknown_field';

export interface BuildReleaseValidationIssue {
	code: BuildReleaseValidationIssueCode;
	path: string;
	message: string;
}

export class BuildReleaseValidationError extends Error {
	readonly issues: BuildReleaseValidationIssue[];

	constructor(issues: BuildReleaseValidationIssue[]) {
		super(
			`Build release manifest is invalid (${issues.length} issue${issues.length === 1 ? '' : 's'}).`,
		);
		this.name = 'BuildReleaseValidationError';
		this.issues = issues;
	}
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function objectAt(
	value: unknown,
	path: string,
	allowedFields: readonly string[],
	issues: BuildReleaseValidationIssue[],
): JsonObject {
	if (!isObject(value)) {
		issues.push({ code: 'invalid_type', path, message: 'Expected an object.' });
		return {};
	}

	for (const field of Object.keys(value)) {
		if (!allowedFields.includes(field)) {
			issues.push({
				code: 'unknown_field',
				path: `${path}.${field}`,
				message: `Unknown field: ${field}.`,
			});
		}
	}

	for (const field of allowedFields) {
		if (!(field in value)) {
			issues.push({
				code: 'missing_field',
				path: `${path}.${field}`,
				message: `Missing required field: ${field}.`,
			});
		}
	}

	return value;
}

function stringAt(
	value: unknown,
	path: string,
	issues: BuildReleaseValidationIssue[],
	pattern?: RegExp,
): string {
	if (typeof value !== 'string' || value.trim() === '') {
		issues.push({ code: 'invalid_type', path, message: 'Expected a non-empty string.' });
		return '';
	}
	if (pattern && !pattern.test(value)) {
		issues.push({
			code: 'invalid_value',
			path,
			message: 'String does not match the required format.',
		});
	}
	return value;
}

function literalAt<T extends string>(
	value: unknown,
	path: string,
	allowed: readonly T[],
	issues: BuildReleaseValidationIssue[],
): T {
	if (typeof value !== 'string' || !allowed.includes(value as T)) {
		issues.push({
			code: 'invalid_value',
			path,
			message: `Expected one of: ${allowed.join(', ')}.`,
		});
		return allowed[0];
	}
	return value as T;
}

function positiveIntegerAt(
	value: unknown,
	path: string,
	issues: BuildReleaseValidationIssue[],
): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
		issues.push({ code: 'invalid_value', path, message: 'Expected a positive integer.' });
		return 1;
	}
	return value;
}

function isoTimestampAt(
	value: unknown,
	path: string,
	issues: BuildReleaseValidationIssue[],
): string {
	const timestamp = stringAt(value, path, issues);
	if (
		timestamp &&
		(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp) ||
			Number.isNaN(Date.parse(timestamp)))
	) {
		issues.push({ code: 'invalid_value', path, message: 'Expected an ISO 8601 UTC timestamp.' });
	}
	return timestamp;
}

function nullableStringAt(
	value: unknown,
	path: string,
	issues: BuildReleaseValidationIssue[],
	format: 'string' | 'timestamp' = 'string',
): string | null {
	if (value === null) return null;
	return format === 'timestamp'
		? isoTimestampAt(value, path, issues)
		: stringAt(value, path, issues);
}

function relativePathAt(
	value: unknown,
	path: string,
	issues: BuildReleaseValidationIssue[],
): string {
	const candidate = stringAt(value, path, issues);
	if (
		candidate &&
		(candidate.startsWith('/') ||
			candidate.startsWith('\\') ||
			/^[A-Za-z]:[\\/]/.test(candidate) ||
			candidate.split(/[\\/]/).includes('..'))
	) {
		issues.push({
			code: 'invalid_value',
			path,
			message: 'Expected a package-relative path without parent traversal.',
		});
	}
	return candidate;
}

function evidenceAt(value: unknown, path: string, issues: BuildReleaseValidationIssue[]): string[] {
	if (!Array.isArray(value) || value.length === 0) {
		issues.push({
			code: 'invalid_value',
			path,
			message: 'Expected at least one evidence reference.',
		});
		return [];
	}
	return value.map((item, index) => stringAt(item, `${path}[${index}]`, issues));
}

function parseArtifact(
	value: unknown,
	path: string,
	issues: BuildReleaseValidationIssue[],
): BuildReleaseArtifactReference {
	const artifact = objectAt(value, path, ['path', 'sha256'], issues);
	return {
		path: relativePathAt(artifact.path, `${path}.path`, issues),
		sha256: stringAt(artifact.sha256, `${path}.sha256`, issues, /^[a-f0-9]{64}$/),
	};
}

function parseVerifier(
	value: unknown,
	path: string,
	issues: BuildReleaseValidationIssue[],
): BuildReleaseVerifierResult {
	const verifier = objectAt(value, path, ['status', 'command', 'completedAt', 'evidence'], issues);
	return {
		status: literalAt(verifier.status, `${path}.status`, ['passed', 'failed'], issues),
		command: stringAt(verifier.command, `${path}.command`, issues),
		completedAt: isoTimestampAt(verifier.completedAt, `${path}.completedAt`, issues),
		evidence: evidenceAt(verifier.evidence, `${path}.evidence`, issues),
	};
}

export function parseBuildReleaseManifest(input: unknown): BuildReleaseManifest {
	const issues: BuildReleaseValidationIssue[] = [];
	const root = objectAt(
		input,
		'$',
		[
			'schema',
			'releaseId',
			'createdAt',
			'handoff',
			'artifacts',
			'verification',
			'release',
			'owners',
			'acceptance',
		],
		issues,
	);
	const handoff = objectAt(
		root.handoff,
		'$.handoff',
		[
			'receiptPath',
			'receiptSha256',
			'handoffId',
			'mapId',
			'mapVersion',
			'accountId',
			'workspaceAccountId',
		],
		issues,
	);
	const artifacts = objectAt(root.artifacts, '$.artifacts', BUILD_RELEASE_ARTIFACTS, issues);
	const verification = objectAt(root.verification, '$.verification', ['staging', 'uat'], issues);
	const release = objectAt(
		root.release,
		'$.release',
		['environment', 'target', 'sourceSha', 'deployId', 'rollback'],
		issues,
	);
	const rollback = objectAt(
		release.rollback,
		'$.release.rollback',
		['command', 'artifact'],
		issues,
	);
	const owners = objectAt(root.owners, '$.owners', ['operator', 'support'], issues);
	const acceptance = objectAt(
		root.acceptance,
		'$.acceptance',
		['receiptId', 'status', 'decidedAt', 'decidedBy', 'note'],
		issues,
	);

	const manifest: BuildReleaseManifest = {
		schema: literalAt(root.schema, '$.schema', [BUILD_RELEASE_SCHEMA], issues),
		releaseId: stringAt(root.releaseId, '$.releaseId', issues),
		createdAt: isoTimestampAt(root.createdAt, '$.createdAt', issues),
		handoff: {
			receiptPath: relativePathAt(handoff.receiptPath, '$.handoff.receiptPath', issues),
			receiptSha256: stringAt(
				handoff.receiptSha256,
				'$.handoff.receiptSha256',
				issues,
				/^[a-f0-9]{64}$/,
			),
			handoffId: stringAt(handoff.handoffId, '$.handoff.handoffId', issues),
			mapId: stringAt(handoff.mapId, '$.handoff.mapId', issues),
			mapVersion: positiveIntegerAt(handoff.mapVersion, '$.handoff.mapVersion', issues),
			accountId: stringAt(handoff.accountId, '$.handoff.accountId', issues),
			workspaceAccountId: stringAt(
				handoff.workspaceAccountId,
				'$.handoff.workspaceAccountId',
				issues,
			),
		},
		artifacts: Object.fromEntries(
			BUILD_RELEASE_ARTIFACTS.map((name) => [
				name,
				parseArtifact(artifacts[name], `$.artifacts.${name}`, issues),
			]),
		) as Record<BuildReleaseArtifactName, BuildReleaseArtifactReference>,
		verification: {
			staging: parseVerifier(verification.staging, '$.verification.staging', issues),
			uat: parseVerifier(verification.uat, '$.verification.uat', issues),
		},
		release: {
			environment: literalAt(
				release.environment,
				'$.release.environment',
				['staging', 'production'],
				issues,
			),
			target: stringAt(release.target, '$.release.target', issues),
			sourceSha: stringAt(
				release.sourceSha,
				'$.release.sourceSha',
				issues,
				/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/,
			),
			deployId: stringAt(release.deployId, '$.release.deployId', issues),
			rollback: {
				command: stringAt(rollback.command, '$.release.rollback.command', issues),
				artifact: stringAt(rollback.artifact, '$.release.rollback.artifact', issues),
			},
		},
		owners: {
			operator: stringAt(owners.operator, '$.owners.operator', issues),
			support: stringAt(owners.support, '$.owners.support', issues),
		},
		acceptance: {
			receiptId: stringAt(acceptance.receiptId, '$.acceptance.receiptId', issues),
			status: literalAt(acceptance.status, '$.acceptance.status', ['accepted', 'rejected'], issues),
			decidedAt: isoTimestampAt(acceptance.decidedAt, '$.acceptance.decidedAt', issues),
			decidedBy: stringAt(acceptance.decidedBy, '$.acceptance.decidedBy', issues),
			note: stringAt(acceptance.note, '$.acceptance.note', issues),
		},
	};

	if (issues.length > 0) {
		throw new BuildReleaseValidationError(issues);
	}

	return manifest;
}

export function parseMapBuildHandoffReceipt(input: unknown): MapBuildHandoffReceipt {
	const issues: BuildReleaseValidationIssue[] = [];
	const root = objectAt(
		input,
		'$',
		[
			'schema',
			'handoffId',
			'mapId',
			'mapVersion',
			'accountId',
			'workspaceAccountId',
			'status',
			'createdAt',
			'createdBy',
			'resolvedAt',
			'resolvedBy',
			'resolutionNote',
		],
		issues,
	);

	const receipt: MapBuildHandoffReceipt = {
		schema: literalAt(root.schema, '$.schema', [MAP_BUILD_HANDOFF_RECEIPT_SCHEMA], issues),
		handoffId: stringAt(root.handoffId, '$.handoffId', issues),
		mapId: stringAt(root.mapId, '$.mapId', issues),
		mapVersion: positiveIntegerAt(root.mapVersion, '$.mapVersion', issues),
		accountId: stringAt(root.accountId, '$.accountId', issues),
		workspaceAccountId: stringAt(root.workspaceAccountId, '$.workspaceAccountId', issues),
		status: literalAt(root.status, '$.status', ['prepared', 'accepted', 'cancelled'], issues),
		createdAt: isoTimestampAt(root.createdAt, '$.createdAt', issues),
		createdBy: stringAt(root.createdBy, '$.createdBy', issues),
		resolvedAt: nullableStringAt(root.resolvedAt, '$.resolvedAt', issues, 'timestamp'),
		resolvedBy: nullableStringAt(root.resolvedBy, '$.resolvedBy', issues),
		resolutionNote: nullableStringAt(root.resolutionNote, '$.resolutionNote', issues),
	};

	if (
		receipt.status === 'prepared' &&
		(receipt.resolvedAt !== null || receipt.resolvedBy !== null)
	) {
		issues.push({
			code: 'invalid_value',
			path: '$.status',
			message: 'A prepared handoff cannot contain terminal resolution fields.',
		});
	}
	if (
		receipt.status !== 'prepared' &&
		(receipt.resolvedAt === null || receipt.resolvedBy === null)
	) {
		issues.push({
			code: 'invalid_value',
			path: '$.status',
			message: 'A terminal handoff requires resolvedAt and resolvedBy.',
		});
	}

	if (issues.length > 0) {
		throw new BuildReleaseValidationError(issues);
	}

	return receipt;
}

const CANONICAL_ARTIFACT_FILENAMES: Record<BuildReleaseArtifactName, string> = {
	mcp_contract: 'mcp_contract.yaml',
	agent_contract: 'agent_contract.yaml',
	outcome_contract: 'outcome_contract.md',
	golden_tasks: 'golden_tasks.yaml',
	runbook: 'runbook.md',
};

function fileSha256(path: string): string {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function resolvedPackagePath(
	packageRoot: string,
	relativePath: string,
	issuePath: string,
	issues: BuildReleaseInspectionIssue[],
): string | null {
	const candidate = resolve(packageRoot, relativePath);
	if (!existsSync(candidate)) return candidate;
	const realRoot = realpathSync(packageRoot);
	const realCandidate = realpathSync(candidate);
	if (realCandidate !== realRoot && !realCandidate.startsWith(`${realRoot}${sep}`)) {
		issues.push({
			code: 'package_path_escape',
			category: 'integrity',
			path: issuePath,
			message: 'Resolved path escapes the release package root.',
		});
		return null;
	}
	return candidate;
}

export function inspectBuildReleasePackage(manifestPath: string): BuildReleaseInspection {
	const issues: BuildReleaseInspectionIssue[] = [];
	let manifest: BuildReleaseManifest;

	try {
		manifest = parseBuildReleaseManifest(JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown);
	} catch (error) {
		const details =
			error instanceof BuildReleaseValidationError
				? error.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' ')
				: error instanceof Error
					? error.message
					: String(error);
		issues.push({
			code: 'manifest_invalid',
			category: 'integrity',
			path: manifestPath,
			message: details,
		});
		return {
			manifest: null,
			handoffReceipt: null,
			evidenceValid: false,
			releaseReady: false,
			issues,
		};
	}

	const packageRoot = dirname(resolve(manifestPath));
	let handoffReceipt: MapBuildHandoffReceipt | null = null;
	const receiptPath = resolvedPackagePath(
		packageRoot,
		manifest.handoff.receiptPath,
		'$.handoff.receiptPath',
		issues,
	);
	if (receiptPath !== null && (!existsSync(receiptPath) || !statSync(receiptPath).isFile())) {
		issues.push({
			code: 'receipt_missing',
			category: 'integrity',
			path: '$.handoff.receiptPath',
			message: `Map handoff receipt is missing: ${manifest.handoff.receiptPath}.`,
		});
	} else if (receiptPath !== null) {
		if (fileSha256(receiptPath) !== manifest.handoff.receiptSha256) {
			issues.push({
				code: 'receipt_hash_mismatch',
				category: 'integrity',
				path: '$.handoff.receiptSha256',
				message: 'Map handoff receipt SHA-256 does not match the manifest.',
			});
		}
		try {
			handoffReceipt = parseMapBuildHandoffReceipt(
				JSON.parse(readFileSync(receiptPath, 'utf8')) as unknown,
			);
		} catch (error) {
			issues.push({
				code: 'receipt_invalid',
				category: 'integrity',
				path: '$.handoff.receiptPath',
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}

	if (handoffReceipt !== null) {
		if (handoffReceipt.status !== 'accepted') {
			issues.push({
				code: 'handoff_not_accepted',
				category: 'integrity',
				path: '$.handoff',
				message: `Map handoff status is ${handoffReceipt.status}; accepted is required.`,
			});
		}
		for (const field of [
			'handoffId',
			'mapId',
			'mapVersion',
			'accountId',
			'workspaceAccountId',
		] as const) {
			if (manifest.handoff[field] !== handoffReceipt[field]) {
				issues.push({
					code: 'handoff_identity_mismatch',
					category: 'integrity',
					path: `$.handoff.${field}`,
					message: `Manifest ${field} does not match the accepted Map handoff receipt.`,
				});
			}
		}
	}

	const seenArtifactPaths = new Set<string>();
	for (const name of BUILD_RELEASE_ARTIFACTS) {
		const reference = manifest.artifacts[name];
		if (basename(reference.path) !== CANONICAL_ARTIFACT_FILENAMES[name]) {
			issues.push({
				code: 'artifact_path_mismatch',
				category: 'integrity',
				path: `$.artifacts.${name}.path`,
				message: `Expected canonical artifact filename ${CANONICAL_ARTIFACT_FILENAMES[name]}.`,
			});
		}
		if (seenArtifactPaths.has(reference.path)) {
			issues.push({
				code: 'artifact_path_mismatch',
				category: 'integrity',
				path: `$.artifacts.${name}.path`,
				message: 'Each canonical artifact must reference a distinct file.',
			});
		}
		seenArtifactPaths.add(reference.path);

		const artifactPath = resolvedPackagePath(
			packageRoot,
			reference.path,
			`$.artifacts.${name}.path`,
			issues,
		);
		if (artifactPath === null) continue;
		if (!existsSync(artifactPath) || !statSync(artifactPath).isFile()) {
			issues.push({
				code: 'artifact_missing',
				category: 'integrity',
				path: `$.artifacts.${name}.path`,
				message: `Canonical artifact is missing: ${reference.path}.`,
			});
			continue;
		}
		if (fileSha256(artifactPath) !== reference.sha256) {
			issues.push({
				code: 'artifact_hash_mismatch',
				category: 'integrity',
				path: `$.artifacts.${name}.sha256`,
				message: `${CANONICAL_ARTIFACT_FILENAMES[name]} SHA-256 does not match the manifest.`,
			});
		}
	}

	for (const verifier of ['staging', 'uat'] as const) {
		if (manifest.verification[verifier].status === 'failed') {
			issues.push({
				code: 'verifier_failed',
				category: 'readiness',
				path: `$.verification.${verifier}.status`,
				message: `${verifier} verification did not pass.`,
			});
		}
	}
	if (manifest.acceptance.status === 'rejected') {
		issues.push({
			code: 'release_rejected',
			category: 'readiness',
			path: '$.acceptance.status',
			message: 'The terminal Build acceptance receipt rejects this release.',
		});
	}

	const evidenceValid = !issues.some((issue) => issue.category === 'integrity');
	return {
		manifest,
		handoffReceipt,
		evidenceValid,
		releaseReady: evidenceValid && !issues.some((issue) => issue.category === 'readiness'),
		issues,
	};
}
