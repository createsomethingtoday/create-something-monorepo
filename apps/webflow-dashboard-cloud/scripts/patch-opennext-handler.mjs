import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const handlerPath = path.resolve(
  scriptDir,
  '../.open-next/server-functions/default/apps/webflow-dashboard-cloud/handler.mjs'
);

const brokenSnippet = 'function setNextjsServerWorkingDirectory(){process.chdir("")}';
const patchedSnippet = 'function setNextjsServerWorkingDirectory(){}';

async function main() {
  const source = await readFile(handlerPath, 'utf8');

  if (source.includes(patchedSnippet)) {
    console.log('OpenNext handler already patched.');
    return;
  }

  if (!source.includes(brokenSnippet)) {
    throw new Error(`Expected OpenNext handler pattern not found in ${handlerPath}`);
  }

  await writeFile(handlerPath, source.replace(brokenSnippet, patchedSnippet), 'utf8');
  console.log('Patched OpenNext handler working-directory workaround.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
