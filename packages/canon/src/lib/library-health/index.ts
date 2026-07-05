import { resolve } from 'node:path';

import {
	buildCanonCodificationAuditReport,
	type CanonCodificationAuditReport
} from '../codification/index.js';
import {
	buildCanonModalityReadinessReport,
	type CanonModalityReadinessReport
} from '../modality-readiness/index.js';
import { buildCanonOverlayIntakeInventory } from '../overlays/intake.js';
import {
	CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES,
	CANON_REGISTRY_MANIFEST,
	type CanonPublicExportClassification,
	type CanonPublicExportClassificationRule,
	type CanonPublicExportRegistryPolicy
} from '../registry/index.js';
import type {
	CanonProjectOverlayInventory,
	CanonRegistryKind,
	CanonRegistryMaturity
} from '../registry/schema.js';

export type CanonLibraryHealthStatus = 'ready' | 'needs-attention';

export type CanonLibraryHealthCandidatePriority = {
	exportPath: string;
	exportName?: string;
	classification: CanonPublicExportClassification;
	priority: number;
	rationale: string;
	recommendedNextEvidence: string[];
};

export type CanonLibraryHealthReport = {
	schemaVersion: 1;
	id: 'canon-library-health-report';
	sourceOfTruth: '@create-something/canon/library-health';
	rootDir: string;
	status: CanonLibraryHealthStatus;
	description: string;
	registry: {
		totalItems: number;
		byKind: Array<{ kind: CanonRegistryKind; count: number }>;
		byMaturity: Array<{ maturity: CanonRegistryMaturity; count: number }>;
		stableItems: number;
		candidateItems: number;
		experimentalItems: number;
	};
	publicExports: {
		totalPolicies: number;
		byPolicy: Array<{ policy: CanonPublicExportRegistryPolicy; count: number }>;
		byClassification: Array<{ classification: CanonPublicExportClassification; count: number }>;
		registryCovered: number;
		candidateReview: number;
		classifiedOut: number;
	};
	candidateReview: {
		total: number;
		byClassification: Array<{ classification: CanonPublicExportClassification; count: number }>;
		priorities: CanonLibraryHealthCandidatePriority[];
	};
	overlays: CanonProjectOverlayInventory['summary'];
	modalities: CanonModalityReadinessReport['summary'];
	codification: CanonCodificationAuditReport['summary'];
	blockers: string[];
	nextActions: string[];
	agentContract: {
		purpose: 'canon-library-health';
		primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
		useFor: string[];
		stopBefore: string[];
	};
};

export function buildCanonLibraryHealthReport(
	rootDir: string
): Promise<CanonLibraryHealthReport> {
	return buildCanonLibraryHealthReportInternal(rootDir);
}

