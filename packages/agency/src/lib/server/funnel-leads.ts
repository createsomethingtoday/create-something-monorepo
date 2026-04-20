import { generateId, type FunnelStage, type Lead, type LeadInput, type LeadSource } from '$lib/funnel';
import type { InboundJob } from '$lib/types/abundance';

export const FUNNEL_STAGES = ['awareness', 'consideration', 'decision', 'won', 'lost'] as const;
export const LEAD_SOURCES = [
	'linkedin',
	'website',
	'referral',
	'cold',
	'event',
	'other',
	'abundance'
] as const;

export interface LeadListOptions {
	stage?: FunnelStage;
	source?: LeadSource;
	campaign?: string;
}

export interface LeadUpdateInput {
	stage?: FunnelStage;
	name?: string;
	email?: string | null;
	company?: string | null;
	role?: string | null;
	linkedin_url?: string | null;
	source_detail?: string | null;
	campaign?: string | null;
	estimated_value?: number | null;
	actual_value?: number | null;
	service_interest?: string | null;
	notes?: string | null;
	discovery_call_at?: string | null;
	proposal_sent_at?: string | null;
	closed_at?: string | null;
}

export interface AbundanceLeadInputOptions {
	stage?: FunnelStage;
	estimated_value?: number | null;
	operator_email?: string | null;
	handed_off_at?: string | null;
}

export function isLeadSource(value: string | null | undefined): value is LeadSource {
	return LEAD_SOURCES.includes(value as LeadSource);
}

export function isFunnelStage(value: string | null | undefined): value is FunnelStage {
	return FUNNEL_STAGES.includes(value as FunnelStage);
}

export async function listLeads(db: D1Database, options: LeadListOptions = {}): Promise<Lead[]> {
	let query = 'SELECT * FROM leads WHERE 1=1';
	const params: string[] = [];

	if (options.stage) {
		query += ' AND stage = ?';
		params.push(options.stage);
	}

	if (options.source) {
		query += ' AND source = ?';
		params.push(options.source);
	}

	if (options.campaign) {
		query += ' AND campaign = ?';
		params.push(options.campaign);
	}

	query += ' ORDER BY updated_at DESC';

	const result = await db.prepare(query).bind(...params).all<Lead>();
	return result.results ?? [];
}

export async function getLead(db: D1Database, id: string): Promise<Lead | null> {
	const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<Lead>();
	return lead ?? null;
}

export async function createLead(db: D1Database, input: LeadInput): Promise<Lead> {
	const name = normalizeRequiredString(input.name, 'name');
	if (!isLeadSource(input.source)) {
		throw new TypeError('A valid lead source is required');
	}

	const stage = input.stage && isFunnelStage(input.stage) ? input.stage : 'awareness';
	const id = generateId('lead');
	const now = new Date().toISOString();

	await db
		.prepare(
			`
			INSERT INTO leads (
				id, name, email, company, role, linkedin_url,
				source, source_detail, campaign, stage,
				estimated_value, service_interest,
				first_touch_at, last_touch_at, notes,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`
		)
		.bind(
			id,
			name,
			normalizeNullableString(input.email),
			normalizeNullableString(input.company),
			normalizeNullableString(input.role),
			normalizeNullableString(input.linkedin_url),
			input.source,
			normalizeNullableString(input.source_detail),
			normalizeNullableString(input.campaign),
			stage,
			normalizeNullableNumber(input.estimated_value),
			normalizeNullableString(input.service_interest),
			now,
			now,
			normalizeNullableString(input.notes),
			now,
			now
		)
		.run();

	const lead = await getLead(db, id);
	if (!lead) {
		throw new Error('Failed to fetch created lead');
	}

	return lead;
}

