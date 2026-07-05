import {
	CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS,
	reviewCanonProjectOverlay
} from '../registry/index.js';
import type { CanonOverlayCatalog, CanonOverlayModalityContract } from '../registry/schema.js';
import { CANON_PROJECT_OVERLAY_TEMPLATE_FILES } from './project-template/files.js';
import { CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST } from './project-template/manifest.js';

export { CANON_PROJECT_OVERLAY_TEMPLATE_FILES } from './project-template/files.js';
export {
	CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST,
	CANON_PROJECT_OVERLAY_TEMPLATE_ROOT
} from './project-template/manifest.js';

export const CANON_OVERLAY_MODALITY_CONTRACTS: CanonOverlayModalityContract[] = [
	{
		modality: 'web',
		useFor: 'Routed pages, marketing surfaces, dashboards, and public workflow proofs.',
		overlayOwns: ['local copy', 'surface-specific templates', 'integration receipts'],
		canonOwns: ['tokens', 'layout primitives', 'accessibility contract', 'registry routing']
	},
	{
		modality: 'chat',
		useFor: 'Agent handoffs, review summaries, intake flows, and compact decision/proof exchanges.',
		overlayOwns: ['conversation copy', 'tool receipts', 'handoff templates'],
		canonOwns: ['decision/proof semantics', 'extension intake routing', 'artifact metadata']
	},
	{
		modality: 'app',
		useFor: 'Authenticated product flows, operational consoles, and repeated task surfaces.',
		overlayOwns: ['workflow policy', 'app-specific states', 'domain data bindings'],
		canonOwns: ['components', 'state display patterns', 'token and motion boundaries']
	},
	{
		modality: 'voice',
		useFor: 'Spoken status, escalation, confirmation, and operator briefing flows.',
		overlayOwns: ['spoken terminology', 'confirmation phrases', 'escalation scripts'],
		canonOwns: ['decision/proof structure', 'state hierarchy', 'artifact references']
	},
	{
		modality: 'glasses',
		useFor: 'Thin, glanceable workflow overlays with state, owner, receipt, and next action.',
		overlayOwns: ['context labels', 'local task sequence', 'device-specific display policy'],
		canonOwns: ['compact proof/state pattern', 'minimum readable metadata', 'routing template']
	}
];

export const CANON_OVERLAY_CATALOG: CanonOverlayCatalog = {
	schemaVersion: 1,
	id: 'canon-overlay-catalog',
	sourceOfTruth: '@create-something/canon/overlays',
	description:
		'Machine-readable Canon overlay contract for extending Canon across web, chat, app, voice, and glasses without forking primitives.',
	requiredArtifacts: CANON_PROJECT_OVERLAY_REQUIRED_ARTIFACTS,
	overlayRules: [
		'Extend Canon through named overlay artifacts, not primitive forks.',
		'Keep theme aliases, token aliases, templates, copy rules, surface policy, and registry metadata together.',
		'Route primitive, template, adapter, token, or policy promotion through Canon extension intake.',
		'Keep one-surface needs project-local until repeated-surface evidence supports candidate promotion.',
		'Do not mark an overlay-driven primitive stable until Canon owns export path, docs, tests, compatibility, and registry routing.'
	],
	modalityContracts: CANON_OVERLAY_MODALITY_CONTRACTS,
	templates: [
		{
			id: CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST.id,
			name: CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST.name,
			summary:
				'Copyable starter pack for project and client overlays with the complete artifact set, extension intake, and reviewable manifest.',
			docsPath: '/canon/resources/overlays',
			registryItemIds: [
				'template.canon-project-overlay-template-pack',
				'template.canon-project-overlay-manifest',
				'template.canon-extension-intake'
			],
			outputFiles: [...CANON_PROJECT_OVERLAY_TEMPLATE_FILES],
			manifest: CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST,
			review: reviewCanonProjectOverlay(CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST)
		}
	],
	agentContract: {
		purpose: 'canon-overlay-extension-discovery',
		primaryConsumers: ['codex', 'mcp', 'ltd-docs', 'project-overlays'],
		useFor: [
			'discovering the required overlay artifact set before starting a client or project UI surface',
			'choosing what stays project-local versus what routes through Canon extension intake',
			'checking modality responsibilities for web, chat, app, voice, and glasses',
			'finding the copyable project-overlay template and its registry dependencies'
		],
		stopBefore: [
			'forking a Canon primitive for local copy or policy needs',
			'promoting a one-surface overlay as Canon stable',
			'shipping an overlay without theme, tokens, templates, copy rules, surface policy, and registry metadata',
			'creating a second overlay documentation system outside Canon source data'
		]
	}
};

export function getCanonOverlayCatalog(): CanonOverlayCatalog {
	return CANON_OVERLAY_CATALOG;
}

export function listCanonOverlayTemplates(): CanonOverlayCatalog['templates'] {
	return CANON_OVERLAY_CATALOG.templates;
}

export function getCanonOverlayTemplate(
	id: string
): CanonOverlayCatalog['templates'][number] | undefined {
	return CANON_OVERLAY_CATALOG.templates.find((template) => template.id === id);
}
