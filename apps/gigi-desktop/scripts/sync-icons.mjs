// Bundle the exact installed Agency Lucide geometry; no desktop runtime dependency.
import { readFileSync, writeFileSync } from 'node:fs';
import { ICON_NODES } from '../web/lucide-icons.mjs';
const packageRoot = new URL('../../../packages/agency/node_modules/lucide-svelte/', import.meta.url);
const version = JSON.parse(readFileSync(new URL('package.json', packageRoot))).version;
if (version !== '0.562.0') throw new Error(`Review Agency icon version before updating: ${version}`);
const nodes = Object.fromEntries(Object.keys(ICON_NODES).map((name) => {
  const source = readFileSync(new URL(`dist/icons/${name}.svelte`, packageRoot), 'utf8');
  const match = source.match(/const iconNode = (.*);/);
  if (!match) throw new Error(`Cannot read icon geometry: ${name}`);
  return [name, JSON.parse(match[1])];
}));
const outputs = {
  'lucide-icons.mjs': '// Lucide 0.562.0 SVG geometry, matching packages/agency. See lucide-LICENSE.txt.\n// Offline subset; regenerate with: node apps/gigi-desktop/scripts/sync-icons.mjs\nexport const ICON_NODES = ' + JSON.stringify(nodes, null, 2) + ';\n',
  'lucide-LICENSE.txt': readFileSync(new URL('LICENSE', packageRoot), 'utf8')
};
for (const [name, content] of Object.entries(outputs)) {
  const path = new URL(`../web/${name}`, import.meta.url);
  if (process.argv.includes('--check')) { if (readFileSync(path, 'utf8') !== content) throw new Error(`Icon subset is stale: ${name}`); }
  else writeFileSync(path, content);
}
console.log(`${process.argv.includes('--check') ? 'Verified' : 'Synced'} Agency Lucide ${version}: ${Object.keys(nodes).length} icons and license`);
