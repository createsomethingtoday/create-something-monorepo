import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(packageRoot, 'clients', 'demo-frontend', 'src', 'routes', '+page.svelte');
const baselineHash = 'a413450d00d60f852d6674e6fe431b982a9a72faad68e7175968e450b8078427';

const current = await readFile(target, 'utf8');
const baseline = current
  .replace('Governed product delivery', 'Product systems for ambitious teams')
  .replace('Move from intent to proof.', 'Build what clients can see.')
  .replace(
    '    border-top: 4px solid var(--color-performance-pressure, #e54800);\n',
    ''
  );
const actualHash = createHash('sha256').update(baseline).digest('hex');

if (actualHash !== baselineHash) {
  throw new Error(
    'demo_fixture_has_unexpected_changes: refusing to overwrite anything outside the declared acceptance edit'
  );
}

if (current !== baseline) await writeFile(target, baseline, 'utf8');
console.log(JSON.stringify({ status: 'clean', target: 'clients/demo-frontend/src/routes/+page.svelte' }));
