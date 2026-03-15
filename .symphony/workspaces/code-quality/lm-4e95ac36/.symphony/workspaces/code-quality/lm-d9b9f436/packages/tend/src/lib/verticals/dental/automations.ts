/**
 * Dental Practice Automations
 * 
 * Deterministic workflows that run at high volume.
 * These are the base layer of the pyramid — fast, reliable, no reasoning required.
 */

import { defineAutomation } from '../../sdk/automation';
import type { DentalAutomationContext, DentalDataItem } from './types';

// =============================================================================
// CALL INGESTION
// =============================================================================

export const callLogIngest = defineAutomation({
	name: 'call-log-ingest',
	description: 'Ingest call logs from phone system, score by conversion potential',
	source: 'phone',

	transform: (raw: any) => ({
		title: raw.direction === 'inbound' 
			? `Inbound call from ${raw.caller_name || raw.caller_phone}`
			: `Outbound call to ${raw.caller_name || raw.caller_phone}`,
		body: raw.transcript?.substring(0, 500) || `${raw.duration_seconds}s ${raw.direction} call`,
		sourceType: 'phone',
		sourceItemId: raw.call_id,
		sourceTimestamp: new Date(raw.timestamp),
		metadata: {
			direction: raw.direction,
			duration_seconds: raw.duration_seconds,
			caller_phone: raw.caller_phone,
			caller_name: raw.caller_name,
			patient_id: raw.patient_id,
			converted: raw.converted || false,
			transcript: raw.transcript,
			handled_by: raw.handled_by,
		},
		score: 0,
		scoreBreakdown: {},
	}),

	score: (item, context) => {
		let score = 0.3; // Base score
		const breakdown: Record<string, number> = { base: 0.3 };
		const meta = item.metadata as any;

		// New patient potential (no patient_id = new caller)
		if (!meta.patient_id) {
			score += 0.3;
			breakdown.new_patient_potential = 0.3;
		}

		// Missed conversion is high priority
		if (!meta.converted && meta.direction === 'inbound') {
			score += 0.25;
			breakdown.missed_conversion = 0.25;
		}

		// Long calls that didn't convert need review
		if (meta.duration_seconds > 120 && !meta.converted) {
			score += 0.15;
			breakdown.long_unconverted = 0.15;
		}

		// Short calls might be hangups
		if (meta.duration_seconds < 30) {
			score -= 0.1;
			breakdown.short_call = -0.1;
		}

		return Math.max(0, Math.min(1, score));
	},

	filter: (item) => {
		const meta = item.metadata as any;
		// Filter out very short calls (< 10s) as likely wrong numbers
		return meta.duration_seconds >= 10;
	},

	notify: (item) => {
		const meta = item.metadata as any;
		// Notify on missed conversions from new callers
		return !meta.converted && !meta.patient_id && meta.direction === 'inbound';
	},
});

// =============================================================================
// APPOINTMENT SYNC
// =============================================================================

export const appointmentSync = defineAutomation({
	name: 'appointment-sync',
	description: 'Sync appointments from PMS, flag high-value and unconfirmed',
	source: 'pms',

	transform: (raw: any) => ({
		title: `${raw.patient_name} - ${raw.procedure_names?.[0] || 'Appointment'}`,
		body: `${raw.provider} | ${raw.duration_minutes}min | $${raw.estimated_production}`,
		sourceType: 'pms',
		sourceItemId: raw.appointment_id,
		sourceTimestamp: new Date(raw.appointment_time),
		metadata: {
			patient_id: raw.patient_id,
			patient_name: raw.patient_name,
			provider: raw.provider,
			procedure_codes: raw.procedure_codes || [],
			procedure_names: raw.procedure_names || [],
			duration_minutes: raw.duration_minutes,
			operatory: raw.operatory,
			confirmed: raw.confirmed || false,
			insurance_verified: raw.insurance_verified || false,
			estimated_production: raw.estimated_production || 0,
			notes: raw.notes,
		},
		score: 0,
		scoreBreakdown: {},
	}),

	score: (item, context) => {
		const ctx = context as unknown as DentalAutomationContext;
		let score = 0.4;
		const breakdown: Record<string, number> = { base: 0.4 };
		const meta = item.metadata as any;

		// Unconfirmed appointments need attention
		if (!meta.confirmed) {
			score += 0.2;
			breakdown.unconfirmed = 0.2;
		}

		// Insurance not verified
		if (!meta.insurance_verified && meta.estimated_production > 200) {
			score += 0.15;
			breakdown.insurance_not_verified = 0.15;
		}

		// High production
		if (meta.estimated_production >= ctx.weights.high_production_threshold) {
			score += 0.2;
			breakdown.high_production = 0.2;
		}

		// VIP patient
		if (ctx.weights.vip_patients.includes(meta.patient_id)) {
			score += 0.15;
			breakdown.vip = 0.15;
		}

		// Priority procedures
		const hasPriority = meta.procedure_codes.some((code: string) =>
			ctx.weights.priority_procedures.includes(code)
		);
		if (hasPriority) {
			score += 0.1;
			breakdown.priority_procedure = 0.1;
		}

		return Math.max(0, Math.min(1, score));
	},

	notify: (item) => {
		const meta = item.metadata as any;
		// Notify on high-value unconfirmed appointments
		return !meta.confirmed && meta.estimated_production > 500;
	},
});

