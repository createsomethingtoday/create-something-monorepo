import {
  applyArcCommand,
  createAppReviewArcDocument,
  validateArcDocument,
  type ArcCommand,
  type ArcDocument
} from '@create-something/arc/model';
import type { Db } from './db';

export type ArcReceipt = {
  id: string;
  arcId: string;
  revision: number;
  action: ArcCommand['type'] | 'seed' | 'save_draft';
  actor: string;
  status: 'recorded';
  evidence: string;
  createdAt: string;
};

export type ArcMutationResponse = {
  document: ArcDocument;
  receipt: ArcReceipt;
  changedSceneIds: string[];
};

type ArcRow = {
  document_json: string;
};

function parseDocument(value: string): ArcDocument {
  const document = JSON.parse(value) as ArcDocument;
  const issues = validateArcDocument(document);
  if (issues.length) throw new Error(`Stored Arc is invalid: ${issues.join(' ')}`);
  return document;
}

export async function getArcDocument(db: Db, arcId: string): Promise<ArcDocument | null> {
  const row = await db
    .prepare('SELECT document_json FROM arcs WHERE id = ?')
    .bind(arcId)
    .first<ArcRow>();
  return row ? parseDocument(row.document_json) : null;
}

export async function getOrCreateAppReviewArc(db: Db): Promise<ArcDocument> {
  const existing = await getArcDocument(db, 'app-review-governance');
  if (existing) return existing;

  const document = createAppReviewArcDocument();
  const receiptId = `arc-receipt-${crypto.randomUUID()}`;
  const documentJson = JSON.stringify(document);
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO arcs (
        id, owner_contact, title, status, current_revision, published_revision,
        document_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      document.id,
      document.ownerContact,
      document.title,
      document.status,
      document.revision,
      document.publishedRevision,
      documentJson,
      document.createdAt,
      document.updatedAt
    ),
    db.prepare(
      `INSERT OR IGNORE INTO arc_versions (
        arc_id, revision, status, document_json, actor, receipt_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(document.id, document.revision, document.status, documentJson, 'system-seed', receiptId, document.createdAt),
    db.prepare(
      `INSERT OR IGNORE INTO arc_receipts (
        id, arc_id, revision, action, actor, status, evidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      receiptId,
      document.id,
      document.revision,
      'seed',
      'system-seed',
      'recorded',
      'Created the governed App Review Arc draft from the pinned composition fixture.',
      document.createdAt
    )
  ]);
  return (await getArcDocument(db, document.id)) ?? document;
}

export async function getArcVersion(
  db: Db,
  arcId: string,
  revision: number
): Promise<ArcDocument | null> {
  const row = await db
    .prepare('SELECT document_json FROM arc_versions WHERE arc_id = ? AND revision = ?')
    .bind(arcId, revision)
    .first<ArcRow>();
  return row ? parseDocument(row.document_json) : null;
}

