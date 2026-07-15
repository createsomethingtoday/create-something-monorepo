const SANDBOX_ID_PATTERN = /^client-workspace-[a-f0-9]{32}$/;
const SNAPSHOT_ARCHIVE = '/tmp/client-workspace-snapshot.tgz';
const RESTORE_ARCHIVE = '/tmp/client-workspace-restore.tgz';

export interface WorkspaceSnapshotRecord {
  sandboxId: string;
  objectKey: string;
  size: number;
  capturedAt: string;
}

export interface WorkspaceSnapshotLedger {
  latest(sandboxId: string): Promise<WorkspaceSnapshotRecord | null>;
  record(record: WorkspaceSnapshotRecord): Promise<void>;
}

export interface WorkspaceSnapshotObjects {
  get(key: string): Promise<ReadableStream<Uint8Array> | null>;
  put(key: string, body: ReadableStream<Uint8Array>): Promise<void>;
}

export interface SnapshotSandbox {
  exec(command: string): Promise<{ success: boolean; exitCode: number; stderr: string }>;
  readFile(
    path: string,
    options: { encoding: 'none' }
  ): Promise<{ content: ReadableStream<Uint8Array>; size: number }>;
  writeFile(
    path: string,
    body: ReadableStream<Uint8Array>,
    options: { encoding: 'none' }
  ): Promise<unknown>;
}

export interface WorkspaceSnapshotStoreOptions {
  ledger: WorkspaceSnapshotLedger;
  objects: WorkspaceSnapshotObjects;
  now?: () => Date;
  randomUUID?: () => string;
}

function assertSandboxId(sandboxId: string): void {
  if (!SANDBOX_ID_PATTERN.test(sandboxId)) throw new Error('sandbox_id_invalid');
}

async function assertExec(
  sandbox: SnapshotSandbox,
  command: string,
  code: string
): Promise<void> {
  const result = await sandbox.exec(command);
  if (!result.success || result.exitCode !== 0) throw new Error(code);
}

export class WorkspaceSnapshotStore {
  readonly #ledger: WorkspaceSnapshotLedger;
  readonly #objects: WorkspaceSnapshotObjects;
  readonly #now: () => Date;
  readonly #randomUUID: () => string;

  constructor(options: WorkspaceSnapshotStoreOptions) {
    this.#ledger = options.ledger;
    this.#objects = options.objects;
    this.#now = options.now ?? (() => new Date());
    this.#randomUUID = options.randomUUID ?? (() => crypto.randomUUID());
  }

  async capture(sandboxId: string, sandbox: SnapshotSandbox): Promise<{
    key: string;
    size: number;
    capturedAt: string;
  }> {
    assertSandboxId(sandboxId);
    const capturedAt = this.#now().toISOString();
    const safeTimestamp = capturedAt.replaceAll(':', '-').replace('.', '-');
    const key = `snapshots/${sandboxId}/${safeTimestamp}-${this.#randomUUID()}.tgz`;

    await assertExec(
      sandbox,
      `tar -C /workspace -czf ${SNAPSHOT_ARCHIVE} -- projects state`,
      'snapshot_archive_failed'
    );
    try {
      const archive = await sandbox.readFile(SNAPSHOT_ARCHIVE, { encoding: 'none' });
      await this.#objects.put(key, archive.content);
      await this.#ledger.record({
        sandboxId,
        objectKey: key,
        size: archive.size,
        capturedAt
      });
      return { key, size: archive.size, capturedAt };
    } finally {
      await assertExec(sandbox, `rm -f ${SNAPSHOT_ARCHIVE}`, 'snapshot_cleanup_failed');
    }
  }

  async restoreLatest(sandboxId: string, sandbox: SnapshotSandbox): Promise<boolean> {
    assertSandboxId(sandboxId);
    const latest = await this.#ledger.latest(sandboxId);
    if (!latest) return false;
    const archive = await this.#objects.get(latest.objectKey);
    if (!archive) throw new Error('snapshot_object_missing');

    await sandbox.writeFile(RESTORE_ARCHIVE, archive, { encoding: 'none' });
    try {
      await assertExec(
        sandbox,
        `rm -rf /workspace/projects /workspace/state && mkdir -p /workspace && tar -C /workspace -xzf ${RESTORE_ARCHIVE}`,
        'snapshot_restore_failed'
      );
      return true;
    } finally {
      await assertExec(sandbox, `rm -f ${RESTORE_ARCHIVE}`, 'snapshot_cleanup_failed');
    }
  }
}
