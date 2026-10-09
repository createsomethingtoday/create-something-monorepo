/** Local references and receipts only. Canonical map content remains owned by Draw. */
export const REGISTRY_VERSION = 'draw.session-registry.v1' as const;
export const REGISTRY_LIMITS = { maps: 200, links: 2000, receipts: 10000, bytes: 8_000_000 } as const;
export interface Scope { clientId: string; workspaceId: string }
export interface ScopedMap extends Scope { mapId: string }
export interface SessionReference { provider: 'claude' | 'codex'; sourceId: string; providerSessionId: string }
export interface SessionLink extends ScopedMap { session: SessionReference }
export interface EditReceipt extends ScopedMap {
  operationId: string;
  requestHash: string;
  expectedRevision: string;
  status: 'committed' | 'verified' | 'unknown' | 'failed';
  session?: SessionReference;
  resultingRevision?: string;
  contentHash?: string;
}
export interface RegistryState {
  version: typeof REGISTRY_VERSION;
  maps: ScopedMap[];
  links: SessionLink[];
  receipts: EditReceipt[];
}

function fail(message: string): never { throw new Error(`Draw registry: ${message}`); }
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected object');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key))) fail('unknown field');
  return record;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) fail('invalid opaque ID or revision');
  return value;
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail('invalid SHA256 hash');
  return value;
}
function map(value: unknown): ScopedMap {
  const row = object(value, ['clientId', 'workspaceId', 'mapId']);
  return { clientId: id(row.clientId), workspaceId: id(row.workspaceId), mapId: id(row.mapId) };
}
function session(value: unknown): SessionReference {
  const row = object(value, ['provider', 'sourceId', 'providerSessionId']);
  if (row.provider !== 'claude' && row.provider !== 'codex') fail('unsupported provider');
  return { provider: row.provider, sourceId: id(row.sourceId), providerSessionId: id(row.providerSessionId) };
}
function receipt(value: unknown): EditReceipt {
  const row = object(value, ['clientId', 'workspaceId', 'mapId', 'operationId', 'requestHash', 'expectedRevision', 'status', 'resultingRevision', 'contentHash', 'session']);
  const base = map({ clientId: row.clientId, workspaceId: row.workspaceId, mapId: row.mapId });
  if (!['committed', 'verified', 'unknown', 'failed'].includes(row.status as string)) fail('invalid receipt status');
  const result: EditReceipt = { ...base, operationId: id(row.operationId), requestHash: hash(row.requestHash), expectedRevision: id(row.expectedRevision), status: row.status as EditReceipt['status'] };
  if (row.session !== undefined) result.session = session(row.session);
  if (result.status === 'committed' || result.status === 'verified') {
    result.resultingRevision = id(row.resultingRevision);
    result.contentHash = hash(row.contentHash);
  } else if ('resultingRevision' in row || 'contentHash' in row) fail('unconfirmed receipt cannot claim resulting content');
  return result;
}
function key(value: ScopedMap): string { return JSON.stringify([value.clientId, value.workspaceId, value.mapId]); }
function sessionKey(value: SessionReference): string { return JSON.stringify([value.provider, value.sourceId, value.providerSessionId]); }
function sameScope(a: Scope, b: Scope): boolean { return a.clientId === b.clientId && a.workspaceId === b.workspaceId; }
function array(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) fail('invalid or oversized collection');
  return value;
}
function unique(values: string[]): void { if (new Set(values).size !== values.length) fail('duplicate identity'); }