// =============================================================================
// ELIGIBILITY CHECK
// =============================================================================

export const eligibilityCheck = defineAutomation({
	name: 'eligibility-check',
	description: 'Process eligibility verifications, flag coverage issues',
	source: 'insurance',

	transform: (raw: any) => ({
		title: `Eligibility: ${raw.patient_name} - ${raw.payer}`,
		body: `$${raw.annual_remaining} remaining of $${raw.annual_max} | ${raw.coverage_status}`,
		sourceType: 'insurance',
		sourceItemId: `elig-${raw.patient_id}-${raw.verified_at}`,
		sourceTimestamp: new Date(raw.verified_at),
		metadata: {
			patient_id: raw.patient_id,
			patient_name: raw.patient_name,
			payer: raw.payer,
			plan_name: raw.plan_name,
			subscriber_id: raw.subscriber_id,
			coverage_status: raw.coverage_status,
			annual_max: raw.annual_max,
			annual_used: raw.annual_used,
			annual_remaining: raw.annual_remaining,
			deductible: raw.deductible,
			deductible_met: raw.deductible_met,
			preventive_coverage: raw.preventive_coverage,
			basic_coverage: raw.basic_coverage,
			major_coverage: raw.major_coverage,
			waiting_periods: raw.waiting_periods,
			frequency_limits: raw.frequency_limits,
			verified_at: new Date(raw.verified_at),
		},
		score: 0,
		scoreBreakdown: {},
	}),

	score: (item) => {
		let score = 0.3;
		const breakdown: Record<string, number> = { base: 0.3 };
		const meta = item.metadata as any;

		// Inactive coverage is critical
		if (meta.coverage_status === 'inactive') {
			score += 0.5;
			breakdown.inactive = 0.5;
		}

		// Low remaining benefits
		if (meta.annual_remaining < 200 && meta.annual_max > 0) {
			score += 0.2;
			breakdown.low_remaining = 0.2;
		}

		// Waiting periods present
		if (meta.waiting_periods && Object.keys(meta.waiting_periods).length > 0) {
			score += 0.1;
			breakdown.waiting_periods = 0.1;
		}

		// Coverage unknown
		if (meta.coverage_status === 'unknown') {
			score += 0.3;
			breakdown.unknown_status = 0.3;
		}

		return Math.max(0, Math.min(1, score));
	},

	notify: (item) => {
		const meta = item.metadata as any;
		return meta.coverage_status === 'inactive' || meta.coverage_status === 'unknown';
	},
});

// =============================================================================
// RECALL REMINDER
// =============================================================================

