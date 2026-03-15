/**
 * Evidence Aggregation API
 *
 * Returns evidence for canon validation:
 * - Principles and which experiments test them
 * - Evidence counts per master
 * - Gap analysis (principles without evidence)
 *
 * This API powers the feedback loop: practice validates philosophy.
 * Part of "The Circle Closes" experiment.
 */

import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

interface EvidenceItem {
	principleId: string;
	principleTitle: string;
	masterId: string;
	masterName: string;
	experiments: {
		slug: string;
		title: string;
		domain: 'io' | 'space' | 'agency';
	}[];
	evidenceCount: number;
}

interface MasterEvidence {
	masterId: string;
	masterName: string;
	totalPrinciples: number;
	principlesWithEvidence: number;
	totalEvidenceCount: number;
}

interface EvidenceState {
	evidence: EvidenceItem[];
	byMaster: MasterEvidence[];
	gaps: {
		principleId: string;
		principleTitle: string;
		masterName: string;
	}[];
	summary: {
		totalPrinciples: number;
		principlesWithEvidence: number;
		totalExperiments: number;
		coveragePercent: number;
	};
	lastUpdated: number;
}

export const GET = async ({ platform }: RequestEvent) => {
	const db = platform?.env?.DB;
	const kv = platform?.env?.CIRCLE_DATA;

	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Try to get cached state from KV first
		if (kv) {
			const cached = await kv.get('evidence:state', 'json');
			if (cached) {
				const state = cached as EvidenceState;
				// Return cached state if less than 10 minutes old
				if (Date.now() / 1000 - state.lastUpdated < 600) {
					return json(state);
				}
			}
		}

		// Get all principles with their masters
		const principlesResult = await db
			.prepare(
				`
				SELECT
					p.id as principle_id,
					p.title as principle_title,
					p.master_id,
					m.name as master_name
				FROM principles p
				JOIN masters m ON p.master_id = m.id
				ORDER BY m.name, p.order_index
			`
			)
			.all<{
				principle_id: string;
				principle_title: string;
				master_id: string;
				master_name: string;
			}>();

		// Get all canon references (experiment → principle links)
		const referencesResult = await db
			.prepare(
				`
				SELECT
					cr.principle_id,
					cr.reference_slug,
					cr.reference_domain,
					cr.description
				FROM canon_references cr
				WHERE cr.principle_id IS NOT NULL
			`
			)
			.all<{
				principle_id: string;
				reference_slug: string;
				reference_domain: string;
				description: string;
			}>();

		const principles = principlesResult.results || [];
		const references = referencesResult.results || [];

		// Build a map of principle_id → experiments
		const principleToExperiments = new Map<
			string,
			{ slug: string; title: string; domain: 'io' | 'space' | 'agency' }[]
		>();

		for (const ref of references) {
			if (!principleToExperiments.has(ref.principle_id)) {
				principleToExperiments.set(ref.principle_id, []);
			}
			principleToExperiments.get(ref.principle_id)!.push({
				slug: ref.reference_slug,
				title: ref.description || ref.reference_slug,
				domain: ref.reference_domain as 'io' | 'space' | 'agency'
			});
		}

		// Build evidence items
		const evidence: EvidenceItem[] = principles.map((p) => ({
			principleId: p.principle_id,
			principleTitle: p.principle_title,
			masterId: p.master_id,
			masterName: p.master_name,
			experiments: principleToExperiments.get(p.principle_id) || [],
			evidenceCount: principleToExperiments.get(p.principle_id)?.length || 0
		}));

		// Build evidence by master
		const masterMap = new Map<
			string,
			{ name: string; total: number; withEvidence: number; evidenceCount: number }
		>();

		for (const item of evidence) {
			if (!masterMap.has(item.masterId)) {
				masterMap.set(item.masterId, {
					name: item.masterName,
					total: 0,
					withEvidence: 0,
					evidenceCount: 0
				});
			}
			const master = masterMap.get(item.masterId)!;
			master.total++;
			if (item.evidenceCount > 0) {
				master.withEvidence++;
				master.evidenceCount += item.evidenceCount;
			}
		}

		const byMaster: MasterEvidence[] = Array.from(masterMap.entries()).map(([id, data]) => ({
			masterId: id,
			masterName: data.name,
			totalPrinciples: data.total,
			principlesWithEvidence: data.withEvidence,
			totalEvidenceCount: data.evidenceCount
		}));

		// Identify gaps (principles without evidence)
		const gaps = evidence
			.filter((e) => e.evidenceCount === 0)
			.map((e) => ({
				principleId: e.principleId,
				principleTitle: e.principleTitle,
				masterName: e.masterName
			}));

		// Calculate summary
		const totalPrinciples = principles.length;
		const principlesWithEvidence = evidence.filter((e) => e.evidenceCount > 0).length;
		const uniqueExperiments = new Set(references.map((r) => `${r.reference_domain}/${r.reference_slug}`));

		const state: EvidenceState = {
			evidence,
			byMaster,
			gaps,
			summary: {
				totalPrinciples,
				principlesWithEvidence,
				totalExperiments: uniqueExperiments.size,
				coveragePercent:
					totalPrinciples > 0 ? Math.round((principlesWithEvidence / totalPrinciples) * 100) : 0
			},
			lastUpdated: Math.floor(Date.now() / 1000)
		};

		// Cache the state in KV
		if (kv) {
			await kv.put('evidence:state', JSON.stringify(state), {
				expirationTtl: 600 // 10 minutes
			});
		}

		return json(state);
	} catch (error) {
		console.error('Failed to fetch evidence state:', error);
		return json({ error: 'Failed to fetch evidence state' }, { status: 500 });
	}
};

// POST endpoint to manually trigger a cache refresh
export const POST = async ({ platform }: RequestEvent) => {
	const kv = platform?.env?.CIRCLE_DATA;

	if (kv) {
		await kv.delete('evidence:state');
	}

	return json({ success: true, message: 'Evidence cache cleared' });
};
