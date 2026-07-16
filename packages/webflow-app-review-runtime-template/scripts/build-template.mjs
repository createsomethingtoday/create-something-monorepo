import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Template, defaultBuildLogger } from 'e2b';
import {
  BASE_IMAGE,
  NODE_VERSION,
  PLAYWRIGHT_VERSION,
  runtimeTemplate
} from '../template.mjs';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const name = process.env.E2B_RUNTIME_TEMPLATE_NAME?.trim() || 'app-review-companion-runtime';
if (!/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(name)) {
  throw new Error('E2B_RUNTIME_TEMPLATE_NAME must be a stable lowercase template name.');
}
if (!process.env.E2B_API_KEY) {
  throw new Error('E2B_API_KEY is required to build the runtime template.');
}

const receiptFlag = process.argv.indexOf('--receipt');
const receiptPath = receiptFlag >= 0 ? process.argv[receiptFlag + 1] : undefined;
if (receiptFlag >= 0 && !receiptPath) throw new Error('--receipt requires a path.');

const [server, runner] = await Promise.all([
  readFile(path.join(packageDir, 'context/server.mjs')),
  readFile(path.join(packageDir, 'context/runner.mjs'))
]);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const build = await Template.build(runtimeTemplate, name, {
  cpuCount: 2,
  memoryMB: 2_048,
  onBuildLogs: defaultBuildLogger()
});
const receipt = {
  schema: 'app-review-runtime-template-build.v1',
  builtAt: new Date().toISOString(),
  name: build.name,
  templateId: build.templateId,
  buildId: build.buildId,
  immutableTemplateRef: `${name}:${build.buildId}`,
  tags: build.tags,
  inputs: {
    baseImage: BASE_IMAGE,
    node: NODE_VERSION,
    playwright: PLAYWRIGHT_VERSION,
    chromiumInstall: 'PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install --with-deps chromium',
    serverSha256: sha256(server),
    runnerSha256: sha256(runner)
  }
};

if (receiptPath) {
  const absoluteReceiptPath = path.resolve(process.cwd(), receiptPath);
  await mkdir(path.dirname(absoluteReceiptPath), { recursive: true });
  await writeFile(absoluteReceiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
}
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
