import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';

import seed from './demo-seed.json';

// Release-bundled data from the recorded Git revision, never the editable demo.
const FILES_SHA256 = '855427ab35c908c6f5e22773769ed9fa5a97c27a6ce1bc07213cc96890ecfa33';

export async function materializeDemoSeed(destination: string): Promise<void> {
  if (createHash('sha256').update(JSON.stringify(seed.files)).digest('hex') !== FILES_SHA256) {
    throw new Error('invalid_demo_seed');
  }
  for (const [path, content] of Object.entries(seed.files)) {
    if (isAbsolute(path) || path.split(/[\\/]/).includes('..')) throw new Error('invalid_demo_seed');
    const target = join(destination, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: 'wx' });
  }
}
