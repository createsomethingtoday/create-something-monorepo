import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(packageRoot, 'clients', 'demo-frontend', 'src', 'routes', '+page.svelte');
const baselineHash = 'f1784ff58bc1f5b8b5be94f1587f69ee12318819cc403781668cc6580f7121ae';

const current = await readFile(target, 'utf8');
const baseline = current
  .replace("const accent = '#2f6f68';", "const accent = '#e66f4d';")
  .replace('Build what clients can see.', 'Shape the next release.');
const actualHash = createHash('sha256').update(baseline).digest('hex');

if (actualHash !== baselineHash) {
  throw new Error(
    'demo_fixture_has_unexpected_changes: refusing to overwrite anything outside the declared acceptance edit'
  );
}

if (current !== baseline) await writeFile(target, baseline, 'utf8');
console.log(JSON.stringify({ status: 'clean', target: 'clients/demo-frontend/src/routes/+page.svelte' }));
