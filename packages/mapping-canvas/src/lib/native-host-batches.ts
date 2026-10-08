import type { CanvasDocument, History } from './document';
import type { CanvasOperation } from './paired-session';

export type NativeHostBatch = { sessionId: string; documentId: string; expectedRevision: number; operationId: string; operations: CanvasOperation[] };
export type NativeHostTicket = { request: NativeHostBatch; epoch: number };

/** Reserve against the authored authority, never a later mirror snapshot. */
export class NativeHostBatches {
  private tickets = new Set<NativeHostTicket>();
  private epoch = 0;
  private recovering = false;
  get pending() { return this.tickets.size; }
  get canMirror() { return !this.pending && !this.recovering; }
  get isRecovering() { return this.recovering; }
  reserve(authority: { sessionId?: string; revision?: number; document?: CanvasDocument }, operations: CanvasOperation[]): NativeHostTicket {
    if (this.recovering) throw new Error('Wait for native state recovery before editing.');
    if (!authority.sessionId || !authority.document || !Number.isSafeInteger(authority.revision) || authority.revision! < 0)
      throw new Error('Native authority is not ready.');
    const expectedRevision = authority.revision! + [...this.tickets].filter(ticket => ticket.epoch === this.epoch).length;
    if (!Number.isSafeInteger(expectedRevision)) throw new Error('Native revision exhausted.');
    const ticket = { epoch: this.epoch, request: { sessionId: authority.sessionId, documentId: authority.document.id,
      expectedRevision, operationId: `mac-batch-${crypto.randomUUID()}`, operations: JSON.parse(JSON.stringify(operations)) as CanvasOperation[] } };
    this.tickets.add(ticket);
    return ticket;
  }
  current(ticket: NativeHostTicket) { return !this.recovering && ticket.epoch === this.epoch; }
  finish(ticket: NativeHostTicket) { this.tickets.delete(ticket); }
  invalidate() { this.epoch += 1; this.recovering = true; }
  recovered() { this.recovering = false; }
}

/** A multi-operation batch is one UI undo checkpoint. Duplicate recovery is not a new edit. */
export function settleNativeHostBatch(history: History, result: { status?: string; document?: CanvasDocument; previousDocument?: CanvasDocument }, recordsHistory: boolean, preserveFuture: boolean): History {
  if (!result.document) throw new Error('Native commit did not return the authoritative document.');
  if (result.status === 'duplicate') return { past: [], present: result.document, future: [] };
  if (result.status !== 'applied') throw new Error('Native batch was not committed.');
  return { past: recordsHistory && result.previousDocument ? [...history.past.slice(0, -1), result.previousDocument] : history.past,
    present: result.document, future: preserveFuture ? history.future : [] };
}
