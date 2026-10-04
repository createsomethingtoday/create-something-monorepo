import type { CanvasDocument } from './document';
import {
  emptyRegistry, validateState, registerMap, linkSession, resolveSession,
  findMap, findReceipt, recordReceipt, exportRegistry, importRegistry,
  type RegistryState, type Scope, type SessionReference, type EditReceipt
} from './session-registry';

/** The registry never owns map content. Mutations must be serialized atomically. */
export interface RegistryStore {
  read(): Promise<RegistryState>;
  update<T>(change: (state: RegistryState) => { state: RegistryState; result: T }): Promise<T>;
}

export interface RegistryBoundary {
  readMap(mapId: string): Promise<CanvasDocument | null>;
  revision(document: CanvasDocument): string;
  /** Calls the current guarded Draw boundary, never a raw document write. */
  edit(mapId: string, expectedRevision: string, commands: unknown): Promise<{
    status: 'committed' | 'unknown' | 'failed'; resultingRevision?: string; contentHash?: string;
  }>;
}

// Stable JSON hashing ignores object-key insertion order, preserves array order.
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',') + '}';
  }
  throw new Error('Only finite JSON values can be hashed.');
}

export async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  if (bytes.length > 4 * 1024 * 1024) throw new Error('Pilot hash input exceeds 4 MiB.');
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function createSessionRegistryPilot(store: RegistryStore, boundary: RegistryBoundary) {
  return {
    async register(scope: Scope, mapId: string) {
      const document = await boundary.readMap(mapId);
      if (!document || document.id !== mapId) throw new Error('Canonical Draw map is unavailable.');
      await store.update(state => ({ state: registerMap(state, scope, mapId), result: undefined }));
    },
    async link(scope: Scope, mapId: string, session: SessionReference, optIn: true) {
      await store.update(state => ({ state: linkSession(state, scope, mapId, session, optIn), result: undefined }));
    },
    async resolve(scope: Scope, session: SessionReference) {
      const maps = resolveSession(await store.read(), scope, session);
      return Promise.all(maps.map(async map => {
        const document = await boundary.readMap(map.mapId);
        if (document && document.id !== map.mapId) throw new Error('Canonical map identity mismatch.');
        return { mapId: map.mapId, document, revision: document ? boundary.revision(document) : null,
          contentHash: document ? await digest(document) : null };
      }));
    },
    async edit(scope: Scope, mapId: string, operationId: string, expectedRevision: string, commands: unknown, session?: SessionReference) {
      const requestHash = await digest({ mapId, expectedRevision, commands, ...(session ? {session} : {}) });
      const reserved = await store.update(state => {
        if (!findMap(state, scope, mapId)) throw new Error('Map is not registered in this scope.');
        const previous = findReceipt(state, scope, mapId, operationId);
        const receipt: EditReceipt = { ...scope, mapId, operationId, expectedRevision, requestHash, status: 'unknown', ...(session ? {session} : {}) };
        if (previous) {
          if (previous.requestHash !== requestHash || previous.expectedRevision !== expectedRevision) throw new Error('Operation ID reused with different request.');
          return { state, result: { duplicate: true, receipt: previous } };
        }
        return { state: recordReceipt(state, receipt), result: { duplicate: false, receipt } };
      });
      if (reserved.duplicate) return reserved;
      // Reserve UNKNOWN before invoking Draw. A crash, thrown mutation or failed
      // receipt write must never allow automatic replay of a potentially applied edit.
      const document = await boundary.readMap(mapId);
      let outcome: Awaited<ReturnType<RegistryBoundary['edit']>>;
      if (!document || document.id !== mapId || boundary.revision(document) !== expectedRevision) {
        outcome = { status: 'failed' };
      } else {
        try { outcome = await boundary.edit(mapId, expectedRevision, commands); }
        catch { return reserved; }
      }
      const receipt: EditReceipt = { ...reserved.receipt, ...outcome };
      try {
        await store.update(state => ({ state: recordReceipt(state, receipt), result: undefined }));
      } catch {
        // Return the durable reservation, never pretend a failed write persisted.
        return { duplicate: false, receipt: reserved.receipt };
      }
      return { duplicate: false, receipt };
    },
    async exportScope(scope: Scope) {
      // Validate scope even when its collections are empty.
      findMap(emptyRegistry(), scope, 'scope-validation');
      const state = await store.read();
      const belongs = (entry: Scope) => entry.clientId === scope.clientId && entry.workspaceId === scope.workspaceId;
      return exportRegistry({ ...state, maps: state.maps.filter(belongs), links: state.links.filter(belongs), receipts: state.receipts.filter(belongs) });
    },
    async importScope(scope: Scope, value: unknown, optIn: true) {
      findMap(emptyRegistry(), scope, 'scope-validation');
      if (typeof value !== 'string') throw new Error('Import requires a registry JSON string.');
      const incoming = importRegistry(value);
      if (optIn !== true) throw new Error('Registry import requires explicit session-link opt-in.');
      if ([...incoming.maps, ...incoming.links, ...incoming.receipts].some(entry => entry.clientId !== scope.clientId || entry.workspaceId !== scope.workspaceId)) throw new Error('Import contains another client scope.');
      await store.update(state => {
        let merged = state;
        for (const map of incoming.maps) merged = registerMap(merged, scope, map.mapId);
        for (const link of incoming.links) merged = linkSession(merged, scope, link.mapId, link.session, true);
        for (const receipt of incoming.receipts) merged = recordReceipt(merged, receipt);
        return { state: merged, result: undefined };
      });
    }
  };
}

/** Separate IndexedDB beside existing canonical Draw storage. No new dependency. */
export function indexedDbRegistryStore(factory: IDBFactory = indexedDB, database = 'create-something-draw-session-registry-pilot'): RegistryStore {
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('registry');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Registry database upgrade is blocked.'));
  });
  async function transact<T>(mode: IDBTransactionMode, change: (state: RegistryState) => { state: RegistryState; result: T }): Promise<T> {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('registry', mode);
      const records = transaction.objectStore('registry');
      const request = records.get('state');
      let result: T;
      let error: unknown;
      request.onsuccess = () => {
        try {
          const state = request.result === undefined ? emptyRegistry() : validateState(request.result);
          const changed = change(state);
          result = changed.result;
          if (mode === 'readwrite') records.put(validateState(changed.state), 'state');
        } catch (cause) { error = cause; transaction.abort(); }
      };
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onabort = transaction.onerror = () => { db.close(); reject(error ?? transaction.error ?? new Error('Registry transaction failed.')); };
    });
  }
  return { read: () => transact('readonly', state => ({ state, result: state })), update: change => transact('readwrite', change) };
}
