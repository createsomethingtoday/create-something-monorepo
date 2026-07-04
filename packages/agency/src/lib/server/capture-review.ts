import {
	computePublicAtlasReadiness,
	createPublicAtlasGraphArtifact,
	normalizePublicAtlasCanvas,
	summarizePublicAtlasCanvas,
	type PublicAtlasCanvas,
	type PublicAtlasGraphArtifact,
	type PublicAtlasNodeKind,
} from '@create-something/canon/atlas/headless';

export type CaptureSurface =
	| 'newsletter'
	| 'contact'
	| 'lead'
	| 'public_atlas'
	| 'user'
	| 'commercial_account'
	| 'legacy_contact'
	| 'mcp_entitlement';

export type CaptureClassificationLabel =
	| 'actual_user'
	| 'customer_record'
	| 'internal_test'
	| 'fixture'
	| 'likely_bot'
	| 'spam'
	| 'legacy_placeholder'
	| 'operational_access'
	| 'needs_review';

export type CaptureRecommendedAction = 'keep' | 'review' | 'ignore' | 'suppress';

export interface CaptureClassification {
	label: CaptureClassificationLabel;
	confidence: 'high' | 'medium' | 'low';
	recommended_action: CaptureRecommendedAction;
	reasons: string[];
}

export interface CaptureReviewRecord {
	id: string;
	surface: CaptureSurface;
	email: string | null;
	email_hash?: string | null;
	matched_email?: string | null;
	name?: string | null;
	status?: string | null;
	source?: string | null;
	source_detail?: string | null;
	captured_at: string | null;
	updated_at?: string | null;
	excerpt?: string | null;
	metadata?: Record<string, unknown>;
	atlas_handoff?: AtlasDevelopmentHandoff | null;
	review?: CaptureReviewDecisionSummary;
	classification: CaptureClassification;
}

export interface AtlasDevelopmentHandoff {
	title: string;
	tier: 'mixed';
	lane: 'claim-worktree' | 'research/no-edit';
	goal: string;
	packet: string;
	linear_create_command: string;
}

export interface CaptureReviewOptions {
	limit?: number;
	includeOperational?: boolean;
	surface?: CaptureSurface | 'all';
	classification?: CaptureClassificationLabel | 'all';
	action?: CaptureRecommendedAction | 'all';
	reviewed?: 'all' | 'reviewed' | 'unreviewed';
	query?: string;
}

export interface CaptureReviewResult {
	generated_at: string;
	limits: {
		per_surface: number;
		include_operational: boolean;
	};
	filters: {
		surface: CaptureSurface | 'all';
		classification: CaptureClassificationLabel | 'all';
		action: CaptureRecommendedAction | 'all';
		reviewed: 'all' | 'reviewed' | 'unreviewed';
		query: string;
	};
	decision_storage: {
		available: boolean;
		stored_count: number;
	};
	summary: {
		total: number;
		unfiltered_total: number;
		by_surface: Record<string, number>;
		by_classification: Record<string, number>;
		recommended_actions: Record<string, number>;
	};
	records: CaptureReviewRecord[];
}

export interface CaptureReviewDecisionSummary {
	id: string;
	reviewed_by: string;
	reviewed_at: string;
	notes: string | null;
	metadata: Record<string, unknown>;
}

