import { describe, expect, it } from 'vitest';
import { DOCUMENT_VERSION, createDocument, type Stroke } from './document';
import { PAIRING_PROTOCOL_VERSION, applyEnvelope, isOperationEnvelope, isValidCanvasTitle, type OperationEnvelope, type PairingHostState } from './paired-session';

const digest = (value: string) => `digest:${value}`;
const stroke: Stroke = { id: 'stroke-1', kind: 'stroke', createdAt: '2026-08-29T00:00:00.000Z', points: [{ x: 1, y: 2 }, { x: 3, y: 4 }], color: '#f3ebe4', width: 3 };
const baseState = (): PairingHostState => ({
  sessionId: 'session-1',
  revision: 0,
  document: createDocument('Paired test'),
  clients: { phone: { capabilityDigest: digest('secret'), expiresAt: '2026-08-30T00:00:00.000Z' } },
  applied: {}
});
const envelope = (overrides: Partial<OperationEnvelope> = {}): OperationEnvelope => ({
  protocolVersion: PAIRING_PROTOCOL_VERSION,
  documentVersion: DOCUMENT_VERSION,
  sessionId: 'session-1',
  clientId: 'phone',
  operationId: 'operation-1',
  baseRevision: 0,
  sentAt: '2026-08-29T00:00:00.000Z',
  capability: 'secret',
  operation: { type: 'put_object', object: stroke },
  ...overrides
});
const apply = (state: PairingHostState, value: unknown) => applyEnvelope(state, value, { now: '2026-08-29T12:00:00.000Z', digestCapability: digest });

describe('paired session protocol', () => {
  it('commits an authorized operation at the next revision', () => {
    const result = apply(baseState(), envelope());
    expect(result.status).toBe('applied');
    expect(result.state.revision).toBe(1);
    expect(result.state.document.objects).toEqual([stroke]);
  });

  it('returns the original receipt for an exactly repeated operation', () => {
    const first = apply(baseState(), envelope());
    const second = apply(first.state, envelope());
    expect(second.status).toBe('duplicate');
    if (second.status !== 'duplicate' || first.status !== 'applied') throw new Error('expected applied then duplicate');
    expect(second.receipt).toEqual(first.receipt);
    expect(second.state.revision).toBe(1);
  });

  it('rejects reuse of an operation id with a changed payload', () => {
    const first = apply(baseState(), envelope());
    const second = apply(first.state, envelope({ operation: { type: 'set_title', title: 'Changed' } }));
    expect(second).toMatchObject({ status: 'rejected', code: 'OPERATION_ID_REUSED', currentRevision: 1 });
  });

  it.each([
    ['STALE_REVISION', { baseRevision: 0 }],
    ['FUTURE_REVISION', { baseRevision: 2 }]
  ] as const)('rejects %s without mutating the host', (code, overrides) => {
    const first = apply(baseState(), envelope());
    const result = apply(first.state, envelope({ operationId: 'operation-2', ...overrides }));
    expect(result).toMatchObject({ status: 'rejected', code, currentRevision: 1 });
    expect(result.state).toBe(first.state);
  });

  it('rejects unknown, revoked, expired, and incorrectly authorized clients', () => {
    expect(apply(baseState(), envelope({ clientId: 'stranger' }))).toMatchObject({ status: 'rejected', code: 'UNKNOWN_CLIENT' });
    expect(apply({ ...baseState(), clients: { phone: { ...baseState().clients.phone, revokedAt: '2026-08-29T01:00:00Z' } } }, envelope())).toMatchObject({ status: 'rejected', code: 'CLIENT_REVOKED' });
    expect(apply({ ...baseState(), clients: { phone: { ...baseState().clients.phone, expiresAt: '2026-08-29T11:00:00Z' } } }, envelope())).toMatchObject({ status: 'rejected', code: 'CAPABILITY_EXPIRED' });
    expect(apply(baseState(), envelope({ capability: 'wrong' }))).toMatchObject({ status: 'rejected', code: 'CAPABILITY_REJECTED' });
  });

  it('rejects protocol, document, session, and operation boundary violations', () => {
    expect(apply(baseState(), { ...envelope(), protocolVersion: 'future' })).toMatchObject({ status: 'rejected', code: 'UNSUPPORTED_PROTOCOL' });
    expect(apply(baseState(), { ...envelope(), documentVersion: 'future' })).toMatchObject({ status: 'rejected', code: 'UNSUPPORTED_DOCUMENT' });
    expect(apply(baseState(), envelope({ sessionId: 'other' }))).toMatchObject({ status: 'rejected', code: 'WRONG_SESSION' });
    expect(apply(baseState(), { ...envelope(), operation: { type: 'remove_objects', ids: [] } })).toMatchObject({ status: 'rejected', code: 'INVALID_ENVELOPE' });
    expect(apply(baseState(), envelope({ operation: { type: 'convert', selectedIds: ['missing'], target: 'note', resultId: 'note-1', createdAt: '2026-08-29T12:00:00Z' } }))).toMatchObject({ status: 'rejected', code: 'INVALID_OPERATION' });
  });

  it('enforces the title boundary in UTF-8 bytes', () => {
    const valid = 'é'.repeat(120);
    const invalid = 'é'.repeat(121);
    expect(isValidCanvasTitle(valid)).toBe(true);
    expect(isValidCanvasTitle(invalid)).toBe(false);
    expect(isOperationEnvelope(envelope({ operation: { type: 'set_title', title: valid } }))).toBe(true);
    expect(isOperationEnvelope(envelope({ operation: { type: 'set_title', title: invalid } }))).toBe(false);
  });

  it('replays conversion with an envelope-owned identity', () => {
    const first = apply(baseState(), envelope());
    const result = apply(first.state, envelope({
      operationId: 'operation-2',
      baseRevision: 1,
      operation: { type: 'convert', selectedIds: ['stroke-1'], target: 'note', resultId: 'note-from-phone', createdAt: '2026-08-29T12:00:00Z' }
    }));
    expect(result.state.document.objects.at(-1)).toMatchObject({ id: 'note-from-phone', kind: 'note', sourceIds: ['stroke-1'] });
  });
});