export async function updateLead(
	db: D1Database,
	id: string,
	input: LeadUpdateInput
): Promise<Lead | null> {
	const existing = await getLead(db, id);
	if (!existing) {
		return null;
	}

	const now = new Date().toISOString();
	const updates: string[] = ['updated_at = ?', 'last_touch_at = ?'];
	const values: Array<string | number | null> = [now, now];

	if (input.stage !== undefined) {
		if (!isFunnelStage(input.stage)) {
			throw new TypeError('A valid funnel stage is required');
		}

		updates.push('stage = ?');
		values.push(input.stage);

		if (input.stage === 'decision' && input.discovery_call_at === undefined && !existing.discovery_call_at) {
			updates.push('discovery_call_at = ?');
			values.push(now);
		}

		if ((input.stage === 'won' || input.stage === 'lost') && input.closed_at === undefined && !existing.closed_at) {
			updates.push('closed_at = ?');
			values.push(now);
		}
	}

	if (input.name !== undefined) {
		updates.push('name = ?');
		values.push(normalizeRequiredString(input.name, 'name'));
	}
	if (input.email !== undefined) {
		updates.push('email = ?');
		values.push(normalizeNullableString(input.email));
	}
	if (input.company !== undefined) {
		updates.push('company = ?');
		values.push(normalizeNullableString(input.company));
	}
	if (input.role !== undefined) {
		updates.push('role = ?');
		values.push(normalizeNullableString(input.role));
	}
	if (input.linkedin_url !== undefined) {
		updates.push('linkedin_url = ?');
		values.push(normalizeNullableString(input.linkedin_url));
	}
	if (input.source_detail !== undefined) {
		updates.push('source_detail = ?');
		values.push(normalizeNullableString(input.source_detail));
	}
	if (input.campaign !== undefined) {
		updates.push('campaign = ?');
		values.push(normalizeNullableString(input.campaign));
	}
	if (input.estimated_value !== undefined) {
		updates.push('estimated_value = ?');
		values.push(normalizeNullableNumber(input.estimated_value));
	}
	if (input.actual_value !== undefined) {
		updates.push('actual_value = ?');
		values.push(normalizeNullableNumber(input.actual_value));
	}
	if (input.service_interest !== undefined) {
		updates.push('service_interest = ?');
		values.push(normalizeNullableString(input.service_interest));
	}
	if (input.notes !== undefined) {
		updates.push('notes = ?');
		values.push(normalizeNullableString(input.notes));
	}
	if (input.discovery_call_at !== undefined) {
		updates.push('discovery_call_at = ?');
		values.push(normalizeNullableString(input.discovery_call_at));
	}
	if (input.proposal_sent_at !== undefined) {
		updates.push('proposal_sent_at = ?');
		values.push(normalizeNullableString(input.proposal_sent_at));
	}
	if (input.closed_at !== undefined) {
		updates.push('closed_at = ?');
		values.push(normalizeNullableString(input.closed_at));
	}

	values.push(id);

	await db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
	return getLead(db, id);
}

export async function deleteLead(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
	return Number(result.meta.changes ?? 0) > 0;
}

export function buildAbundanceLeadInputFromInboundJob(
	job: InboundJob,
	options: AbundanceLeadInputOptions = {}
): LeadInput {
	return {
		name: job.title,
		company: job.employer ?? undefined,
		source: 'abundance',
		source_detail: [
			'Abundance inbound job',
			job.source_system ?? null,
			job.specialty ?? null,
			job.source_agents.length > 0 ? job.source_agents.join(', ') : null
		]
			.filter(Boolean)
			.join(' · '),
		campaign: 'abundance-network',
		stage: options.stage ?? 'decision',
		estimated_value: normalizeNullableNumber(options.estimated_value) ?? undefined,
		service_interest: 'abundance recruiter handoff',
		notes: buildAbundanceLeadNotes(job, options)
	};
}

export function buildAbundanceLeadNotes(
	job: InboundJob,
	options: AbundanceLeadInputOptions = {}
): string {
	const handedOffAt = options.handed_off_at ?? new Date().toISOString();
	const lines = [
		'Abundance recruiter handoff',
		`Inbound job ID: ${job.id}`,
		`Title: ${job.title}`,
		job.employer ? `Employer: ${job.employer}` : null,
		job.facility_name ? `Facility: ${job.facility_name}` : null,
		job.location ? `Location: ${job.location}` : null,
		job.category ? `Category: ${job.category}` : null,
		job.specialty ? `Specialty: ${job.specialty}` : null,
		job.pay_min != null || job.pay_max != null
			? `Compensation: ${formatInboundJobPay(job)}`
			: null,
		job.shift ? `Shift: ${job.shift}` : null,
		job.duration_weeks ? `Duration: ${job.duration_weeks} weeks` : null,
		job.start_date ? `Start date: ${job.start_date}` : null,
		job.openings != null ? `Openings: ${job.openings}` : null,
		job.job_url ? `Posting URL: ${job.job_url}` : null,
		job.external_job_id ? `External job ID: ${job.external_job_id}` : null,
		job.source_system ? `Source system: ${job.source_system}` : null,
		job.source_run_id ? `Source run: ${job.source_run_id}` : null,
		`Source agents: ${job.source_agents.join(', ')}`,
		`Dedupe key: ${job.dedupe_key}`,
		job.notes ? `Operator notes: ${job.notes}` : null,
		options.operator_email ? `Handed off by: ${options.operator_email}` : null,
		`Handed off at: ${handedOffAt}`
	];

	return lines.filter(Boolean).join('\n');
}

function formatInboundJobPay(job: InboundJob): string {
	const amount = [job.pay_min, job.pay_max]
		.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
		.map((value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value));

	if (amount.length === 2 && amount[0] !== amount[1]) {
		return `${amount[0]}-${amount[1]}${job.pay_period ? ` / ${job.pay_period}` : ''}`;
	}

	return `${amount[0] ?? amount[1] ?? 'Not set'}${job.pay_period ? ` / ${job.pay_period}` : ''}`;
}

function normalizeRequiredString(value: string | null | undefined, fieldName: string): string {
	const normalized = normalizeNullableString(value);
	if (!normalized) {
		throw new TypeError(`${fieldName} is required`);
	}
	return normalized;
}

function normalizeNullableString(value: string | null | undefined): string | null {
	if (typeof value !== 'string') {
		return value == null ? null : String(value);
	}

	const normalized = value.trim();
	return normalized ? normalized : null;
}

function normalizeNullableNumber(value: number | string | null | undefined): number | null {
	if (value === null || value === undefined || value === '') {
		return null;
	}

	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}

	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
}