async function buildCanonLibraryHealthReportInternal(
	rootDir: string
): Promise<CanonLibraryHealthReport> {
	const root = resolve(rootDir);
	const overlayInventory = await buildCanonOverlayIntakeInventory({ rootDir: root });
	const modalityReadiness = buildCanonModalityReadinessReport({
		registryManifest: CANON_REGISTRY_MANIFEST,
		overlayInventory
	});
	const codification = await buildCanonCodificationAuditReport(root);
	const publicExportRules = CANON_PUBLIC_EXPORT_CLASSIFICATION_RULES;
	const candidateRules = publicExportRules.filter(
		(rule) => rule.registryPolicy === 'candidate-review'
	);
	const blockers = getHealthBlockers({ overlayInventory, modalityReadiness, codification });

	return {
		schemaVersion: 1,
		id: 'canon-library-health-report',
		sourceOfTruth: '@create-something/canon/library-health',
		rootDir: root,
		status: blockers.length > 0 ? 'needs-attention' : 'ready',
		description:
			'Agent-readable Canon library health report combining registry maturity, public export policy, overlay readiness, modality readiness, and repo-wide UI codification.',
		registry: {
			totalItems: CANON_REGISTRY_MANIFEST.items.length,
			byKind: countBy(CANON_REGISTRY_MANIFEST.items, (item) => item.kind, 'kind'),
			byMaturity: countBy(CANON_REGISTRY_MANIFEST.items, (item) => item.maturity, 'maturity'),
			stableItems: CANON_REGISTRY_MANIFEST.items.filter((item) => item.maturity === 'stable')
				.length,
			candidateItems: CANON_REGISTRY_MANIFEST.items.filter((item) => item.maturity === 'candidate')
				.length,
			experimentalItems: CANON_REGISTRY_MANIFEST.items.filter(
				(item) => item.maturity === 'experimental'
			).length
		},
		publicExports: {
			totalPolicies: publicExportRules.length,
			byPolicy: countBy(publicExportRules, (rule) => rule.registryPolicy, 'policy'),
			byClassification: countBy(
				publicExportRules,
				(rule) => rule.classification,
				'classification'
			),
			registryCovered: publicExportRules.filter((rule) => rule.registryPolicy === 'registry-covered')
				.length,
			candidateReview: candidateRules.length,
			classifiedOut: publicExportRules.filter((rule) => rule.registryPolicy === 'classified-out')
				.length
		},
		candidateReview: {
			total: candidateRules.length,
			byClassification: countBy(candidateRules, (rule) => rule.classification, 'classification'),
			priorities: candidateRules.map(toCandidatePriority).sort(compareCandidatePriorities)
		},
		overlays: overlayInventory.summary,
		modalities: modalityReadiness.summary,
		codification: codification.summary,
		blockers,
		nextActions: getNextActions({ candidateRules, blockers }),
		agentContract: {
			purpose: 'canon-library-health',
			primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
			useFor: [
				'auditing whether Canon is safe to extend before adding or promoting UI surfaces',
				'prioritizing candidate-review public exports for stable registry promotion',
				'checking that overlays, modalities, and repo UI codification stay aligned',
				'feeding Canon health evidence into Linear, PRs, and MCP resources'
			],
			stopBefore: [
				'treating candidate-review items as stable Canon without docs, tests, compatibility, and registry routing',
				'promoting project-local overlay needs without repeated-surface evidence',
				'claiming web, chat, app, voice, or glasses readiness without overlay evidence',
				'adding Node-backed health or codification APIs to the root browser-facing Canon barrel'
			]
		}
	};
}

export function assertCanonLibraryHealthReport(report: CanonLibraryHealthReport) {
	if (report.blockers.length === 0) return;

	throw new Error(
		[
			'Canon library health failed: blockers need attention before Canon can be called healthy.',
			...report.blockers.map((blocker) => `- ${blocker}`)
		].join('\n')
	);
}

export function renderCanonLibraryHealthReport(
	report: CanonLibraryHealthReport,
	options: { verbose?: boolean; priorityLimit?: number } = {}
) {
	const priorityLimit = options.priorityLimit ?? (options.verbose ? report.candidateReview.total : 12);
	const priorities = report.candidateReview.priorities.slice(0, priorityLimit);
	const lines = [
		'# Canon Library Health',
		'',
		report.description,
		'',
		`Root: ${report.rootDir}`,
		`Status: ${report.status}`,
		'',
		'## Summary',
		'',
		`- Registry items: ${report.registry.totalItems}`,
		`- Stable registry items: ${report.registry.stableItems}`,
		`- Candidate registry items: ${report.registry.candidateItems}`,
		`- Public export policies: ${report.publicExports.totalPolicies}`,
		`- Registry-covered export policies: ${report.publicExports.registryCovered}`,
		`- Candidate-review export policies: ${report.publicExports.candidateReview}`,
		`- Classified-out export policies: ${report.publicExports.classifiedOut}`,
		`- Ready overlays: ${report.overlays.ready}/${report.overlays.total}`,
		`- Implemented modalities: ${report.modalities.implemented}/${report.modalities.totalModalities}`,
		`- UI files needing Canon decision: ${report.codification.needsCanonDecision}`,
		'',
		'## Candidate-review Backlog',
		'',
		`Total: ${report.candidateReview.total}`,
		''
	];

	for (const entry of report.candidateReview.byClassification) {
		lines.push(`- ${entry.classification}: ${entry.count}`);
	}

	lines.push('', '## Promotion Priorities', '');

	for (const priority of priorities) {
		const label = `${priority.exportPath}${priority.exportName ? `#${priority.exportName}` : ''}`;
		lines.push(`- ${label}: ${priority.classification}, priority ${priority.priority}`);
		if (options.verbose) {
			lines.push(`  - ${priority.rationale}`);
			for (const evidence of priority.recommendedNextEvidence) {
				lines.push(`  - ${evidence}`);
			}
		}
	}

	if (report.blockers.length) {
		lines.push('', '## Blockers', '');
		for (const blocker of report.blockers) lines.push(`- ${blocker}`);
	}

	lines.push('', '## Next Actions', '');
	for (const action of report.nextActions) lines.push(`- ${action}`);

	return lines.join('\n').trimEnd();
}

