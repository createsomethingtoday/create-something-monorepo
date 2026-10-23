import type { WriteJournal } from './indexed-transcript';

export const INGESTION_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS transcript_ingestion (
    meeting_key TEXT PRIMARY KEY, selected_key TEXT NOT NULL, owner TEXT, expires_at TEXT,
    version TEXT, ready_version TEXT, index_block_id TEXT, page_id TEXT, verified_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS transcript_write_journal (
    operation_key TEXT PRIMARY KEY, reserved_at TEXT NOT NULL
  )`,
] as const;

export function meetingKey(candidate: { canonicalMeetingKey: string; meetingDate: string }): string {
  return JSON.stringify([candidate.canonicalMeetingKey, candidate.meetingDate]);
}

export async function selectRendition(db: D1Database, key: string, selected: string): Promise<void> {
  await db.prepare(`INSERT INTO transcript_ingestion (meeting_key, selected_key) VALUES (?, ?)
    ON CONFLICT(meeting_key) DO UPDATE SET
      ready_version = CASE WHEN selected_key = excluded.selected_key THEN ready_version ELSE NULL END,
      selected_key = excluded.selected_key`).bind(key, selected).run();
}

export async function claimIngestion(db: D1Database, key: string, selected: string): Promise<IngestionLease> {
  const owner = crypto.randomUUID();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const result = await db.prepare(`UPDATE transcript_ingestion SET owner = ?, expires_at = ?, ready_version = NULL,
      index_block_id = NULL, verified_at = NULL
    WHERE meeting_key = ? AND selected_key = ? AND (owner IS NULL OR expires_at < ?)`)
    .bind(owner, expires, key, selected, new Date().toISOString()).run();
  if (result.meta.changes !== 1) throw new Error('Meeting sync lock is busy or rendition is no longer selected');
  return new IngestionLease(db, key, selected, owner);
}

export class IngestionLease implements WriteJournal {
  constructor(private db: D1Database, private key: string, private selected: string, private owner: string) {}

  projectionFence() { return { key: this.key, selected: this.selected, owner: this.owner }; }

  async assertOwner(): Promise<void> {
    const row = await this.db.prepare(`SELECT owner FROM transcript_ingestion
      WHERE meeting_key = ? AND selected_key = ? AND owner = ? AND expires_at > ?`)
      .bind(this.key, this.selected, this.owner, new Date().toISOString()).first();
    if (!row) throw new Error('Ingestion ownership lost; readiness withheld');
  }

  async reserve(key: string): Promise<boolean> {
    await this.assertOwner();
    const result = await this.db.prepare(`INSERT OR IGNORE INTO transcript_write_journal VALUES (?, ?)`)
      .bind(key, new Date().toISOString()).run();
    return result.meta.changes === 1;
  }

  async begin(version: string): Promise<void> {
    await this.assertOwner();
    await this.db.prepare(`UPDATE transcript_ingestion SET version = ? WHERE meeting_key = ? AND owner = ?`)
      .bind(version, this.key, this.owner).run();
  }

  async ready(version: string, page: string, index: string): Promise<void> {
    const result = await this.db.prepare(`UPDATE transcript_ingestion
      SET ready_version = ?, page_id = ?, index_block_id = ?, verified_at = ?
      WHERE meeting_key = ? AND selected_key = ? AND owner = ? AND version = ? AND expires_at > ?`)
      .bind(version, page, index, new Date().toISOString(), this.key, this.selected, this.owner, version, new Date().toISOString()).run();
    if (result.meta.changes !== 1) throw new Error('Ingestion ownership lost; readiness withheld');
  }

  async release(): Promise<void> {
    await this.db.prepare(`UPDATE transcript_ingestion SET owner = NULL, expires_at = NULL WHERE meeting_key = ? AND owner = ?`)
      .bind(this.key, this.owner).run();
  }
}
