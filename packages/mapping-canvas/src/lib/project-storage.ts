import { createDocument, normalizeDocument, type CanvasDocument } from './document';
import { validateProject, type Project } from './animation/model';

export const DRAW_PROJECT_VERSION = 'draw.project.v1' as const;

export type DrawProjectRecord = {
  version: typeof DRAW_PROJECT_VERSION;
  id: string;
  canvas?: CanvasDocument;
  motion?: Project;
};

type ProjectUpdate = { canvas?: CanvasDocument; motion?: Project };

const DATABASE = 'create-something-draw-projects';
const STORE = 'projects';
const META = 'meta';
const ACTIVE_CANVAS = 'active-canvas';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      if (!request.result.objectStoreNames.contains(META)) request.result.createObjectStore(META);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function mergeProjectRecord(
  current: DrawProjectRecord | undefined,
  update: ProjectUpdate
): DrawProjectRecord {
  const id = update.canvas?.id ?? update.motion?.id ?? current?.id;
  if (!id) throw new Error('A Draw project update requires a project ID.');
  if (current && current.id !== id)
    throw new Error('Draw project identity cannot change during a merge.');
  if (update.canvas && update.motion && update.canvas.id !== update.motion.id)
    throw new Error('Canvas and Motion must use the same Draw project ID.');
  if (update.canvas && !normalizeDocument(update.canvas))
    throw new Error('Invalid Canvas document.');
  if (update.motion) {
    validateProject(update.motion);
    if (update.motion.id !== id) throw new Error('Motion project identity does not match Canvas.');
  }
  return {
    version: DRAW_PROJECT_VERSION,
    id,
    ...(current?.canvas ? { canvas: current.canvas } : {}),
    ...(current?.motion ? { motion: current.motion } : {}),
    ...(update.canvas ? { canvas: JSON.parse(JSON.stringify(update.canvas)) } : {}),
    ...(update.motion ? { motion: JSON.parse(JSON.stringify(update.motion)) } : {})
  };
}

export function canvasSpaceForProject(record: DrawProjectRecord): CanvasDocument | null {
  if (record.canvas) return clone(record.canvas);
  if (!record.motion) return null;
  return { ...createDocument(record.motion.title), id: record.id };
}

export async function activateCanvasProject(id: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE, META], 'readwrite');
    const request = transaction.objectStore(STORE).get(id);
    request.onsuccess = () => {
      if (!normalizeDocument(request.result?.canvas)) {
        transaction.abort();
        return;
      }
      transaction.objectStore(META).put(id, ACTIVE_CANVAS);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onabort = () => {
      db.close();
      reject(new Error('Draw project has no Canvas space to activate.'));
    };
    transaction.onerror = () => {};
  });
}

export async function loadProjectRecord(id: string): Promise<DrawProjectRecord | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE);
    const request = transaction.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function listProjectRecords(): Promise<DrawProjectRecord[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const records: DrawProjectRecord[] = [];
    const transaction = db.transaction(STORE);
    const request = transaction.objectStore(STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      records.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve(records);
    };
  });
}

export async function loadCanvasProject(id?: string): Promise<CanvasDocument | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE, META]);
    const projects = transaction.objectStore(STORE);
    const finish = (projectId: string | undefined) => {
      if (!projectId) {
        resolve(null);
        return;
      }
      const request = projects.get(projectId);
      request.onsuccess = () => resolve(normalizeDocument(request.result?.canvas));
      request.onerror = () => reject(request.error);
    };
    if (id) finish(id);
    else {
      const request = transaction.objectStore(META).get(ACTIVE_CANVAS);
      request.onsuccess = () =>
        finish(typeof request.result === 'string' ? request.result : undefined);
      request.onerror = () => reject(request.error);
    }
    transaction.oncomplete = () => db.close();
  });
}

export async function saveCanvasProject(canvas: CanvasDocument): Promise<void> {
  const db = await open();
  const portable = clone(canvas);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE, META], 'readwrite');
    const projects = transaction.objectStore(STORE);
    const request = projects.get(canvas.id);
    request.onsuccess = () => {
      projects.put(mergeProjectRecord(request.result, { canvas: portable }));
      transaction.objectStore(META).put(canvas.id, ACTIVE_CANVAS);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/** Copy a legacy Canvas into the shared store once without replacing a migrated edit. */
export async function migrateLegacyCanvasProject(canvas: CanvasDocument): Promise<void> {
  const db = await open();
  const portable = clone(canvas);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE, META], 'readwrite');
    const projects = transaction.objectStore(STORE);
    const request = projects.get(canvas.id);
    request.onsuccess = () => {
      const current = request.result as DrawProjectRecord | undefined;
      if (current?.canvas) return;
      projects.put(mergeProjectRecord(current, { canvas: portable }));
      transaction.objectStore(META).put(canvas.id, ACTIVE_CANVAS);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearCanvasProject(id?: string): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE, META], 'readwrite');
    const projects = transaction.objectStore(STORE);
    const removeCanvas = (projectId: string | undefined) => {
      if (!projectId) return;
      const request = projects.get(projectId);
      request.onsuccess = () => {
        const current = request.result as DrawProjectRecord | undefined;
        if (!current) return;
        if (current.motion)
          projects.put({ version: DRAW_PROJECT_VERSION, id: current.id, motion: current.motion });
        else projects.delete(projectId);
      };
    };
    if (id) removeCanvas(id);
    else {
      const request = transaction.objectStore(META).get(ACTIVE_CANVAS);
      request.onsuccess = () =>
        removeCanvas(typeof request.result === 'string' ? request.result : undefined);
    }
    transaction.objectStore(META).delete(ACTIVE_CANVAS);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveMotionProject(
  motion: Project,
  expectedRevision: number | null,
  expectedCanvasUpdatedAt?: string | null
): Promise<void> {
  validateProject(motion);
  const portable = clone(motion);
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const projects = transaction.objectStore(STORE);
    const request = projects.get(motion.id);
    let conflict: 'motion' | 'canvas' | null = null;
    request.onsuccess = () => {
      const current = request.result as DrawProjectRecord | undefined;
      if ((current?.motion?.revision ?? null) !== expectedRevision) {
        conflict = 'motion';
        transaction.abort();
        return;
      }
      if (
        expectedCanvasUpdatedAt !== undefined &&
        (current?.canvas?.updatedAt ?? null) !== expectedCanvasUpdatedAt
      ) {
        conflict = 'canvas';
        transaction.abort();
        return;
      }
      projects.put(mergeProjectRecord(current, { motion: portable }));
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onabort = () => {
      db.close();
      reject(
        new Error(
          conflict === 'canvas'
            ? 'Canvas changed in another tab. Reload Motion before editing; your draft has not overwritten it.'
            : conflict === 'motion'
              ? 'Another tab changed this project. Reload before editing; your draft has not overwritten it.'
              : 'Could not save project. Export your draft before closing.'
        )
      );
    };
    transaction.onerror = () => {};
  });
}
