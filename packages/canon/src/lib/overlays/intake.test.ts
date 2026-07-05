import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	buildCanonOverlayCandidateQueue,
	buildCanonOverlayCandidatePromotionPlans,
	buildCanonOverlayCandidatePromotionReadinessReports,
	buildCanonOverlayCandidateReviewPackets,
	buildCanonOverlayIntakeInventory,
	findCanonOverlayCandidatePromotionPlan,
	findCanonOverlayCandidatePromotionReadinessReport,
	findCanonOverlayCandidateReviewPacket,
	findCanonProjectOverlayManifestFiles,
	renderCanonOverlayCandidateQueue,
	renderCanonOverlayCandidatePromotionPlan,
	renderCanonOverlayCandidatePromotionPlans,
	renderCanonOverlayCandidatePromotionReadinessReport,
	renderCanonOverlayCandidatePromotionReadinessReports,
	renderCanonOverlayCandidateReviewPacket,
	renderCanonOverlayCandidateReviewPackets,
	renderCanonOverlayIntakeInventory
} from './intake.js';

const tempRoots: string[] = [];

async function createTempRoot() {
	const root = await mkdtemp(join(tmpdir(), 'canon-overlay-intake-'));
	tempRoots.push(root);
	return root;
}

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Canon overlay intake inventory', () => {
	it('discovers project overlay manifests without treating the Canon template as project intake', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-a/canon-overlay/manifest.ts',
			readyManifest('overlay.client-a', 'Client A Overlay', '@create-something/client-a')
		);
		await writeOverlayArtifactSet(root, 'packages/client-a/canon-overlay');
		await writeOverlayManifest(
			root,
			'packages/canon/src/lib/overlays/project-template/manifest.ts',
			readyManifest('overlay.project-template', 'Canon Project Overlay Template', '@create-something/canon')
		);

		const files = await findCanonProjectOverlayManifestFiles({ rootDir: root });

		expect(files.map((file) => file.replace(root, ''))).toEqual([
			'/packages/client-a/canon-overlay/manifest.ts'
		]);
	});

	it('builds a reviewable multi-project intake inventory', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-a/canon-overlay/manifest.ts',
			readyManifest('overlay.client-a', 'Client A Overlay', '@create-something/client-a')
		);
		await writeOverlayArtifactSet(root, 'packages/client-a/canon-overlay');
		await writeOverlayManifest(
			root,
			'apps/client-b/canon-overlay/manifest.ts',
			needsArtifactsManifest('overlay.client-b', 'Client B Overlay', '@create-something/client-b')
		);

		const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });

		expect(inventory.id).toBe('canon-overlay-intake-inventory');
		expect(inventory.entries.map((entry) => entry.manifest.id)).toEqual([
			'overlay.client-b',
			'overlay.client-a'
		]);
		expect(inventory.summary).toMatchObject({
			total: 2,
			ready: 1,
			needsArtifacts: 1,
			candidateIntakes: 1,
			projectLocalIntakes: 1
		});
		expect(inventory.entries[0]?.review.missingArtifacts).toEqual([
			'tokens',
			'templates',
			'copy-rules',
			'surface-policy',
			'registry'
		]);

		const rendered = renderCanonOverlayIntakeInventory(inventory);
		expect(rendered).toContain('Client A Overlay');
		expect(rendered).toContain('Intake overlay.client-a.surface-brief: promote-candidate');
		expect(rendered).toContain('Client B Overlay');
	});

	it('flags stale source paths and unknown registry IDs before an overlay can be ready', async () => {
		const root = await createTempRoot();
		const manifest = readyManifest(
			'overlay.client-c',
			'Client C Overlay',
			'@create-something/client-c'
		);
		manifest.artifacts[0]?.registryItemIds?.push('component.not-real');
		manifest.extensionIntakes[0] = {
			...manifest.extensionIntakes[0],
			sourcePath: 'src/routes/missing/+page.svelte',
			dependencies: ['template.canon-extension-intake', 'policy.not-real'],
			surfaces: [
				{
					surfaceId: 'client-c.web',
					name: 'Client C Web',
					modality: 'web',
					sourcePath: 'src/routes/exists/+page.svelte'
				},
				{
					surfaceId: 'client-c.chat',
					name: 'Client C Chat',
					modality: 'chat',
					sourcePath: 'src/lib/missing-chat.ts'
				}
			]
		};

		await writeOverlayManifest(root, 'packages/client-c/canon-overlay/manifest.ts', manifest);
		await writeOverlayArtifactSet(root, 'packages/client-c/canon-overlay');
		await writeFileAt(root, 'packages/client-c/src/routes/exists/+page.svelte', '<main />\n');

		const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });
		const review = inventory.entries[0]?.review;

		expect(review?.status).toBe('needs-review');
		expect(review?.integrityIssues.map((issue) => issue.kind)).toEqual([
			'unknown-registry-item',
			'missing-source-path',
			'missing-source-path',
			'unknown-registry-item'
		]);
		expect(review?.integrityIssues.map((issue) => issue.message).join(' ')).toContain(
			'src/routes/missing/+page.svelte'
		);
		expect(review?.integrityIssues.map((issue) => issue.message).join(' ')).toContain(
			'component.not-real'
		);
		expect(inventory.summary).toMatchObject({
			ready: 0,
			needsReview: 1
		});
	});

	it('flags missing declared artifact files as artifact gaps', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-d/canon-overlay/manifest.ts',
			readyManifest('overlay.client-d', 'Client D Overlay', '@create-something/client-d')
		);

		const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });
		const review = inventory.entries[0]?.review;

		expect(review?.status).toBe('needs-artifacts');
		expect(review?.missingArtifacts).toEqual([]);
		expect(review?.integrityIssues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'missing-artifact-file',
					path: 'packages/client-d/canon-overlay/theme.css'
				})
			])
		);
	});

	it('builds a Canon candidate queue from ready repeated-surface intakes only', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-a/canon-overlay/manifest.ts',
			readyManifest('overlay.client-a', 'Client A Overlay', '@create-something/client-a')
		);
		await writeOverlayArtifactSet(root, 'packages/client-a/canon-overlay');
		await writeOverlayManifest(
			root,
			'packages/client-b/canon-overlay/manifest.ts',
			needsArtifactsManifest('overlay.client-b', 'Client B Overlay', '@create-something/client-b')
		);

		const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });
		const queue = buildCanonOverlayCandidateQueue(inventory);

		expect(queue.id).toBe('canon-overlay-candidate-queue');
		expect(queue.summary).toMatchObject({
			total: 1,
			overlays: 1,
			byRequestedKind: [{ kind: 'template', count: 1 }]
		});
		expect(queue.summary.byModality).toEqual([
			{ modality: 'chat', count: 1 },
			{ modality: 'web', count: 1 }
		]);
		expect(queue.entries[0]).toMatchObject({
			overlayId: 'overlay.client-a',
			intakeId: 'overlay.client-a.surface-brief',
			title: 'Client A Overlay surface brief',
			requestedKind: 'template',
			reviewUri: 'canon://overlays/intake/overlay.client-a',
			candidateUri: 'canon://overlays/candidates/overlay.client-a.surface-brief',
			handoffUri: 'canon://overlays/candidates/overlay.client-a.surface-brief/handoff',
			dependencies: ['template.canon-extension-intake']
		});
		expect(queue.entries[0]?.requiredEvidence.join(' ')).toContain('At least two surface proofs');
		expect(queue.entries[0]?.stopBeforeStable.join(' ')).toContain('Do not mark stable');
		expect(queue.agentContract.stopBefore.join(' ')).toContain('automatically promoting');

		const rendered = renderCanonOverlayCandidateQueue(queue);
		expect(rendered).toContain('Canon Overlay Candidate Queue');
		expect(rendered).toContain('Client A Overlay surface brief');
		expect(rendered).toContain('canon://overlays/intake/overlay.client-a');
	});

	it('builds review handoff packets from the Canon candidate queue', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-a/canon-overlay/manifest.ts',
			readyManifest('overlay.client-a', 'Client A Overlay', '@create-something/client-a')
		);
		await writeOverlayArtifactSet(root, 'packages/client-a/canon-overlay');

		const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });
		const queue = buildCanonOverlayCandidateQueue(inventory);
		const packets = buildCanonOverlayCandidateReviewPackets(queue);
		const packet = packets.entries[0];

		expect(packets.id).toBe('canon-overlay-candidate-review-packets');
		expect(packets.summary).toMatchObject({
			total: 1,
			overlays: 1,
			byRequestedKind: [{ kind: 'template', count: 1 }]
		});
		expect(packet).toMatchObject({
			id: 'canon-overlay-candidate-review:overlay.client-a.surface-brief',
			candidateId: 'overlay.client-a:overlay.client-a.surface-brief',
			overlayId: 'overlay.client-a',
			intakeId: 'overlay.client-a.surface-brief',
			handoffUri: 'canon://overlays/candidates/overlay.client-a.surface-brief/handoff',
			candidateUri: 'canon://overlays/candidates/overlay.client-a.surface-brief',
			reviewUri: 'canon://overlays/intake/overlay.client-a'
		});
		expect(packet?.promotionChecklist.join(' ')).toContain('human maintainer approved');
		expect(packet?.approvalBoundary.join(' ')).toContain('does not create Linear issues');
		expect(packet?.agentContract.stopBefore.join(' ')).toContain('automatically opening Linear work');
		expect(findCanonOverlayCandidateReviewPacket(packets, packet!.intakeId)?.id).toBe(packet?.id);
		expect(findCanonOverlayCandidateReviewPacket(packets, packet!.id)?.intakeId).toBe(
			packet?.intakeId
		);
		expect(findCanonOverlayCandidateReviewPacket(packets, packet!.candidateId)?.intakeId).toBe(
			packet?.intakeId
		);
		expect(findCanonOverlayCandidateReviewPacket(packets, 'overlay.missing')).toBeUndefined();

		const packetRendered = renderCanonOverlayCandidateReviewPacket(packet!);
		expect(packetRendered).toContain('Approval Boundary');
		expect(packetRendered).toContain('Open promotion work only after explicit human approval');
		expect(packetRendered).toContain('Do not mark stable');

		const collectionRendered = renderCanonOverlayCandidateReviewPackets(packets);
		expect(collectionRendered).toContain('Canon Overlay Candidate Review Packets');
		expect(collectionRendered).toContain(
			'canon://overlays/candidates/overlay.client-a.surface-brief/handoff'
		);
	});

	it('builds approval-gated promotion plans from candidate review packets', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-a/canon-overlay/manifest.ts',
			readyManifest('overlay.client-a', 'Client A Overlay', '@create-something/client-a')
		);
		await writeOverlayArtifactSet(root, 'packages/client-a/canon-overlay');

		const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });
		const queue = buildCanonOverlayCandidateQueue(inventory);
		const packets = buildCanonOverlayCandidateReviewPackets(queue);
		const plans = buildCanonOverlayCandidatePromotionPlans(packets);
		const plan = plans.entries[0];

		expect(plans.id).toBe('canon-overlay-candidate-promotion-plans');
		expect(plans.summary).toMatchObject({
			total: 1,
			overlays: 1,
			byRequestedKind: [{ kind: 'template', count: 1 }]
		});
		expect(plan).toMatchObject({
			id: 'canon-overlay-candidate-promotion-plan:overlay.client-a.surface-brief',
			packetId: 'canon-overlay-candidate-review:overlay.client-a.surface-brief',
			candidateId: 'overlay.client-a:overlay.client-a.surface-brief',
			intakeId: 'overlay.client-a.surface-brief',
			planUri: 'canon://overlays/candidates/overlay.client-a.surface-brief/promotion-plan',
			handoffUri: 'canon://overlays/candidates/overlay.client-a.surface-brief/handoff'
		});
		expect(plan?.preconditions.join(' ')).toContain('Human maintainer approval');
		expect(plan?.requiredChanges.join(' ')).toContain('registry metadata');
		expect(plan?.validationPlan.join(' ')).toContain('MCP parity');
		expect(plan?.stopConditions.join(' ')).toContain('Stop if human approval is missing');
		expect(plan?.approvalBoundary.join(' ')).toContain('does not approve implementation');

		expect(findCanonOverlayCandidatePromotionPlan(plans, plan!.intakeId)?.id).toBe(plan?.id);
		expect(findCanonOverlayCandidatePromotionPlan(plans, plan!.id)?.intakeId).toBe(
			plan?.intakeId
		);
		expect(findCanonOverlayCandidatePromotionPlan(plans, plan!.candidateId)?.intakeId).toBe(
			plan?.intakeId
		);
		expect(findCanonOverlayCandidatePromotionPlan(plans, plan!.packetId)?.intakeId).toBe(
			plan?.intakeId
		);
		expect(findCanonOverlayCandidatePromotionPlan(plans, 'overlay.missing')).toBeUndefined();

		const rendered = renderCanonOverlayCandidatePromotionPlan(plan!);
		expect(rendered).toContain('Canon-owned export path');
		expect(rendered).toContain('Stop if human approval is missing');
		expect(rendered).toContain('Stable promotion still requires Canon-owned export path');

		const collectionRendered = renderCanonOverlayCandidatePromotionPlans(plans);
		expect(collectionRendered).toContain('Canon Overlay Candidate Promotion Plans');
		expect(collectionRendered).toContain(
			'canon://overlays/candidates/overlay.client-a.surface-brief/promotion-plan'
		);
	});

	it('builds read-only readiness reports from candidate promotion plans', async () => {
		const root = await createTempRoot();
		await writeOverlayManifest(
			root,
			'packages/client-a/canon-overlay/manifest.ts',
			readyManifest('overlay.client-a', 'Client A Overlay', '@create-something/client-a')
		);
		await writeOverlayArtifactSet(root, 'packages/client-a/canon-overlay');

		const inventory = await buildCanonOverlayIntakeInventory({ rootDir: root });
		const queue = buildCanonOverlayCandidateQueue(inventory);
		const packets = buildCanonOverlayCandidateReviewPackets(queue);
		const plans = buildCanonOverlayCandidatePromotionPlans(packets);
		const reports = buildCanonOverlayCandidatePromotionReadinessReports(plans);
		const report = reports.entries[0];

		expect(reports.id).toBe('canon-overlay-candidate-promotion-readiness-reports');
		expect(reports.summary).toMatchObject({
			total: 1,
			needsApproval: 1,
			needsTargets: 0,
			readyForImplementation: 0
		});
		expect(report).toMatchObject({
			id: 'canon-overlay-candidate-promotion-readiness:overlay.client-a.surface-brief',
			planId: 'canon-overlay-candidate-promotion-plan:overlay.client-a.surface-brief',
			candidateId: 'overlay.client-a:overlay.client-a.surface-brief',
			intakeId: 'overlay.client-a.surface-brief',
			status: 'needs-approval',
			readinessUri: 'canon://overlays/candidates/overlay.client-a.surface-brief/readiness'
		});
		expect(report?.checks.map((check) => check.id)).toEqual([
			'human-approval',
			'registry-target',
			'export-target',
			'docs-target',
			'validation-scope',
			'compatibility-scope'
		]);
		expect(report?.checks.find((check) => check.id === 'human-approval')?.status).toBe(
			'needs-input'
		);
		expect(report?.relatedRegistryItems.length).toBeGreaterThan(0);
		expect(report?.candidateExportPolicies.length).toBeGreaterThan(0);
		expect(report?.approvalBoundary.join(' ')).toContain('does not approve implementation');

		expect(findCanonOverlayCandidatePromotionReadinessReport(reports, report!.intakeId)?.id).toBe(
			report?.id
		);
		expect(findCanonOverlayCandidatePromotionReadinessReport(reports, report!.id)?.intakeId).toBe(
			report?.intakeId
		);
		expect(
			findCanonOverlayCandidatePromotionReadinessReport(reports, report!.candidateId)?.intakeId
		).toBe(report?.intakeId);
		expect(findCanonOverlayCandidatePromotionReadinessReport(reports, report!.planId)?.intakeId).toBe(
			report?.intakeId
		);
		expect(
			findCanonOverlayCandidatePromotionReadinessReport(reports, 'overlay.missing')
		).toBeUndefined();

		const rendered = renderCanonOverlayCandidatePromotionReadinessReport(report!);
		expect(rendered).toContain('Human Approval');
		expect(rendered).toContain('Related Registry Items');
		expect(rendered).toContain('Candidate Export Policies');
		expect(rendered).toContain('Stop before: automatically creating Linear issues');

		const collectionRendered = renderCanonOverlayCandidatePromotionReadinessReports(reports);
		expect(collectionRendered).toContain('Canon Overlay Candidate Promotion Readiness Reports');
		expect(collectionRendered).toContain(
			'canon://overlays/candidates/overlay.client-a.surface-brief/readiness'
		);
	});
});

