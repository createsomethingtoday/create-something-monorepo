/**
 * Research Papers List - Server Load
 *
 * Papers represent the Vorhandenheit (present-at-hand) mode of research:
 * theoretical analysis that DESCRIBES the hermeneutic circle.
 *
 * Distinguished from experiments which DEMONSTRATE the circle.
 */

import type { PageServerLoad } from './$types';
import type { PaperMeta } from './types';
import type { ResearchArtifact } from '$lib/config/researchArtifacts';
import { getLocalPaperArtifacts, normalizeCategory } from '$lib/config/researchArtifacts';

function normalizePaperCategory(category: string): PaperMeta['category'] {
	const normalized = normalizeCategory(category);
	if (normalized === 'case-study' || normalized === 'methodology' || normalized === 'research') {
		return normalized;
	}
	return 'research';
}

function artifactToPaperMeta(artifact: ResearchArtifact): PaperMeta {
	const tags = artifact.tags?.map((tag) => tag.name) ?? [];

	return {
		slug: artifact.slug,
		title: artifact.title,
		subtitle: artifact.excerpt_short || '',
		description: artifact.description || artifact.excerpt_long || artifact.excerpt_short || '',
		category: normalizePaperCategory(artifact.category),
		readingTime: artifact.reading_time,
		difficulty: (artifact.difficulty_level || 'intermediate') as PaperMeta['difficulty'],
		date: (artifact.published_at || artifact.created_at || artifact.date || '').split('T')[0],
		keywords: tags
	};
}

const papers: PaperMeta[] = getLocalPaperArtifacts()
	.map(artifactToPaperMeta)
	.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const load: PageServerLoad = async () => {
	return {
		papers,
		meta: {
			title: 'Research Papers',
			description:
				'Formal research applying phenomenology, hermeneutics, and design philosophy to AI-native development.',
			keywords: [
				'research',
				'phenomenology',
				'hermeneutics',
				'Heidegger',
				'LLM',
				'AI development'
			]
		}
	};
};