export const recallReminder = defineAutomation({
	name: 'recall-reminder',
	description: 'Track recall due dates, prioritize overdue patients',
	source: 'pms',

	transform: (raw: any) => ({
		title: `Recall due: ${raw.patient_name}`,
		body: `${raw.recall_type} | Last visit: ${new Date(raw.last_visit).toLocaleDateString()} | ${raw.days_overdue > 0 ? `${raw.days_overdue} days overdue` : 'Due soon'}`,
		sourceType: 'pms',
		sourceItemId: `recall-${raw.patient_id}-${raw.due_date}`,
		sourceTimestamp: new Date(raw.due_date),
		metadata: {
			patient_id: raw.patient_id,
			patient_name: raw.patient_name,
			recall_type: raw.recall_type,
			last_visit: new Date(raw.last_visit),
			due_date: new Date(raw.due_date),
			days_overdue: raw.days_overdue,
			attempts: raw.attempts || 0,
			last_attempt: raw.last_attempt ? new Date(raw.last_attempt) : undefined,
			preferred_contact: raw.preferred_contact || 'text',
			insurance_coverage: raw.insurance_coverage,
		},
		score: 0,
		scoreBreakdown: {},
	}),

	score: (item, context) => {
		const ctx = context as unknown as DentalAutomationContext;
		let score = 0.3;
		const breakdown: Record<string, number> = { base: 0.3 };
		const meta = item.metadata as any;

		// Overdue increases priority
		if (meta.days_overdue > 0) {
			const overdueBoost = Math.min(0.4, meta.days_overdue / 180 * 0.4);
			score += overdueBoost;
			breakdown.overdue = overdueBoost;
		}

		// VIP patient
		if (ctx.weights.vip_patients.includes(meta.patient_id)) {
			score += 0.2;
			breakdown.vip = 0.2;
		}

		// Few attempts = fresh lead
		if (meta.attempts === 0) {
			score += 0.15;
			breakdown.fresh = 0.15;
		}

		// Many failed attempts = deprioritize slightly
		if (meta.attempts >= 3) {
			score -= 0.1;
			breakdown.many_attempts = -0.1;
		}

		// Has insurance coverage
		if (meta.insurance_coverage && meta.insurance_coverage !== 'none') {
			score += 0.1;
			breakdown.insured = 0.1;
		}

		return Math.max(0, Math.min(1, score));
	},

	filter: (item) => {
		const meta = item.metadata as any;
		// Only include if not already scheduled
		return meta.attempts < 5; // Stop after 5 attempts
	},
});

// =============================================================================
// CLAIM STATUS
// =============================================================================

export const claimStatus = defineAutomation({
	name: 'claim-status',
	description: 'Track claim statuses, flag denials and aged claims',
	source: 'claims',

	transform: (raw: any) => ({
		title: `Claim ${raw.claim_id}: ${raw.patient_name} - ${raw.status}`,
		body: `${raw.payer} | Billed: $${raw.billed_amount}${raw.paid_amount ? ` | Paid: $${raw.paid_amount}` : ''}${raw.denial_reason ? ` | Denied: ${raw.denial_reason}` : ''}`,
		sourceType: 'claims',
		sourceItemId: raw.claim_id,
		sourceTimestamp: new Date(raw.submitted_date),
		metadata: {
			claim_id: raw.claim_id,
			patient_id: raw.patient_id,
			patient_name: raw.patient_name,
			payer: raw.payer,
			procedure_codes: raw.procedure_codes || [],
			billed_amount: raw.billed_amount,
			status: raw.status,
			submitted_date: new Date(raw.submitted_date),
			response_date: raw.response_date ? new Date(raw.response_date) : undefined,
			paid_amount: raw.paid_amount,
			denial_reason: raw.denial_reason,
			era_received: raw.era_received || false,
		},
		score: 0,
		scoreBreakdown: {},
	}),

	score: (item) => {
		let score = 0.3;
		const breakdown: Record<string, number> = { base: 0.3 };
		const meta = item.metadata as any;

		// Denied claims are high priority
		if (meta.status === 'denied') {
			score += 0.5;
			breakdown.denied = 0.5;
		}

		// Pending claims that are old
		if (meta.status === 'pending') {
			const daysPending = Math.floor((Date.now() - new Date(meta.submitted_date).getTime()) / (1000 * 60 * 60 * 24));
			if (daysPending > 30) {
				const ageBoost = Math.min(0.3, (daysPending - 30) / 60 * 0.3);
				score += ageBoost;
				breakdown.aged_pending = ageBoost;
			}
		}

		// High dollar amount
		if (meta.billed_amount > 1000) {
			score += 0.15;
			breakdown.high_value = 0.15;
		}

		// Underpaid (paid less than billed)
		if (meta.paid_amount && meta.paid_amount < meta.billed_amount * 0.7) {
			score += 0.2;
			breakdown.underpaid = 0.2;
		}

		return Math.max(0, Math.min(1, score));
	},

	notify: (item) => {
		const meta = item.metadata as any;
		return meta.status === 'denied' && meta.billed_amount > 200;
	},
});

// =============================================================================
// REVIEW REQUEST
// =============================================================================

