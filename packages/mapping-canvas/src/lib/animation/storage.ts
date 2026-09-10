import { validateProject, type Project } from './model';
const DB = 'create-something-draw-animation';
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('projects', { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export type ProjectSummary = Pick<Project, 'id' | 'title' | 'revision'>;
export async function loadProjects(): Promise<ProjectSummary[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const summaries: ProjectSummary[] = [],
      tx = db.transaction('projects'),
      r = tx.objectStore('projects').openCursor();
    r.onsuccess = () => {
      const cursor = r.result;
      if (!cursor) {
        resolve(summaries);
        return;
      }
      const p = cursor.value;
      summaries.push({ id: p.id, title: p.title, revision: p.revision });
      cursor.continue();
    };
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
  });
}
export async function loadProject(id: string): Promise<Project> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects'),
      r = tx.objectStore('projects').get(id);
    r.onsuccess = () => {
      try {
        validateProject(r.result);
        resolve(r.result);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
  });
}
export async function saveProject(p: Project, expected: number | null): Promise<void> {
  validateProject(p);
  const portable = JSON.parse(JSON.stringify(p));
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite'),
      store = tx.objectStore('projects'),
      get = store.get(p.id);
    let conflict = false;
    get.onsuccess = () => {
      const existing = get.result as Project | undefined;
      if ((existing?.revision ?? null) !== expected) {
        conflict = true;
        tx.abort();
        return;
      }
      store.put(portable);
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = () => {
      db.close();
      reject(
        new Error(
          conflict
            ? 'Another tab changed this project. Reload before editing; your draft has not overwritten it.'
            : 'Could not save project. Export your draft before closing.'
        )
      );
    };
    tx.onerror = () => {};
  });
}