export interface CaptureReviewDecisionRow {
	id: string;
	surface: CaptureSurface;
	source_id: string;
	email: string | null;
	email_hash: string | null;
	classification_label: CaptureClassificationLabel;
	confidence: CaptureClassification['confidence'];
	recommended_action: CaptureRecommendedAction;
	notes: string | null;
	reviewed_by: string;
	reviewed_at: string;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

export interface CaptureReviewDecisionInput {
	surface: CaptureSurface;
	sourceId: string;
	email?: string | null;
	emailHash?: string | null;
	classificationLabel: CaptureClassificationLabel;
	confidence?: CaptureClassification['confidence'];
	recommendedAction: CaptureRecommendedAction;
	notes?: string | null;
	reviewedBy: string;
	metadata?: Record<string, unknown>;
}

export interface CaptureReviewDecisionDeleteInput {
	surface: CaptureSurface;
	sourceId: string;
}

interface D1PreparedStatementLike {
	bind(...values: unknown[]): D1PreparedStatementLike;
	all<T = unknown>(): Promise<{ results?: T[] }>;
	first<T = unknown>(): Promise<T | null>;
	run(): Promise<unknown>;
}

interface D1DatabaseLike {
	prepare(query: string): D1PreparedStatementLike;
}

interface NewsletterRow {
	id: number | string;
	email: string;
	status: string | null;
	source: string | null;
	subscribed_at: string | null;
	created_at: string | null;
	updated_at: string | null;
	confirmed_at: string | null;
	unsubscribed_at: string | null;
	bounce_count: number | null;
	last_bounce_at: string | null;
}

interface ContactRow {
	id: number | string;
	name: string | null;
	email: string | null;
	company: string | null;
	service: string | null;
	status: string | null;
	submitted_at: string | null;
	created_at: string | null;
	updated_at: string | null;
	message_excerpt: string | null;
}

interface LeadRow {
	id: string;
	name: string | null;
	email: string | null;
	company: string | null;
	source: string | null;
	source_detail: string | null;
	campaign: string | null;
	stage: string | null;
	service_interest: string | null;
	first_touch_at: string | null;
	last_touch_at: string | null;
	created_at: string | null;
	updated_at: string | null;
	notes_excerpt: string | null;
}

interface AtlasSessionRow {
	id: string;
	email_hash: string | null;
	readiness_slug: string | null;
	readiness_score: number | null;
	canvas_json: string | null;
	summary: string | null;
	source: string | null;
	created_at: string | null;
	updated_at: string | null;
	summary_excerpt: string | null;
}

interface UserRow {
	id: string;
	username: string | null;
	email: string | null;
	role: string | null;
	created_at: string | null;
	updated_at: string | null;
	last_login: string | null;
}

interface CommercialAccountRow {
	id: string;
	normalized_email: string | null;
	stripe_customer_id: string | null;
	stripe_subscription_id: string | null;
	product_id: string | null;
	service_tier: string | null;
	subscription_status: string | null;
	contract_active: number | null;
	billing_active: number | null;
	metadata_excerpt: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface LegacyContactRow {
	id: number | string;
	name: string | null;
	email: string | null;
	created_at: string | null;
}

interface McpEntitlementRow {
	auth_subject: string | null;
	auth_email: string | null;
	tenant_id: string | null;
	service_tier: string | null;
	contract_active: number | null;
	billing_active: number | null;
	metadata_excerpt: string | null;
	created_at: string | null;
	updated_at: string | null;
}

const TEST_EMAILS = new Set([
	'test@example.com',
	'test-deployment@example.com',
	'test-new-design@example.com',
	'demo@createsomething.agency',
]);

const FIXTURE_EMAILS = new Set(['alice@techstartup.com', 'bob@enterprise.com', 'charlie@email.com']);
const INTERNAL_DOMAINS = new Set(['createsomething.io', 'createsomething.agency']);
const PLACEHOLDER_EMAILS = new Set(['legacy@placeholder.com']);
const VALID_SURFACES = new Set<CaptureSurface>([
	'newsletter',
	'contact',
	'lead',
	'public_atlas',
	'user',
	'commercial_account',
	'legacy_contact',
	'mcp_entitlement',
]);
const VALID_CLASSIFICATION_LABELS = new Set<CaptureClassificationLabel>([
	'actual_user',
	'customer_record',
	'internal_test',
	'fixture',
	'likely_bot',
	'spam',
	'legacy_placeholder',
	'operational_access',
	'needs_review',
]);
const VALID_RECOMMENDED_ACTIONS = new Set<CaptureRecommendedAction>([
	'keep',
	'review',
	'ignore',
	'suppress',
]);
const VALID_CONFIDENCE = new Set<CaptureClassification['confidence']>(['high', 'medium', 'low']);
const ATLAS_KIND_LABELS: Record<PublicAtlasNodeKind, string> = {
	actor: 'Actor',
	human: 'Human task',
	ai: 'AI task',
	system: 'System operation',
	data: 'Data artifact',
	constraint: 'Constraint',
	touchpoint: 'Touchpoint',
};

function normalizeEmail(value: string | null | undefined): string | null {
	const normalized = value?.trim().toLowerCase();
	return normalized || null;
}

function emailDomain(email: string | null): string | null {
	const at = email?.lastIndexOf('@') ?? -1;
	return at >= 0 ? email?.slice(at + 1) ?? null : null;
}

function localPart(email: string | null): string {
	const at = email?.lastIndexOf('@') ?? -1;
	return at >= 0 ? email?.slice(0, at) ?? '' : '';
}

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function parseAtlasCanvas(value: string | null): PublicAtlasCanvas | null {
	if (!value) return null;

	try {
		return normalizePublicAtlasCanvas(JSON.parse(value));
	} catch {
		return null;
	}
}

function labelsByKind(
	artifact: PublicAtlasGraphArtifact,
	kinds: PublicAtlasNodeKind[],
	fallback: string
): string {
	const labels = artifact.nodes
		.filter((node) => kinds.includes(node.kind))
		.map((node) => {
			const status = node.status === 'unknown' ? '' : ` (${node.status})`;
			return `${ATLAS_KIND_LABELS[node.kind]}: ${node.label}${status}`;
		});
	return labels.length ? labels.join('; ') : fallback;
}

function firstAtlasWorkflowLabel(artifact: PublicAtlasGraphArtifact): string {
	return (
		artifact.nodes.find((node) => node.kind === 'data')?.label ??
		artifact.nodes.find((node) => node.kind === 'actor')?.label ??
		'Captured Atlas workflow'
	);
}

function titleizeAtlasStarterId(canvasId: string): string | null {
	const match = canvasId.match(/^public_atlas_([a-z0-9-]+)_/);
	if (!match?.[1]) return null;
	const words = match[1].split('-');
	return words
		.map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
		.join(' ');
}

function buildAtlasDevelopmentHandoff(row: AtlasSessionRow): AtlasDevelopmentHandoff | null {
	const canvas = parseAtlasCanvas(row.canvas_json);
	if (!canvas) return null;

	const readiness = computePublicAtlasReadiness(canvas);
	const artifact = createPublicAtlasGraphArtifact(canvas, readiness);
	const workflowLabel = firstAtlasWorkflowLabel(artifact);
	const mapLabel = titleizeAtlasStarterId(canvas.id) ?? workflowLabel;
	const lane: AtlasDevelopmentHandoff['lane'] =
		readiness.slug === 'needs-shape' ? 'research/no-edit' : 'claim-worktree';
	const title = `Implement Atlas handoff: ${mapLabel}`;
	const goal =
		readiness.slug === 'needs-shape'
			? `Clarify ${mapLabel} until the owner, durable record, approval boundary, and first stop condition are explicit.`
			: `Turn ${mapLabel} into the next reviewed development slice with explicit state, execution, and judgment boundaries.`;
	const database = labelsByKind(
		artifact,
		['data', 'touchpoint'],
		'No durable data artifact or inspection touchpoint mapped yet.'
	);
	const automation = labelsByKind(
		artifact,
		['system', 'ai'],
		'No run path or bounded AI task mapped yet.'
	);
	const judgment = labelsByKind(
		artifact,
		['actor', 'human', 'constraint'],
		'No owner, approval, or stop condition mapped yet.'
	);
	const handoffs = artifact.edges.length
		? artifact.edges.map((edge) => `${edge.source} -> ${edge.target} (${edge.relationship})`).join('; ')
		: 'No handoffs mapped yet.';
	const summary = row.summary ?? summarizePublicAtlasCanvas(canvas, readiness);
	const packet = [
		`Atlas session: ${row.id}`,
		`Atlas map: ${mapLabel}`,
		`Source: ${row.source ?? 'agency-public-atlas'}`,
		`Readiness: ${readiness.level} (${readiness.score}/100)`,
		`Lane: ${lane}`,
		`Tier: mixed`,
		`Goal: ${goal}`,
		'',
		'Database:',
		`- ${database}`,
		'',
		'Automation:',
		`- ${automation}`,
		'',
		'Judgment:',
		`- ${judgment}`,
		'',
		'Acceptance criteria:',
		'- Development scope names the durable record, run path, approval point, stop condition, and proof surface.',
		'- Implementation preserves the public Atlas boundary: no production writes, credential capture, or third-party mutation without an owning promotion workflow.',
		'- Operator evidence can be recorded in Linear or a PR body before promotion.',
		'',
		'Verification:',
		'- Add or update the nearest route/unit test for the selected slice.',
		'- Run the package-local test/check command that covers the touched surface.',
		'- Smoke the public or admin route if the change is promoted.',
		'',
		'Stop conditions:',
		'- Pause if the map requires credentials, PHI/PII export, production writes, or unclear approval authority.',
		'- Pause if the owning data source or runtime binding is unavailable.',
		'',
		`Handoffs: ${handoffs}`,
		'',
		'Canvas summary:',
		summary,
	].join('\n');

	return {
		title,
		tier: 'mixed',
		lane,
		goal,
		packet,
		linear_create_command: `pnpm linear:create -- --title ${shellQuote(title)} --description '<paste handoff packet>' --label code-quality`,
	};
}

function isGeneratedLookingEmail(email: string | null): boolean {
	const domain = emailDomain(email);
	if (domain !== 'gmail.com' && domain !== 'yahoo.com') return false;
	return /^[a-z]{7,12}\d{2,4}$/.test(localPart(email));
}

function classifyBase(record: {
	surface: CaptureSurface;
	email: string | null;
	name?: string | null;
	source?: string | null;
	source_detail?: string | null;
	status?: string | null;
	excerpt?: string | null;
	metadata?: Record<string, unknown>;
}): CaptureClassification {
	const email = normalizeEmail(record.email);
	const domain = emailDomain(email);
	const text = `${record.name ?? ''} ${record.source ?? ''} ${record.source_detail ?? ''} ${record.status ?? ''} ${record.excerpt ?? ''}`.toLowerCase();
	const reasons: string[] = [];

	if (email && (TEST_EMAILS.has(email) || email.startsWith('codex.oauth.probe+'))) {
		return {
			label: 'internal_test',
			confidence: 'high',
			recommended_action: 'ignore',
			reasons: ['Email is an explicit test, demo, or Codex probe address.'],
		};
	}

	if (email && INTERNAL_DOMAINS.has(domain ?? '')) {
		return {
			label: 'internal_test',
			confidence: 'high',
			recommended_action: 'ignore',
			reasons: ['Email belongs to a CREATE SOMETHING domain.'],
		};
	}

	if (email && PLACEHOLDER_EMAILS.has(email)) {
		return {
			label: 'legacy_placeholder',
			confidence: 'high',
			recommended_action: 'ignore',
			reasons: ['Email is a known legacy placeholder value.'],
		};
	}

	if (email && FIXTURE_EMAILS.has(email)) {
		return {
			label: 'fixture',
			confidence: 'high',
			recommended_action: 'ignore',
			reasons: ['Email matches a seeded fixture contact.'],
		};
	}

	if (
		record.surface === 'contact' &&
		(text.includes('book meetings') ||
			text.includes('targeted outreach') ||
			text.includes('100 million') ||
			text.includes('drive traffic'))
	) {
		return {
			label: 'spam',
			confidence: 'high',
			recommended_action: 'suppress',
			reasons: ['Contact message is a generic outbound lead-generation pitch.'],
		};
	}

	if (email && isGeneratedLookingEmail(email)) {
		return {
			label: 'likely_bot',
			confidence: 'medium',
			recommended_action: 'suppress',
			reasons: ['Email local part looks randomly generated and has no stronger source evidence.'],
		};
	}

	if (record.surface === 'newsletter') {
		if (record.status === 'active' && record.source && !text.includes('unconfirmed')) {
			return {
				label: 'actual_user',
				confidence: 'high',
				recommended_action: 'keep',
				reasons: ['Newsletter row is active and has a source attribution.'],
			};
		}

		reasons.push('Newsletter row lacks enough source or confirmation context for automatic trust.');
	}

	if (record.surface === 'lead') {
		return {
			label: 'actual_user',
			confidence: 'high',
			recommended_action: 'keep',
			reasons: ['Row is already promoted into the funnel leads table.'],
		};
	}

	if (record.surface === 'commercial_account') {
		return {
			label: 'customer_record',
			confidence: 'high',
			recommended_action: 'keep',
			reasons: ['Row was created from Stripe customer, invoice, or subscription state.'],
		};
	}

	if (record.surface === 'mcp_entitlement') {
		return {
			label: 'operational_access',
			confidence: 'high',
			recommended_action: 'keep',
			reasons: ['Row is an MCP entitlement or partner access record, not public capture.'],
		};
	}

	if (record.surface === 'user') {
		return {
			label: 'internal_test',
			confidence: 'medium',
			recommended_action: 'ignore',
			reasons: ['Local users table currently contains demo/admin style records.'],
		};
	}

	return {
		label: 'needs_review',
		confidence: 'low',
		recommended_action: 'review',
		reasons: reasons.length > 0 ? reasons : ['No deterministic classification rule matched this row.'],
	};
}

export function classifyCaptureRecord(
	record: Omit<CaptureReviewRecord, 'classification'>
): CaptureClassification {
	return classifyBase(record);
}

async function sha256Hex(value: string): Promise<string> {
	const subtle = globalThis.crypto?.subtle;
	if (subtle) {
		const encoded = new TextEncoder().encode(value);
		const digest = await subtle.digest('SHA-256', encoded);
		return Array.from(new Uint8Array(digest))
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
	}

	const crypto = await import('node:crypto');
	return crypto.createHash('sha256').update(value).digest('hex');
}

export async function matchAtlasEmailHash(
	emailHash: string | null | undefined,
	emails: Iterable<string | null | undefined>
): Promise<string | null> {
	if (!emailHash) return null;
	const normalizedHash = emailHash.trim().toLowerCase();

	for (const rawEmail of emails) {
		const email = normalizeEmail(rawEmail);
		if (!email) continue;
		if ((await sha256Hex(`email:${email}`)) === normalizedHash) {
			return email;
		}
	}

	return null;
}

async function tableExists(db: D1DatabaseLike, tableName: string): Promise<boolean> {
	const row = await db
		.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
		.bind(tableName)
		.first<{ name: string }>();
	return Boolean(row?.name);
}

async function queryAll<T>(
	db: D1DatabaseLike,
	sql: string,
	values: unknown[] = []
): Promise<T[]> {
	const statement = db.prepare(sql);
	const result = values.length > 0 ? await statement.bind(...values).all<T>() : await statement.all<T>();
	return result.results ?? [];
}

function boundedLimit(value: number | undefined): number {
	if (!Number.isFinite(value) || !value) return 100;
	return Math.max(1, Math.min(500, Math.floor(value)));
}

function normalizeFilters(options: CaptureReviewOptions): CaptureReviewResult['filters'] {
	const surface = options.surface && VALID_SURFACES.has(options.surface as CaptureSurface) ? options.surface : 'all';
	const classification =
		options.classification && VALID_CLASSIFICATION_LABELS.has(options.classification as CaptureClassificationLabel)
			? options.classification
			: 'all';
	const action =
		options.action && VALID_RECOMMENDED_ACTIONS.has(options.action as CaptureRecommendedAction)
			? options.action
			: 'all';
	const reviewed =
		options.reviewed === 'reviewed' || options.reviewed === 'unreviewed' ? options.reviewed : 'all';

	return {
		surface,
		classification,
		action,
		reviewed,
		query: options.query?.trim().toLowerCase() ?? '',
	};
}

function addRecord(records: CaptureReviewRecord[], record: Omit<CaptureReviewRecord, 'classification'>): void {
	records.push({
		...record,
		classification: classifyCaptureRecord(record),
	});
}

function createId(prefix: string): string {
	const random =
		typeof crypto !== 'undefined' && 'randomUUID' in crypto
			? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
			: Math.random().toString(36).slice(2, 14);
	return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function decisionKey(surface: CaptureSurface, sourceId: string): string {
	return `${surface}:${sourceId}`;
}

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function assertValidDecisionInput(input: CaptureReviewDecisionInput): void {
	if (!VALID_SURFACES.has(input.surface)) {
		throw new Error(`Invalid capture surface: ${input.surface}`);
	}
	if (!input.sourceId.trim()) {
		throw new Error('sourceId is required');
	}
	if (!VALID_CLASSIFICATION_LABELS.has(input.classificationLabel)) {
		throw new Error(`Invalid classification label: ${input.classificationLabel}`);
	}
	if (!VALID_RECOMMENDED_ACTIONS.has(input.recommendedAction)) {
		throw new Error(`Invalid recommended action: ${input.recommendedAction}`);
	}
	if (input.confidence && !VALID_CONFIDENCE.has(input.confidence)) {
		throw new Error(`Invalid confidence: ${input.confidence}`);
	}
	if (!input.reviewedBy.trim()) {
		throw new Error('reviewedBy is required');
	}
}

function assertValidDecisionDeleteInput(input: CaptureReviewDecisionDeleteInput): void {
	if (!VALID_SURFACES.has(input.surface)) {
		throw new Error(`Invalid capture surface: ${input.surface}`);
	}
	if (!input.sourceId.trim()) {
		throw new Error('sourceId is required');
	}
}

function applyStoredDecisions(
	records: CaptureReviewRecord[],
	decisions: Map<string, CaptureReviewDecisionRow>
): void {
	for (const record of records) {
		const decision = decisions.get(decisionKey(record.surface, record.id));
		if (!decision) continue;

		const computed = record.classification;
		record.classification = {
			label: decision.classification_label,
			confidence: decision.confidence,
			recommended_action: decision.recommended_action,
			reasons: [
				`Operator reviewed this ${record.surface} row on ${decision.reviewed_at}.`,
				...(decision.notes ? [decision.notes] : []),
			],
		};
		record.review = {
			id: decision.id,
			reviewed_by: decision.reviewed_by,
			reviewed_at: decision.reviewed_at,
			notes: decision.notes,
			metadata: {
				...parseMetadata(decision.metadata_json),
				computed_classification: computed,
			},
		};
	}
}

function searchableText(record: CaptureReviewRecord): string {
	const metadataValues = Object.values(record.metadata ?? {})
		.map((value) => (value == null ? '' : String(value)))
		.join(' ');
	return [
		record.id,
		record.surface,
		record.email,
		record.email_hash,
		record.matched_email,
		record.name,
		record.status,
		record.source,
		record.source_detail,
		record.excerpt,
		record.classification.label,
		record.classification.recommended_action,
		metadataValues,
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
}

function filterRecords(
	records: CaptureReviewRecord[],
	filters: CaptureReviewResult['filters']
): CaptureReviewRecord[] {
	return records.filter((record) => {
		if (filters.surface !== 'all' && record.surface !== filters.surface) return false;
		if (filters.classification !== 'all' && record.classification.label !== filters.classification) return false;
		if (filters.action !== 'all' && record.classification.recommended_action !== filters.action) return false;
		if (filters.reviewed === 'reviewed' && !record.review) return false;
		if (filters.reviewed === 'unreviewed' && record.review) return false;
		if (filters.query && !searchableText(record).includes(filters.query)) return false;
		return true;
	});
}

async function listCaptureReviewDecisions(
	db: D1DatabaseLike
): Promise<{ available: boolean; decisions: Map<string, CaptureReviewDecisionRow> }> {
	if (!(await tableExists(db, 'capture_review_decisions'))) {
		return { available: false, decisions: new Map() };
	}

	const rows = await queryAll<CaptureReviewDecisionRow>(
		db,
		`SELECT id, surface, source_id, email, email_hash, classification_label, confidence,
		        recommended_action, notes, reviewed_by, reviewed_at, metadata_json, created_at, updated_at
		   FROM capture_review_decisions`
	);

	return {
		available: true,
		decisions: new Map(rows.map((row) => [decisionKey(row.surface, row.source_id), row])),
	};
}

export async function upsertCaptureReviewDecision(
	db: D1DatabaseLike,
	input: CaptureReviewDecisionInput
): Promise<CaptureReviewDecisionRow> {
	assertValidDecisionInput(input);
	if (!(await tableExists(db, 'capture_review_decisions'))) {
		throw new Error('capture_review_decisions table is not available; apply migration 0029 first');
	}

	const id = createId('capture_review');
	const now = new Date().toISOString();
	const confidence = input.confidence ?? 'high';
	const metadata = JSON.stringify(input.metadata ?? {});

	await db
		.prepare(
			`INSERT INTO capture_review_decisions (
				id,
				surface,
				source_id,
				email,
				email_hash,
				classification_label,
				confidence,
				recommended_action,
				notes,
				reviewed_by,
				reviewed_at,
				metadata_json,
				created_at,
				updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(surface, source_id) DO UPDATE SET
				email = excluded.email,
				email_hash = excluded.email_hash,
				classification_label = excluded.classification_label,
				confidence = excluded.confidence,
				recommended_action = excluded.recommended_action,
				notes = excluded.notes,
				reviewed_by = excluded.reviewed_by,
				reviewed_at = excluded.reviewed_at,
				metadata_json = excluded.metadata_json,
				updated_at = excluded.updated_at`
		)
		.bind(
			id,
			input.surface,
			input.sourceId.trim(),
			normalizeEmail(input.email),
			input.emailHash?.trim().toLowerCase() || null,
			input.classificationLabel,
			confidence,
			input.recommendedAction,
			input.notes?.trim() || null,
			input.reviewedBy.trim(),
			now,
			metadata,
			now,
			now
		)
		.run();

	const row = await db
		.prepare(
			`SELECT id, surface, source_id, email, email_hash, classification_label, confidence,
			        recommended_action, notes, reviewed_by, reviewed_at, metadata_json, created_at, updated_at
			   FROM capture_review_decisions
			  WHERE surface = ? AND source_id = ?`
		)
		.bind(input.surface, input.sourceId.trim())
		.first<CaptureReviewDecisionRow>();

	if (!row) {
		throw new Error('Failed to read stored capture review decision');
	}
	return row;
}

export async function deleteCaptureReviewDecision(
	db: D1DatabaseLike,
	input: CaptureReviewDecisionDeleteInput
): Promise<{ deleted: boolean }> {
	assertValidDecisionDeleteInput(input);
	if (!(await tableExists(db, 'capture_review_decisions'))) {
		throw new Error('capture_review_decisions table is not available; apply migration 0029 first');
	}

	await db
		.prepare(`DELETE FROM capture_review_decisions WHERE surface = ? AND source_id = ?`)
		.bind(input.surface, input.sourceId.trim())
		.run();

	const row = await db
		.prepare(`SELECT id FROM capture_review_decisions WHERE surface = ? AND source_id = ?`)
		.bind(input.surface, input.sourceId.trim())
		.first<{ id: string }>();

	return { deleted: !row };
}

export async function buildCaptureReview(
	db: D1DatabaseLike,
	options: CaptureReviewOptions = {}
): Promise<CaptureReviewResult> {
	const limit = boundedLimit(options.limit);
	const includeOperational = Boolean(options.includeOperational);
	const filters = normalizeFilters(options);
	const records: CaptureReviewRecord[] = [];
	const knownEmails = new Set<string>();
	const decisionStorage = await listCaptureReviewDecisions(db);

	if (await tableExists(db, 'newsletter_subscribers')) {
		const rows = await queryAll<NewsletterRow>(
			db,
			`SELECT id, email, status, source, subscribed_at, created_at, updated_at,
			        confirmed_at, unsubscribed_at, bounce_count, last_bounce_at
			   FROM newsletter_subscribers
			  ORDER BY datetime(COALESCE(created_at, subscribed_at)) DESC
			  LIMIT ?`,
			[limit]
		);

		for (const row of rows) {
			const email = normalizeEmail(row.email);
			if (email) knownEmails.add(email);
			const confirmedState = row.confirmed_at ? 'confirmed' : 'unconfirmed';
			addRecord(records, {
				id: String(row.id),
				surface: 'newsletter',
				email,
				name: null,
				status: row.status,
				source: row.source,
				source_detail: confirmedState,
				captured_at: row.created_at ?? row.subscribed_at,
				updated_at: row.updated_at,
				metadata: {
					confirmed_at: row.confirmed_at,
					unsubscribed_at: row.unsubscribed_at,
					bounce_count: row.bounce_count ?? 0,
					last_bounce_at: row.last_bounce_at,
				},
			});
		}
	}

	if (await tableExists(db, 'contact_submissions')) {
		const rows = await queryAll<ContactRow>(
			db,
			`SELECT id, name, email, company, service, status, submitted_at, created_at, updated_at,
			        substr(message, 1, 280) AS message_excerpt
			   FROM contact_submissions
			  ORDER BY datetime(COALESCE(submitted_at, created_at)) DESC
			  LIMIT ?`,
			[limit]
		);

		for (const row of rows) {
			const email = normalizeEmail(row.email);
			if (email) knownEmails.add(email);
			addRecord(records, {
				id: String(row.id),
				surface: 'contact',
				email,
				name: row.name,
				status: row.status,
				source: 'contact_form',
				source_detail: row.service,
				captured_at: row.submitted_at ?? row.created_at,
				updated_at: row.updated_at,
				excerpt: row.message_excerpt,
				metadata: {
					company: row.company,
				},
			});
		}
	}

	if (await tableExists(db, 'leads')) {
		const rows = await queryAll<LeadRow>(
			db,
			`SELECT id, name, email, company, source, source_detail, campaign, stage, service_interest,
			        first_touch_at, last_touch_at, created_at, updated_at, substr(notes, 1, 280) AS notes_excerpt
			   FROM leads
			  ORDER BY datetime(COALESCE(updated_at, created_at, last_touch_at)) DESC
			  LIMIT ?`,
			[limit]
		);

		for (const row of rows) {
			const email = normalizeEmail(row.email);
			if (email) knownEmails.add(email);
			addRecord(records, {
				id: row.id,
				surface: 'lead',
				email,
				name: row.name,
				status: row.stage,
				source: row.source,
				source_detail: row.source_detail,
				captured_at: row.created_at ?? row.first_touch_at,
				updated_at: row.updated_at ?? row.last_touch_at,
				excerpt: row.notes_excerpt,
				metadata: {
					company: row.company,
					campaign: row.campaign,
					service_interest: row.service_interest,
				},
			});
		}
	}

	if (includeOperational) {
		await appendOperationalRecords(db, records, knownEmails, limit);
	}

	if (await tableExists(db, 'public_atlas_sessions')) {
		const rows = await queryAll<AtlasSessionRow>(
			db,
			`SELECT id, email_hash, readiness_slug, readiness_score, source, created_at, updated_at,
			        canvas_json, summary, substr(summary, 1, 220) AS summary_excerpt
			   FROM public_atlas_sessions
			  WHERE email_hash IS NOT NULL
			  ORDER BY datetime(COALESCE(updated_at, created_at)) DESC
			  LIMIT ?`,
			[limit]
		);

		for (const row of rows) {
			const matchedEmail = await matchAtlasEmailHash(row.email_hash, knownEmails);
			const atlasHandoff = buildAtlasDevelopmentHandoff(row);
			addRecord(records, {
				id: row.id,
				surface: 'public_atlas',
				email: matchedEmail,
				email_hash: row.email_hash,
				matched_email: matchedEmail,
				status: row.readiness_slug,
				source: row.source,
				captured_at: row.created_at,
				updated_at: row.updated_at,
				excerpt: row.summary_excerpt,
				metadata: {
					readiness_score: row.readiness_score,
					hash_matched_from_known_email: Boolean(matchedEmail),
					atlas_handoff_title: atlasHandoff?.title,
					atlas_handoff_lane: atlasHandoff?.lane,
				},
				atlas_handoff: atlasHandoff,
			});
		}
	}

	applyStoredDecisions(records, decisionStorage.decisions);
	const filteredRecords = filterRecords(records, filters);
	const summary = summarizeRecords(filteredRecords, records.length);
	return {
		generated_at: new Date().toISOString(),
		limits: {
			per_surface: limit,
			include_operational: includeOperational,
		},
		filters,
		decision_storage: {
			available: decisionStorage.available,
			stored_count: decisionStorage.decisions.size,
		},
		summary,
		records: filteredRecords.sort((a, b) => (b.captured_at ?? '').localeCompare(a.captured_at ?? '')),
	};
}

async function appendOperationalRecords(
	db: D1DatabaseLike,
	records: CaptureReviewRecord[],
	knownEmails: Set<string>,
	limit: number
): Promise<void> {
	if (await tableExists(db, 'users')) {
		const rows = await queryAll<UserRow>(
			db,
			`SELECT id, username, email, role, created_at, updated_at, last_login
			   FROM users
			  ORDER BY datetime(created_at) DESC
			  LIMIT ?`,
			[limit]
		);

		for (const row of rows) {
			const email = normalizeEmail(row.email);
			if (email) knownEmails.add(email);
			addRecord(records, {
				id: row.id,
				surface: 'user',
				email,
				name: row.username,
				status: row.role,
				source: 'users',
				captured_at: row.created_at,
				updated_at: row.updated_at,
				metadata: { last_login: row.last_login },
			});
		}
	}

	if (await tableExists(db, 'agency_commercial_accounts')) {
		const rows = await queryAll<CommercialAccountRow>(
			db,
			`SELECT id, normalized_email, stripe_customer_id, stripe_subscription_id, product_id, service_tier,
			        subscription_status, contract_active, billing_active, substr(metadata_json, 1, 260) AS metadata_excerpt,
			        created_at, updated_at
			   FROM agency_commercial_accounts
			  ORDER BY datetime(created_at) DESC
			  LIMIT ?`,
			[limit]
		);

		for (const row of rows) {
			const email = normalizeEmail(row.normalized_email);
			if (email) knownEmails.add(email);
			addRecord(records, {
				id: row.id,
				surface: 'commercial_account',
				email,
				status: row.subscription_status,
				source: 'stripe',
				source_detail: row.service_tier,
				captured_at: row.created_at,
				updated_at: row.updated_at,
				excerpt: row.metadata_excerpt,
				metadata: {
					stripe_customer_id: row.stripe_customer_id,
					stripe_subscription_id: row.stripe_subscription_id,
					product_id: row.product_id,
					contract_active: row.contract_active === 1,
					billing_active: row.billing_active === 1,
				},
			});
		}
	}

	if (await tableExists(db, 'contacts')) {
		const rows = await queryAll<LegacyContactRow>(
			db,
			`SELECT id, name, email, created_at
			   FROM contacts
			  ORDER BY datetime(created_at) DESC
			  LIMIT ?`,
			[limit]
		);

		for (const row of rows) {
			const email = normalizeEmail(row.email);
			if (email) knownEmails.add(email);
			addRecord(records, {
				id: String(row.id),
				surface: 'legacy_contact',
				email,
				name: row.name,
				source: 'contacts',
				captured_at: row.created_at,
			});
		}
	}

	if (await tableExists(db, 'agency_mcp_entitlements')) {
		const rows = await queryAll<McpEntitlementRow>(
			db,
			`SELECT auth_subject, auth_email, tenant_id, service_tier, contract_active, billing_active,
			        substr(metadata_json, 1, 180) AS metadata_excerpt, created_at, updated_at
			   FROM agency_mcp_entitlements
			  ORDER BY datetime(created_at) DESC
			  LIMIT ?`,
			[limit]
		);

		for (const row of rows) {
			const email = normalizeEmail(row.auth_email);
			if (email) knownEmails.add(email);
			addRecord(records, {
				id: row.auth_subject ?? `${row.tenant_id ?? 'tenant'}:${row.created_at ?? 'unknown'}`,
				surface: 'mcp_entitlement',
				email,
				status: row.contract_active === 1 && row.billing_active === 1 ? 'active' : 'inactive',
				source: 'mcp_entitlements',
				source_detail: row.service_tier,
				captured_at: row.created_at,
				updated_at: row.updated_at,
				excerpt: row.metadata_excerpt,
				metadata: {
					tenant_id: row.tenant_id,
					contract_active: row.contract_active === 1,
					billing_active: row.billing_active === 1,
				},
			});
		}
	}
}

function summarizeRecords(
	records: CaptureReviewRecord[],
	unfilteredTotal = records.length
): CaptureReviewResult['summary'] {
	const bySurface: Record<string, number> = {};
	const byClassification: Record<string, number> = {};
	const recommendedActions: Record<string, number> = {};

	for (const record of records) {
		bySurface[record.surface] = (bySurface[record.surface] ?? 0) + 1;
		byClassification[record.classification.label] =
			(byClassification[record.classification.label] ?? 0) + 1;
		recommendedActions[record.classification.recommended_action] =
			(recommendedActions[record.classification.recommended_action] ?? 0) + 1;
	}

	return {
		total: records.length,
		unfiltered_total: unfilteredTotal,
		by_surface: bySurface,
		by_classification: byClassification,
		recommended_actions: recommendedActions,
	};
}
