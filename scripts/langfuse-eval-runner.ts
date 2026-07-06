import { statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { waitForLangfuseEvals } from '../evals/langfuse/harness.js';

async function collectEvalFiles(path: string): Promise<string[]> {
  const stat = statSync(path);
  if (stat.isFile()) {
    return path.endsWith('.eval.ts') ? [path] : [];
  }

  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) return collectEvalFiles(child);
      if (entry.isFile() && entry.name.endsWith('.eval.ts')) return Promise.resolve([child]);
      return Promise.resolve([]);
    }),
  );
  return nested.flat().sort();
}

const targetArg = process.argv[2] ?? 'evals/langfuse';
const target = resolve(process.cwd(), targetArg);
const files = await collectEvalFiles(target);

if (files.length === 0) {
  console.error(`No Langfuse eval files found at ${targetArg}`);
  process.exit(1);
}

console.log(JSON.stringify({ langfuseEvalFiles: files.map((file) => file.replace(`${process.cwd()}/`, '')) }));

for (const file of files) {
  await import(pathToFileURL(file).href);
}

const results = await waitForLangfuseEvals();
const failed = results.reduce((sum, result) => sum + result.failed, 0);

console.log(
  JSON.stringify(
    {
      langfuseEvalRun: {
        files: files.length,
        suites: results.length,
        failed,
        emittedToLangfuse: results.some((result) => result.emittedToLangfuse),
      },
    },
    null,
    2,
  ),
);

if (failed > 0) {
  process.exitCode = 1;
}
