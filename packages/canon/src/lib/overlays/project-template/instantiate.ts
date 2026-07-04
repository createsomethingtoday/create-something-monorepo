import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type {
	CanonProjectOverlayManifest,
	CanonRegistryModality
} from '../../registry/schema.js';
import { CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST } from './manifest.js';

const CANON_PROJECT_OVERLAY_OUTPUT_FILES = [
	'theme.css',
	'tokens.json',
	'templates/README.md',
	'templates/surface-brief.md',
	'copy-rules.md',
	'surface-policy.md',
	'registry.json',
	'manifest.ts'
] as const;

export type CanonProjectOverlayInstantiateOptions = {
	id: string;
	name: string;
	owner: string;
	sourcePackage: string;
	outputRoot: string;
	targetModalities?: CanonRegistryModality[];
	tags?: string[];
	force?: boolean;
	dryRun?: boolean;
	includeContent?: boolean;
};

export type CanonProjectOverlayInstantiateFile = {
	relativePath: (typeof CANON_PROJECT_OVERLAY_OUTPUT_FILES)[number];
	path: string;
	content: string;
	action: 'would-create' | 'created' | 'overwritten' | 'skipped-existing';
};

export type CanonProjectOverlayInstantiateResult = {
	manifest: CanonProjectOverlayManifest;
	files: CanonProjectOverlayInstantiateFile[];
	dryRun: boolean;
	outputRoot: string;
	summary: string;
};

const DEFAULT_MODALITIES: CanonRegistryModality[] = ['web', 'chat', 'app', 'voice', 'glasses'];

export function createCanonProjectOverlayManifest(
	options: Omit<CanonProjectOverlayInstantiateOptions, 'outputRoot' | 'force' | 'dryRun'>
): CanonProjectOverlayManifest {
	const targetModalities = options.targetModalities?.length
		? options.targetModalities
		: DEFAULT_MODALITIES;
	const tags = options.tags?.length
		? options.tags
		: ['canon', 'overlay', 'project', 'client', 'governance'];

	return {
		id: options.id,
		name: options.name,
		owner: options.owner,
		sourcePackage: options.sourcePackage,
		sourcePath: 'manifest.ts',
		targetModalities,
		tags,
		artifacts: CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST.artifacts.map((artifact) => ({
			...artifact,
			path: relativeOverlayArtifactPath(artifact.kind)
		})),
		extensionIntakes: CANON_PROJECT_OVERLAY_TEMPLATE_MANIFEST.extensionIntakes?.map((packet) => ({
			...packet,
			id: `${options.id}.surface-brief`,
			owner: options.owner,
			sourcePackage: options.sourcePackage,
			sourcePath: 'templates/surface-brief.md',
			requestedModalities: targetModalities,
			surfaces: packet.surfaces.map((surface, index) => ({
				...surface,
				surfaceId: `${targetModalities[index] ?? targetModalities[0]}-${options.id.replace(/^overlay\./, '').replaceAll('.', '-')}-brief-${index + 1}`,
				modality: targetModalities[index] ?? targetModalities[0],
				sourcePath: 'templates/surface-brief.md'
			}))
		}))
	};
}

export function renderCanonProjectOverlayTemplateFiles(
	options: Omit<CanonProjectOverlayInstantiateOptions, 'force' | 'dryRun' | 'includeContent'>
): Array<Pick<CanonProjectOverlayInstantiateFile, 'relativePath' | 'path' | 'content'>> {
	const manifest = createCanonProjectOverlayManifest(options);
	const outputRoot = options.outputRoot;
	const files: Array<Pick<CanonProjectOverlayInstantiateFile, 'relativePath' | 'path' | 'content'>> = [
		{
			relativePath: 'theme.css',
			path: join(outputRoot, 'theme.css'),
			content: renderThemeCss(manifest)
		},
		{
			relativePath: 'tokens.json',
			path: join(outputRoot, 'tokens.json'),
			content: `${JSON.stringify(renderTokensJson(manifest), null, 2)}\n`
		},
		{
			relativePath: 'templates/README.md',
			path: join(outputRoot, 'templates/README.md'),
			content: renderTemplatesReadme(manifest)
		},
		{
			relativePath: 'templates/surface-brief.md',
			path: join(outputRoot, 'templates/surface-brief.md'),
			content: renderSurfaceBrief(manifest)
		},
		{
			relativePath: 'copy-rules.md',
			path: join(outputRoot, 'copy-rules.md'),
			content: renderCopyRules(manifest)
		},
		{
			relativePath: 'surface-policy.md',
			path: join(outputRoot, 'surface-policy.md'),
			content: renderSurfacePolicy(manifest)
		},
		{
			relativePath: 'registry.json',
			path: join(outputRoot, 'registry.json'),
			content: `${JSON.stringify(renderRegistryJson(manifest), null, 2)}\n`
		},
		{
			relativePath: 'manifest.ts',
			path: join(outputRoot, 'manifest.ts'),
			content: renderManifestTs(manifest)
		}
	];

	return files;
}

