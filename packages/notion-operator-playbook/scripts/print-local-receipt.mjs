import { readFile } from 'node:fs/promises';
import worker from '../dist/index.js';
import { createLocalBuildReceipt } from '../dist/receipt.js';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const generatedAt = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : new Date().toISOString();
console.log(
  JSON.stringify(
    createLocalBuildReceipt({
      manifest: worker.manifest,
      packageVersion: packageJson.version,
      generatedAt
    }),
    null,
    2
  )
);
