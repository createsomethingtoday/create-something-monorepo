/**
 * Dashboard Functions for Plagiarism Detection
 *
 * Provides similarity cluster analysis and visualization data.
 */

import type { Env } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface Cluster {
	id: string;
	templates: Array<{ id: string; name: string; url: string }>;
	avgSimilarity: number;
	suspicionLevel: 'low' | 'medium' | 'high';
}

export interface DashboardStats {
	totalTemplates: number;
	totalCases: number;
	pendingCases: number;
	completedCases: number;
	clusters: Cluster[];
}

// =============================================================================
// CLUSTER ANALYSIS
// =============================================================================

/**
 * Find similarity clusters among indexed templates.
 * Uses LSH band hashes to identify groups of similar templates.
 */
export async function findSimilarityClusters(env: Env): Promise<Cluster[]> {
	// Find hash values that appear in multiple templates (potential clusters)
	const sharedHashes = await env.DB.prepare(`
		SELECT hash_value, COUNT(DISTINCT template_id) as template_count
		FROM minhash_lsh_bands
		GROUP BY hash_value
		HAVING template_count >= 2 AND template_count <= 10
		ORDER BY template_count DESC
		LIMIT 20
	`).all();

	if (!sharedHashes.results || sharedHashes.results.length === 0) {
		return [];
	}

	const clusters: Cluster[] = [];
	const seenTemplates = new Set<string>();

	for (const row of sharedHashes.results as any[]) {
		const hashValue = row.hash_value;

		// Get templates sharing this hash
		const templates = await env.DB.prepare(`
			SELECT DISTINCT t.id, t.name, t.url
			FROM minhash_lsh_bands b
			JOIN template_minhash t ON b.template_id = t.id
			WHERE b.hash_value = ?
			LIMIT 10
		`).bind(hashValue).all();

		if (templates.results && templates.results.length >= 2) {
			// Check if we've already seen these templates in another cluster
			const newTemplates = (templates.results as any[]).filter(t => !seenTemplates.has(t.id));
			if (newTemplates.length >= 2) {
				for (const t of templates.results as any[]) {
					seenTemplates.add(t.id);
				}

				const suspicionLevel = row.template_count > 5 ? 'high' : row.template_count > 3 ? 'medium' : 'low';

				clusters.push({
					id: hashValue.substring(0, 8),
					templates: templates.results as any[],
					avgSimilarity: 0.5 + (row.template_count / 20),
					suspicionLevel
				});

				if (clusters.length >= 10) break;
			}
		}
	}

	return clusters;
}

// =============================================================================
// DASHBOARD STATS
// =============================================================================

/**
 * Get dashboard statistics for the plagiarism detection system.
 */
export async function getDashboardStats(env: Env): Promise<DashboardStats> {
	// Get template count
	const templateCount = await env.DB.prepare(`
		SELECT COUNT(*) as count FROM template_minhash
	`).first<{ count: number }>();

	// Get case counts
	const caseCounts = await env.DB.prepare(`
		SELECT 
			COUNT(*) as total,
			SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
			SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
		FROM plagiarism_cases
	`).first<{ total: number; pending: number; completed: number }>();

	// Get similarity clusters
	const clusters = await findSimilarityClusters(env);

	return {
		totalTemplates: templateCount?.count || 0,
		totalCases: caseCounts?.total || 0,
		pendingCases: caseCounts?.pending || 0,
		completedCases: caseCounts?.completed || 0,
		clusters
	};
}

// =============================================================================
// RECENT CASES
// =============================================================================

/**
 * Get recent plagiarism cases for dashboard display.
 */
export async function getRecentCases(
	env: Env,
	limit = 10
): Promise<Array<{
	id: string;
	originalUrl: string;
	allegedCopyUrl: string;
	status: string;
	finalDecision: string | null;
	createdAt: number;
}>> {
	const results = await env.DB.prepare(`
		SELECT id, original_url, alleged_copy_url, status, final_decision, created_at
		FROM plagiarism_cases
		ORDER BY created_at DESC
		LIMIT ?
	`).bind(limit).all();

	return (results.results || []).map((row: any) => ({
		id: row.id,
		originalUrl: row.original_url,
		allegedCopyUrl: row.alleged_copy_url,
		status: row.status,
		finalDecision: row.final_decision,
		createdAt: row.created_at
	}));
}

// =============================================================================
// TEMPLATE SEARCH
// =============================================================================

/**
 * Search for templates by name or URL.
 */
export async function searchTemplates(
	env: Env,
	query: string,
	limit = 20
): Promise<Array<{ id: string; name: string; url: string; createdAt: number }>> {
	const searchTerm = `%${query}%`;

	const results = await env.DB.prepare(`
		SELECT id, name, url, created_at
		FROM template_minhash
		WHERE name LIKE ? OR url LIKE ?
		ORDER BY created_at DESC
		LIMIT ?
	`).bind(searchTerm, searchTerm, limit).all();

	return (results.results || []).map((row: any) => ({
		id: row.id,
		name: row.name,
		url: row.url,
		createdAt: row.created_at
	}));
}
