import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { hashReceipt } from './canonical.js';
import type { OfferWatch, OfferWatchRepository } from './service.js';

interface StoredOfferWatches {
  schemaVersion: 'offer_watch_store.v0.1';
  watches: Record<string, OfferWatch>;
  idempotencyIndex: Record<string, string>;
}

export interface CreateFileOfferWatchRepositoryOptions {
  filePath: string;
}

function emptyStore(): StoredOfferWatches {
  return {
    schemaVersion: 'offer_watch_store.v0.1',
    watches: {},
    idempotencyIndex: {}
  };
}

function idempotencyHash(key: string): string {
  return hashReceipt({ scope: 'offer_watch', key });
}

function parseStore(text: string): StoredOfferWatches {
  const value = JSON.parse(text) as Partial<StoredOfferWatches>;
  if (
    value.schemaVersion !== 'offer_watch_store.v0.1' ||
    !value.watches ||
    typeof value.watches !== 'object' ||
    !value.idempotencyIndex ||
    typeof value.idempotencyIndex !== 'object'
  ) {
    throw new Error('Offer watch store has an unsupported or invalid schema.');
  }
  return value as StoredOfferWatches;
}

export function createFileOfferWatchRepository(
  options: CreateFileOfferWatchRepositoryOptions
): OfferWatchRepository {
  const { filePath } = options;
  let writeQueue = Promise.resolve();

  async function readStore(): Promise<StoredOfferWatches> {
    try {
      return parseStore(await readFile(filePath, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore();
      throw error;
    }
  }

  async function writeStore(store: StoredOfferWatches): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600
    });
    await rename(temporaryPath, filePath);
  }

  return {
    async findByIdempotencyKey(key) {
      const store = await readStore();
      const watchId = store.idempotencyIndex[idempotencyHash(key)];
      return watchId ? store.watches[watchId] : undefined;
    },
    async get(id) {
      return (await readStore()).watches[id];
    },
    async list() {
      return Object.values((await readStore()).watches).sort((left, right) =>
        left.id.localeCompare(right.id)
      );
    },
    async save(key, watch) {
      writeQueue = writeQueue.then(async () => {
        const store = await readStore();
        store.watches[watch.id] = watch;
        store.idempotencyIndex[idempotencyHash(key)] = watch.id;
        await writeStore(store);
      });
      await writeQueue;
    },
    async update(watch) {
      writeQueue = writeQueue.then(async () => {
        const store = await readStore();
        if (!store.watches[watch.id]) {
          throw new Error(`Offer watch ${watch.id} does not exist.`);
        }
        store.watches[watch.id] = watch;
        await writeStore(store);
      });
      await writeQueue;
    }
  };
}
