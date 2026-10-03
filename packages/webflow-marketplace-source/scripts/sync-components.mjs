import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const source=resolve('../webflow-components/src/components');
const destination=resolve('src/vendor/marketplace');
const roots=['cards/TemplateCard.tsx','grid/TemplateGrid.tsx','filter/TemplateFilterBar.tsx','marketplace/TemplateSearchSidebar.tsx','marketplace/TemplateMarketplaceHeading.tsx','marketplace/TemplateDetailHero.tsx','marketplace/TemplateDetailStickyBar.tsx'];
const manifest={sourcePackage:'packages/webflow-components/src/components',files:{}};
async function visit(path){
 const key=relative(source,path);if(manifest.files[key])return;
 if(key.startsWith('..'))throw new Error(`Dependency escapes component tree: ${key}`);
 const text=await readFile(path,'utf8');
 manifest.files[key]=createHash('sha256').update(text).digest('hex');
 const target=resolve(destination,key);await mkdir(dirname(target),{recursive:true});await writeFile(target,text);
 for(const {fileName:spec}of ts.preProcessFile(text,true,true).importedFiles){
  if(!spec.startsWith('.')){if(!['react','react-dom','react-dom/client','react-dom/server'].includes(spec))throw new Error(`Unexpected external dependency: ${spec}`);continue}
  let found;
  for(const candidate of [resolve(dirname(path),spec),...['.ts','.tsx','.js','/index.ts','/index.tsx'].map(ext=>resolve(dirname(path),spec+ext))]){
   try{if((await stat(candidate)).isFile()){found=candidate;break}}catch{}
  }
  if(!found)throw new Error(`Missing ${spec} imported by ${key}`);
  await visit(found);
 }
}
for(const root of roots)await visit(resolve(source,root));
await writeFile('component-snapshot.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Copied ${Object.keys(manifest.files).length} repository-owned component modules.`);
