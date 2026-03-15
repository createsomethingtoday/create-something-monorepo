import type { PageServerLoad } from './$types';
import { getItems, getItemCounts, getSourcesForTenant } from '$lib/db/queries';
import { generateDentalSimulation } from '$lib/simulation/dental-server';

export const load: PageServerLoad = async ({ platform, locals }) => {
	// Use demo data when:
	// 1. No D1 database available (local dev)
	// 2. No tenant resolved
	// 3. Tenant is in demo tier (demo mode)
	const isDemo = !platform?.env?.DB || !locals.tenant || locals.tenant.tier === 'demo';
	
	if (isDemo) {
		const now = Date.now();
		
		// Use TypeScript simulation (WASM has issues in Workers)
		let simulation;
		try {
			simulation = generateDentalSimulation(now);
		} catch (e: any) {
			console.error('Simulation failed:', e?.message || e);
			// Fallback to hardcoded data
			return {
				items: getDentalDemoItems(),
				counts: { inbox: 7, approved: 5, dismissed: 3, snoozed: 2, archived: 0, total: 17 },
				sources: getDentalDemoSources(),
				metrics: getDentalMetrics(),
				activityLog: [
					{ minutesAgo: 1, text: 'Verified insurance for upcoming patient' },
					{ minutesAgo: 3, text: 'Sent appointment confirmation' },
					{ minutesAgo: 5, text: 'Processed incoming call' },
				],
				timeOfDay: 'morning',
			};
		}
		
		return {
			items: simulation.items,
			counts: {
				inbox: simulation.items.filter((i: any) => i.status === 'inbox').length,
				approved: simulation.items.filter((i: any) => i.status === 'approved').length,
				dismissed: simulation.items.filter((i: any) => i.status === 'dismissed').length,
				snoozed: simulation.items.filter((i: any) => i.status === 'snoozed').length,
				archived: 0,
				total: simulation.items.length
			},
			sources: getDentalDemoSources(),
			metrics: simulation.metrics,
			activityLog: simulation.activityLog,
			timeOfDay: simulation.timeOfDay,
		};
	}

	// Load real data for paying tenants (tenant is guaranteed non-null past isDemo guard)
	const tenant = locals.tenant!;
	const db = platform!.env.DB;
	const [items, counts, sources] = await Promise.all([
		getItems(db, {
			tenantId: tenant.id,
			sortBy: 'score',
			sortOrder: 'desc',
			limit: 200,
		}),
		getItemCounts(db, tenant.id),
		getSourcesForTenant(db, tenant.id),
	]);

	return {
		items,
		counts,
		sources,
		metrics: null,
		activityLog: null,
		timeOfDay: null,
	};
};

// =============================================================================
// CALM PRACTICE METRICS
// =============================================================================

function getDentalMetrics() {
	return {
		// Today's flow
		today: {
			appointments: 24,
			completed: 18,
			remaining: 6,
			avgWaitTime: '2 min',
			onTimeRate: 96,
		},
		// Automation stats
		automations: {
			today: 147,
			callsProcessed: 23,
			confirmationsSent: 24,
			eligibilityChecked: 19,
			recallsContacted: 12,
		},
		// Agent work
		agents: {
			completed: 8,
			awaitingApproval: 3,
			appealsDrafted: 1,
			prepsSummaries: 6,
		},
		// Human decisions
		humanActions: {
			today: 11,
			avgTimeToAction: '4 min',
		},
		// Health indicators
		health: {
			noShowRate: 4,
			claimDenialRate: 3,
			reviewScore: 4.8,
			waitingRoom: 0,
		},
	};
}

// =============================================================================
// DENTAL PRACTICE DEMO DATA — THE CALM PRACTICE STORY
// =============================================================================

