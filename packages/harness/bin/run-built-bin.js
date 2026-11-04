import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const builtBins = new Map([
  ['harness', 'dist/cli.js'],
  ['gt-smart-sling', 'dist/bin/gt-smart-sling.js'],
  ['gt-prime', 'dist/bin/gt-prime.js'],
  ['gt-status', 'dist/bin/gt-status.js'],
  ['gt-rig', 'dist/bin/gt-rig.js'],
  ['gt-completion', 'dist/bin/gt-completion.js'],
  ['routing-report', 'dist/bin/routing-report.js'],
  ['ralph-escalate', 'dist/bin/ralph-escalate.js'],
]);

export async function runBuiltBin(binName) {
  const builtBin = builtBins.get(binName);

  if (!builtBin) {
    console.error(
      `Unknown @create-something/harness binary "${binName}". Known binaries: ${Array.from(builtBins.keys()).join(', ')}.`
    );
    process.exit(1);
  }

  const builtBinPath = join(packageRoot, builtBin);

  if (!existsSync(builtBinPath)) {
    console.error(
      `Missing built @create-something/harness binary at ${builtBin}. Run "pnpm --filter @create-something/harness build" first.`
    );
    process.exit(1);
  }

  await import(pathToFileURL(builtBinPath).href);
}
