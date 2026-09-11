import { loadProjectRecord, listProjectRecords, saveMotionProject } from '../project-storage';
import { syncMotionProject } from './import-map';
import { validateProject, type Project } from './model';

const LEGACY_DATABASE = 'create-something-draw-animation';
const LEGACY_STORE = 'projects';
let migration: Promise<void> | undefined;
const loadedCanvasVersions = new Map<string, string | null>();

function openLegacy(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(LEGACY_STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function legacyProjects(): Promise<Project[]> {
  const db = await openLegacy();
  return new Promise((resolve, reject) => {
    const projects: Project[] = [];
    const transaction = db.transaction(LEGACY_STORE);
    const request = transaction.objectStore(LEGACY_STORE).openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        validateProject(cursor.value);
        projects.push(cursor.value);
      } catch {
        // Preserve but ignore an invalid legacy record.
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve(projects);
    };
  });
}

async function migrateLegacyProjects(): Promise<void> {
  if (!migration) {
    const activeMigration = (async () => {
      for (const project of await legacyProjects()) {
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          const existing = await loadProjectRecord(project.id);
          if (existing?.motion) break;
          try {
            await saveMotionProject(
              project,
              null,
              existing?.canvas?.updatedAt ?? null,
              'legacy-migration'
            );
            break;
          } catch (error) {
            lastError = error;
            if ((await loadProjectRecord(project.id))?.motion) break;
            if (attempt === 2) throw lastError;
          }
        }
      }
    })();
    migration = activeMigration;
    void activeMigration.catch(() => {
      if (migration === activeMigration) migration = undefined;
    });
  }
  return migration;
}

export type ProjectSummary = Pick<Project, 'id' | 'title' | 'revision'>;

export async function loadProjects(): Promise<ProjectSummary[]> {
  await migrateLegacyProjects();
  return (await listProjectRecords()).map((record) => ({
    id: record.id,
    title: record.motion?.title ?? record.canvas?.title ?? 'Untitled Draw project',
    revision: record.motion?.revision ?? 0
  }));
}

export async function loadProject(id: string): Promise<Project> {
  await migrateLegacyProjects();
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const record = await loadProjectRecord(id);
    if (!record) throw new Error('Draw project was not found on this device.');
    if (!record.canvas && record.motion) {
      loadedCanvasVersions.set(id, null);
      return record.motion;
    }
    if (!record.canvas) throw new Error('Draw project has no Canvas or Motion space.');
    const synchronized = syncMotionProject(record.canvas, record.motion);
    try {
      let committedCanvasUpdatedAt = record.canvas.updatedAt;
      if (!record.motion || synchronized !== record.motion)
        committedCanvasUpdatedAt = (await saveMotionProject(
          synchronized,
          record.motion?.revision ?? null,
          record.canvas.updatedAt
        )) ?? record.canvas.updatedAt;
      loadedCanvasVersions.set(id, committedCanvasUpdatedAt);
      return synchronized;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function saveProject(
  project: Project,
  expectedRevision: number | null
): Promise<void> {
  const canvasUpdatedAt = await saveMotionProject(
    project,
    expectedRevision,
    loadedCanvasVersions.get(project.id) ?? null
  );
  loadedCanvasVersions.set(project.id, canvasUpdatedAt);
}