export const reviewRequest = defineAutomation({
	name: 'review-request',
	description: 'Trigger review requests after completed appointments',
	source: 'pms',

	transform: (raw: any) => ({
		title: `Review request: ${raw.patient_name}`,
		body: `Completed ${raw.procedure_names?.[0] || 'appointment'} with ${raw.provider}`,
		sourceType: 'pms',
		sourceItemId: `review-req-${raw.appointment_id}`,
		sourceTimestamp: new Date(raw.completed_time),
		metadata: {
			patient_id: raw.patient_id,
			patient_name: raw.patient_name,
			provider: raw.provider,
			procedure_codes: raw.procedure_codes || [],
			phone: raw.patient_phone,
			email: raw.patient_email,
			preferred_contact: raw.preferred_contact || 'text',
			sent: false,
		},
		score: 0,
		scoreBreakdown: {},
	}),

	score: (item) => {
		// Review requests are low priority items
		return 0.2;
	},

	filter: (item) => {
		const meta = item.metadata as any;
		// Only patients with contact info
		return !!(meta.phone || meta.email);
	},
});

// =============================================================================
// PAYMENT RECEIVED
// =============================================================================

export const paymentReceived = defineAutomation({
	name: 'payment-received',
	description: 'Log payments and flag large patient balances',
	source: 'accounting',

	transform: (raw: any) => ({
		title: `Payment: $${raw.amount} from ${raw.patient_name || raw.payer}`,
		body: `${raw.payment_type} payment via ${raw.method || 'unknown'} | Remaining: $${raw.remaining_balance}`,
		sourceType: 'accounting',
		sourceItemId: raw.payment_id,
		sourceTimestamp: new Date(raw.payment_date),
		metadata: {
			patient_id: raw.patient_id,
			patient_name: raw.patient_name,
			amount: raw.amount,
			payment_type: raw.payment_type,
			method: raw.method,
			invoice_ids: raw.invoice_ids || [],
			remaining_balance: raw.remaining_balance || 0,
		},
		score: 0,
		scoreBreakdown: {},
	}),

	score: (item) => {
		let score = 0.2;
		const breakdown: Record<string, number> = { base: 0.2 };
		const meta = item.metadata as any;

		// Large payments are informational
		if (meta.amount > 1000) {
			score += 0.1;
			breakdown.large_payment = 0.1;
		}

		// High remaining balance needs attention
		if (meta.remaining_balance > 500) {
			score += 0.3;
			breakdown.high_balance = 0.3;
		}

		return score;
	},
});

// =============================================================================
// REVIEW INGEST
// =============================================================================

export const reviewIngest = defineAutomation({
	name: 'review-ingest',
	description: 'Ingest new reviews, prioritize negative for response',
	source: 'reviews',

	transform: (raw: any) => ({
		title: `${raw.rating}★ Review on ${raw.platform}`,
		body: raw.review_text.substring(0, 300),
		sourceType: 'reviews',
		sourceItemId: `${raw.platform}-${raw.review_id}`,
		sourceTimestamp: new Date(raw.created_at),
		metadata: {
			platform: raw.platform,
			rating: raw.rating,
			reviewer_name: raw.reviewer_name,
			patient_id: raw.patient_id,
			review_text: raw.review_text,
			response_status: 'pending',
			sentiment: raw.rating >= 4 ? 'positive' : raw.rating >= 3 ? 'neutral' : 'negative',
			keywords: raw.keywords || [],
		},
		score: 0,
		scoreBreakdown: {},
	}),

	score: (item) => {
		let score = 0.3;
		const breakdown: Record<string, number> = { base: 0.3 };
		const meta = item.metadata as any;

		// Negative reviews are urgent
		if (meta.rating <= 2) {
			score += 0.5;
			breakdown.negative = 0.5;
		} else if (meta.rating === 3) {
			score += 0.2;
			breakdown.neutral = 0.2;
		}

		// Google reviews matter most
		if (meta.platform === 'google') {
			score += 0.1;
			breakdown.google = 0.1;
		}

		return Math.max(0, Math.min(1, score));
	},

	notify: (item) => {
		const meta = item.metadata as any;
		return meta.rating <= 2; // Alert on negative reviews
	},
});

// =============================================================================
// EXPORT ALL
// =============================================================================

export const dentalAutomations = [
	callLogIngest,
	appointmentSync,
	eligibilityCheck,
	recallReminder,
	claimStatus,
	reviewRequest,
	paymentReceived,
	reviewIngest,
];
