import { isDocument, normalizeDocument, type CanvasDocument } from './document';
import { REGISTRY_LIMITS, validateState, type RegistryState, type Scope } from './session-registry';

export const BUNDLE_VERSION = 'draw.session-bundle.v1' as const;
export interface BundleMap { mapId: string; contentHash: string; document: CanvasDocument }
export interface SessionRegistryBundle {
  version: typeof BUNDLE_VERSION;
  scope: Scope;
  registry: RegistryState;
  maps: BundleMap[];
}

function fail(message: string): never { throw new Error(`Draw session bundle: ${message}`); }
function closed(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected object');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !keys.includes(key))) fail('unknown field');
  return row;
}
function scopeOf(value: unknown): Scope {
  const row = closed(value, ['clientId', 'workspaceId']);
  for (const field of ['clientId', 'workspaceId']) {
    if (typeof row[field] !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(row[field] as string)) fail('invalid scope');
  }
  return { clientId: row.clientId as string, workspaceId: row.workspaceId as string };
}
function sameScope(a: Scope, b: Scope): boolean { return a.clientId === b.clientId && a.workspaceId === b.workspaceId; }

/** Reject non-JSON values before cloning: no getters, prototypes, cycles or silent stringify coercion. */
function plainJson(value: unknown, ancestors = new Set<object>(), depth = 0, budget = { nodes: 0 }): void {
  if (++budget.nodes > 500_000 || depth > 64) fail('content complexity limit exceeded');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || !value) fail('expected plain JSON');
  if (ancestors.has(value)) fail('cyclic content');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail('expected plain object');
  if (Object.getOwnPropertySymbols(value).length) fail('symbol field');
  ancestors.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (!descriptor.enumerable || !('value' in descriptor)) fail('non-JSON field');
    if (Array.isArray(value) && !/^(0|[1-9]\d*)$/.test(key)) fail('array field');
    plainJson(descriptor.value, ancestors, depth + 1, budget);
  }
  if (Array.isArray(value) && Object.keys(value).length !== value.length) fail('sparse array');
  ancestors.delete(value);
}
const baseKeys = ['kind', 'id', 'createdAt', 'name', 'hidden', 'locked', 'rotation', 'fill', 'strokeWidth', 'sourceIds', 'sourceSnapshot'];
const kindKeys: Record<string, string[]> = {
  stroke: ['points', 'color', 'width'], rectangle: ['from', 'to', 'color'], ellipse: ['from', 'to', 'color'], arrow: ['from', 'to', 'color'],
  note: ['x', 'y', 'width', 'height', 'text', 'content'], connector: ['fromId', 'toId', 'label'], group: ['x', 'y', 'width', 'height', 'label', 'childIds']
};
function objectFields(value: unknown): void {
  const initial = closed(value, [...baseKeys, ...Object.values(kindKeys).flat()]);
  if (typeof initial.kind !== 'string' || !Object.hasOwn(kindKeys, initial.kind)) fail('unsupported canvas kind');
  const row = closed(value, [...baseKeys, ...kindKeys[initial.kind]]);
  if (row.sourceSnapshot !== undefined) {
    if (!Array.isArray(row.sourceSnapshot)) fail('invalid source snapshot');
    row.sourceSnapshot.forEach(objectFields);
  }
  if (row.kind === 'stroke' && Array.isArray(row.points)) row.points.forEach((point) => closed(point, ['x', 'y']));
  if (['rectangle', 'ellipse', 'arrow'].includes(row.kind as string)) {
    closed(row.from, ['x', 'y']); closed(row.to, ['x', 'y']);
  }
  if (row.kind === 'note' && row.content !== undefined) {
    const content = closed(row.content, ['blocks']);
    if (!Array.isArray(content.blocks)) fail('invalid note blocks');
    content.blocks.forEach((value) => {
      const block = closed(value, ['type', 'runs']);
      if (!Array.isArray(block.runs)) fail('invalid note runs');
      block.runs.forEach((run) => closed(run, ['text', 'bold', 'italic', 'underline', 'code', 'link']));
    });
  }
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${canonical(row[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function documentOf(value: unknown): CanvasDocument {
  const row = closed(value, ['version', 'id', 'title', 'background', 'createdAt', 'updatedAt', 'viewport', 'objects']);
  closed(row.viewport, ['x', 'y', 'zoom']);
  if (!Array.isArray(row.objects)) fail('invalid canvas objects');
  row.objects.forEach(objectFields);
  if (!isDocument(value)) fail('invalid canvas document');
  const normalized = normalizeDocument(value);
  if (!normalized || canonical(normalized) !== canonical(value)) fail('document would change during storage normalization');
  return value;
}

/** Structural validation only. Caller must verify each document's SHA256 before import writes. */
export function validateBundleStructure(value: unknown, scope: Scope): SessionRegistryBundle {
  plainJson(value);
  const serialized = JSON.stringify(value);
  if (new TextEncoder().encode(serialized).byteLength > REGISTRY_LIMITS.bytes) fail('bundle exceeds byte limit');
  const detached: unknown = JSON.parse(serialized);
  const row = closed(detached, ['version', 'scope', 'registry', 'maps']);
  if (row.version !== BUNDLE_VERSION) fail('unsupported bundle version');
  const requested = scopeOf(scope), included = scopeOf(row.scope);
  if (!sameScope(requested, included)) fail('bundle scope mismatch');
  const registry = validateState(row.registry);
  if (registry.maps.some((map) => !sameScope(map, requested))) fail('registry contains another scope');
  if (!Array.isArray(row.maps) || row.maps.length > REGISTRY_LIMITS.maps) fail('invalid map collection');
  const maps = row.maps.map((value): BundleMap => {
    const entry = closed(value, ['mapId', 'contentHash', 'document']);
    if (typeof entry.mapId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(entry.mapId)) fail('invalid map ID');
    if (typeof entry.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.contentHash)) fail('invalid content hash');
    const document = documentOf(entry.document);
    if (document.id !== entry.mapId) fail('document identity mismatch');
    return { mapId: entry.mapId, contentHash: entry.contentHash, document };
  });
  const identities = new Set(maps.map((map) => map.mapId));
  if (identities.size !== maps.length || maps.length !== registry.maps.length || registry.maps.some((map) => !identities.has(map.mapId))) fail('bundle map membership mismatch');
  return { version: BUNDLE_VERSION, scope: included, registry, maps };
}
