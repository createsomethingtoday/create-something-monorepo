import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
	CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES,
	CANON_REGISTRY_MANIFEST,
	reviewCanonProjectOverlay
} from '../registry/index.js';
import type {
	CanonOverlayCandidateQueue,
	CanonOverlayCandidateQueueEntry,
	CanonOverlayCandidatePromotionPlan,
	CanonOverlayCandidatePromotionPlanCollection,
	CanonOverlayCandidatePromotionApprovalField,
	CanonOverlayCandidatePromotionApprovalRecord,
	CanonOverlayCandidatePromotionApprovalRecordCollection,
	CanonOverlayCandidatePromotionApprovalState,
	CanonOverlayCandidatePromotionApprovalTarget,
	CanonOverlayCandidatePromotionReadinessCheck,
	CanonOverlayCandidatePromotionReadinessExportMatch,
	CanonOverlayCandidatePromotionReadinessRegistryMatch,
	CanonOverlayCandidatePromotionReadinessReport,
	CanonOverlayCandidatePromotionReadinessReportCollection,
	CanonOverlayCandidatePromotionReadinessStatus,
	CanonOverlayCandidateReviewPacket,
	CanonOverlayCandidateReviewPacketCollection,
	CanonProjectOverlayIntegrityIssue,
	CanonProjectOverlayInventory,
	CanonProjectOverlayInventoryEntry,
	CanonProjectOverlayManifest,
	CanonProjectOverlayReview,
	CanonRegistryKind,
	CanonRegistryModality
} from '../registry/schema.js';

const DEFAULT_SEARCH_ROOTS = ['apps', 'packages'];
const DEFAULT_IGNORED_DIRECTORIES = new Set([
	'.cache',
	'.git',
	'.svelte-kit',
	'.vite',
	'.wrangler',
	'build',
	'coverage',
	'dist',
	'node_modules',
	'output'
]);

export type CanonOverlayIntakeInventoryOptions = {
	rootDir: string;
	rootLabel?: string;
	searchRoots?: string[];
	includeTemplate?: boolean;
};

type CanonOverlayManifestModule = {
	CANON_PROJECT_OVERLAY_MANIFEST?: unknown;
	default?: unknown;
};

export async function findCanonProjectOverlayManifestFiles(
	options: CanonOverlayIntakeInventoryOptions
): Promise<string[]> {
	const rootDir = resolve(options.rootDir);
	const searchRoots = normalizeSearchRoots(options.searchRoots);
	const files: string[] = [];

	for (const searchRoot of searchRoots) {
		await walk(join(rootDir, searchRoot), async (filePath) => {
			if (!filePath.endsWith('manifest.ts') && !filePath.endsWith('manifest.js')) return;
			if (!options.includeTemplate && isProjectTemplateManifest(rootDir, filePath)) return;

			const source = await readFile(filePath, 'utf-8');
			if (
				source.includes('CANON_PROJECT_OVERLAY_MANIFEST') ||
				source.includes('CanonProjectOverlayManifest')
			) {
				files.push(filePath);
			}
		});
	}

	return files.sort((a, b) => relative(rootDir, a).localeCompare(relative(rootDir, b)));
}

export async function loadCanonProjectOverlayManifest(
	manifestPath: string
): Promise<CanonProjectOverlayManifest> {
	const moduleUrl = `${pathToFileURL(manifestPath).href}?canonOverlay=${Date.now()}`;
	const manifestModule = (await import(moduleUrl)) as CanonOverlayManifestModule;
	const candidate = manifestModule.CANON_PROJECT_OVERLAY_MANIFEST ?? manifestModule.default;

	if (!isCanonProjectOverlayManifest(candidate)) {
		throw new Error(`${manifestPath} does not export CANON_PROJECT_OVERLAY_MANIFEST`);
	}

	return candidate;
}

export async function buildCanonOverlayIntakeInventory(
	options: CanonOverlayIntakeInventoryOptions
): Promise<CanonProjectOverlayInventory> {
	const rootDir = resolve(options.rootDir);
	const searchRoots = normalizeSearchRoots(options.searchRoots);
	const manifestFiles = await findCanonProjectOverlayManifestFiles({
		...options,
		rootDir,
		searchRoots
	});
	const entries: CanonProjectOverlayInventoryEntry[] = [];

	for (const manifestFile of manifestFiles) {
		const manifest = await loadCanonProjectOverlayManifest(manifestFile);
		const review = reviewCanonProjectOverlay(manifest, {
			integrityIssues: await inspectCanonProjectOverlayIntegrity({
				rootDir,
				manifestFile,
				manifest
			})
		});
		entries.push({
			manifestPath: normalizeRelativePath(rootDir, manifestFile),
			manifest,
			review
		});
	}

	return createCanonOverlayIntakeInventory({
		rootDir: options.rootLabel ?? rootDir,
		searchRoots,
		entries
	});
}

export function createCanonOverlayIntakeInventory({
	rootDir,
	searchRoots,
	entries
}: {
	rootDir: string;
	searchRoots: string[];
	entries: CanonProjectOverlayInventoryEntry[];
}): CanonProjectOverlayInventory {
	return {
		schemaVersion: 1,
		id: 'canon-overlay-intake-inventory',
		sourceOfTruth: '@create-something/canon/overlays/intake',
		description:
			'Repo-level Canon overlay intake inventory for discovering project overlay manifests, reviewing evidence, and routing repeated-surface proposals back to Canon without forking primitives.',
		rootDir,
		searchRoots,
		entries,
		summary: summarizeOverlayInventory(entries),
		agentContract: {
			purpose: 'canon-overlay-intake-inventory',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'finding project/client Canon overlays across repo packages and apps',
				'reviewing overlay artifact completeness before handoff',
				'identifying extension intakes that are project-local versus candidate promotion',
				'keeping multi-project feedback attached to Canon overlay manifests instead of ad hoc docs'
			],
			stopBefore: [
				'automatically promoting a project-local overlay into Canon stable',
				'mutating project overlay files during inventory discovery',
				'using a one-surface overlay as evidence for shared Canon primitives',
				'creating a second overlay intake tracker outside Canon and Linear'
			]
		}
	};
}

export function renderCanonOverlayIntakeInventory(
	inventory: CanonProjectOverlayInventory
): string {
	const lines = [
		'# Canon Overlay Intake Inventory',
		'',
		`Root: ${inventory.rootDir}`,
		`Search roots: ${inventory.searchRoots.join(', ') || '(none)'}`,
		`Total overlays: ${inventory.summary.total}`,
		`Ready: ${inventory.summary.ready}`,
		`Needs artifacts: ${inventory.summary.needsArtifacts}`,
		`Needs evidence: ${inventory.summary.needsEvidence}`,
		`Needs review: ${inventory.summary.needsReview}`,
		`Candidate intakes: ${inventory.summary.candidateIntakes}`,
		`Project-local intakes: ${inventory.summary.projectLocalIntakes}`
	];

	if (inventory.entries.length === 0) {
		lines.push('', 'No project overlay manifests were found.');
		return lines.join('\n');
	}

	for (const entry of inventory.entries) {
		lines.push(
			'',
			`## ${entry.manifest.name}`,
			`- Manifest: ${entry.manifestPath}`,
			`- Overlay: ${entry.manifest.id}`,
			`- Owner: ${entry.manifest.owner}`,
			`- Source package: ${entry.manifest.sourcePackage}`,
			`- Modalities: ${entry.manifest.targetModalities.join(', ')}`,
			`- Status: ${entry.review.status}`,
			`- Summary: ${entry.review.summary}`
		);

		if (entry.review.integrityIssues.length) {
			lines.push(`- Integrity issues: ${entry.review.integrityIssues.length}`);
			for (const issue of entry.review.integrityIssues) {
				lines.push(`  - ${issue.message}`);
			}
		}

		for (const decision of entry.review.extensionDecisions) {
			lines.push(
				`- Intake ${decision.packet.id}: ${decision.decision.action} (${decision.decision.stage})`
			);
		}
	}

	return lines.join('\n');
}

