import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createPlayer } from '../model.js';
import { JsonFileLabStore } from './store.js';

let dir = '';
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });
describe('local authoritative datastore', () => {
  it('creates, persists, and reloads a versioned workspace', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-lab-'));
    const store = new JsonFileLabStore(join(dir, 'workspace.json'));
    const first = await store.read();
    await store.mutate((state) => createPlayer(state, 'API Managed Player', 'p-api'));
    expect((await store.read()).players.some((p) => p.id === 'p-api')).toBe(true);
  });

  it('fails closed without overwriting a corrupt authoritative file', async () => {
    dir = await mkdtemp(join(tmpdir(), 'guard-lab-'));
    const path = join(dir, 'workspace.json');
    await writeFile(path, '{corrupt', 'utf8');
    const store = new JsonFileLabStore(path);
    await expect(store.read()).rejects.toThrow('invalid');
    expect(await readFile(path, 'utf8')).toBe('{corrupt');
  });
});