export async function instantiateCanonProjectOverlayTemplate(
	options: CanonProjectOverlayInstantiateOptions
): Promise<CanonProjectOverlayInstantiateResult> {
	const dryRun = options.dryRun ?? false;
	const renderedFiles = renderCanonProjectOverlayTemplateFiles(options);
	const files: CanonProjectOverlayInstantiateFile[] = [];

	for (const file of renderedFiles) {
		const exists = existsSync(file.path);
		const action = exists
			? options.force
				? dryRun
					? 'would-create'
					: 'overwritten'
				: 'skipped-existing'
			: dryRun
				? 'would-create'
				: 'created';

		if (!dryRun && action !== 'skipped-existing') {
			await mkdir(dirname(file.path), { recursive: true });
			await writeFile(file.path, file.content, 'utf-8');
		}

		files.push({
			...file,
			content: options.includeContent === false ? '' : file.content,
			action
		});
	}

	const manifest = createCanonProjectOverlayManifest(options);
	const createdCount = files.filter((file) => file.action === 'created').length;
	const overwrittenCount = files.filter((file) => file.action === 'overwritten').length;
	const skippedCount = files.filter((file) => file.action === 'skipped-existing').length;
	const wouldCreateCount = files.filter((file) => file.action === 'would-create').length;

	return {
		manifest,
		files,
		dryRun,
		outputRoot: options.outputRoot,
		summary: dryRun
			? `Would create ${wouldCreateCount} Canon overlay file(s) in ${options.outputRoot}.`
			: `Created ${createdCount}, overwritten ${overwrittenCount}, skipped ${skippedCount} Canon overlay file(s) in ${options.outputRoot}.`
	};
}

function relativeOverlayArtifactPath(kind: CanonProjectOverlayManifest['artifacts'][number]['kind']) {
	switch (kind) {
		case 'theme':
			return 'theme.css';
		case 'tokens':
			return 'tokens.json';
		case 'templates':
			return 'templates';
		case 'copy-rules':
			return 'copy-rules.md';
		case 'surface-policy':
			return 'surface-policy.md';
		case 'registry':
			return 'registry.json';
	}
}

function renderThemeCss(manifest: CanonProjectOverlayManifest): string {
	return `/*
 * ${manifest.name} theme overlay.
 * Generated from @create-something/canon/overlays/project-template.
 * Keep aliases pointed at Canon tokens instead of forking primitives.
 */

:root {
\t--overlay-accent: var(--color-clear-action, #155eef);
\t--overlay-accent-contrast: var(--color-clear-action-contrast, #ffffff);
\t--overlay-surface: var(--color-bg-surface, #ffffff);
\t--overlay-surface-muted: var(--color-bg-subtle, #f6f7f9);
\t--overlay-border: var(--color-border-default, #d9dde5);
\t--overlay-proof: var(--color-clear-proof, #0f766e);
\t--overlay-review: var(--color-clear-review, #a16207);
\t--overlay-block: var(--color-clear-block, #b42318);
\t--overlay-radius: var(--radius-clear, 8px);
\t--overlay-focus-ring: 0 0 0 3px color-mix(in srgb, var(--overlay-accent) 24%, transparent);
}

[data-canon-overlay='${manifest.id}'] {
\tcolor: var(--color-fg-default, #111827);
\tbackground: var(--overlay-surface);
}

[data-canon-overlay='${manifest.id}'] :focus-visible {
\toutline: none;
\tbox-shadow: var(--overlay-focus-ring);
}
`;
}

function renderTokensJson(manifest: CanonProjectOverlayManifest) {
	return {
		$schema: 'https://design-tokens.github.io/community-group/format/',
		$extensions: {
			canonOverlay: {
				id: manifest.id,
				name: manifest.name,
				sourcePackage: manifest.sourcePackage
			}
		},
		canonOverlay: {
			accent: {
				$type: 'color',
				$value: '{color.clear.action}',
				$description: 'Project accent alias. Keep the underlying Canon token as the source of truth.'
			},
			surface: {
				$type: 'color',
				$value: '{color.bg.surface}',
				$description: 'Default overlay surface alias for web and app shells.'
			},
			proof: {
				$type: 'color',
				$value: '{color.clear.proof}',
				$description: 'Evidence and receipt state alias. Must be paired with text labels.'
			},
			radius: {
				$type: 'dimension',
				$value: '{radius.clear}',
				$description: 'Overlay radius alias. Do not introduce a project-specific radius scale.'
			}
		}
	};
}