async function writeOverlayManifest(root: string, relativePath: string, manifest: unknown) {
	await writeFileAt(
		root,
		relativePath,
		`export const CANON_PROJECT_OVERLAY_MANIFEST = ${JSON.stringify(manifest, null, 2)};\n`,
	);
}

async function writeOverlayArtifactSet(root: string, overlayRoot: string) {
	await writeFileAt(root, `${overlayRoot}/theme.css`, ':root {}\n');
	await writeFileAt(root, `${overlayRoot}/tokens.json`, '{}\n');
	await mkdir(join(root, overlayRoot, 'templates'), { recursive: true });
	await writeFileAt(root, `${overlayRoot}/templates/surface-brief.md`, '# Surface Brief\n');
	await writeFileAt(root, `${overlayRoot}/copy-rules.md`, '# Copy Rules\n');
	await writeFileAt(root, `${overlayRoot}/surface-policy.md`, '# Surface Policy\n');
	await writeFileAt(root, `${overlayRoot}/registry.json`, '{}\n');
}

async function writeFileAt(root: string, relativePath: string, content: string) {
	const filePath = join(root, relativePath);
	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, content, 'utf-8');
}

function readyManifest(id: string, name: string, sourcePackage: string): {
	id: string;
	name: string;
	owner: string;
	sourcePackage: string;
	sourcePath: string;
	targetModalities: string[];
	tags: string[];
	artifacts: Array<{ kind: string; path: string; registryItemIds?: string[] }>;
	extensionIntakes: Array<Record<string, unknown>>;
} {
	return {
		id,
		name,
		owner: 'client-team',
		sourcePackage,
		sourcePath: 'manifest.ts',
		targetModalities: ['web', 'chat'],
		tags: ['canon', 'overlay'],
		artifacts: [
			{ kind: 'theme', path: 'theme.css', registryItemIds: ['token.canon-core'] },
			{ kind: 'tokens', path: 'tokens.json', registryItemIds: ['token.canon-core'] },
			{ kind: 'templates', path: 'templates', registryItemIds: ['template.canon-extension-intake'] },
			{ kind: 'copy-rules', path: 'copy-rules.md', registryItemIds: ['policy.signal-decision-proof'] },
			{
				kind: 'surface-policy',
				path: 'surface-policy.md',
				registryItemIds: ['policy.signal-decision-proof']
			},
			{ kind: 'registry', path: 'registry.json', registryItemIds: ['component.clear-proof-strip'] }
		],
		extensionIntakes: [
			{
				id: `${id}.surface-brief`,
				title: `${name} surface brief`,
				summary: 'Repeated proof panel pattern across client surfaces.',
				requestedKind: 'template',
				requestedModalities: ['web', 'chat'],
				owner: 'client-team',
				sourcePackage,
				tags: ['proof'],
				dependencies: ['template.canon-extension-intake'],
				surfaces: [
					{ surfaceId: `${id}.web`, name: `${name} Web`, modality: 'web' },
					{ surfaceId: `${id}.chat`, name: `${name} Chat`, modality: 'chat' }
				]
			}
		]
	};
}

function needsArtifactsManifest(id: string, name: string, sourcePackage: string) {
	return {
		id,
		name,
		owner: 'client-team',
		sourcePackage,
		targetModalities: ['app'],
		artifacts: [{ kind: 'theme', path: 'theme.css' }],
		extensionIntakes: [
			{
				id: `${id}.local-card`,
				title: `${name} local card`,
				summary: 'One app-only pattern that needs more evidence.',
				requestedKind: 'component',
				requestedModalities: ['app'],
				owner: 'client-team',
				sourcePackage,
				tags: ['local'],
				surfaces: [{ surfaceId: `${id}.app`, name: `${name} App`, modality: 'app' }]
			}
		]
	};
}