export function buildCanonOverlayCandidateQueue(
	inventory: CanonProjectOverlayInventory
): CanonOverlayCandidateQueue {
	const entries: CanonOverlayCandidateQueueEntry[] = inventory.entries.flatMap((entry) => {
		if (entry.review.status !== 'ready') return [];

		return entry.review.extensionDecisions
			.filter(({ decision }) => decision.stage === 'candidate')
			.map(({ packet, decision }) => ({
				id: `${entry.manifest.id}:${packet.id}`,
				overlayId: entry.manifest.id,
				overlayName: entry.manifest.name,
				manifestPath: entry.manifestPath,
				intakeId: packet.id,
				title: packet.title,
				summary: packet.summary,
				owner: packet.owner,
				sourcePackage: packet.sourcePackage,
				sourcePath: packet.sourcePath,
				requestedKind: packet.requestedKind,
				requestedModalities: packet.requestedModalities,
				tags: packet.tags,
				surfaces: packet.surfaces,
				dependencies: packet.dependencies ?? [],
				requiredEvidence: decision.requiredEvidence,
				stopBeforeStable: decision.stopBeforeStable,
				rationale: decision.rationale,
				reviewUri: `canon://overlays/intake/${entry.manifest.id}`,
				candidateUri: `canon://overlays/candidates/${packet.id}`,
				handoffUri: `canon://overlays/candidates/${packet.id}/handoff`
			}));
	});

	return {
		schemaVersion: 1,
		id: 'canon-overlay-candidate-queue',
		sourceOfTruth: '@create-something/canon/overlays/intake',
		description:
			'Read-only queue of Canon overlay extension intakes that have repeated-surface evidence and are ready for Canon candidate review.',
		entries,
		summary: {
			total: entries.length,
			overlays: new Set(entries.map((entry) => entry.overlayId)).size,
			byRequestedKind: countByRequestedKind(entries),
			byModality: countByModality(entries)
		},
		agentContract: {
			purpose: 'canon-overlay-candidate-review',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'reviewing repeated-surface overlay evidence before Canon promotion work',
				'prioritizing candidate templates, components, adapters, tokens, or policies by modality and source package',
				'connecting candidate review back to the owning project overlay manifest and intake review',
				'keeping Canon stable promotion gated on export path, docs, tests, and compatibility evidence'
			],
			stopBefore: [
				'automatically creating Linear issues from candidate queue entries',
				'automatically promoting any candidate queue entry into Canon stable',
				'editing project overlay manifests from the candidate queue',
				'treating queued candidates as approved production changes'
			]
		}
	};
}

export function renderCanonOverlayCandidateQueue(queue: CanonOverlayCandidateQueue): string {
	const lines = [
		'# Canon Overlay Candidate Queue',
		'',
		`Total candidates: ${queue.summary.total}`,
		`Source overlays: ${queue.summary.overlays}`
	];

	if (queue.entries.length === 0) {
		lines.push('', 'No overlay candidates are ready for Canon review.');
		return lines.join('\n');
	}

	for (const entry of queue.entries) {
		lines.push(
			'',
			`## ${entry.title}`,
			`- Candidate: ${entry.intakeId}`,
			`- Overlay: ${entry.overlayName} (${entry.overlayId})`,
			`- Requested kind: ${entry.requestedKind}`,
			`- Modalities: ${entry.requestedModalities.join(', ')}`,
			`- Source package: ${entry.sourcePackage}`,
			`- Review: ${entry.reviewUri}`,
			`- Summary: ${entry.summary}`
		);
	}

	return lines.join('\n');
}

export function buildCanonOverlayCandidateReviewPackets(
	queue: CanonOverlayCandidateQueue
): CanonOverlayCandidateReviewPacketCollection {
	const entries = queue.entries.map((entry) => createCandidateReviewPacket(entry));

	return {
		schemaVersion: 1,
		id: 'canon-overlay-candidate-review-packets',
		sourceOfTruth: '@create-something/canon/overlays/intake',
		description:
			'Read-only review packets for Canon overlay candidate intakes, including approval boundaries and promotion evidence before Canon implementation work starts.',
		entries,
		summary: {
			total: entries.length,
			overlays: new Set(entries.map((entry) => entry.overlayId)).size,
			byRequestedKind: countByRequestedKind(entries),
			byModality: countByModality(entries)
		},
		agentContract: {
			purpose: 'canon-overlay-candidate-review-packets',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'preparing a human-reviewable handoff before opening Canon promotion work',
				'checking required evidence, surfaces, dependencies, and stop-before-stable constraints in one packet',
				'keeping candidate review anchored to the owning overlay manifest and candidate queue entry',
				'recording the approval boundary between project-local evidence and Canon stable implementation'
			],
			stopBefore: [
				'automatically creating Linear issues from review packets',
				'automatically promoting review packets into Canon stable registry items',
				'editing project overlay manifests while rendering review packets',
				'treating review packets as production approval without human review'
			]
		}
	};
}

export function renderCanonOverlayCandidateReviewPacket(
	packet: CanonOverlayCandidateReviewPacket
): string {
	const lines = [
		`# ${packet.title}`,
		'',
		`Candidate: ${packet.candidateId}`,
		`Overlay: ${packet.overlayName} (${packet.overlayId})`,
		`Manifest: ${packet.manifestPath}`,
		`Requested kind: ${packet.requestedKind}`,
		`Modalities: ${packet.requestedModalities.join(', ')}`,
		`Source package: ${packet.sourcePackage}`,
		`Candidate resource: ${packet.candidateUri}`,
		`Overlay review: ${packet.reviewUri}`,
		'',
		'## Summary',
		packet.summary,
		'',
		'## Surfaces',
		...packet.surfaces.map(
			(surface) =>
				`- ${surface.name} (${surface.modality}): ${surface.sourcePath ?? surface.surfaceId}${
					surface.proof ? ` - ${surface.proof}` : ''
				}`
		),
		'',
		'## Required Evidence',
		...packet.requiredEvidence.map((item) => `- ${item}`),
		'',
		'## Promotion Checklist',
		...packet.promotionChecklist.map((item) => `- ${item}`),
		'',
		'## Approval Boundary',
		...packet.approvalBoundary.map((item) => `- ${item}`)
	];

	return lines.join('\n');
}

export function renderCanonOverlayCandidateReviewPackets(
	collection: CanonOverlayCandidateReviewPacketCollection
): string {
	const lines = [
		'# Canon Overlay Candidate Review Packets',
		'',
		`Total packets: ${collection.summary.total}`,
		`Source overlays: ${collection.summary.overlays}`
	];

	if (collection.entries.length === 0) {
		lines.push('', 'No overlay candidate review packets are available.');
		return lines.join('\n');
	}

	for (const packet of collection.entries) {
		lines.push('', `## ${packet.title}`, `- Handoff: ${packet.handoffUri}`, `- Candidate: ${packet.candidateUri}`);
	}

	return lines.join('\n');
}

