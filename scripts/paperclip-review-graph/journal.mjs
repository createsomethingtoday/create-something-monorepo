import { readFile, open, mkdir, link, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
export function durableJournal(path) {
  return {
    loadIntent: async () => {
      try {
        return JSON.parse(await readFile(path, 'utf8'));
      } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
      }
    },
    saveIntent: async (intent) => {
      await mkdir(dirname(path), { recursive: true });
      const temporary = path + '.' + randomUUID() + '.tmp';
      const file = await open(temporary, 'wx', 0o600);
      try {
        await file.writeFile(JSON.stringify(intent, null, 2) + '\n');
        await file.sync();
      } finally {
        await file.close();
      }
      try {
        await link(temporary, path);
        const directory = await open(dirname(path), 'r');
        try {
          await directory.sync();
        } finally {
          await directory.close();
        }
      } finally {
        await unlink(temporary);
      }
    }
  };
}
