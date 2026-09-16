import { normalizeDocument, type CanvasDocument } from './document';
import {
  canvasSpaceForProject,
  clearCanvasProject,
  loadCanvasProject,
  loadProjectRecord,
  migrateLegacyCanvasProject,
  saveCanvasProject
} from './project-storage';

const LEGACY_DATABASE = 'create-something-mapping-canvas';
const LEGACY_STORE = 'documents';
const LEGACY_KEY = 'active';

function openLegacy(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LEGACY_STORE))
        request.result.createObjectStore(LEGACY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadLegacyDocument(): Promise<{ document: CanvasDocument; backgroundWasMissing: boolean } | null> {
  const db = await openLegacy();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LEGACY_STORE);
    const request = transaction.objectStore(LEGACY_STORE).get(LEGACY_KEY);
    request.onsuccess = () => {
      const normalized = normalizeDocument(request.result);
      resolve(normalized ? {
        document: normalized,
        backgroundWasMissing: request.result?.background === undefined
      } : null);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function loadDocument(id?: string): Promise<CanvasDocument | null> {
  const shared = await loadCanvasProject(id);
  if (shared) return shared;
  const legacy = await loadLegacyDocument();
  if (legacy) {
    await migrateLegacyCanvasProject(legacy.document, legacy.backgroundWasMissing);
    if (!id || legacy.document.id === id) return (await loadCanvasProject(legacy.document.id)) ?? legacy.document;
  }
  if (id) {
    const record = await loadProjectRecord(id);
    if (record?.motion) {
      const canvas = canvasSpaceForProject(record)!;
      await saveCanvasProject(canvas);
      return canvas;
    }
  }
  return null;
}

export const saveDocument = saveCanvasProject;
export const clearDocument = clearCanvasProject;
