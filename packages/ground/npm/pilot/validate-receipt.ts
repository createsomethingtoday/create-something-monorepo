import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { validateGroundBenchmarkReceipt } from './receipt.ts';

async function main(): Promise<void> {
  const receiptPath = process.argv.slice(2).find((argument) => argument !== '--');
  if (!receiptPath) {
    throw new Error('Usage: tsx pilot/validate-receipt.ts <receipt.json>');
  }
  const absolutePath = resolve(process.cwd(), receiptPath);
  const receipt = JSON.parse(await readFile(absolutePath, 'utf8'));
  const validation = validateGroundBenchmarkReceipt(receipt);
  process.stdout.write(
    `${JSON.stringify({ receiptPath: absolutePath, ...validation }, null, 2)}\n`
  );
  if (!validation.valid) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