export function findCanonOverlayCandidateReviewPacket(
	collection: CanonOverlayCandidateReviewPacketCollection,
	id: string
): CanonOverlayCandidateReviewPacket | undefined {
	return collection.entries.find(
		(entry) => entry.intakeId === id || entry.id === id || entry.candidateId === id
	);
}

export function buildCanonOverlayCandidatePromotionPlans(
	packets: CanonOverlayCandidateReviewPacketCollection
): CanonOverlayCandidatePromotionPlanCollection {
	const entries = packets.entries.map((packet) => createCandidatePromotionPlan(packet));

	return {
		schemaVersion: 1,
		id: 'canon-overlay-candidate-promotion-plans',
		sourceOfTruth: '@create-something/canon/overlays/intake',
		description:
			'Read-only implementation plans for Canon overlay candidates after explicit human approval, preserving export, docs, tests, compatibility, and stop-condition requirements before stable promotion.',
		entries,
		summary: {
			total: entries.length,
			overlays: new Set(entries.map((entry) => entry.overlayId)).size,
			byRequestedKind: countByRequestedKind(entries),
			byModality: countByModality(entries)
		},
		agentContract: {
			purpose: 'canon-overlay-candidate-promotion-plans',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'planning a bounded Canon implementation slice after a human approves a candidate handoff',
				'checking export, docs, tests, compatibility, MCP content, and rollback expectations before stable promotion',
				'keeping candidate implementation work separate from approval and Linear issue creation',
				'turning repeated-surface overlay evidence into a reviewable implementation checklist'
			],
			stopBefore: [
				'automatically creating Linear issues from promotion plans',
				'automatically approving or marking any candidate stable',
				'editing project overlay manifests while rendering promotion plans',
				'treating a plan as production permission without explicit human approval'
			]
		}
	};
}

export function renderCanonOverlayCandidatePromotionPlan(
	plan: CanonOverlayCandidatePromotionPlan
): string {
	const lines = [
		`# ${plan.title}`,
		'',
		`Candidate: ${plan.candidateId}`,
		`Overlay: ${plan.overlayName} (${plan.overlayId})`,
		`Manifest: ${plan.manifestPath}`,
		`Requested kind: ${plan.requestedKind}`,
		`Modalities: ${plan.requestedModalities.join(', ')}`,
		`Source package: ${plan.sourcePackage}`,
		`Promotion plan: ${plan.planUri}`,
		`Review packet: ${plan.handoffUri}`,
		`Candidate resource: ${plan.candidateUri}`,
		`Overlay review: ${plan.reviewUri}`,
		'',
		'## Summary',
		plan.summary,
		'',
		'## Preconditions',
		...plan.preconditions.map((item) => `- ${item}`),
		'',
		'## Implementation Scope',
		...plan.implementationScope.map((item) => `- ${item}`),
		'',
		'## Required Changes',
		...plan.requiredChanges.map((item) => `- ${item}`),
		'',
		'## Validation Plan',
		...plan.validationPlan.map((item) => `- ${item}`),
		'',
		'## Documentation Plan',
		...plan.documentationPlan.map((item) => `- ${item}`),
		'',
		'## Compatibility Plan',
		...plan.compatibilityPlan.map((item) => `- ${item}`),
		'',
		'## Stop Conditions',
		...plan.stopConditions.map((item) => `- ${item}`),
		'',
		'## Approval Boundary',
		...plan.approvalBoundary.map((item) => `- ${item}`)
	];

	return lines.join('\n');
}

export function renderCanonOverlayCandidatePromotionPlans(
	collection: CanonOverlayCandidatePromotionPlanCollection
): string {
	const lines = [
		'# Canon Overlay Candidate Promotion Plans',
		'',
		`Total plans: ${collection.summary.total}`,
		`Source overlays: ${collection.summary.overlays}`
	];

	if (collection.entries.length === 0) {
		lines.push('', 'No overlay candidate promotion plans are available.');
		return lines.join('\n');
	}

	for (const plan of collection.entries) {
		lines.push('', `## ${plan.title}`, `- Plan: ${plan.planUri}`, `- Handoff: ${plan.handoffUri}`);
	}

	return lines.join('\n');
}

export function findCanonOverlayCandidatePromotionPlan(
	collection: CanonOverlayCandidatePromotionPlanCollection,
	id: string
): CanonOverlayCandidatePromotionPlan | undefined {
	return collection.entries.find(
		(entry) => entry.intakeId === id || entry.id === id || entry.candidateId === id || entry.packetId === id
	);
}

export function buildCanonOverlayCandidatePromotionReadinessReports(
	plans: CanonOverlayCandidatePromotionPlanCollection
): CanonOverlayCandidatePromotionReadinessReportCollection {
	const entries = plans.entries.map((plan) => createCandidatePromotionReadinessReport(plan));

	return {
		schemaVersion: 1,
		id: 'canon-overlay-candidate-promotion-readiness-reports',
		sourceOfTruth: '@create-something/canon/overlays/intake',
		description:
			'Read-only readiness reports for Canon overlay candidate promotion plans, showing approval, registry, export, docs, validation, compatibility, and stop-condition gaps before implementation starts.',
		entries,
		summary: {
			total: entries.length,
			needsApproval: countReadiness(entries, 'needs-approval'),
			needsTargets: countReadiness(entries, 'needs-targets'),
			readyForImplementation: countReadiness(entries, 'ready-for-implementation')
		},
		agentContract: {
			purpose: 'canon-overlay-candidate-promotion-readiness-reports',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'checking whether an approved promotion plan has enough Canon target information to start implementation',
				'comparing candidates with current Canon registry and public export policy snapshots',
				'keeping human approval and target selection explicit before code changes'
			],
			stopBefore: [
				'treating readiness as human approval',
				'automatically creating Linear work from readiness reports',
				'automatically editing Canon registry, exports, docs, or project overlays',
				'marking candidates stable from readiness output'
			]
		}
	};
}

export function renderCanonOverlayCandidatePromotionReadinessReport(
	report: CanonOverlayCandidatePromotionReadinessReport
): string {
	const lines = [
		`# ${report.title}`,
		'',
		`Status: ${report.status}`,
		`Readiness report: ${report.readinessUri}`,
		`Promotion plan: ${report.planUri}`,
		`Review packet: ${report.handoffUri}`,
		`Candidate resource: ${report.candidateUri}`,
		'',
		'## Summary',
		report.summary,
		'',
		'## Checks',
		...report.checks.flatMap((check) => [
			`### ${check.label}`,
			`- Status: ${check.status}`,
			`- Required action: ${check.requiredAction}`,
			...check.evidence.map((item) => `- Evidence: ${item}`),
			''
		]),
		'## Related Registry Items',
		...(report.relatedRegistryItems.length
			? report.relatedRegistryItems.map(
					(item) =>
						`- ${item.id}: ${item.name} (${item.maturity}, score ${item.score}) - ${item.reason}`
				)
			: ['- None found from current Canon registry snapshot.']),
		'',
		'## Candidate Export Policies',
		...(report.candidateExportPolicies.length
			? report.candidateExportPolicies.map((rule) => {
					const label = rule.exportName ? `${rule.exportPath}#${rule.exportName}` : rule.exportPath;
					return `- ${label}: ${rule.registryPolicy} / ${rule.classification} (score ${rule.score})`;
				})
			: ['- None found from current Canon public export policy snapshot.']),
		'',
		'## Stop Conditions',
		...report.stopConditions.map((item) => `- ${item}`),
		'',
		'## Approval Boundary',
		...report.approvalBoundary.map((item) => `- ${item}`),
		'',
		'## Agent Contract',
		...report.agentContract.useFor.map((item) => `- Use for: ${item}`),
		...report.agentContract.stopBefore.map((item) => `- Stop before: ${item}`)
	];

	return lines.join('\n');
}

