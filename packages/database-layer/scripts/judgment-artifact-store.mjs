import { readFile, mkdir, open, link, unlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { verifySealed, canonicalJudgmentJson } from '../dist/judgment-data.js';

export async function persistJudgmentArtifact(directory, artifact) {
  verifySealed(artifact);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = join(directory, `${artifact.digest}.json`);
  const temporary = join(directory, `.pending-${randomUUID()}`);
  const bytes = canonicalJudgmentJson(artifact) + '\n';
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    try {
      await link(temporary, destination);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if ((await readFile(destination, 'utf8')) !== bytes)
        throw new Error('existing artifact integrity conflict');
    }
    const dir = await open(directory, 'r');
    try {
      await dir.sync();
    } finally {
      await dir.close();
    }
  } finally {
    await unlink(temporary);
  }
  return { path: resolve(destination), digest: artifact.digest };
}
