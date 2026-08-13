#!/usr/bin/env tsx

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { THRESHOLD_DWELLING } from '../data/threshold-dwelling.js';
import { createThresholdDwellingMassingGlb } from '../src/threshold-dwelling-massing-glb.js';

const outputPath = resolve(
  process.cwd(),
  '../space/static/experiments/threshold-dwelling/renders/threshold-dwelling-r08-massing-guide.glb'
);
const { glb, receipt } = createThresholdDwellingMassingGlb(THRESHOLD_DWELLING);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, glb);

console.log(
  JSON.stringify(
    {
      outputPath,
      sha256: createHash('sha256').update(glb).digest('hex'),
      byteLength: glb.length,
      receipt
    },
    null,
    2
  )
);
