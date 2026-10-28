import { setTimeout as delay } from 'node:timers/promises';

/** Container-local only: never calls Sandbox/Worker APIs or starts a container. */
export async function runBackups({ signal, backup, intervalMs = 300000, onError = console.error }) {
  while (!signal.aborted) {
    try {
      await delay(intervalMs, undefined, { signal });
      signal.throwIfAborted();
      await backup(signal); // serial: no overlapping runs or retry storm
    } catch (error) {
      if (signal.aborted) return;
      onError('[backup] Backup failed; waiting for next interval', error);
    }
  }
}