/** Strict closed schema; prevents accidentally importing transcripts, paths or credentials as fields. */
export function validateState(value: unknown): RegistryState {
  const row = object(value, ['version', 'maps', 'links', 'receipts']);
  if (row.version !== REGISTRY_VERSION) fail('unsupported version');
  const maps = array(row.maps, REGISTRY_LIMITS.maps).map(map);
  const links = array(row.links, REGISTRY_LIMITS.links).map((value): SessionLink => {
    const entry = object(value, ['clientId', 'workspaceId', 'mapId', 'session']);
    return { ...map({ clientId: entry.clientId, workspaceId: entry.workspaceId, mapId: entry.mapId }), session: session(entry.session) };
  });
  const receipts = array(row.receipts, REGISTRY_LIMITS.receipts).map(receipt);
  const membership = new Set(maps.map(key));
  unique(maps.map(key));
  // Canonical Draw storage is keyed globally by map ID. A map cannot be
  // assigned to two client scopes without aliasing the same document.
  unique(maps.map(entry => entry.mapId));
  unique(links.map((link) => `${key(link)}:${sessionKey(link.session)}`));
  unique(receipts.map((entry) => `${key(entry)}:${entry.operationId}`));
  if ([...links, ...receipts].some((entry) => !membership.has(key(entry)))) fail('reference to unregistered map');
  if (receipts.some(entry => entry.session && !links.some(link => key(link) === key(entry) && sessionKey(link.session) === sessionKey(entry.session!)))) fail('receipt session is not linked to map');
  return { version: REGISTRY_VERSION, maps, links, receipts };
}
export function emptyRegistry(): RegistryState { return { version: REGISTRY_VERSION, maps: [], links: [], receipts: [] }; }
export function findMap(state: RegistryState, scope: Scope, mapId: string): ScopedMap | undefined {
  const target = map({ ...scope, mapId });
  return validateState(state).maps.find((entry) => key(entry) === key(target));
}
export function registerMap(state: RegistryState, scope: Scope, mapId: string): RegistryState {
  const current = validateState(state), entry = map({ ...scope, mapId });
  if (current.maps.some((existing) => key(existing) === key(entry))) return current;
  return validateState({ ...current, maps: [...current.maps, entry] });
}
export function linkSession(state: RegistryState, scope: Scope, mapId: string, reference: SessionReference, optIn: boolean): RegistryState {
  if (optIn !== true) fail('session linking requires explicit opt-in');
  const current = validateState(state), entry = { ...map({ ...scope, mapId }), session: session(reference) };
  if (!findMap(current, scope, mapId)) fail('unregistered map');
  if (current.links.some((link) => key(link) === key(entry) && sessionKey(link.session) === sessionKey(entry.session))) return current;
  return validateState({ ...current, links: [...current.links, entry] });
}
export function resolveSession(state: RegistryState, scope: Scope, reference: SessionReference): ScopedMap[] {
  object(scope, ['clientId', 'workspaceId']);
  id(scope.clientId); id(scope.workspaceId);
  const target = sessionKey(session(reference)), current = validateState(state);
  return current.links.filter((entry) => sameScope(entry, scope) && sessionKey(entry.session) === target)
    .map(({ clientId, workspaceId, mapId }) => ({ clientId, workspaceId, mapId }));
}
export function findReceipt(state: RegistryState, scope: Scope, mapId: string, operationId: string): EditReceipt | undefined {
  const target = map({ ...scope, mapId }); id(operationId);
  return validateState(state).receipts.find((entry) => key(entry) === key(target) && entry.operationId === operationId);
}
export function recordReceipt(state: RegistryState, value: EditReceipt): RegistryState {
  const current = validateState(state), next = receipt(value);
  const previous = findReceipt(current, { clientId: next.clientId, workspaceId: next.workspaceId }, next.mapId, next.operationId);
  if (previous) {
    if (previous.requestHash !== next.requestHash || previous.expectedRevision !== next.expectedRevision) fail('operation identity reused with different request');
    if (JSON.stringify(previous.session) !== JSON.stringify(next.session)) fail('operation session provenance cannot change');
    if (JSON.stringify(previous) === JSON.stringify(next)) return current;
    const allowed = (previous.status === 'unknown' && ['committed', 'failed'].includes(next.status)) || (previous.status === 'committed' && next.status === 'verified');
    if (!allowed) fail('invalid receipt transition');
    if (previous.status === 'committed' && (previous.resultingRevision !== next.resultingRevision || previous.contentHash !== next.contentHash)) fail('verification cannot change committed content');
  }
  return validateState({ ...current, receipts: [...current.receipts.filter((entry) => !(key(entry) === key(next) && entry.operationId === next.operationId)), next] });
}
export function exportRegistry(state: RegistryState): string {
  const text = JSON.stringify(validateState(state));
  if (new TextEncoder().encode(text).byteLength > REGISTRY_LIMITS.bytes) fail('export exceeds byte limit');
  return text;
}
export function importRegistry(text: string): RegistryState {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > REGISTRY_LIMITS.bytes) fail('import exceeds byte limit');
  return validateState(JSON.parse(text));
}