export function renderCanonOverlayCandidatePromotionReadinessReports(
	collection: CanonOverlayCandidatePromotionReadinessReportCollection
): string {
	const lines = [
		'# Canon Overlay Candidate Promotion Readiness Reports',
		'',
		`Total reports: ${collection.summary.total}`,
		`Needs approval: ${collection.summary.needsApproval}`,
		`Needs targets: ${collection.summary.needsTargets}`,
		`Ready for implementation: ${collection.summary.readyForImplementation}`
	];

	if (collection.entries.length === 0) {
		lines.push('', 'No overlay candidate promotion readiness reports are available.');
		return lines.join('\n');
	}

	for (const report of collection.entries) {
		lines.push(
			'',
			`## ${report.title}`,
			`- Status: ${report.status}`,
			`- Readiness: ${report.readinessUri}`,
			`- Plan: ${report.planUri}`
		);
	}

	return lines.join('\n');
}

export function findCanonOverlayCandidatePromotionReadinessReport(
	collection: CanonOverlayCandidatePromotionReadinessReportCollection,
	id: string
): CanonOverlayCandidatePromotionReadinessReport | undefined {
	return collection.entries.find(
		(entry) => entry.intakeId === id || entry.id === id || entry.candidateId === id || entry.planId === id
	);
}

export function buildCanonOverlayCandidatePromotionApprovalRecords(
	reports: CanonOverlayCandidatePromotionReadinessReportCollection
): CanonOverlayCandidatePromotionApprovalRecordCollection {
	const entries = reports.entries.map((report) => createCandidatePromotionApprovalRecord(report));

	return {
		schemaVersion: 1,
		id: 'canon-overlay-candidate-promotion-approval-records',
		sourceOfTruth: '@create-something/canon/overlays/intake',
		description:
			'Read-only approval-record templates for Canon overlay candidate promotion readiness reports, making maintainer approval, target selection, and implementation ownership explicit before code changes.',
		entries,
		summary: {
			total: entries.length,
			approvalRequired: countApprovalState(entries, 'approval-required')
		},
		agentContract: {
			purpose: 'canon-overlay-candidate-promotion-approval-records',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'recording the human approval and target-selection fields required before implementation starts',
				'turning readiness review hints into explicit maintainer choices',
				'preserving approval evidence as a review artifact without mutating Canon or project overlays'
			],
			stopBefore: [
				'treating an unfilled approval record as approval',
				'automatically filling target fields from readiness hints',
				'automatically creating Linear work from approval records',
				'automatically editing Canon registry, exports, docs, or project overlays',
				'marking candidates stable from approval-record output'
			]
		}
	};
}

export function renderCanonOverlayCandidatePromotionApprovalRecord(
	record: CanonOverlayCandidatePromotionApprovalRecord
): string {
	const lines = [
		`# ${record.title}`,
		'',
		`State: ${record.state}`,
		`Approval record: ${record.approvalUri}`,
		`Readiness report: ${record.readinessUri}`,
		`Promotion plan: ${record.planUri}`,
		`Review packet: ${record.handoffUri}`,
		`Candidate resource: ${record.candidateUri}`,
		'',
		'## Summary',
		record.summary,
		'',
		'## Required Approval Fields',
		...record.requiredFields.flatMap((field) => [
			`### ${field.label}`,
			`- Required: ${field.required ? 'yes' : 'no'}`,
			`- Current value: ${field.value ?? 'UNSET'}`,
			`- Instructions: ${field.instructions}`,
			...(field.hints.length ? field.hints.map((hint) => `- Hint: ${hint}`) : ['- Hint: none']),
			''
		]),
		'## Target Hints',
		'### Registry Items',
		...(record.targetHints.registryItems.length
			? record.targetHints.registryItems.map(
					(item) =>
						`- ${item.id}: ${item.name} (${item.maturity}, score ${item.score}) - ${item.reason}`
				)
			: ['- None found from current Canon registry snapshot.']),
		'',
		'### Export Policies',
		...(record.targetHints.exportPolicies.length
			? record.targetHints.exportPolicies.map((rule) => {
					const label = rule.exportName ? `${rule.exportPath}#${rule.exportName}` : rule.exportPath;
					return `- ${label}: ${rule.registryPolicy} / ${rule.classification} (score ${rule.score})`;
				})
			: ['- None found from current Canon public export policy snapshot.']),
		'',
		'### Docs Paths',
		...(record.targetHints.docsPaths.length
			? record.targetHints.docsPaths.map((docsPath) => `- ${docsPath}`)
			: ['- None found from related registry items.']),
		'',
		'## Checklist',
		...record.checklist.map((item) => `- ${item}`),
		'',
		'## Stop Conditions',
		...record.stopConditions.map((item) => `- ${item}`),
		'',
		'## Approval Boundary',
		...record.approvalBoundary.map((item) => `- ${item}`),
		'',
		'## Agent Contract',
		...record.agentContract.useFor.map((item) => `- Use for: ${item}`),
		...record.agentContract.stopBefore.map((item) => `- Stop before: ${item}`)
	];

	return lines.join('\n');
}

export function renderCanonOverlayCandidatePromotionApprovalRecords(
	collection: CanonOverlayCandidatePromotionApprovalRecordCollection
): string {
	const lines = [
		'# Canon Overlay Candidate Promotion Approval Records',
		'',
		`Total records: ${collection.summary.total}`,
		`Approval required: ${collection.summary.approvalRequired}`
	];

	if (collection.entries.length === 0) {
		lines.push('', 'No overlay candidate promotion approval records are available.');
		return lines.join('\n');
	}

	for (const record of collection.entries) {
		lines.push(
			'',
			`## ${record.title}`,
			`- State: ${record.state}`,
			`- Approval record: ${record.approvalUri}`,
			`- Readiness: ${record.readinessUri}`
		);
	}

	return lines.join('\n');
}

export function findCanonOverlayCandidatePromotionApprovalRecord(
	collection: CanonOverlayCandidatePromotionApprovalRecordCollection,
	id: string
): CanonOverlayCandidatePromotionApprovalRecord | undefined {
	return collection.entries.find(
		(entry) =>
			entry.intakeId === id ||
			entry.id === id ||
			entry.candidateId === id ||
			entry.planId === id ||
			entry.readinessReportId === id
	);
}

function summarizeOverlayInventory(entries: CanonProjectOverlayInventoryEntry[]) {
	return {
		total: entries.length,
		ready: countReviews(entries, 'ready'),
		needsArtifacts: countReviews(entries, 'needs-artifacts'),
		needsEvidence: countReviews(entries, 'needs-evidence'),
		needsReview: countReviews(entries, 'needs-review'),
		candidateIntakes: countDecisions(entries, 'candidate'),
		projectLocalIntakes: countDecisions(entries, 'project-local')
	};
}

function countReviews(
	entries: CanonProjectOverlayInventoryEntry[],
	status: CanonProjectOverlayReview['status']
) {
	return entries.filter((entry) => entry.review.status === status).length;
}

