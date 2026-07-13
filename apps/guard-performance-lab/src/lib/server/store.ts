import { mkdir, open, readFile, rename, stat, unlink, writeFile, type FileHandle } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInitialState, parseAuthoritativeState, parseState, type LabState } from '../model.js';

export interface LabStore {
  read(): Promise<LabState>;
  mutate(transform: (state: LabState) => LabState | Promise<LabState>): Promise<LabState>;
  reset(): Promise<LabState>;
}

export class JsonFileLabStore implements LabStore {
  constructor(readonly path = resolve(process.env.GUARD_LAB_DATA_PATH ?? '.data/workspace.json')) {}
  private async readUnlocked(): Promise<LabState> {
    try { return parseAuthoritativeState(await readFile(this.path, 'utf8')); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return createInitialState();
      throw error;
    }
  }
  private async writeUnlocked(state: LabState): Promise<LabState> {
    const normalized = parseState(JSON.stringify(state));
    await mkdir(dirname(this.path), { recursive: true });
    const temp = `${this.path}.tmp`;
    await writeFile(temp, JSON.stringify(normalized, null, 2), 'utf8');
    await rename(temp, this.path);
    return normalized;
  }
  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(dirname(this.path), { recursive: true });
    const lockPath = `${this.path}.lock`;
    let handle: FileHandle | undefined;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      try { handle = await open(lockPath, 'wx'); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const lockStat = await stat(lockPath).catch(() => undefined);
        if (lockStat && Date.now() - lockStat.mtimeMs > 10_000) { await unlink(lockPath).catch(() => undefined); continue; }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
      }
    }
    if (!handle) throw new Error('The local workspace is busy. Retry the operation.');
    try { return await operation(); }
    finally { await handle.close(); await unlink(lockPath).catch(() => undefined); }
  }
  async read(): Promise<LabState> { return this.readUnlocked(); }
  async mutate(transform: (state: LabState) => LabState | Promise<LabState>): Promise<LabState> {
    return this.withLock(async () => {
      const current = await this.readUnlocked();
      const transformed = await transform(current);
      return this.writeUnlocked({ ...transformed, revision: current.revision + 1 });
    });
  }
  async reset(): Promise<LabState> { return this.mutate(() => createInitialState()); }
}

export const labStore = new JsonFileLabStore();
