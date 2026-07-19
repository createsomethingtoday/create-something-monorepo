import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { RunnerJournal, RunnerJournalEntry } from './runner.js';

export class MemoryRunnerJournal implements RunnerJournal {
  private readonly entries = new Map<string, RunnerJournalEntry>();

  async get(requestId: string): Promise<RunnerJournalEntry | null> {
    const entry = this.entries.get(requestId);
    return entry ? structuredClone(entry) : null;
  }

  async pending(): Promise<RunnerJournalEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => entry.state !== 'terminal')
      .map((entry) => structuredClone(entry));
  }

  async put(entry: RunnerJournalEntry): Promise<void> {
    this.entries.set(entry.request_id, structuredClone(entry));
  }
}

export class FileRunnerJournal implements RunnerJournal {
  constructor(private readonly path: string) {}

  async get(requestId: string): Promise<RunnerJournalEntry | null> {
    return (await this.read())[requestId] ?? null;
  }

  async pending(): Promise<RunnerJournalEntry[]> {
    return Object.values(await this.read()).filter((entry) => entry.state !== 'terminal');
  }

  async put(entry: RunnerJournalEntry): Promise<void> {
    const entries = await this.read();
    entries[entry.request_id] = entry;
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, `${JSON.stringify(entries, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, this.path);
  }

  private async read(): Promise<Record<string, RunnerJournalEntry>> {
    try {
      const value = JSON.parse(await readFile(this.path, 'utf8')) as unknown;
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Journal root is invalid.');
      }
      return value as Record<string, RunnerJournalEntry>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw error;
    }
  }
}
