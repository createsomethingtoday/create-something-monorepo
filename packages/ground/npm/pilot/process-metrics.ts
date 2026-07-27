import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function readResidentSetSize(pid: number): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('ps', ['-o', 'rss=', '-p', String(pid)]);
    const rssKiB = Number.parseInt(stdout.trim(), 10);
    return Number.isFinite(rssKiB) ? rssKiB * 1024 : null;
  } catch {
    return null;
  }
}

export function startRssSampler(pid: number | null): {
  stop: () => Promise<number | null>;
} {
  if (pid === null) {
    return { stop: async () => null };
  }

  let active = true;
  let peakRssBytes: number | null = null;
  const sampling = (async () => {
    while (active) {
      const sample = await readResidentSetSize(pid);
      if (sample !== null) {
        peakRssBytes = Math.max(peakRssBytes ?? 0, sample);
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  })();

  return {
    stop: async () => {
      active = false;
      await sampling;
      return peakRssBytes;
    }
  };
}
