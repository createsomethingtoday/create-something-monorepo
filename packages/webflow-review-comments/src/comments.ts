/**
 * Review comment rules and storage. Kept free of HTTP so the same rules can
 * move into webflow/webflow with the data.
 */

export type ActorRole = 'creator' | 'reviewer';
export type Visibility = 'internal' | 'draft' | 'released';
export type Resolution = 'open' | 'resolved' | 'carried_forward';

export interface Actor {
	email: string;
	role: ActorRole;
	/** Review program of the caller's key (for example "template" or "app"); null reaches every thread. */
	scope: string | null;
}

export interface ReviewComment {
	id: string;
	assetRef: string;
	versionRef: string;
	mongoResourceId: string | null;
	parentId: string | null;
	authorEmail: string;
	authorRole: ActorRole | 'system';
	body: string;
	visibility: Visibility;
	releasedAt: string | null;
	resolution: Resolution;
	rubricRef: string | null;
	createdAt: string;
	editedAt: string | null;
}

export interface NewComment {
	assetRef: string;
	body: string;
	parentId: string | null;
	rubricRef: string | null;
	mongoResourceId: string | null;
	visibility: Visibility;
	/** Set by the caller for one save. A repeat with the same key returns the first comment and writes nothing. */
	requestKey: string | null;
}

/** One draft as the reviewer read it before a release: its id and its last edit time (null when never edited). */
export interface ExpectedDraft {
	id: string;
	editedAt: string | null;
}

/** Thrown for caller mistakes; the router maps `status` onto the response. */
export class CommentError extends Error {
	constructor(
		readonly status: 400 | 403 | 404 | 409,
		message: string
	) {
		super(message);
	}
}

const REF_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_CHARS = 20_000;
const SCOPE_PATTERN = /^[a-z0-9-]{1,32}$/;
const REQUEST_KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_EXPECTED_DRAFTS = 200;
const RESOLUTIONS: readonly Resolution[] = ['open', 'resolved', 'carried_forward'];
const REVIEWER_VISIBILITIES: readonly Visibility[] = ['internal', 'draft', 'released'];

export function isRef(value: unknown): value is string {
	return typeof value === 'string' && REF_PATTERN.test(value);
}

export function isActorRole(value: unknown): value is ActorRole {
	return value === 'creator' || value === 'reviewer';
}

export function isScope(value: unknown): value is string {
	return typeof value === 'string' && SCOPE_PATTERN.test(value);
}

/**
 * The caller has already verified this person's session. The role and scope
 * come from the caller's key, never from the request, so both are trusted here.
 */
export function parseActor(email: string | null, role: ActorRole, scope: string | null = null): Actor | null {
	if (!email || !EMAIL_PATTERN.test(email)) return null;
	return { email: email.toLowerCase(), role, scope };
}

function parseBody(value: unknown): string {
	const body = typeof value === 'string' ? value.trim() : '';
	if (!body) throw new CommentError(400, 'body is required');
	if (body.length > MAX_BODY_CHARS) throw new CommentError(400, `body exceeds ${MAX_BODY_CHARS} characters`);
	return body;
}

function optionalRef(value: unknown, field: string): string | null {
	if (value === undefined || value === null) return null;
	if (!isRef(value)) throw new CommentError(400, `${field} must be a record reference`);
	return value;
}

export function parseNewComment(input: unknown, actor: Actor): NewComment {
	if (!input || typeof input !== 'object') throw new CommentError(400, 'body must be a JSON object');
	const raw = input as Record<string, unknown>;

	if (!isRef(raw.assetRef)) throw new CommentError(400, 'assetRef is required');

	const body = parseBody(raw.body);

	// Creator replies are always visible to reviewers, so they are released on write.
	let visibility: Visibility = 'released';
	if (actor.role === 'reviewer') {
		visibility = (raw.visibility as Visibility | undefined) ?? 'draft';
		if (!REVIEWER_VISIBILITIES.includes(visibility)) {
			throw new CommentError(400, 'visibility must be internal, draft, or released');
		}
	} else if (raw.visibility !== undefined && raw.visibility !== 'released') {
		throw new CommentError(403, 'creators cannot post internal or draft comments');
	}

	return {
		assetRef: raw.assetRef,
		body,
		parentId: optionalRef(raw.parentId, 'parentId'),
		rubricRef: optionalRef(raw.rubricRef, 'rubricRef'),
		mongoResourceId: optionalRef(raw.mongoResourceId, 'mongoResourceId'),
		visibility,
		requestKey: parseRequestKey(raw.requestKey)
	};
}