function getDentalDemoItems() {
	const now = Date.now();
	const hour = 60 * 60 * 1000;
	const day = 24 * hour;
	const min = 60 * 1000;
	
	// Helper to convert timestamps to ISO strings (SvelteKit can't serialize Date objects)
	const toISO = (ts: number) => new Date(ts).toISOString();
	const nowISO = toISO(now);

	return [
		// =========================================================================
		// INBOX: Items needing human attention (the curated few)
		// =========================================================================
		
		// HIGH VALUE: Agent completed work, needs approval
		{
			id: 'dental-1',
			tenantId: 'demo',
			sourceId: 'claims',
			title: 'Appeal ready for Robert Thompson\'s crown',
			body: 'Drafted the letter. Delta denied it saying no pre-auth, but we have the treatment notes and x-rays to prove otherwise. Deadline is Feb 5. Take a look?',
			sourceType: 'claims',
			category: 'claim',
			sourceTimestamp: toISO(now - 15 * min),
			ingestedAt: nowISO,
			metadata: {
				claim_id: 'CLM-2024-8847',
				patient_name: 'Robert Thompson',
				payer: 'Delta Dental',
				billed_amount: 1245,
				status: 'appeal_ready',
				agent: 'insurance-appeal-drafter',
				agent_status: 'awaiting_approval',
			},
			score: 0.95,
			scoreBreakdown: { agent_complete: 0.4, high_value: 0.25, deadline: 0.2, base: 0.1 },
			status: 'inbox' as const,
		},
		{
			id: 'dental-2',
			tenantId: 'demo',
			sourceId: 'reviews',
			title: 'Response ready for 2-star review',
			body: 'Michael complained about wait time. Drafted an apology that mentions we\'ve fixed our scheduling. Want to review before it posts?',
			sourceType: 'reviews',
			category: 'review',
			sourceTimestamp: toISO(now - 2 * hour),
			ingestedAt: nowISO,
			metadata: {
				platform: 'google',
				rating: 2,
				reviewer_name: 'Michael K.',
				response_status: 'draft_ready',
				agent: 'review-response-drafter',
				agent_status: 'awaiting_approval',
			},
			score: 0.88,
			scoreBreakdown: { agent_complete: 0.4, negative: 0.3, google: 0.1, base: 0.08 },
			status: 'inbox' as const,
		},
		{
			id: 'dental-3',
			tenantId: 'demo',
			sourceId: 'phone',
			title: 'New patient worth calling back',
			body: 'Jennifer Morrison called about implants. Has PPO, referred by Dr. Martinez. Looks promising - scored 9/10. Want me to suggest some times?',
			sourceType: 'phone',
			category: 'call',
			sourceTimestamp: toISO(now - 45 * min),
			ingestedAt: nowISO,
			metadata: {
				direction: 'inbound',
				duration_seconds: 245,
				caller_phone: '(555) 234-5678',
				caller_name: 'Jennifer Morrison',
				converted: false,
				lead_score: 9,
				agent: 'new-patient-intake-scorer',
				agent_status: 'recommendation_ready',
				suggested_slots: ['Tomorrow 2:00 PM', 'Thursday 10:00 AM'],
			},
			score: 0.85,
			scoreBreakdown: { high_lead_score: 0.35, new_patient: 0.25, referral: 0.15, base: 0.1 },
			status: 'inbox' as const,
		},
		
		// MEDIUM: Flagged items needing review
		{
			id: 'dental-4',
			tenantId: 'demo',
			sourceId: 'insurance',
			title: 'Sarah Williams - insurance might be gone',
			body: 'She has a crown prep Thursday but Cigna says coverage ended Jan 1. Might have new insurance, might need to reschedule, might be self-pay.',
			sourceType: 'insurance',
			category: 'eligibility',
			sourceTimestamp: toISO(now - 30 * min),
			ingestedAt: nowISO,
			metadata: {
				patient_id: 'PT-4521',
				patient_name: 'Sarah Williams',
				payer: 'Cigna',
				coverage_status: 'inactive',
				appointment_date: 'Thursday 9:00 AM',
				procedure: 'Crown Prep (D2750)',
			},
			score: 0.78,
			scoreBreakdown: { inactive_coverage: 0.4, upcoming_appt: 0.25, base: 0.13 },
			status: 'inbox' as const,
		},
		{
			id: 'dental-5',
			tenantId: 'demo',
			sourceId: 'pms',
			title: 'Maria Johnson hasn\'t confirmed tomorrow',
			body: 'Implant consult at 10 AM with Dr. Jones. $2,400 visit, $1,200 her portion. Sent 2 texts, nothing back. Call her?',
			sourceType: 'pms',
			category: 'appointment',
			sourceTimestamp: toISO(now + 18 * hour),
			ingestedAt: nowISO,
			metadata: {
				patient_name: 'Maria Johnson',
				provider: 'Dr. Jones',
				procedure_names: ['Implant Consultation'],
				confirmed: false,
				confirmation_attempts: 2,
				estimated_production: 2400,
				patient_portion: 1200,
			},
			score: 0.72,
			scoreBreakdown: { unconfirmed: 0.25, high_value: 0.3, tomorrow: 0.1, base: 0.07 },
			status: 'inbox' as const,
		},

		// LOWER: Informational, can batch review
		{
			id: 'dental-6',
			tenantId: 'demo',
			sourceId: 'pms',
			title: 'Gap in Dr. Smith\'s schedule tomorrow',
			body: '3-4 PM is open. Already texted 4 people who might want it - 3 overdue for cleanings, 1 with pending fillings. Waiting to hear back.',
			sourceType: 'pms',
			category: 'appointment',
			sourceTimestamp: toISO(now - 1 * hour),
			ingestedAt: nowISO,
			metadata: {
				gap_date: 'Tomorrow',
				gap_time: '3:00 PM - 4:00 PM',
				provider: 'Dr. Smith',
				outreach_sent: 4,
				responses: 0,
			},
			score: 0.45,
			scoreBreakdown: { gap_identified: 0.2, outreach_pending: 0.15, base: 0.1 },
			status: 'inbox' as const,
		},
		{
			id: 'dental-7',
			tenantId: 'demo',
			sourceId: 'reviews',
			title: '5 stars from Amanda R.',
			body: '"Dr. Smith is amazing! She explained everything clearly and the cleaning was painless. No wait time at all!"',
			sourceType: 'reviews',
			category: 'review',
			sourceTimestamp: toISO(now - 3 * hour),
			ingestedAt: nowISO,
			metadata: {
				platform: 'google',
				rating: 5,
				reviewer_name: 'Amanda R.',
				response_status: 'pending',
				sentiment: 'positive',
			},
			score: 0.35,
			scoreBreakdown: { positive: 0.15, google: 0.1, base: 0.1 },
			status: 'inbox' as const,
		},

		// =========================================================================
		// APPROVED: Done (shows the flow working)
		// =========================================================================
		{
			id: 'dental-8',
			tenantId: 'demo',
			sourceId: 'claims',
			title: 'Sent Kevin Walsh\'s appeal',
			body: 'Appeal went to Aetna with Dr. Patel\'s CBCT. Now we wait.',
			sourceType: 'claims',
			category: 'claim',
			sourceTimestamp: toISO(now - 4 * hour),
			ingestedAt: nowISO,
			metadata: {
				claim_id: 'CLM-2024-8790',
				patient_name: 'Kevin Walsh',
				payer: 'Aetna',
				status: 'appealed',
			},
			score: 0.7,
			scoreBreakdown: { appealed: 0.4, base: 0.3 },
			status: 'approved' as const,
			curatedBy: 'Office Manager',
			curatedAt: toISO(now - 3.5 * hour),
		},
		{
			id: 'dental-9',
			tenantId: 'demo',
			sourceId: 'pms',
			title: 'Carlos Garcia confirmed for implant surgery',
			body: 'Feb 15 is a go. Pre-op instructions sent. CareCredit covered his $3,200 portion.',
			sourceType: 'pms',
			category: 'appointment',
			sourceTimestamp: toISO(now - 6 * hour),
			ingestedAt: nowISO,
			metadata: {
				patient_name: 'Carlos Garcia',
				procedure: 'Implant Surgery',
				confirmed: true,
				financing_approved: true,
			},
			score: 0.85,
			scoreBreakdown: { high_value: 0.4, confirmed: 0.25, base: 0.2 },
			status: 'approved' as const,
			curatedBy: 'Front Desk',
			curatedAt: toISO(now - 5 * hour),
		},
		{
			id: 'dental-10',
			tenantId: 'demo',
			sourceId: 'phone',
			title: 'Jennifer Morrison is booked',
			body: 'Called her back. Implant consult Thursday at 2 with Dr. Jones. Delta PPO checked out.',
			sourceType: 'phone',
			category: 'call',
			sourceTimestamp: toISO(now - 5 * hour),
			ingestedAt: nowISO,
			metadata: {
				caller_name: 'Jennifer Morrison',
				converted: true,
				appointment_scheduled: 'Thursday 2:00 PM',
			},
			score: 0.9,
			scoreBreakdown: { converted: 0.5, new_patient: 0.25, base: 0.15 },
			status: 'approved' as const,
			curatedBy: 'Front Desk',
			curatedAt: toISO(now - 4.5 * hour),
		},
		{
			id: 'dental-11',
			tenantId: 'demo',
			sourceId: 'reviews',
			title: 'Responded to 4-star review',
			body: 'Thanked them and mentioned online booking is live now.',
			sourceType: 'reviews',
			category: 'review',
			sourceTimestamp: toISO(now - 1 * day),
			ingestedAt: nowISO,
			metadata: {
				platform: 'google',
				rating: 4,
				response_status: 'responded',
			},
			score: 0.4,
			scoreBreakdown: { responded: 0.2, base: 0.2 },
			status: 'approved' as const,
			curatedBy: 'Office Manager',
			curatedAt: toISO(now - 20 * hour),
		},
		{
			id: 'dental-12',
			tenantId: 'demo',
			sourceId: 'accounting',
			title: 'Delta Dental paid $4,250',
			body: 'Posted automatically to 8 patient accounts. Everything balanced.',
			sourceType: 'accounting',
			category: 'payment',
			sourceTimestamp: toISO(now - 8 * hour),
			ingestedAt: nowISO,
			metadata: {
				amount: 4250,
				payment_type: 'insurance',
				accounts_posted: 8,
			},
			score: 0.3,
			scoreBreakdown: { auto_processed: 0.1, base: 0.2 },
			status: 'approved' as const,
			curatedBy: 'automation',
			curatedAt: toISO(now - 8 * hour),
		},

		// =========================================================================
		// DISMISSED: Skipped (handled or not relevant)
		// =========================================================================
		{
			id: 'dental-13',
			tenantId: 'demo',
			sourceId: 'phone',
			title: 'Prescription refill request',
			body: 'Sent to Dr. Smith\'s clinical queue automatically.',
			sourceType: 'phone',
			category: 'call',
			sourceTimestamp: toISO(now - 7 * hour),
			ingestedAt: nowISO,
			metadata: {
				direction: 'inbound',
				duration_seconds: 45,
				routed_to: 'clinical_queue',
			},
			score: 0.15,
			scoreBreakdown: { routed: 0.05, base: 0.1 },
			status: 'dismissed' as const,
			curatedBy: 'automation',
			curatedAt: toISO(now - 7 * hour),
		},
		{
			id: 'dental-14',
			tenantId: 'demo',
			sourceId: 'pms',
			title: 'Elena Martinez moved away',
			body: 'Sent her records to her new dentist in Arizona.',
			sourceType: 'pms',
			category: 'recall',
			sourceTimestamp: toISO(now - 2 * day),
			ingestedAt: nowISO,
			metadata: {
				patient_name: 'Elena Martinez',
				reason: 'relocated',
			},
			score: 0.05,
			scoreBreakdown: { inactive: -0.15, base: 0.2 },
			status: 'dismissed' as const,
			curatedBy: 'Front Desk',
			curatedAt: toISO(now - 2 * day),
		},
		{
			id: 'dental-15',
			tenantId: 'demo',
			sourceId: 'phone',
			title: 'Wrong number',
			body: 'Someone looking for Tony\'s Pizza.',
			sourceType: 'phone',
			category: 'call',
			sourceTimestamp: toISO(now - 9 * hour),
			ingestedAt: nowISO,
			metadata: {
				duration_seconds: 8,
			},
			score: 0.02,
			scoreBreakdown: { spam: -0.18, base: 0.2 },
			status: 'dismissed' as const,
			curatedBy: 'automation',
			curatedAt: toISO(now - 9 * hour),
		},

		// =========================================================================
		// SNOOZED: Later
		// =========================================================================
		{
			id: 'dental-16',
			tenantId: 'demo',
			sourceId: 'pms',
			title: 'Maria Ortiz wants veneers after her wedding',
			body: '$12K job but she\'s waiting until March. Following up Feb 15.',
			sourceType: 'pms',
			category: 'treatment_plan',
			sourceTimestamp: toISO(now - 10 * day),
			ingestedAt: nowISO,
			metadata: {
				patient_name: 'Maria Ortiz',
				total_fee: 12000,
				status: 'interested_later',
			},
			score: 0.6,
			scoreBreakdown: { high_value: 0.35, deferred: 0.15, base: 0.1 },
			status: 'snoozed' as const,
			curatedBy: 'Dr. Smith',
			curatedAt: toISO(now - 9 * day),
			snoozeUntil: toISO(now + 25 * day),
		},
		{
			id: 'dental-17',
			tenantId: 'demo',
			sourceId: 'claims',
			title: 'Waiting on x-ray from oral surgeon',
			body: 'MetLife needs the CBCT before they\'ll process Kevin Walsh\'s claim. Dr. Patel is sending it tomorrow.',
			sourceType: 'claims',
			category: 'claim',
			sourceTimestamp: toISO(now - 5 * day),
			ingestedAt: nowISO,
			metadata: {
				patient_name: 'Kevin Walsh',
				payer: 'MetLife',
				waiting_for: 'specialist_imaging',
			},
			score: 0.4,
			scoreBreakdown: { pending_external: 0.2, base: 0.2 },
			status: 'snoozed' as const,
			curatedBy: 'Insurance Coordinator',
			curatedAt: toISO(now - 4 * day),
			snoozeUntil: toISO(now + 2 * day),
		},
	];
}

function getDentalDemoSources() {
	const nowISO = new Date().toISOString();
	return [
		{ id: 'pms', tenantId: 'demo', type: 'pms', name: 'Open Dental', status: 'demo', config: { vendor: 'open_dental' }, lastSyncAt: nowISO },
		{ id: 'phone', tenantId: 'demo', type: 'phone', name: 'Weave', status: 'demo', config: { vendor: 'weave' }, lastSyncAt: nowISO },
		{ id: 'insurance', tenantId: 'demo', type: 'insurance', name: 'Zuub', status: 'demo', config: { vendor: 'zuub' }, lastSyncAt: nowISO },
		{ id: 'claims', tenantId: 'demo', type: 'claims', name: 'DentalXChange', status: 'demo', config: { vendor: 'dental_xchange' }, lastSyncAt: nowISO },
		{ id: 'reviews', tenantId: 'demo', type: 'reviews', name: 'Google', status: 'demo', config: { vendor: 'google' }, lastSyncAt: nowISO },
		{ id: 'accounting', tenantId: 'demo', type: 'accounting', name: 'QuickBooks', status: 'demo', config: { vendor: 'quickbooks' }, lastSyncAt: nowISO },
	];
}
