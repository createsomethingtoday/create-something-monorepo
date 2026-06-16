import type { ConciergeThread } from '$chat/thread-store';
import type { D1Database, D1PreparedStatement } from '$server/db/d1';
import { runBatch } from '$server/db/d1';

interface PersistedThreadRow {
	id: string;
	thread_json: string;
}

function stringify(value: unknown) {
	return JSON.stringify(value);
}

function parseThread(value: string) {
	return JSON.parse(value) as ConciergeThread;
}

function scopedThreadId(sessionId: string, threadId: string) {
	return ['thread', sessionId, threadId].join(':');
}

function serializeThreadUpserts(
	db: D1Database,
	sessionId: string,
	threads: ConciergeThread[]
) {
	const statements: D1PreparedStatement[] = [];

	for (const thread of threads) {
		const createdAt = thread.messages[0]?.createdAt ?? thread.updatedAt;
		const scopedId = scopedThreadId(sessionId, thread.id);

		statements.push(
			db
				.prepare(
					`INSERT INTO chat_threads (
						id, session_id, title, subtitle, user_name, updated_at, status, pending_action,
						badges_json, thread_json, created_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
						title = excluded.title,
						subtitle = excluded.subtitle,
						user_name = excluded.user_name,
						updated_at = excluded.updated_at,
						status = excluded.status,
						pending_action = excluded.pending_action,
						badges_json = excluded.badges_json,
						thread_json = excluded.thread_json`
				)
				.bind(
					scopedId,
					sessionId,
					thread.title,
					thread.subtitle,
					thread.userName,
					thread.updatedAt,
					thread.status,
					thread.pendingAction,
					stringify(thread.badges),
					stringify(thread),
					createdAt
				)
		);
	}

	return statements;
}

function serializeThreadDeletes(db: D1Database, scopedIds: string[]) {
	return scopedIds.map((id) => db.prepare('DELETE FROM chat_threads WHERE id = ?').bind(id));
}

async function listPersistedThreadIds(db: D1Database, sessionId: string) {
	const result = await db
		.prepare('SELECT id FROM chat_threads WHERE session_id = ?')
		.bind(sessionId)
		.all<Pick<PersistedThreadRow, 'id'>>();

	return result.results.map((row) => row.id);
}

export async function loadPersistedSessionThreads(db: D1Database, sessionId: string) {
	const result = await db
		.prepare('SELECT id, thread_json FROM chat_threads WHERE session_id = ? ORDER BY updated_at DESC')
		.bind(sessionId)
		.all<PersistedThreadRow>();

	if (result.results.length === 0) {
		return null;
	}

	return result.results.map((row) => parseThread(row.thread_json));
}

export async function upsertPersistedSessionThreads(
	db: D1Database,
	sessionId: string,
	threads: ConciergeThread[]
) {
	await runBatch(db, serializeThreadUpserts(db, sessionId, threads));
}

export async function replacePersistedSessionThreads(
	db: D1Database,
	sessionId: string,
	threads: ConciergeThread[]
) {
	const nextScopedIds = new Set(threads.map((thread) => scopedThreadId(sessionId, thread.id)));
	const existingScopedIds = await listPersistedThreadIds(db, sessionId);
	const deletedScopedIds = existingScopedIds.filter((id) => !nextScopedIds.has(id));

	await runBatch(db, [
		...serializeThreadDeletes(db, deletedScopedIds),
		...serializeThreadUpserts(db, sessionId, threads)
	]);
}
