import assert from 'node:assert/strict';
import { lstatSync, realpathSync, mkdtempSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, basename, join, relative, resolve, isAbsolute } from 'node:path';

export function receiptDestination(root, output) {
  const destination = resolve(output);
  const parent = realpathSync(dirname(destination));
  const canonical = join(parent, basename(destination));
  const local = relative(realpathSync(root), canonical);
  assert(local !== '' && (local === '..' || local.startsWith('../') || isAbsolute(local)),
    '--output must be outside the analyzed checkout');
  let entry;
  try { entry = lstatSync(canonical); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert(!entry?.isSymbolicLink(), '--output must not be a symbolic link');
  return canonical;
}

export function writeReceipt(root, output, content) {
  const destination = receiptDestination(root, output);
  const temporary = mkdtempSync(join(dirname(destination), '.ground-receipt-'));
  try {
    const staged = join(temporary, 'receipt.json');
    writeFileSync(staged, content, { flag: 'wx' });
    renameSync(staged, destination);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