export async function listArcReceipts(db: Db, arcId: string, limit = 50): Promise<ArcReceipt[]> {
  const rows = await db
    .prepare(
      `SELECT id, arc_id, revision, action, actor, status, evidence, created_at
       FROM arc_receipts WHERE arc_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .bind(arcId, Math.max(1, Math.min(limit, 100)))
    .all<{
      id: string;
      arc_id: string;
      revision: number;
      action: ArcCommand['type'] | 'seed' | 'save_draft';
      actor: string;
      status: 'recorded';
      evidence: string;
      created_at: string;
    }>();
  return (rows.results ?? []).map((row) => ({
    id: row.id,
    arcId: row.arc_id,
    revision: row.revision,
    action: row.action,
    actor: row.actor,
    status: row.status,
    evidence: row.evidence,
    createdAt: row.created_at
  }));
}

export async function applyPersistedArcCommand(
  db: Db,
  input: {
    arcId: string;
    actor: string;
    command: ArcCommand;
    idempotencyKey: string;
  }
): Promise<ArcMutationResponse> {
  const replay = await db
    .prepare('SELECT response_json FROM arc_idempotency WHERE idempotency_key = ? AND arc_id = ?')
    .bind(input.idempotencyKey, input.arcId)
    .first<{ response_json: string }>();
  if (replay) return JSON.parse(replay.response_json) as ArcMutationResponse;

  const source =
    input.arcId === 'app-review-governance'
      ? await getOrCreateAppReviewArc(db)
      : await getArcDocument(db, input.arcId);
  if (!source) throw new Error(`Arc not found: ${input.arcId}. List Arc resources first.`);

  const now = new Date().toISOString();
  const mutation = applyArcCommand(source, input.command, {
    actor: input.actor,
    now,
    id: () => crypto.randomUUID()
  });
  const receipt: ArcReceipt = {
    id: `arc-receipt-${crypto.randomUUID()}`,
    arcId: input.arcId,
    revision: mutation.document.revision,
    action: input.command.type,
    actor: input.actor,
    status: 'recorded',
    evidence: mutation.summary,
    createdAt: now
  };
  const response: ArcMutationResponse = {
    document: mutation.document,
    receipt,
    changedSceneIds: mutation.changedSceneIds
  };
  const documentJson = JSON.stringify(mutation.document);

  await db.batch([
    db
      .prepare(
        `UPDATE arcs SET owner_contact = ?, title = ?, status = ?, current_revision = ?,
          published_revision = ?, document_json = ?, updated_at = ? WHERE id = ?`
      )
      .bind(
        mutation.document.ownerContact,
        mutation.document.title,
        mutation.document.status,
        mutation.document.revision,
        mutation.document.publishedRevision,
        documentJson,
        mutation.document.updatedAt,
        input.arcId
      ),
    db
      .prepare(
        `INSERT INTO arc_versions (
          arc_id, revision, status, document_json, actor, receipt_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.arcId,
        mutation.document.revision,
        mutation.document.status,
        documentJson,
        input.actor,
        receipt.id,
        now
      ),
    db
      .prepare(
        `INSERT INTO arc_receipts (
          id, arc_id, revision, action, actor, status, evidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        receipt.id,
        receipt.arcId,
        receipt.revision,
        receipt.action,
        receipt.actor,
        receipt.status,
        receipt.evidence,
        receipt.createdAt
      ),
    db
      .prepare(
        'INSERT INTO arc_idempotency (idempotency_key, arc_id, response_json, created_at) VALUES (?, ?, ?, ?)'
      )
      .bind(input.idempotencyKey, input.arcId, JSON.stringify(response), now)
  ]);

  return response;
}

export async function saveArcDraft(
  db: Db,
  input: {
    arcId: string;
    actor: string;
    baseRevision: number;
    document: ArcDocument;
    idempotencyKey: string;
  }
): Promise<ArcMutationResponse> {
  const replay = await db
    .prepare('SELECT response_json FROM arc_idempotency WHERE idempotency_key = ? AND arc_id = ?')
    .bind(input.idempotencyKey, input.arcId)
    .first<{ response_json: string }>();
  if (replay) return JSON.parse(replay.response_json) as ArcMutationResponse;

  const source = await getArcDocument(db, input.arcId);
  if (!source) throw new Error(`Arc not found: ${input.arcId}.`);
  if (source.revision !== input.baseRevision) {
    throw new Error(`Arc changed from revision ${input.baseRevision} to ${source.revision}. Reload before saving.`);
  }
  if (!['draft', 'review'].includes(source.status)) {
    throw new Error(`Arc is ${source.status}. Recover it to a draft before saving editor changes.`);
  }
  if (input.document.id !== input.arcId || input.document.ownerContact !== source.ownerContact) {
    throw new Error('Arc identity and customer ownership cannot be changed from Studio.');
  }
  const now = new Date().toISOString();
  const document: ArcDocument = structuredClone(input.document);
  document.status = source.status;
  document.revision = source.revision + 1;
  document.publishedRevision = source.publishedRevision;
  document.createdAt = source.createdAt;
  document.updatedAt = now;
  const issues = validateArcDocument(document);
  if (issues.length) throw new Error(`Arc preflight failed: ${issues.join(' ')}`);

  const receipt: ArcReceipt = {
    id: `arc-receipt-${crypto.randomUUID()}`,
    arcId: input.arcId,
    revision: document.revision,
    action: 'save_draft',
    actor: input.actor,
    status: 'recorded',
    evidence: 'Saved the visual Studio draft after composition preflight.',
    createdAt: now
  };
  const changedSceneIds = document.composition.scenes
    .filter((scene) => {
      const previous = source.composition.scenes.find((candidate) => candidate.id === scene.id);
      return !previous || JSON.stringify(previous) !== JSON.stringify(scene);
    })
    .map((scene) => scene.id);
  const response: ArcMutationResponse = { document, receipt, changedSceneIds };
  const documentJson = JSON.stringify(document);
  await db.batch([
    db.prepare(
      `UPDATE arcs SET title = ?, status = ?, current_revision = ?, published_revision = ?,
       document_json = ?, updated_at = ? WHERE id = ?`
    ).bind(
      document.title,
      document.status,
      document.revision,
      document.publishedRevision,
      documentJson,
      now,
      input.arcId
    ),
    db.prepare(
      `INSERT INTO arc_versions (
       arc_id, revision, status, document_json, actor, receipt_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(input.arcId, document.revision, document.status, documentJson, input.actor, receipt.id, now),
    db.prepare(
      `INSERT INTO arc_receipts (
       id, arc_id, revision, action, actor, status, evidence, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(receipt.id, input.arcId, document.revision, 'save_draft', input.actor, 'recorded', receipt.evidence, now),
    db.prepare(
      'INSERT INTO arc_idempotency (idempotency_key, arc_id, response_json, created_at) VALUES (?, ?, ?, ?)'
    ).bind(input.idempotencyKey, input.arcId, JSON.stringify(response), now)
  ]);
  return response;
}

export async function recordArcAnalytics(
  db: Db,
  arcId: string,
  revision: number,
  event: 'opened' | 'completed' | 'exited'
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO arc_analytics (id, arc_id, revision, event, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(`arc-event-${crypto.randomUUID()}`, arcId, revision, event, new Date().toISOString())
    .run();
}
