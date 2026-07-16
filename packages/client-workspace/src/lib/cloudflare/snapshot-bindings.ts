import type {
  WorkspaceSnapshotLedger,
  WorkspaceSnapshotObjects,
  WorkspaceSnapshotRecord
} from './snapshot-store.js';

interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<T>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
}

interface D1DatabaseLike {
  prepare(sql: string): D1StatementLike;
}

interface R2BucketLike {
  get(key: string): Promise<{ body: ReadableStream<Uint8Array> } | null>;
  put(
    key: string,
    body: ReadableStream<Uint8Array>,
    options: {
      httpMetadata: { contentType: string };
      customMetadata: { classification: string };
    }
  ): Promise<unknown>;
}

interface SnapshotRow {
  sandbox_id: string;
  object_key: string;
  size_bytes: number;
  captured_at: string;
}

interface FixedLengthStreamPair {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

interface R2WorkspaceSnapshotObjectsOptions {
  createFixedLengthStream?: (size: number) => FixedLengthStreamPair;
}

function createRuntimeFixedLengthStream(size: number): FixedLengthStreamPair {
  const RuntimeFixedLengthStream = (
    globalThis as typeof globalThis & {
      FixedLengthStream?: new (expectedLength: number) => FixedLengthStreamPair;
    }
  ).FixedLengthStream;
  if (!RuntimeFixedLengthStream) throw new Error('fixed_length_stream_unavailable');
  return new RuntimeFixedLengthStream(size);
}

export class D1WorkspaceSnapshotLedger implements WorkspaceSnapshotLedger {
  constructor(private readonly database: D1DatabaseLike) {}

  async latest(sandboxId: string): Promise<WorkspaceSnapshotRecord | null> {
    const row = await this.database
      .prepare(
        `SELECT sandbox_id, object_key, size_bytes, captured_at
         FROM workspace_snapshots
         WHERE sandbox_id = ?1`
      )
      .bind(sandboxId)
      .first<SnapshotRow>();
    return row
      ? {
          sandboxId: row.sandbox_id,
          objectKey: row.object_key,
          size: row.size_bytes,
          capturedAt: row.captured_at
        }
      : null;
  }

  async record(record: WorkspaceSnapshotRecord): Promise<void> {
    const result = await this.database
      .prepare(
        `INSERT INTO workspace_snapshots (
           sandbox_id, object_key, size_bytes, captured_at
         ) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(sandbox_id) DO UPDATE SET
           object_key = excluded.object_key,
           size_bytes = excluded.size_bytes,
           captured_at = excluded.captured_at`
      )
      .bind(record.sandboxId, record.objectKey, record.size, record.capturedAt)
      .run();
    if (!result.success) throw new Error('snapshot_ledger_write_failed');
  }
}

export class R2WorkspaceSnapshotObjects implements WorkspaceSnapshotObjects {
  readonly #createFixedLengthStream: (size: number) => FixedLengthStreamPair;

  constructor(
    private readonly bucket: R2BucketLike,
    options: R2WorkspaceSnapshotObjectsOptions = {}
  ) {
    this.#createFixedLengthStream =
      options.createFixedLengthStream ?? createRuntimeFixedLengthStream;
  }

  async get(key: string): Promise<ReadableStream<Uint8Array> | null> {
    return (await this.bucket.get(key))?.body ?? null;
  }

  async put(key: string, body: ReadableStream<Uint8Array>, size: number): Promise<void> {
    const fixed = this.#createFixedLengthStream(size);
    const piping = body.pipeTo(fixed.writable);
    await Promise.all([
      this.bucket.put(key, fixed.readable, {
        httpMetadata: { contentType: 'application/gzip' },
        customMetadata: { classification: 'private-client-workspace-snapshot' }
      }),
      piping
    ]);
  }
}
