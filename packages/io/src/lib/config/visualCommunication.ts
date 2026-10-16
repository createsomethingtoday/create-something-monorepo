import type {
	ArtifactVisualKind,
	ArtifactVisualNode,
	ArtifactVisualSummary,
	GeneratedBrandImageSpec
} from '@create-something/canon/types';

export const CREATE_SOMETHING_RESEARCH_VISUAL_PROMPT_CONTRACT =
	'create-something-research-visual.v1' as const;

export interface ArtifactVisualDefinitionInput {
	kind: ArtifactVisualKind;
	title: string;
	caption?: string;
	nodes: ArtifactVisualNode[];
	subject: string;
	motifs: string[];
	alt: string;
	intendedUse?: GeneratedBrandImageSpec['intended_use'];
}

export interface ArtifactVisualDefinition {
	visual_summary: ArtifactVisualSummary;
	generated_brand_image: GeneratedBrandImageSpec;
}

export function defineArtifactVisuals(input: ArtifactVisualDefinitionInput): ArtifactVisualDefinition {
	return {
		visual_summary: {
			kind: input.kind,
			title: input.title,
			caption: input.caption,
			nodes: input.nodes
		},
		generated_brand_image: {
			prompt_contract: CREATE_SOMETHING_RESEARCH_VISUAL_PROMPT_CONTRACT,
			model: 'gpt-image-2',
			status: 'prompt-only',
			intended_use: input.intendedUse ?? 'article-hero',
			size: '1536x1024',
			quality: 'medium',
			alt: input.alt,
			prompt: buildBrandVisualPrompt(input)
		}
	};
}

export function applyArtifactVisuals<T extends { id: string }>(
	artifacts: T[],
	visualsById: Record<string, ArtifactVisualDefinition>,
	sourceLabel: string
): Array<T & ArtifactVisualDefinition> {
	const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
	const missing = artifacts.filter((artifact) => !visualsById[artifact.id]).map((artifact) => artifact.id);
	const extra = Object.keys(visualsById).filter((id) => !artifactIds.has(id));

	if (missing.length > 0 || extra.length > 0) {
		const messages = [];
		if (missing.length > 0) {
			messages.push(`${sourceLabel} missing visual definitions: ${missing.join(', ')}`);
		}
		if (extra.length > 0) {
			messages.push(`${sourceLabel} has visual definitions for unknown artifacts: ${extra.join(', ')}`);
		}
		throw new Error(messages.join('\n'));
	}

	return artifacts.map((artifact) => ({
		...artifact,
		...visualsById[artifact.id]
	}));
}

function buildBrandVisualPrompt(input: ArtifactVisualDefinitionInput): string {
	const motifs = input.motifs.map((motif) => `- ${motif}`).join('\n');

	return `CREATE SOMETHING research visual system.

Purpose:
Create a publication-quality visual abstract for a research paper or experiment.

Brand:
Minimal, rigorous, systems-oriented, black and white foundation with one restrained amber accent. High contrast, quiet interface density, no decorative clutter.

Visual language:
Abstract operating-system diagram. Architectural systems thinking. Sparse geometry. Visible layers, boundaries, traces, receipts, handoff paths, and owner checkpoints. Subtle terminal or paper texture. No stock-photo people. No glossy SaaS gradients. No mascot. No cartoon. No fake UI chrome.

Composition:
16:9 editorial hero. Centered system object with generous negative space. Readable at article header size. Suitable above a title, but do not include title text in the image.

Subject:
${input.subject}

Required motifs:
${motifs}

Forbidden:
watermarks, extra logos, random text, illegible labels, fake brand names, colorful dashboard clutter, decorative blobs.`;
}
