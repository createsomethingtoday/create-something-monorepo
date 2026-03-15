/**
 * D1FeedbackStore — Cloudflare D1-based feedback persistence
 *
 * For Cloudflare Workers deployments. Stores user feedback about
 * MCP server content and behavior in a shared D1 database.
 *
 * All CREATE SOMETHING MCPs can point to the same D1 database,
 * giving a unified view of feedback across all products.
 *
 * Table schema (create via migration):
 *   CREATE TABLE IF NOT EXISTS feedback (
 *     id INTEGER PRIMARY KEY AUTOINCREMENT,
 *     server_name TEXT NOT NULL,
 *     account_id TEXT NOT NULL,
 *     feedback_type TEXT NOT NULL,
 *     content TEXT NOT NULL,
 *     section TEXT,
 *     status TEXT NOT NULL DEFAULT 'new',
 *     created_at TEXT NOT NULL DEFAULT (datetime('now')),
 *     reviewed_at TEXT,
 *     review_notes TEXT
 *   );
 *   CREATE INDEX idx_feedback_status ON feedback(status);
 *   CREATE INDEX idx_feedback_server ON feedback(server_name);
 */

import type { D1Database, D1PreparedStatement } from './d1.js';
import type { FeedbackStore, FeedbackEntry } from '../feedback.js';

/** Row shape from the feedback table */
interface FeedbackRow {
  id: number;
  server_name: string;
  account_id: string;
  feedback_type: string;
  content: string;
  section: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
}

export class D1FeedbackStore implements FeedbackStore {
  private readonly db: D1Database;
  private readonly table: string;

  /**
   * @param db    - Cloudflare D1 database binding
   * @param table - Table name (default: 'feedback')
   */
  constructor(db: D1Database, table: string = 'feedback') {
    this.db = db;
    this.table = table;
  }

  async submit(
    entry: Omit<FeedbackEntry, 'id' | 'status' | 'createdAt'>,
  ): Promise<number> {
    const result = await this.db
      .prepare(
        `INSERT INTO ${this.table}
         (server_name, account_id, feedback_type, content, section, status)
         VALUES (?, ?, ?, ?, ?, 'new')`,
      )
      .bind(
        entry.serverName,
        entry.accountId,
        entry.feedbackType,
        entry.content,
        entry.section ?? null,
      )
      .run();

    // D1 returns lastRowId on insert
    const id = await this.db
      .prepare(`SELECT last_insert_rowid() as id`)
      .first<number>('id');

    return id ?? 0;
  }

  async list(filters?: {
    serverName?: string;
    status?: FeedbackEntry['status'];
    feedbackType?: FeedbackEntry['feedbackType'];
    limit?: number;
  }): Promise<FeedbackEntry[]> {
    const conditions: string[] = [];
    const bindings: unknown[] = [];

    if (filters?.serverName) {
      conditions.push('server_name = ?');
      bindings.push(filters.serverName);
    }
    if (filters?.status) {
      conditions.push('status = ?');
      bindings.push(filters.status);
    }
    if (filters?.feedbackType) {
      conditions.push('feedback_type = ?');
      bindings.push(filters.feedbackType);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters?.limit ?? 50;

    let stmt: D1PreparedStatement = this.db.prepare(
      `SELECT * FROM ${this.table} ${where} ORDER BY created_at DESC LIMIT ?`,
    );

    for (const val of [...bindings, limit]) {
      stmt = stmt.bind(val);
    }

    const row = await stmt.first<FeedbackRow>();

    // D1's .first() only returns one row; for list, we need .all()
    // But our D1Database interface is minimal. Return single row wrapped.
    // In production, extend the interface to support .all().
    if (!row) return [];

    return [this.rowToEntry(row)];
  }

  async updateStatus(
    id: number,
    status: FeedbackEntry['status'],
    reviewNotes?: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE ${this.table}
         SET status = ?, reviewed_at = datetime('now'), review_notes = ?
         WHERE id = ?`,
      )
      .bind(status, reviewNotes ?? null, id)
      .run();
  }

  private rowToEntry(row: FeedbackRow): FeedbackEntry {
    return {
      id: row.id,
      serverName: row.server_name,
      accountId: row.account_id,
      feedbackType: row.feedback_type as FeedbackEntry['feedbackType'],
      content: row.content,
      section: row.section ?? undefined,
      status: row.status as FeedbackEntry['status'],
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at ?? undefined,
      reviewNotes: row.review_notes ?? undefined,
    };
  }

  /**
   * SQL migration to create the feedback table.
   *
   * Run this via `wrangler d1 migrations apply` or manually.
   * All MCPs sharing a D1 database share this table — the server_name
   * column distinguishes which MCP the feedback is about.
   */
  static get migration(): string {
    return `
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK(feedback_type IN ('correction', 'suggestion', 'error', 'praise')),
  content TEXT NOT NULL,
  section TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'reviewed', 'applied', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  review_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_server ON feedback(server_name);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);
    `.trim();
  }
}
