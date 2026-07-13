import type { CanonProjectOverlayManifest } from '../../registry/schema.js';

export const CANON_PROJECT_OVERLAY_TEMPLATE_ROOT =
	'packages/canon/src/lib/overlays/project-template';

export const CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST: CanonProjectOverlayManifest = {
	id: 'overlay.project-template',
	name: 'Canon Project Overlay Template',
	owner: 'project-owner',
	sourcePackage: '@create-something/example-project',
	sourcePath: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/manifest.ts`,
	targetModalities: ['web', 'chat', 'app', 'voice', 'glasses'],
	tags: ['canon', 'overlay', 'template', 'project', 'client', 'governance'],
	artifacts: [
		{
			kind: 'theme',
			path: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/theme.css`,
			description: 'Project-local CSS aliases that point back to Canon tokens.',
			registryItemIds: ['token.performance-core']
		},
		{
			kind: 'tokens',
			path: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/tokens.json`,
			description: 'Design-token aliases for project-specific names without a new token scale.',
			registryItemIds: ['token.performance-core']
		},
		{
			kind: 'templates',
			path: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/templates`,
			description: 'Copyable briefs for surface-specific workflow overlays.',
			registryItemIds: [
				'template.canon-project-overlay-manifest',
				'template.canon-extension-intake'
			]
		},
		{
			kind: 'copy-rules',
			path: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/copy-rules.md`,
			description: 'Project voice and terminology rules that keep Canon primitives stable.',
			registryItemIds: ['policy.signal-decision-proof']
		},
		{
			kind: 'surface-policy',
			path: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/surface-policy.md`,
			description: 'Modality policy for web, chat, app, voice, and glasses overlays.',
			registryItemIds: ['policy.signal-decision-proof']
		},
		{
			kind: 'registry',
			path: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/registry.json`,
			description: 'Project-local registry metadata and Canon dependency list.',
			registryItemIds: [
				'component.clear-decision-panel',
				'component.clear-proof-strip',
				'template.canon-project-overlay-manifest'
			]
		}
	],
	extensionIntakes: [
		{
			id: 'overlay.project-template.surface-brief',
			title: 'Surface Brief Template',
			summary:
				'A reusable project-overlay brief for documenting workflow state, Canon reuse, local artifacts, evidence, and extension-intake needs.',
			requestedKind: 'template',
			requestedModalities: ['web', 'chat', 'app', 'voice', 'glasses'],
			owner: 'project-owner',
			sourcePackage: '@create-something/example-project',
			sourcePath: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/templates/surface-brief.md`,
			tags: ['overlay', 'brief', 'surface', 'evidence'],
			surfaces: [
				{
					surfaceId: 'web-project-overlay-brief',
					name: 'Web project overlay brief',
					modality: 'web',
					sourcePath: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/templates/surface-brief.md`,
					proof: 'Copyable template names Canon reuse, local overlay artifacts, evidence, and extension intake.'
				},
				{
					surfaceId: 'chat-project-overlay-brief',
					name: 'Chat project overlay brief',
					modality: 'chat',
					sourcePath: `${CANON_PROJECT_OVERLAY_TEMPLATE_ROOT}/templates/surface-brief.md`,
					proof: 'The same structure summarizes cleanly for agent/chat handoff.'
				}
			],
			dependencies: [
				'template.canon-project-overlay-manifest',
				'template.canon-extension-intake',
				'policy.signal-decision-proof'
			]
		}
	]
};