function parseRequestKey(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== 'string' || !REQUEST_KEY_PATTERN.test(value)) {
		throw new CommentError(400, 'requestKey must be 8 to 64 letters, digits, hyphens or underscores');
	}
	return value;
}

/**
 * The drafts the reviewer read before the release. Absent means the caller
 * sends no list (a decision tool that releases as part of its own step).
 */
export function parseExpectedDrafts(input: unknown): ExpectedDraft[] | null {
	const raw = (input as { expected?: unknown } | null)?.expected;
	if (raw === undefined || raw === null) return null;
	if (!Array.isArray(raw) || raw.length > MAX_EXPECTED_DRAFTS) {
		throw new CommentError(400, `expected must be a list of at most ${MAX_EXPECTED_DRAFTS} drafts`);
	}
	const seen = new Set<string>();
	return raw.map((entry) => {
		const item = entry as { id?: unknown; editedAt?: unknown } | null;
		if (!item || !isRef(item.id) || seen.has(item.id)) throw new CommentError(400, 'expected holds a draft id that is not valid');
		seen.add(item.id);
		const editedAt = item.editedAt ?? null;
		if (editedAt !== null && (typeof editedAt !== 'string' || editedAt.length > 40)) {
			throw new CommentError(400, 'expected holds an editedAt that is not valid');
		}
		return { id: item.id, editedAt };
	});
}

export function parseEdit(input: unknown): string {
	if (!input || typeof input !== 'object') throw new CommentError(400, 'body must be a JSON object');
	return parseBody((input as Record<string, unknown>).body);
}

export function parseResolution(input: unknown): Resolution {
	const value = (input as { resolution?: unknown } | null)?.resolution;
	if (!RESOLUTIONS.includes(value as Resolution)) {
		throw new CommentError(400, 'resolution must be open, resolved, or carried_forward');
	}
	return value as Resolution;
}

interface CommentRow {
	id: string;
	asset_ref: string;
	version_ref: string;
	mongo_resource_id: string | null;
	parent_id: string | null;
	author_email: string;
	author_role: ActorRole | 'system';
	body: string;
	visibility: Visibility;
	released_at: string | null;
	resolution: Resolution;
	rubric_ref: string | null;
	created_at: string;
	edited_at: string | null;
	request_key?: string | null;
}

function toComment(row: CommentRow): ReviewComment {
	return {
		id: row.id,
		assetRef: row.asset_ref,
		versionRef: row.version_ref,
		mongoResourceId: row.mongo_resource_id,
		parentId: row.parent_id,
		authorEmail: row.author_email,
		authorRole: row.author_role,
		body: row.body,
		visibility: row.visibility,
		releasedAt: row.released_at,
		resolution: row.resolution,
		rubricRef: row.rubric_ref,
		createdAt: row.created_at,
		editedAt: row.edited_at
	};
}

// Creators only ever see released comments; reviewers see everything.
function visibilityClause(actor: Actor): string {
	return actor.role === 'creator' ? " AND visibility = 'released'" : '';
}

/**
 * A scoped key reaches only the threads opened under its scope. Out-of-scope
 * rows read as absent, so one review program cannot learn of or change
 * another program's threads.
 */
function scopeClause(actor: Actor): { sql: string; params: string[] } {
	if (!actor.scope) return { sql: '', params: [] };
	return {
		sql: ' AND version_ref IN (SELECT version_ref FROM review_versions WHERE scope = ?)',
		params: [actor.scope]
	};
}

