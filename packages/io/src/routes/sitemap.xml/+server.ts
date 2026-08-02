import type { RequestHandler } from './$types';
import { renderSitemap } from '@create-something/canon/search';
import {
	PUBLIC_AGENT_TRUST_CARDS,
	PUBLIC_MCP_TRUST_CARDS
} from '$lib/config/publicTrustCatalog';
import {
	getPublishedExperimentMetas,
	getPublishedExperimentSlugs
} from '$lib/config/experimentCatalog';
import { getCatalogPaperCategories } from '$lib/config/paperCategories';
import { getPublishedPaperMetas, getPublishedPaperSlugs } from '$lib/config/paperCatalog';

const paperMetas = getPublishedPaperMetas();
const knownPaperSlugs = getPublishedPaperSlugs();

function isMissingPapersTable(error: unknown): boolean {
	return error instanceof Error && error.message.includes('no such table: papers');
}

export const GET: RequestHandler = async ({ platform }) => {
	const baseUrl = 'https://createsomething.io';
	const paths = [
		'/',
		'/experiments',
		'/papers',
		'/methodology',
		'/categories',
		'/mcp',
		'/agents',
		'/about',
		'/contact'
	];

	for (const card of PUBLIC_MCP_TRUST_CARDS) {
		paths.push(`/mcp/${card.slug}`);
	}

	for (const card of PUBLIC_AGENT_TRUST_CARDS) {
		paths.push(`/agents/${card.slug}`);
	}

	for (const paper of paperMetas) {
		paths.push(`/papers/${paper.slug}`);
	}

	for (const category of getCatalogPaperCategories()) {
		paths.push(`/category/${category.slug}`);
	}

	const knownExperimentSlugs = getPublishedExperimentSlugs();
	for (const experiment of getPublishedExperimentMetas()) {
		knownExperimentSlugs.add(experiment.slug);
		paths.push(`/experiments/${experiment.slug}`);
	}

	const db = platform?.env?.DB;
	if (db) {
		try {
			const experimentsResult = await db
				.prepare(
					`SELECT id, slug, updated_at, created_at
					FROM papers
					WHERE published = 1
					ORDER BY created_at DESC`
				)
				.all();

			for (const experiment of experimentsResult.results || []) {
				const record = experiment as { id: string; slug?: string | null; updated_at?: string; created_at?: string };
				const slug = record.slug || record.id;
				if (!slug || knownPaperSlugs.has(slug) || knownExperimentSlugs.has(slug)) continue;
				knownExperimentSlugs.add(slug);
				paths.push(`/experiments/${slug}`);
			}

			const categoriesResult = await db.prepare(`SELECT slug FROM categories ORDER BY name`).all();
			for (const category of categoriesResult.results || []) {
				const record = category as { slug: string };
				paths.push(`/category/${record.slug}`);
			}
		} catch (error) {
			if (!isMissingPapersTable(error)) {
				console.error('Failed to add database-backed sitemap entries:', error);
			}
		}
	}

	return new Response(renderSitemap(baseUrl, paths), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