function getHealthBlockers(options: {
	overlayInventory: CanonProjectOverlayInventory;
	modalityReadiness: CanonModalityReadinessReport;
	codification: CanonCodificationAuditReport;
}) {
	const blockers: string[] = [];

	if (options.overlayInventory.summary.ready !== options.overlayInventory.summary.total) {
		blockers.push(
			`${options.overlayInventory.summary.total - options.overlayInventory.summary.ready} overlay manifests are not ready.`
		);
	}
	if (options.modalityReadiness.summary.gaps > 0) {
		blockers.push(`${options.modalityReadiness.summary.gaps} modalities have readiness gaps.`);
	}
	if (options.codification.summary.needsCanonDecision > 0) {
		blockers.push(
			`${options.codification.summary.needsCanonDecision} UI files need an explicit Canon decision.`
		);
	}

	return blockers;
}

function getNextActions(options: {
	candidateRules: CanonPublicExportClassificationRule[];
	blockers: string[];
}) {
	if (options.blockers.length > 0) {
		return [
			'Clear health blockers before promoting additional candidate-review exports.',
			'Run the overlay, modality, and codification reports with verbose output to locate the failing surface.'
		];
	}

	if (options.candidateRules.length === 0) {
		return ['Keep adding new public exports only with explicit registry coverage or classification.'];
	}

	return [
		'Promote the highest-priority stable-foundation candidates first, starting with docs, tests, and registry item coverage.',
		'Use overlay candidate evidence before moving project-local patterns into Canon stable.',
		'Keep Node-backed health and codification APIs on explicit subpath exports only.'
	];
}

function toCandidatePriority(
	rule: CanonPublicExportClassificationRule
): CanonLibraryHealthCandidatePriority {
	return {
		exportPath: rule.exportPath,
		exportName: rule.exportName,
		classification: rule.classification,
		priority: priorityForClassification(rule.classification),
		rationale: rule.rationale,
		recommendedNextEvidence: recommendedEvidenceForClassification(rule.classification)
	};
}

function compareCandidatePriorities(
	left: CanonLibraryHealthCandidatePriority,
	right: CanonLibraryHealthCandidatePriority
) {
	return (
		right.priority - left.priority ||
		formatExportLabel(left).localeCompare(formatExportLabel(right))
	);
}

function priorityForClassification(classification: CanonPublicExportClassification) {
	switch (classification) {
		case 'stable-foundation-candidate':
			return 100;
		case 'composition-pattern':
			return 85;
		case 'content-utility':
			return 75;
		case 'platform-surface':
			return 70;
		case 'domain-specific':
			return 60;
		case 'brand-surface':
			return 55;
		case 'governance-contract':
		case 'headless-contract':
		case 'registry-artifact':
		case 'token-artifact':
			return 50;
		case 'analytics-surface':
		case 'auth-surface':
		case 'supporting-api':
			return 35;
		case 'decorative-effect':
			return 25;
		case 'experiment':
		case 'docs-only':
		case 'style-artifact':
			return 10;
	}
}

function recommendedEvidenceForClassification(classification: CanonPublicExportClassification) {
	switch (classification) {
		case 'stable-foundation-candidate':
			return [
				'Add or confirm stable registry item coverage.',
				'Add docs and compatibility notes for web, app, chat, voice, and glasses as applicable.',
				'Cover source and public export behavior with focused tests.'
			];
		case 'composition-pattern':
		case 'content-utility':
		case 'platform-surface':
			return [
				'Name the repeated surfaces or overlays that use the pattern.',
				'Add extension and evidence contracts before stable promotion.'
			];
		case 'domain-specific':
		case 'brand-surface':
			return ['Confirm property ownership and prevent accidental foundation promotion.'];
		default:
			return ['Keep the classification explicit unless repeated-surface evidence changes the policy.'];
	}
}

function countBy<Item, Key extends string, Label extends string>(
	items: Item[],
	getKey: (item: Item) => Key,
	label: Label
): Array<Record<Label, Key> & { count: number }> {
	const counts = new Map<Key, number>();

	for (const item of items) {
		const key = getKey(item);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, count]) => ({ [label]: key, count }) as Record<Label, Key> & { count: number });
}

function formatExportLabel(priority: CanonLibraryHealthCandidatePriority) {
	return `${priority.exportPath}${priority.exportName ? `#${priority.exportName}` : ''}`;
}
