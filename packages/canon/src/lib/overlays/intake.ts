import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { CANON_REGISTRY_MANIFEST, reviewCanonProjectOverlay } from '../registry/index.js';
import type {
	CanonOverlayCandidateQueue,
	CanonOverlayCandidateQueueEntry,
	CanonOverlayCandidatePromotionPlan,
	CanonOverlayCandidatePromotionPlanCollection,
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