function countDecisions(
	entries: CanonProjectOverlayInventoryEntry[],
	stage: 'candidate' | 'project-local'
) {
	return entries.reduce(
		(count, entry) =>
			count +
			entry.review.extensionDecisions.filter((decision) => decision.decision.stage === stage)
				.length,
		0
	);
}

function countByRequestedKind(entries: Array<{ requestedKind: CanonRegistryKind }>) {
	const counts = new Map<CanonRegistryKind, number>();
	for (const entry of entries) {
		counts.set(entry.requestedKind, (counts.get(entry.requestedKind) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([kind, count]) => ({ kind, count }))
		.sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
}

function countByModality(entries: Array<{ requestedModalities: CanonRegistryModality[] }>) {
	const counts = new Map<CanonRegistryModality, number>();
	for (const entry of entries) {
		for (const modality of entry.requestedModalities) {
			counts.set(modality, (counts.get(modality) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.map(([modality, count]) => ({ modality, count }))
		.sort((a, b) => b.count - a.count || a.modality.localeCompare(b.modality));
}

function countReadiness(
	entries: CanonOverlayCandidatePromotionReadinessReport[],
	status: CanonOverlayCandidatePromotionReadinessStatus
) {
	return entries.filter((entry) => entry.status === status).length;
}

function countApprovalState(
	entries: CanonOverlayCandidatePromotionApprovalRecord[],
	state: CanonOverlayCandidatePromotionApprovalState
) {
	return entries.filter((entry) => entry.state === state).length;
}

function createCandidateReviewPacket(
	entry: CanonOverlayCandidateQueueEntry
): CanonOverlayCandidateReviewPacket {
	return {
		id: `canon-overlay-candidate-review:${entry.intakeId}`,
		candidateId: entry.id,
		title: `${entry.title} review packet`,
		summary: entry.summary,
		overlayId: entry.overlayId,
		overlayName: entry.overlayName,
		manifestPath: entry.manifestPath,
		intakeId: entry.intakeId,
		owner: entry.owner,
		sourcePackage: entry.sourcePackage,
		sourcePath: entry.sourcePath,
		requestedKind: entry.requestedKind,
		requestedModalities: entry.requestedModalities,
		tags: entry.tags,
		surfaces: entry.surfaces,
		dependencies: entry.dependencies,
		requiredEvidence: entry.requiredEvidence,
		stopBeforeStable: entry.stopBeforeStable,
		rationale: entry.rationale,
		reviewUri: entry.reviewUri,
		candidateUri: entry.candidateUri,
		handoffUri: entry.handoffUri,
		promotionChecklist: [
			'Confirm a human maintainer approved opening Canon promotion work from this packet.',
			'Review the owning overlay manifest, source package, source path, surfaces, and proofs.',
			'Verify every required evidence item has current source or test coverage.',
			'Decide whether the candidate becomes a Canon registry item, template, adapter, token, policy, or remains project-local.',
			'Update Canon export path, docs, tests, MCP generated content, and compatibility notes before any stable promotion.'
		],
		approvalBoundary: [
			'This packet is read-only and does not create Linear issues, mutate overlay manifests, or approve stable promotion.',
			'Open promotion work only after explicit human approval.',
			'Do not mark stable until every stop-before-stable item is resolved.'
		],
		agentContract: {
			purpose: 'canon-overlay-candidate-review-packet',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'turning a queued overlay candidate into a reviewable handoff',
				'checking candidate source evidence before implementation planning',
				'preparing a bounded promotion slice after human approval'
			],
			stopBefore: [
				'automatically opening Linear work from the packet',
				'automatically editing Canon registry or stable exports',
				'overriding stop-before-stable requirements'
			]
		}
	};
}

function createCandidatePromotionPlan(
	packet: CanonOverlayCandidateReviewPacket
): CanonOverlayCandidatePromotionPlan {
	return {
		id: `canon-overlay-candidate-promotion-plan:${packet.intakeId}`,
		packetId: packet.id,
		candidateId: packet.candidateId,
		intakeId: packet.intakeId,
		title: `${packet.title.replace(/ review packet$/, '')} promotion plan`,
		summary: packet.summary,
		overlayId: packet.overlayId,
		overlayName: packet.overlayName,
		manifestPath: packet.manifestPath,
		owner: packet.owner,
		sourcePackage: packet.sourcePackage,
		sourcePath: packet.sourcePath,
		requestedKind: packet.requestedKind,
		requestedModalities: packet.requestedModalities,
		planUri: `canon://overlays/candidates/${packet.intakeId}/promotion-plan`,
		handoffUri: packet.handoffUri,
		candidateUri: packet.candidateUri,
		reviewUri: packet.reviewUri,
		preconditions: [
			'Human maintainer approval is recorded outside this plan before implementation starts.',
			'Candidate review packet has been read and current source paths still resolve.',
			'Implementation owner confirms the candidate should move toward Canon candidate or stable work instead of remaining project-local.'
		],
		implementationScope: [
			`Evaluate the ${packet.requestedKind} candidate for Canon-owned source, export, docs, tests, compatibility, and registry routing.`,
			`Preserve the owning overlay as evidence: ${packet.overlayName} (${packet.overlayId}).`,
			`Cover modalities: ${packet.requestedModalities.join(', ')}.`,
			`Review source package ${packet.sourcePackage}${packet.sourcePath ? ` at ${packet.sourcePath}` : ''}.`
		],
		requiredChanges: [
			'Choose the Canon source module, package export path, registry item id, and maturity target before editing.',
			'Add or update Canon source implementation only after confirming no stable registry item already satisfies the candidate.',
			'Update Canon registry metadata with kind, modalities, dependencies, docs path, and contract notes.',
			'Update MCP generated content and public Canon docs for the new or changed Canon primitive.',
			'Keep project overlay artifacts as evidence; do not mutate them as part of promotion planning.'
		],
		validationPlan: [
			'Run focused Canon tests for the touched source and registry behavior.',
			'Run Canon build or package check covering public exports.',
			'Run MCP parity/build checks if generated registry, overlay, or docs content changes.',
			'Run .ltd check if public Canon docs change.',
			'Record exact commands and evidence in the promotion PR or Linear issue.'
		],
		documentationPlan: [
			'Document the Canon-owned behavior and import path in the nearest Canon docs page.',
			'Link the promoted item back to the registry and overlay evidence where useful.',
			'Call out modality responsibilities for web, chat, app, voice, or glasses as applicable.'
		],
		compatibilityPlan: [
			'Preserve existing project overlay behavior until Canon consumers intentionally migrate.',
			'Name any breaking API, token, copy, or policy change before promotion.',
			'Include rollback or keep-local guidance if the candidate remains project-owned.'
		],
		stopConditions: [
			...packet.stopBeforeStable,
			'Stop if human approval is missing or ambiguous.',
			'Stop if source paths, surface proofs, or required evidence are stale.',
			'Stop if implementation would create a fork instead of a Canon-owned export and registry item.',
			'Stop before creating Linear work automatically from this plan.'
		],
		approvalBoundary: [
			'This plan is read-only and does not approve implementation, create Linear issues, mutate overlays, or mark anything stable.',
			'Open implementation work only after explicit human approval.',
			'Stable promotion still requires Canon-owned export path, docs, tests, compatibility notes, and registry routing.'
		],
		agentContract: {
			purpose: 'canon-overlay-candidate-promotion-plan',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'planning implementation after candidate approval',
				'checking promotion scope before editing Canon',
				'carrying evidence and stop conditions into a follow-up PR'
			],
			stopBefore: [
				'automatically creating Linear issues',
				'automatically editing Canon source',
				'treating the plan as approval or stable promotion'
			]
		}
	};
}

function createCandidatePromotionReadinessReport(
	plan: CanonOverlayCandidatePromotionPlan
): CanonOverlayCandidatePromotionReadinessReport {
	const relatedRegistryItems = findRelatedRegistryItems(plan);
	const candidateExportPolicies = findCandidateExportPolicies(plan);
	const checks = createPromotionReadinessChecks({
		plan,
		relatedRegistryItems,
		candidateExportPolicies
	});
	const status = deriveReadinessStatus(checks);

	return {
		id: `canon-overlay-candidate-promotion-readiness:${plan.intakeId}`,
		planId: plan.id,
		candidateId: plan.candidateId,
		intakeId: plan.intakeId,
		title: `${plan.title.replace(/ promotion plan$/, '')} readiness report`,
		summary:
			`${plan.summary} This readiness report compares the plan with current Canon registry and public export policy snapshots before implementation starts.`,
		status,
		readinessUri: `canon://overlays/candidates/${plan.intakeId}/readiness`,
		planUri: plan.planUri,
		handoffUri: plan.handoffUri,
		candidateUri: plan.candidateUri,
		reviewUri: plan.reviewUri,
		checks,
		relatedRegistryItems,
		candidateExportPolicies,
		stopConditions: [
			...plan.stopConditions,
			'Stop if readiness output is used as approval instead of evidence for a maintainer decision.',
			'Stop if no Canon registry id, export path, docs path, and validation scope have been selected.'
		],
		approvalBoundary: [
			'This readiness report is read-only and does not approve implementation, create Linear issues, mutate overlays, or mark anything stable.',
			'Human approval and target selection must be recorded outside this report before implementation starts.',
			'Use related registry items and export policies as review hints, not automatic target choices.'
		],
		agentContract: {
			purpose: 'canon-overlay-candidate-promotion-readiness-report',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'checking whether promotion work has approval and target-selection prerequisites',
				'finding likely registry or export-policy neighbors before implementation',
				'carrying missing target evidence into a follow-up implementation slice'
			],
			stopBefore: [
				'automatically creating Linear issues',
				'automatically selecting registry ids or export paths',
				'automatically editing Canon or project overlays',
				'treating readiness as stable promotion'
			]
		}
	};
}

function createCandidatePromotionApprovalRecord(
	report: CanonOverlayCandidatePromotionReadinessReport
): CanonOverlayCandidatePromotionApprovalRecord {
	const target: CanonOverlayCandidatePromotionApprovalTarget = {
		approvalOwner: null,
		approvalEvidence: null,
		approvedAt: null,
		registryAction: null,
		registryItemId: null,
		exportPath: null,
		exportName: null,
		docsPath: null,
		maturityTarget: null,
		implementationOwner: null
	};
	const docsPaths = uniqueStrings(
		report.relatedRegistryItems
			.map((item) => item.docsPath)
			.filter((value): value is string => Boolean(value))
	);

	return {
		id: `canon-overlay-candidate-promotion-approval-record:${report.intakeId}`,
		readinessReportId: report.id,
		planId: report.planId,
		candidateId: report.candidateId,
		intakeId: report.intakeId,
		title: `${report.title.replace(/ readiness report$/, '')} approval record`,
		summary:
			`${report.summary} Fill this record before implementation starts; every target remains unset until a maintainer records an explicit choice.`,
		state: 'approval-required',
		approvalUri: `canon://overlays/candidates/${report.intakeId}/approval-record`,
		readinessUri: report.readinessUri,
		planUri: report.planUri,
		handoffUri: report.handoffUri,
		candidateUri: report.candidateUri,
		reviewUri: report.reviewUri,
		target,
		requiredFields: createApprovalFields({ target, report, docsPaths }),
		targetHints: {
			registryItems: report.relatedRegistryItems,
			exportPolicies: report.candidateExportPolicies,
			docsPaths
		},
		checklist: [
			'Record the human maintainer or role approving implementation.',
			'Record the approval evidence location, such as PR comment, Linear comment, meeting note, or signed decision.',
			'Select registry action and registry item id before editing Canon source.',
			'Select export path and docs path before implementation starts.',
			'Select maturity target and implementation owner before opening implementation work.',
			'Carry validation and compatibility requirements from the readiness report into the implementation PR.'
		],
		stopConditions: [
			...report.stopConditions,
			'Stop if any required approval-record field is still UNSET.',
			'Stop if target fields were copied from hints without maintainer review.',
			'Stop before using this record as permission to mutate Canon or project overlays.'
		],
		approvalBoundary: [
			'This approval record is a read-only template and does not itself approve implementation.',
			'Only a maintainer-filled record with explicit owner, evidence, target, docs, maturity, and implementation owner fields can support opening implementation work.',
			'The record does not create Linear issues, mutate Canon, mutate project overlays, or mark candidates stable.'
		],
		agentContract: {
			purpose: 'canon-overlay-candidate-promotion-approval-record',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'recording the exact human approval and target choices required before implementation',
				'keeping readiness hints separate from maintainer-selected targets',
				'handing an approved candidate into a bounded implementation slice'
			],
			stopBefore: [
				'automatically filling required approval fields',
				'automatically creating Linear work',
				'automatically editing Canon source, registry, exports, docs, or project overlays',
				'treating an unfilled approval record as approval or stable promotion'
			]
		}
	};
}

function createApprovalFields({
	target,
	report,
	docsPaths
}: {
	target: CanonOverlayCandidatePromotionApprovalTarget;
	report: CanonOverlayCandidatePromotionReadinessReport;
	docsPaths: string[];
}): CanonOverlayCandidatePromotionApprovalField[] {
	const registryHints = report.relatedRegistryItems.map((item) => `${item.id}: ${item.name}`);
	const exportHints = report.candidateExportPolicies.map((rule) => {
		const label = rule.exportName ? `${rule.exportPath}#${rule.exportName}` : rule.exportPath;
		return `${label}: ${rule.registryPolicy} / ${rule.classification}`;
	});

	return [
		{
			id: 'approvalOwner',
			label: 'Approval Owner',
			required: true,
			value: target.approvalOwner,
			hints: ['Name the maintainer, role, or decision authority who approved implementation.'],
			instructions: 'Record the human owner responsible for the approval decision.'
		},
		{
			id: 'approvalEvidence',
			label: 'Approval Evidence',
			required: true,
			value: target.approvalEvidence,
			hints: ['Use a stable PR comment, Linear comment, meeting note, or decision artifact reference.'],
			instructions: 'Record where the approval decision can be audited.'
		},
		{
			id: 'approvedAt',
			label: 'Approved At',
			required: true,
			value: target.approvedAt,
			hints: ['Use an ISO 8601 timestamp or exact calendar date.'],
			instructions: 'Record when the approval decision happened.'
		},
		{
			id: 'registryAction',
			label: 'Registry Action',
			required: true,
			value: target.registryAction,
			hints: ['Allowed values: reuse-existing, update-existing, create-new.'],
			instructions: 'Choose how implementation should treat the Canon registry target.'
		},
		{
			id: 'registryItemId',
			label: 'Registry Item Id',
			required: true,
			value: target.registryItemId,
			hints: registryHints,
			instructions: 'Record the selected Canon registry item id or the new id to create.'
		},
		{
			id: 'exportPath',
			label: 'Export Path',
			required: true,
			value: target.exportPath,
			hints: exportHints,
			instructions: 'Record the package export path that implementation should add or update.'
		},
		{
			id: 'exportName',
			label: 'Export Name',
			required: false,
			value: target.exportName,
			hints: exportHints,
			instructions: 'Record the named export when the target is a symbol-level export.'
		},
		{
			id: 'docsPath',
			label: 'Docs Path',
			required: true,
			value: target.docsPath,
			hints: docsPaths,
			instructions: 'Record the Canon docs path that implementation must update.'
		},
		{
			id: 'maturityTarget',
			label: 'Maturity Target',
			required: true,
			value: target.maturityTarget,
			hints: ['Allowed values: experimental, candidate, stable. Stable requires export, docs, tests, compatibility, and registry routing.'],
			instructions: 'Record the intended Canon maturity after implementation.'
		},
		{
			id: 'implementationOwner',
			label: 'Implementation Owner',
			required: true,
			value: target.implementationOwner,
			hints: ['Name the maintainer or agent lane responsible for the implementation slice.'],
			instructions: 'Record who owns the follow-up implementation work.'
		}
	];
}

function uniqueStrings(values: string[]) {
	return [...new Set(values)].sort();
}

function createPromotionReadinessChecks({
	plan,
	relatedRegistryItems,
	candidateExportPolicies
}: {
	plan: CanonOverlayCandidatePromotionPlan;
	relatedRegistryItems: CanonOverlayCandidatePromotionReadinessRegistryMatch[];
	candidateExportPolicies: CanonOverlayCandidatePromotionReadinessExportMatch[];
}): CanonOverlayCandidatePromotionReadinessCheck[] {
	const relatedDocsPaths = relatedRegistryItems
		.map((item) => item.docsPath)
		.filter((value): value is string => Boolean(value));

	return [
		{
			id: 'human-approval',
			label: 'Human Approval',
			status: 'needs-input',
			evidence: [
				'Promotion plans and readiness reports cannot verify approval automatically.',
				`Plan approval boundary: ${plan.approvalBoundary.join(' ')}`
			],
			requiredAction: 'Record explicit maintainer approval before implementation starts.'
		},
		{
			id: 'registry-target',
			label: 'Canon Registry Target',
			status: relatedRegistryItems.length ? 'review' : 'missing',
			evidence: relatedRegistryItems.length
				? relatedRegistryItems.map(
						(item) => `${item.id} is a ${item.kind} ${item.maturity} item with overlapping evidence.`
					)
				: ['No likely registry neighbor was found in the current Canon registry snapshot.'],
			requiredAction:
				'Choose whether to reuse, update, or create a Canon registry item id before editing implementation code.'
		},
		{
			id: 'export-target',
			label: 'Canon Export Target',
			status: candidateExportPolicies.length ? 'review' : 'missing',
			evidence: candidateExportPolicies.length
				? candidateExportPolicies.map((rule) => {
						const label = rule.exportName ? `${rule.exportPath}#${rule.exportName}` : rule.exportPath;
						return `${label} is ${rule.registryPolicy} / ${rule.classification}.`;
					})
				: ['No likely public export policy neighbor was found in the current Canon export policy snapshot.'],
			requiredAction:
				'Select the Canon export path and confirm whether public export policy needs a new or updated rule.'
		},
		{
			id: 'docs-target',
			label: 'Canon Docs Target',
			status: relatedDocsPaths.length ? 'review' : 'missing',
			evidence: relatedDocsPaths.length
				? relatedDocsPaths.map((docsPath) => `Related registry docs path: ${docsPath}.`)
				: ['No docs path can be selected automatically from the promotion plan.'],
			requiredAction: 'Choose the nearest Canon docs page and update it during implementation.'
		},
		{
			id: 'validation-scope',
			label: 'Validation Scope',
			status: plan.validationPlan.length ? 'ready' : 'missing',
			evidence: plan.validationPlan,
			requiredAction: 'Run and record the focused Canon, MCP, and docs validation commands.'
		},
		{
			id: 'compatibility-scope',
			label: 'Compatibility Scope',
			status: plan.compatibilityPlan.length ? 'ready' : 'missing',
			evidence: plan.compatibilityPlan,
			requiredAction: 'Name migration, rollback, or keep-local behavior before stable promotion.'
		}
	];
}

function deriveReadinessStatus(
	checks: CanonOverlayCandidatePromotionReadinessCheck[]
): CanonOverlayCandidatePromotionReadinessStatus {
	if (checks.some((check) => check.id === 'human-approval' && check.status === 'needs-input')) {
		return 'needs-approval';
	}
	if (checks.some((check) => check.status === 'missing' || check.status === 'review')) {
		return 'needs-targets';
	}
	return 'ready-for-implementation';
}

function findRelatedRegistryItems(
	plan: CanonOverlayCandidatePromotionPlan
): CanonOverlayCandidatePromotionReadinessRegistryMatch[] {
	return CANON_REGISTRY_MANIFEST.items
		.map((item) => {
			const score = scoreRegistryItemForPlan(item, plan);
			const modalityOverlap = item.modalities.filter((modality) =>
				plan.requestedModalities.includes(modality)
			);
			return {
				item,
				score,
				modalityOverlap
			};
		})
		.filter(({ item, score, modalityOverlap }) => score > 0 && (item.kind === plan.requestedKind || modalityOverlap.length > 0))
		.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
		.slice(0, 5)
		.map(({ item, score, modalityOverlap }) => ({
			id: item.id,
			name: item.name,
			kind: item.kind,
			maturity: item.maturity,
			modalities: item.modalities,
			docsPath: item.docsPath,
			score,
			reason:
				item.kind === plan.requestedKind
					? `Matches requested kind and overlaps ${modalityOverlap.length} requested modalities.`
					: `Overlaps ${modalityOverlap.length} requested modalities.`
		}));
}

function findCandidateExportPolicies(
	plan: CanonOverlayCandidatePromotionPlan
): CanonOverlayCandidatePromotionReadinessExportMatch[] {
	return CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES
		.map((rule) => ({
			rule,
			score: scoreExportRuleForPlan(rule, plan)
		}))
		.filter(({ rule, score }) => score > 0 && rule.registryPolicy !== 'classified-out')
		.sort((a, b) => b.score - a.score || a.rule.exportPath.localeCompare(b.rule.exportPath))
		.slice(0, 5)
		.map(({ rule, score }) => ({
			exportPath: rule.exportPath,
			classification: rule.classification,
			registryPolicy: rule.registryPolicy,
			score,
			rationale: rule.rationale,
			...(rule.exportName ? { exportName: rule.exportName } : {}),
			...(rule.registryItemIds ? { registryItemIds: rule.registryItemIds } : {})
		}));
}

function scoreRegistryItemForPlan(
	item: (typeof CANON_REGISTRY_MANIFEST.items)[number],
	plan: CanonOverlayCandidatePromotionPlan
) {
	const tokens = tokenizePlan(plan);
	const haystack = [
		item.id,
		item.name,
		item.kind,
		item.maturity,
		item.description,
		item.sourcePath,
		item.importPath ?? '',
		item.docsPath ?? '',
		...item.tags,
		...item.modalities,
		...(item.dependencies ?? []),
		item.contract.accessibility ?? '',
		item.contract.evidence ?? '',
		item.contract.motion ?? '',
		item.contract.extension ?? ''
	]
		.join(' ')
		.toLowerCase();

	let score = item.kind === plan.requestedKind ? 4 : 0;
	score += item.modalities.filter((modality) => plan.requestedModalities.includes(modality)).length;
	for (const token of tokens) {
		if (haystack.includes(token)) score += 1;
	}
	return score;
}

function scoreExportRuleForPlan(
	rule: (typeof CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES)[number],
	plan: CanonOverlayCandidatePromotionPlan
) {
	const tokens = tokenizePlan(plan);
	const haystack = [
		rule.exportPath,
		rule.exportName ?? '',
		rule.classification,
		rule.registryPolicy,
		...(rule.registryItemIds ?? []),
		rule.rationale
	]
		.join(' ')
		.toLowerCase();

	let score = rule.registryPolicy === 'candidate-review' ? 2 : 0;
	for (const token of tokens) {
		if (haystack.includes(token)) score += 1;
	}
	return score;
}

function tokenizePlan(plan: CanonOverlayCandidatePromotionPlan) {
	return [
		plan.title,
		plan.summary,
		plan.overlayId,
		plan.overlayName,
		plan.sourcePackage,
		plan.sourcePath ?? '',
		plan.requestedKind,
		...plan.requestedModalities
	]
		.join(' ')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length >= 4);
}

async function inspectCanonProjectOverlayIntegrity({
	rootDir,
	manifestFile,
	manifest
}: {
	rootDir: string;
	manifestFile: string;
	manifest: CanonProjectOverlayManifest;
}): Promise<CanonProjectOverlayIntegrityIssue[]> {
	const overlayRoot = dirname(manifestFile);
	const packageRoot = overlayRoot.endsWith('/canon-overlay') ? dirname(overlayRoot) : overlayRoot;
	const registryIds = new Set(CANON_REGISTRY_MANIFEST.items.map((item) => item.id));
	const issues: CanonProjectOverlayIntegrityIssue[] = [];

	if (manifest.sourcePath) {
		await addMissingPathIssue({
			issues,
			rootDir,
			baseDir: overlayRoot,
			context: 'manifest.sourcePath',
			path: manifest.sourcePath,
			kind: 'missing-source-path'
		});
	}

	for (const artifact of manifest.artifacts) {
		await addMissingPathIssue({
			issues,
			rootDir,
			baseDir: overlayRoot,
			context: `artifact.${artifact.kind}`,
			path: artifact.path,
			kind: 'missing-artifact-file'
		});
		for (const registryItemId of artifact.registryItemIds ?? []) {
			addUnknownRegistryIssue({
				issues,
				registryIds,
				context: `artifact.${artifact.kind}.registryItemIds`,
				registryItemId
			});
		}
	}

	for (const packet of manifest.extensionIntakes ?? []) {
		if (packet.sourcePath) {
			await addMissingPathIssue({
				issues,
				rootDir,
				baseDir: packageRoot,
				context: `intake.${packet.id}.sourcePath`,
				path: packet.sourcePath,
				kind: 'missing-source-path'
			});
		}
		for (const surface of packet.surfaces) {
			if (!surface.sourcePath) continue;
			await addMissingPathIssue({
				issues,
				rootDir,
				baseDir: packageRoot,
				context: `intake.${packet.id}.surface.${surface.surfaceId}.sourcePath`,
				path: surface.sourcePath,
				kind: 'missing-source-path'
			});
		}
		for (const registryItemId of packet.dependencies ?? []) {
			addUnknownRegistryIssue({
				issues,
				registryIds,
				context: `intake.${packet.id}.dependencies`,
				registryItemId
			});
		}
		if (packet.matchesRegistryItemId) {
			addUnknownRegistryIssue({
				issues,
				registryIds,
				context: `intake.${packet.id}.matchesRegistryItemId`,
				registryItemId: packet.matchesRegistryItemId
			});
		}
		if (packet.deprecatesRegistryItemId) {
			addUnknownRegistryIssue({
				issues,
				registryIds,
				context: `intake.${packet.id}.deprecatesRegistryItemId`,
				registryItemId: packet.deprecatesRegistryItemId
			});
		}
	}

	return issues;
}

async function addMissingPathIssue({
	issues,
	rootDir,
	baseDir,
	context,
	path,
	kind
}: {
	issues: CanonProjectOverlayIntegrityIssue[];
	rootDir: string;
	baseDir: string;
	context: string;
	path: string;
	kind: 'missing-artifact-file' | 'missing-source-path';
}) {
	const fullPath = resolve(baseDir, path);
	if (await pathExists(fullPath)) return;

	const normalizedPath = normalizeRelativePath(rootDir, fullPath);
	issues.push({
		kind,
		context,
		path: normalizedPath,
		message:
			kind === 'missing-artifact-file'
				? `${context} points to missing overlay artifact path ${normalizedPath}.`
				: `${context} points to missing source path ${normalizedPath}.`
	});
}

function addUnknownRegistryIssue({
	issues,
	registryIds,
	context,
	registryItemId
}: {
	issues: CanonProjectOverlayIntegrityIssue[];
	registryIds: Set<string>;
	context: string;
	registryItemId: string;
}) {
	if (registryIds.has(registryItemId)) return;
	issues.push({
		kind: 'unknown-registry-item',
		context,
		registryItemId,
		message: `${context} references unknown Canon registry item ${registryItemId}.`
	});
}

async function pathExists(path: string) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function walk(root: string, visitFile: (filePath: string) => Promise<void>): Promise<void> {
	let entries;
	try {
		entries = await readdir(root, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		const filePath = join(root, entry.name);
		if (entry.isDirectory()) {
			if (DEFAULT_IGNORED_DIRECTORIES.has(entry.name)) continue;
			await walk(filePath, visitFile);
			continue;
		}

		if (entry.isFile()) {
			await visitFile(filePath);
		}
	}
}

function normalizeSearchRoots(searchRoots = DEFAULT_SEARCH_ROOTS) {
	return searchRoots.map((root) => root.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''));
}

function normalizeRelativePath(rootDir: string, filePath: string) {
	return relative(rootDir, isAbsolute(filePath) ? filePath : resolve(filePath)).replace(/\\/g, '/');
}

function isProjectTemplateManifest(rootDir: string, filePath: string) {
	return (
		normalizeRelativePath(rootDir, filePath) ===
		'packages/canon/src/lib/overlays/project-template/manifest.ts'
	);
}

function isCanonProjectOverlayManifest(value: unknown): value is CanonProjectOverlayManifest {
	if (!value || typeof value !== 'object') return false;
	const manifest = value as Partial<CanonProjectOverlayManifest>;
	return (
		typeof manifest.id === 'string' &&
		manifest.id.startsWith('overlay.') &&
		typeof manifest.name === 'string' &&
		typeof manifest.owner === 'string' &&
		typeof manifest.sourcePackage === 'string' &&
		Array.isArray(manifest.targetModalities) &&
		manifest.targetModalities.every(isCanonRegistryModality) &&
		Array.isArray(manifest.artifacts)
	);
}

function isCanonRegistryModality(value: unknown): value is CanonRegistryModality {
	return (
		value === 'web' ||
		value === 'chat' ||
		value === 'app' ||
		value === 'voice' ||
		value === 'glasses'
	);
}
