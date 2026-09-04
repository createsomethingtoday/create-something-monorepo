import {
  DOCUMENT_VERSION,
  convertWithIdentity,
  isCanvasObject,
  isDocument,
  removeObjects,
  restoreConversion,
  withObjects,
  type CanvasDocument,
  type CanvasObject,
  type Viewport
} from './document';

export const PAIRING_PROTOCOL_VERSION = 'create-something.draw-pairing.v1' as const;

export type CanvasOperation =
  | { type: 'put_object'; object: CanvasObject }
  | { type: 'remove_objects'; ids: string[] }
  | { type: 'replace_objects'; objects: CanvasObject[] }
  | { type: 'set_title'; title: string }
  | { type: 'set_viewport'; viewport: Viewport }
  | { type: 'convert'; selectedIds: string[]; target: 'note' | 'connector' | 'group'; resultId: string; createdAt: string }
  | { type: 'restore_conversion'; id: string };

export type OperationEnvelope = {
  protocolVersion: typeof PAIRING_PROTOCOL_VERSION;
  documentVersion: typeof DOCUMENT_VERSION;
  sessionId: string;
  clientId: string;
  operationId: string;
  baseRevision: number;
  sentAt: string;
  capability: string;
  operation: CanvasOperation;
};

export type PairedClient = {
  capabilityDigest: string;
  expiresAt: string;
  revokedAt?: string;
};

export type AppliedOperation = {
  operationId: string;
  clientId: string;
  fingerprint: string;
  revision: number;
  documentUpdatedAt: string;
};

export type PairingHostState = {
  sessionId: string;
  revision: number;
  document: CanvasDocument;
  clients: Record<string, PairedClient>;
  applied: Record<string, AppliedOperation>;
};

export type OperationErrorCode =
  | 'INVALID_ENVELOPE'
  | 'UNSUPPORTED_PROTOCOL'
  | 'UNSUPPORTED_DOCUMENT'
  | 'WRONG_SESSION'
  | 'UNKNOWN_CLIENT'
  | 'CAPABILITY_REJECTED'
  | 'CLIENT_REVOKED'
  | 'CAPABILITY_EXPIRED'
  | 'STALE_REVISION'
  | 'FUTURE_REVISION'
  | 'OPERATION_ID_REUSED'
  | 'INVALID_OPERATION';

export type OperationResult =
  | { status: 'applied'; state: PairingHostState; receipt: AppliedOperation }
  | { status: 'duplicate'; state: PairingHostState; receipt: AppliedOperation }
  | { status: 'rejected'; state: PairingHostState; code: OperationErrorCode; currentRevision: number };

type ApplyOptions = {
  now?: string;
  digestCapability: (capability: string) => string;
  fingerprint?: (envelope: OperationEnvelope) => string;
};

const defaultFingerprint = (envelope: OperationEnvelope) => JSON.stringify({
  protocolVersion: envelope.protocolVersion,
  documentVersion: envelope.documentVersion,
  sessionId: envelope.sessionId,
  clientId: envelope.clientId,
  operationId: envelope.operationId,
  baseRevision: envelope.baseRevision,
  operation: envelope.operation
});

const rejected = (state: PairingHostState, code: OperationErrorCode): OperationResult => ({
  status: 'rejected',
  state,
  code,
  currentRevision: state.revision
});

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const utf8 = new TextEncoder();

export function isValidCanvasTitle(title: unknown): title is string {
  return typeof title === 'string' && title.trim().length > 0 && utf8.encode(title).byteLength <= 240;
}

const isViewport = (value: unknown): value is Viewport => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Viewport>;
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y) && isFiniteNumber(candidate.zoom) && candidate.zoom > 0;
};

export function isOperationEnvelope(value: unknown): value is OperationEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<OperationEnvelope>;
  if (envelope.protocolVersion !== PAIRING_PROTOCOL_VERSION || envelope.documentVersion !== DOCUMENT_VERSION) return false;
  if (![envelope.sessionId, envelope.clientId, envelope.operationId, envelope.sentAt, envelope.capability].every((part) => typeof part === 'string' && part.length > 0)) return false;
  if (!Number.isSafeInteger(envelope.baseRevision) || (envelope.baseRevision ?? -1) < 0 || !envelope.operation || typeof envelope.operation !== 'object') return false;
  return isCanvasOperation(envelope.operation);
}