export async function listByVersion(db: D1Database, versionRef: string, actor: Actor): Promise<ReviewComment[]> {
	const scope = scopeClause(actor);
	const { results } = await db
		.prepare(
			`SELECT * FROM review_comments WHERE version_ref = ?${visibilityClause(actor)}${scope.sql} ORDER BY created_at, id`
		)
		.bind(versionRef, ...scope.params)
		.all<CommentRow>();
	return results.map(toComment);
}

export async function listByAsset(db: D1Database, assetRef: string, actor: Actor): Promise<ReviewComment[]> {
	const scope = scopeClause(actor);
	const { results } = await db
		.prepare(
			`SELECT * FROM review_comments WHERE asset_ref = ?${visibilityClause(actor)}${scope.sql} ORDER BY created_at, id`
		)
		.bind(assetRef, ...scope.params)
		.all<CommentRow>();
	return results.map(toComment);
}

async function getRow(db: D1Database, id: string): Promise<CommentRow | null> {
	return db.prepare('SELECT * FROM review_comments WHERE id = ?').bind(id).first<CommentRow>();
}

/** The comment, or null when it does not exist or sits outside the caller's scope. */
async function getRowInScope(db: D1Database, id: string, actor: Actor): Promise<CommentRow | null> {
	const scope = scopeClause(actor);
	return db
		.prepare(`SELECT * FROM review_comments WHERE id = ?${scope.sql}`)
		.bind(id, ...scope.params)
		.first<CommentRow>();
}

async function pinnedVersion(db: D1Database, versionRef: string): Promise<{ asset_ref: string; scope: string | null } | null> {
	return db
		.prepare('SELECT asset_ref, scope FROM review_versions WHERE version_ref = ?')
		.bind(versionRef)
		.first<{ asset_ref: string; scope: string | null }>();
}

/** True once the review team has released feedback on the version, so the creator can see its thread. */
async function hasReleasedThread(db: D1Database, versionRef: string): Promise<boolean> {
	const row = await db
		.prepare(`SELECT 1 AS found FROM review_comments WHERE version_ref = ? AND visibility = 'released' LIMIT 1`)
		.bind(versionRef)
		.first();
	return Boolean(row);
}

/**
 * A version belongs to one asset. Only a reviewer opens the thread: their
 * caller reads the asset from the review record, so the first reviewer
 * comment pins it (atomically, by primary key). A creator caller can only
 * write to, or read, a version already pinned to the asset it names. A caller
 * mistake therefore cannot leak feedback into another creator's history, and
 * a creator key cannot claim another creator's version. The pin also keeps the
 * scope of the key that opened the thread. A thread that holds only drafts or
 * internal notes reads as absent to a creator, so a reply cannot land in it
 * and its existence stays private.
 */
async function requireVersionAsset(db: D1Database, versionRef: string, assetRef: string, actor: Actor): Promise<void> {
	if (actor.role === 'reviewer') {
		await db
			.prepare('INSERT OR IGNORE INTO review_versions (version_ref, asset_ref, scope) VALUES (?, ?, ?)')
			.bind(versionRef, assetRef, actor.scope)
			.run();
	}
	const pinned = await pinnedVersion(db, versionRef);
	// A thread in another scope reads as absent.
	if (!pinned || (actor.scope && pinned.scope !== actor.scope)) {
		throw new CommentError(404, 'no review thread on this version');
	}
	if (pinned.asset_ref !== assetRef) throw new CommentError(409, 'version belongs to a different asset');
	if (actor.role === 'creator' && !(await hasReleasedThread(db, versionRef))) {
		throw new CommentError(404, 'no review thread on this version');
	}
}

/** Creators read a version only through the asset they own; the caller checked that ownership. */
export async function requireCreatorVersionAccess(db: D1Database, versionRef: string, assetRef: unknown): Promise<void> {
	if (!isRef(assetRef)) throw new CommentError(400, 'assetRef is required');
	if ((await pinnedVersion(db, versionRef))?.asset_ref !== assetRef || !(await hasReleasedThread(db, versionRef))) {
		throw new CommentError(404, 'no review thread on this version');
	}
}

