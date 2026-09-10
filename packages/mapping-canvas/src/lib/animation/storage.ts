import { loadProjectRecord, listProjectRecords, saveMotionProject } from '../project-storage';
import { syncMotionProject } from './import-map';
import { validateProject, type Project } from './model';

const LEGACY_DATABASE = 'create-something-draw-animation';
const LEGACY_STORE = 'projects';
let migration: Promise<void> | undefined;

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
  migration ??= (async () => {
    for (const project of await legacyProjects()) {
      const existing = await loadProjectRecord(project.id);
      if (!existing?.motion) await saveMotionProject(project, null);
    }
  })();
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
  const record = await loadProjectRecord(id);
  if (!record) throw new Error('Draw project was not found on this device.');
  if (!record.canvas && record.motion) return record.motion;
  if (!record.canvas) throw new Error('Draw project has no Canvas or Motion space.');
  const synchronized = syncMotionProject(record.canvas, record.motion);
  if (!record.motion || synchronized !== record.motion)
    await saveMotionProject(synchronized, record.motion?.revision ?? null);
  return synchronized;
}

export const saveProject = saveMotionProject;
