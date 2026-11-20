import { constants } from 'node:fs';
import { link, lstat, mkdir, open, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, join } from 'node:path';
import { z } from 'zod';
import {
  decisionOutcomeSchema, decisionRequestHash, decisionRequestSchema,
  type DecisionOutcome, type DecisionReceipt, type DecisionRepository
} from './decisions.js';

const receiptSchema = z.object({
  schema: z.literal('agent-decision/v1'), authority: z.literal('advisory_only'),
  request: decisionRequestSchema, requestHash: z.string().regex(/^[a-f0-9]{64}$/),
  selector: z.object({ provider: z.string().min(1), model: z.string().min(1), version: z.string().min(1) }).strict().nullable(),
  selectedId: z.string().nullable(),
  reason: z.enum(['selected', 'pinned', 'resumed', 'abstained', 'invalid_response',
    'unavailable', 'selector_failed', 'timeout', 'state_changed']),
  fallback: z.boolean(), elapsedMs: z.number().finite().nonnegative()
}).strict();

function missing(error: unknown) {
  return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
}

/** Local operator evidence only. This is not a signed or hosted authority store. */
export class FileDecisionRepository implements DecisionRepository {
  private directory: string;
  constructor(directory: string) { this.directory = resolve(directory); }

  private async ready() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const info = await lstat(this.directory);
    if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) {
      throw new Error('Decision store must be a private directory, not a symlink');
    }
  }
  private filename(kind: 'decision' | 'outcome', scope: string, id: string) {
    if (!scope || !id || scope.length > 128 || id.length > 128) throw new Error('Invalid decision identity');
    const key = createHash('sha256').update(JSON.stringify([scope, id])).digest('hex');
    return join(this.directory, `${kind}-${key}.json`);
  }
  private async read(filename: string): Promise<unknown | undefined> {
    await this.ready();
    let file;
    try { file = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW); }
    catch (error) { if (missing(error)) return undefined; throw new Error('Decision file cannot be safely opened'); }
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size > 100_000 || (info.mode & 0o077) !== 0) throw new Error('Invalid decision evidence file');
      return JSON.parse(await file.readFile('utf8')) as unknown;
    } finally { await file.close(); }
  }
  private async append(filename: string, value: unknown) {
    await this.ready();
    const serialized = JSON.stringify(value);
    const temporary = join(this.directory, `.pending-${randomUUID()}`);
    const file = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
      try {
        await file.writeFile(serialized + '\n');
        await file.sync();
      } finally { await file.close(); }
      // link is atomic and fails if the destination already exists, including symlinks.
      try { await link(temporary, filename); }
      catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error;
        const existing = await this.read(filename);
        if (JSON.stringify(existing) !== serialized) throw new Error('Immutable decision evidence conflict');
      }
    } finally {
      await unlink(temporary);
      // Flush the directory entry as well as the file before claiming durable readback.
      const directory = await open(this.directory, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try { await directory.sync(); } finally { await directory.close(); }
    }
  }
  private async receipt(value: unknown, scope?: string, id?: string): Promise<DecisionReceipt> {
    const receipt = receiptSchema.parse(value);
    const fixed = receipt.reason === 'pinned' || receipt.reason === 'resumed';
    const blocked = receipt.reason === 'state_changed' || receipt.reason === 'timeout';
    const selected = receipt.reason === 'selected';
    const semanticsValid = blocked ? receipt.selectedId === null && !receipt.fallback : fixed ?
      receipt.request.mode === receipt.reason && receipt.selectedId === receipt.request.fixedChoiceId &&
        !receipt.fallback && receipt.selector === null : selected ?
      receipt.request.mode === 'fresh' && receipt.selectedId !== null && !receipt.fallback && receipt.selector !== null :
      receipt.request.mode === 'fresh' && receipt.fallback && receipt.selectedId === receipt.request.fallbackId &&
        (receipt.reason === 'unavailable' ? receipt.selector === null : receipt.selector !== null);
    if (!semanticsValid) throw new Error('Stored decision semantics are inconsistent');
    if ((scope !== undefined && receipt.request.scope !== scope) ||
        (id !== undefined && receipt.request.id !== id) ||
        await decisionRequestHash(receipt.request) !== receipt.requestHash ||
        (receipt.selectedId !== null && !receipt.request.candidates.some(candidate => candidate.id === receipt.selectedId)) ||
        (receipt.fallback && receipt.selectedId !== receipt.request.fallbackId)) {
      throw new Error('Stored decision binding or request hash mismatch');
    }
    return receipt;
  }
  async putDecision(value: DecisionReceipt): Promise<void> {
    const receipt = await this.receipt(value);
    await this.append(this.filename('decision', receipt.request.scope, receipt.request.id), receipt);
  }
  async getDecision(scope: string, id: string): Promise<DecisionReceipt | undefined> {
    const value = await this.read(this.filename('decision', scope, id));
    return value === undefined ? undefined : this.receipt(value, scope, id);
  }
  private async outcome(value: unknown, scope?: string, id?: string): Promise<DecisionOutcome> {
    const outcome = decisionOutcomeSchema.parse(value);
    const receipt = await this.getDecision(outcome.scope, outcome.decisionId);
    if ((scope !== undefined && outcome.scope !== scope) || (id !== undefined && outcome.decisionId !== id) ||
        !receipt || receipt.requestHash !== outcome.requestHash || receipt.selectedId === null) {
      throw new Error('Stored outcome binding mismatch');
    }
    return outcome;
  }
  async putOutcome(value: DecisionOutcome): Promise<void> {
    const outcome = await this.outcome(value);
    await this.append(this.filename('outcome', outcome.scope, outcome.decisionId), outcome);
  }
  async getOutcome(scope: string, id: string): Promise<DecisionOutcome | undefined> {
    const value = await this.read(this.filename('outcome', scope, id));
    return value === undefined ? undefined : this.outcome(value, scope, id);
  }
}
