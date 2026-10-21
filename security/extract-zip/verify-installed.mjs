import { readdirSync, realpathSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = resolve(process.argv[2] || '.');
const expected = JSON.parse(readFileSync(new URL('./provenance.json', import.meta.url))).patchedIndexSha256;
const seen = new Set(), packages = new Set(), extracts = new Set();
function modules(dir) {
  if (!existsSync(dir)) return;
  dir = realpathSync(dir);
  if (seen.has(dir)) return;
  seen.add(dir);
  for (const item of readdirSync(dir, {withFileTypes:true})) {
    if (item.name.startsWith('.')) continue;
    const candidate = join(dir,item.name);
    if (item.name.startsWith('@')) {
      for (const child of readdirSync(candidate)) visit(join(candidate,child));
    } else visit(candidate);
  }
}
function visit(candidate) {
  let location;
  try { location=realpathSync(candidate); } catch { throw new Error(`Broken dependency link: ${candidate}`); }
  if (packages.has(location) || !existsSync(join(location,'package.json'))) return;
  packages.add(location);
  const metadata=JSON.parse(readFileSync(join(location,'package.json')));
  if(metadata.name==='extract-zip') {
    if(metadata.version!=='2.0.1') throw new Error(`Unreviewed extract-zip version ${metadata.version}`);
    const digest=createHash('sha256').update(readFileSync(join(location,'index.js'))).digest('hex');
    if(digest!==expected) throw new Error(`Unpatched extract-zip: ${location}`);
    extracts.add(location);
  }
  modules(join(location,'node_modules'));
  // pnpm keeps dependency links adjacent to the package in its virtual store.
  let parent=dirname(location);
  if(basename(parent).startsWith('@')) parent=dirname(parent);
  if(basename(parent)==='node_modules') modules(parent);
}
modules(join(root,'node_modules'));
// Workspace package dependencies are linked from these per-package directories.
for (const family of ['apps','packages']) {
  const walk=(dir,depth)=>{
    if(!existsSync(dir)||depth>4)return;
    if(existsSync(join(dir,'package.json'))) modules(join(dir,'node_modules'));
    for(const item of readdirSync(dir,{withFileTypes:true})) if(item.isDirectory()&&!['node_modules','.git','target','dist','.cache'].includes(item.name)) walk(join(dir,item.name),depth+1);
  };
  walk(join(root,family),0);
}
if(!extracts.size) throw new Error('No installed extract-zip was verified');
const result=spawnSync(process.execPath,['--test',fileURLToPath(new URL('./security.test.cjs',import.meta.url))],{env:{...process.env,EXTRACT_ZIP_MODULE:[...extracts][0]},stdio:'inherit'});
if(result.status!==0) process.exit(result.status||1);
console.log(JSON.stringify({root,packagesChecked:packages.size,verifiedExtractZip:[...extracts],sha256:expected}));