function renderTemplatesReadme(manifest: CanonProjectOverlayManifest): string {
	return `# ${manifest.name} Templates

Copy these templates into project surfaces and fill in project-specific details.

## Files

- \`surface-brief.md\`: one surface or client workflow brief.

## Template Rules

- Keep template structure stable so agents can compare overlays across clients.
- Put project language in the overlay, not in Canon primitives.
- Attach extension-intake packets only when the project needs a primitive, template, adapter, token, or policy that Canon does not already provide.
`;
}

function renderSurfaceBrief(manifest: CanonProjectOverlayManifest): string {
	return `# Surface Brief

Overlay: ${manifest.name} (${manifest.id})

## Surface

- Name:
- Modality: ${manifest.targetModalities.join(' | ')}
- Owner: ${manifest.owner}
- Source path:

## Workflow Need

Describe the workflow object, action, policy, owner, and receipt.

## Canon Reuse

- Registry items:
- Imported components:
- Token aliases:

## Local Overlay

- Theme changes:
- Copy rules:
- Surface policy:
- Templates:

## Evidence

- Receipt:
- Validation command:
- Second surface or client proof:

## Extension Intake

Use only when the local overlay cannot reuse an existing Canon registry item.
`;
}

function renderCopyRules(manifest: CanonProjectOverlayManifest): string {
	return `# ${manifest.name} Copy Rules

Use this file to define project-local language while preserving Canon structure.

## Rules

- Name the workflow object before the action.
- Name the owner, evidence, receipt, and next action when a surface asks for trust.
- Keep state words stable across modalities: \`ready\`, \`review\`, \`blocked\`, \`complete\`.
- Keep reasoning and policy details off thin displays; summarize the decision and route to the full receipt.
- Do not rename Canon primitives to project-specific concepts when the primitive behavior is unchanged.

## Voice And Chat

- Prefer short declarative sentences.
- Make handoffs explicit: who owns the next step, what proof exists, and where the durable record lives.
- Do not put private chain-of-thought, hidden policy text, or speculative rationale in user-visible output.

## Web And App

- Put proof beside claims.
- Use action labels that describe the result, not the component.
- Keep local marketing tone in project copy files, not Canon primitives.
`;
}

function renderSurfacePolicy(manifest: CanonProjectOverlayManifest): string {
	return `# ${manifest.name} Surface Policy

This policy keeps ${manifest.sourcePackage} overlays portable across ${manifest.targetModalities.join(', ')} without forking Canon.

## Web

- Use Canon components and tokens first.
- Add project-local layout, copy, and theme aliases only when the consuming route needs them.
- Keep receipt, evidence, and owner metadata visible near decisions.

## Chat

- Return compact summaries grounded in overlay artifacts.
- Name the registry item or template before suggesting a local primitive.
- Route primitive changes through Canon extension intake.

## App

- Preserve touch targets, focus order, and text state labels.
- Use local templates for workflow-specific screens, not new base components.

## Voice

- Speak status, owner, and next action.
- Do not read long policy text. Point to the receipt or durable record.

## Glasses

- Show only glanceable state, owner, and next action.
- Keep reasoning, review history, and policy bodies on larger surfaces.

## Promotion Boundary

Project overlays can become Canon candidates only after repeated-surface evidence exists. Until then, keep implementation, copy, and policy local to the named overlay.
`;
}

function renderRegistryJson(manifest: CanonProjectOverlayManifest) {
	return {
		id: manifest.id,
		name: manifest.name,
		owner: manifest.owner,
		sourcePackage: manifest.sourcePackage,
		targetModalities: manifest.targetModalities,
		registryItemIds: [
			'token.canon-core',
			'component.clear-decision-panel',
			'component.clear-proof-strip',
			'template.canon-project-overlay-manifest',
			'template.canon-extension-intake',
			'policy.signal-decision-proof'
		],
		overlayRule:
			'Use project-local artifacts for theme, tokens, templates, copy, surface policy, and registry metadata. Route primitive changes through Canon extension intake instead of forking Canon.'
	};
}

function renderManifestTs(manifest: CanonProjectOverlayManifest): string {
	return `import type { CanonProjectOverlayManifest } from '@create-something/canon/registry';

export const CANON_PROJECT_OVERLAY_MANIFEST: CanonProjectOverlayManifest = ${JSON.stringify(
		manifest,
		null,
		2
	)};
`;
}