export async function createComment(
	db: D1Database,
	versionRef: string,
	input: NewComment,
	actor: Actor,
	now: string = new Date().toISOString()
): Promise<ReviewComment> {
	if (input.parentId) {
		const parent = await getRow(db, input.parentId);
		// A creator must not learn that a hidden parent exists, so both cases read as 404.
		if (
			!parent ||
			parent.version_ref !== versionRef ||
			(actor.role === 'creator' && parent.visibility !== 'released')
		) {
			throw new CommentError(404, 'parent comment not found on this version');
		}
	}

	// After input checks, so a rejected request never leaves a pin behind.
	await requireVersionAsset(db, versionRef, input.assetRef, actor);

	// A repeat of one save (a second click, a retry after a lost answer) returns the first comment.
	const repeated = async (): Promise<ReviewComment | null> => {
		if (!input.requestKey) return null;
		const first = await db
			.prepare('SELECT * FROM review_comments WHERE author_email = ? AND request_key = ?')
			.bind(actor.email, input.requestKey)
			.first<CommentRow>();
		if (!first) return null;
		if (first.version_ref !== versionRef || first.body !== input.body) {
			throw new CommentError(409, 'requestKey was used for a different comment');
		}
		return toComment(first);
	};
	const earlier = await repeated();
	if (earlier) return earlier;

	const id = crypto.randomUUID();
	const insert = db
		.prepare(
			`INSERT INTO review_comments
			   (id, asset_ref, version_ref, mongo_resource_id, parent_id, author_email, author_role,
			    body, visibility, released_at, rubric_ref, created_at, request_key)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			input.assetRef,
			versionRef,
			input.mongoResourceId,
			input.parentId,
			actor.email,
			actor.role,
			input.body,
			input.visibility,
			input.visibility === 'released' ? now : null,
			input.rubricRef,
			now,
			input.requestKey
		);
	try {
		await insert.run();
	} catch (cause) {
		// Two requests with one key at the same moment: the unique index lets one in, the other reads it.
		const winner = input.requestKey ? await repeated() : null;
		if (winner) return winner;
		throw cause;
	}

	return toComment((await getRow(db, id)) as CommentRow);
}

/**
 * A condition that is true only while the drafts on the version are exactly
 * the expected ones, each with the same last edit. It is part of the release
 * statement itself, so a draft that is added or edited at the last moment
 * stops the whole release.
 */
export function expectedDraftsGuard(
	versionRef: string,
	actor: Actor,
	expected: ExpectedDraft[]
): { sql: string; params: Array<string | number | null> } {
	const scope = actor.scope ? ' AND d.version_ref IN (SELECT version_ref FROM review_versions WHERE scope = ?)' : '';
	const scopeParams = actor.scope ? [actor.scope] : [];
	const all = `(SELECT COUNT(*) FROM review_comments d WHERE d.version_ref = ? AND d.visibility = 'draft'${scope}) = ?`;
	if (!expected.length) return { sql: ` AND ${all}`, params: [versionRef, ...scopeParams, 0] };
	const each = expected.map(() => '(d.id = ? AND d.edited_at IS ?)').join(' OR ');
	const same = `(SELECT COUNT(*) FROM review_comments d WHERE d.version_ref = ? AND d.visibility = 'draft'${scope} AND (${each})) = ?`;
	return {
		sql: ` AND ${all} AND ${same}`,
		params: [
			versionRef,
			...scopeParams,
			expected.length,
			versionRef,
			...scopeParams,
			...expected.flatMap((draft) => [draft.id, draft.editedAt]),
			expected.length
		]
	};
}

/**
 * The "send feedback" moment: every draft on the version becomes visible to
 * the creator. Internal notes stay internal. The caller sets the review status
 * first; the email is queued with this release and sent after it (notify.ts).
 */
export async function releaseVersion(
	db: D1Database,
	versionRef: string,
	actor: Actor,
	now: string = new Date().toISOString(),
	/** Runs in the same transaction, before the release, while the drafts still exist. */
	before?: D1PreparedStatement,
	/** The drafts the reviewer read. When they are not the drafts on the version now, nothing is released. */
	expected?: ExpectedDraft[] | null
): Promise<{ released: number }> {
	const scope = scopeClause(actor);
	const guard = expected ? expectedDraftsGuard(versionRef, actor, expected) : { sql: '', params: [] };
	const changed = () => new CommentError(409, 'the drafts on this version changed; read the thread again, then release');
	if (expected) {
		// A clear answer for the usual case. The guard in the statement covers a change after this read.
		const holds = await db
			.prepare(`SELECT 1 AS ok WHERE 1 = 1${guard.sql}`)
			.bind(...guard.params)
			.first<{ ok: number }>();
		if (!holds) throw changed();
	}
	const release = db
		.prepare(
			`UPDATE review_comments SET visibility = 'released', released_at = ?
			 WHERE version_ref = ? AND visibility = 'draft'${scope.sql}${guard.sql}`
		)
		.bind(now, versionRef, ...scope.params, ...guard.params);
	const released = before
		? ((await db.batch([before, release]))[1].meta.changes ?? 0)
		: ((await release.run()).meta.changes ?? 0);
	if (expected && released !== expected.length) throw changed();
	return { released };
}

/**
 * Only the author may change an unreleased comment. Released text is what the
 * creator saw, so it stays as sent.
 */
async function requireOwnUnreleased(
	db: D1Database,
	id: string,
	actor: Actor,
	action: 'edit' | 'delete'
): Promise<CommentRow> {
	const row = await getRowInScope(db, id, actor);
	if (!row) throw new CommentError(404, 'comment not found');
	if (row.author_email !== actor.email) throw new CommentError(403, `only the author can ${action} this comment`);
	if (row.visibility === 'released') {
		throw new CommentError(403, `released comments cannot be ${action === 'edit' ? 'edited' : 'deleted'}`);
	}
	return row;
}

export async function editComment(
	db: D1Database,
	id: string,
	body: string,
	actor: Actor,
	now: string = new Date().toISOString()
): Promise<ReviewComment> {
	await requireOwnUnreleased(db, id, actor, 'edit');
	// The visibility guard closes the race with a release between read and write.
	const result = await db
		.prepare(`UPDATE review_comments SET body = ?, edited_at = ? WHERE id = ? AND visibility != 'released'`)
		.bind(body, now, id)
		.run();
	if (!result.meta.changes) throw new CommentError(409, 'comment was released while editing');
	return toComment((await getRow(db, id)) as CommentRow);
}

export async function deleteComment(db: D1Database, id: string, actor: Actor): Promise<{ deleted: string }> {
	await requireOwnUnreleased(db, id, actor, 'delete');
	const reply = await db.prepare('SELECT 1 AS found FROM review_comments WHERE parent_id = ? LIMIT 1').bind(id).first();
	if (reply) throw new CommentError(409, 'comment has replies');
	let result: D1Result;
	try {
		result = await db.prepare(`DELETE FROM review_comments WHERE id = ? AND visibility != 'released'`).bind(id).run();
	} catch (error) {
		// A reply written between the check above and this delete trips the parent_id foreign key.
		if (error instanceof Error && /FOREIGN KEY/i.test(error.message)) throw new CommentError(409, 'comment has replies');
		throw error;
	}
	if (!result.meta.changes) throw new CommentError(409, 'comment was released while deleting');
	return { deleted: id };
}

export async function setResolution(
	db: D1Database,
	id: string,
	resolution: Resolution,
	actor: Actor
): Promise<ReviewComment> {
	const scope = scopeClause(actor);
	const result = await db
		.prepare(`UPDATE review_comments SET resolution = ? WHERE id = ?${scope.sql}`)
		.bind(resolution, id, ...scope.params)
		.run();
	if (!result.meta.changes) throw new CommentError(404, 'comment not found');
	return toComment((await getRow(db, id)) as CommentRow);
}