export function isCanvasOperation(value: unknown): value is CanvasOperation {
  if (!value || typeof value !== 'object') return false;
  const operation = value as CanvasOperation;
  if (operation.type === 'put_object') return isCanvasObject(operation.object);
  if (operation.type === 'remove_objects') return Array.isArray(operation.ids) && operation.ids.length > 0 && operation.ids.every((id) => typeof id === 'string' && id.length > 0);
  if (operation.type === 'replace_objects') return Array.isArray(operation.objects) && operation.objects.every(isCanvasObject);
  if (operation.type === 'set_title') return isValidCanvasTitle(operation.title);
  if (operation.type === 'set_viewport') return isViewport(operation.viewport);
  if (operation.type === 'convert') return Array.isArray(operation.selectedIds) && operation.selectedIds.length > 0 && operation.selectedIds.every((id) => typeof id === 'string' && id.length > 0) && ['note', 'connector', 'group'].includes(operation.target) && typeof operation.resultId === 'string' && operation.resultId.length > 0 && typeof operation.createdAt === 'string' && operation.createdAt.length > 0;
  return operation.type === 'restore_conversion' && typeof operation.id === 'string' && operation.id.length > 0;
}

export function applyCanvasOperation(document: CanvasDocument, operation: CanvasOperation): CanvasDocument | undefined {
  if (operation.type === 'put_object') {
    const index = document.objects.findIndex(({ id }) => id === operation.object.id);
    const objects = index < 0
      ? [...document.objects, operation.object]
      : document.objects.map((object, objectIndex) => objectIndex === index ? operation.object : object);
    const next = withObjects(document, objects);
    return isDocument(next) ? next : undefined;
  }
  if (operation.type === 'remove_objects') return removeObjects(document, operation.ids);
  if (operation.type === 'replace_objects') return withObjects(document, operation.objects);
  if (operation.type === 'set_title') return { ...document, title: operation.title, updatedAt: new Date().toISOString() };
  if (operation.type === 'set_viewport') return { ...document, viewport: operation.viewport, updatedAt: new Date().toISOString() };
  if (operation.type === 'convert') {
    if (document.objects.some(({ id }) => id === operation.resultId)) return undefined;
    const next = convertWithIdentity(document, operation.selectedIds, operation.target, { id: operation.resultId, createdAt: operation.createdAt });
    return next === document ? undefined : next;
  }
  const next = restoreConversion(document, operation.id);
  return next === document ? undefined : next;
}

export function applyCanvasOperations(document: CanvasDocument, values: unknown[]): CanvasDocument | undefined {
  if (!values.length || !values.every(isCanvasOperation)) return undefined;
  let next: CanvasDocument | undefined = document;
  for (const operation of values) {
    next = next && applyCanvasOperation(next, operation);
    if (!next) return undefined;
  }
  return isDocument(next) ? next : undefined;
}

export function applyEnvelope(state: PairingHostState, value: unknown, options: ApplyOptions): OperationResult {
  if (!value || typeof value !== 'object') return rejected(state, 'INVALID_ENVELOPE');
  const candidate = value as Partial<OperationEnvelope>;
  if (candidate.protocolVersion !== PAIRING_PROTOCOL_VERSION) return rejected(state, 'UNSUPPORTED_PROTOCOL');
  if (candidate.documentVersion !== DOCUMENT_VERSION) return rejected(state, 'UNSUPPORTED_DOCUMENT');
  if (!isOperationEnvelope(value)) return rejected(state, 'INVALID_ENVELOPE');
  const envelope = value;
  if (envelope.sessionId !== state.sessionId) return rejected(state, 'WRONG_SESSION');
  const client = state.clients[envelope.clientId];
  if (!client) return rejected(state, 'UNKNOWN_CLIENT');
  if (client.revokedAt) return rejected(state, 'CLIENT_REVOKED');
  const now = options.now ?? new Date().toISOString();
  if (Date.parse(client.expiresAt) <= Date.parse(now)) return rejected(state, 'CAPABILITY_EXPIRED');
  if (options.digestCapability(envelope.capability) !== client.capabilityDigest) return rejected(state, 'CAPABILITY_REJECTED');

  const fingerprint = (options.fingerprint ?? defaultFingerprint)(envelope);
  const previous = state.applied[envelope.operationId];
  if (previous) return previous.fingerprint === fingerprint
    ? { status: 'duplicate', state, receipt: previous }
    : rejected(state, 'OPERATION_ID_REUSED');
  if (envelope.baseRevision < state.revision) return rejected(state, 'STALE_REVISION');
  if (envelope.baseRevision > state.revision) return rejected(state, 'FUTURE_REVISION');

  const document = applyCanvasOperation(state.document, envelope.operation);
  if (!document || !isDocument(document)) return rejected(state, 'INVALID_OPERATION');
  const receipt: AppliedOperation = {
    operationId: envelope.operationId,
    clientId: envelope.clientId,
    fingerprint,
    revision: state.revision + 1,
    documentUpdatedAt: document.updatedAt
  };
  return {
    status: 'applied',
    receipt,
    state: {
      ...state,
      revision: receipt.revision,
      document,
      applied: { ...state.applied, [envelope.operationId]: receipt }
    }
  };
}
