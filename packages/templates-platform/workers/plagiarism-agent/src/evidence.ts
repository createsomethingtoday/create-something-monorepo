/**
 * Evidence Persistence for Plagiarism Detection
 * 
 * Stores all analysis evidence in D1 for transparency and auditing.
 */

import type { Env } from './types';

/**
 * Store evidence for a plagiarism case.
 * Non-fatal - logs errors but doesn't throw.
 */
export async function storeEvidence(
	env: Env,
	caseId: string,
	kind: string,
	data: unknown
): Promise<void> {
	try {
		await env.DB.prepare(`
			INSERT INTO plagiarism_evidence (case_id, kind, data_json, created_at)
			VALUES (?, ?, ?, ?)
		`).bind(
			caseId,
			kind,
			JSON.stringify(data),
			Date.now()
		).run();
	} catch (error: any) {
		console.log('[Evidence] Failed to store evidence (non-fatal):', error?.message || String(error));
	}
}

/**
 * Retrieve all evidence for a case.
 */
export async function getEvidence(
	env: Env,
	caseId: string
): Promise<Array<{ kind: string; data: unknown; created_at: number }>> {
	try {
		const results = await env.DB.prepare(`
			SELECT kind, data_json, created_at
			FROM plagiarism_evidence
			WHERE case_id = ?
			ORDER BY created_at ASC
		`).bind(caseId).all();

		return (results.results || []).map((row: any) => ({
			kind: row.kind,
			data: JSON.parse(row.data_json),
			created_at: row.created_at
		}));
	} catch (error: any) {
		console.log('[Evidence] Failed to retrieve evidence:', error?.message || String(error));
		return [];
	}
}

/**
 * Get evidence of a specific kind for a case.
 */
export async function getEvidenceByKind(
	env: Env,
	caseId: string,
	kind: string
): Promise<unknown | null> {
	try {
		const result = await env.DB.prepare(`
			SELECT data_json
			FROM plagiarism_evidence
			WHERE case_id = ? AND kind = ?
			ORDER BY created_at DESC
			LIMIT 1
		`).bind(caseId, kind).first();

		if (result?.data_json) {
			return JSON.parse(result.data_json as string);
		}
		return null;
	} catch (error: any) {
		console.log('[Evidence] Failed to retrieve evidence by kind:', error?.message || String(error));
		return null;
	}
}
