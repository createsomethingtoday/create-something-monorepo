import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, rename, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { build, STATIC_FILES } from '../build.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
async function fixture(t) {
 const root = await mkdtemp(join(tmpdir(),'walkthrough-promotion-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const name of STATIC_FILES) await writeFile(join(root,name),name.endsWith('.mp4')?Buffer.from([0,0,0,12,102,116,121,112,105,115,111,109]):'fixture');
 const manifest={title:'Fixture',source:{file:'screen.mp4',duration:1},scenes:[{id:'one',start:0,end:1,label:'One',title:'Observe',prompt:'Watch.',evidence:'Recorded.'}]};
 await writeFile(join(root,'manifest.json'),JSON.stringify(manifest));
 const output_sha256={};for(const n of ['screen.mp4','walkthrough.mp4','poster.jpg'])output_sha256[n]=hash(await readFile(join(root,n)));
 await writeFile(join(root,'render-receipt.json'),JSON.stringify({manifest_sha256:hash(await readFile(join(root,'manifest.json'))),output_sha256}));
 await mkdir(join(root,'dist'));await writeFile(join(root,'dist/previous.txt'),'previous generation');return root;
}
test('failed static promotion restores the previous bundle',async t=>{
 const root=await fixture(t);let failed=false;
 await assert.rejects(build(root,{renameDirectory:async(src,dst)=>{
   if(dst===join(root,'dist')&&!failed){failed=true;throw new Error('injected promotion failure');}
   return rename(src,dst);
 }}),/injected promotion failure/);
 assert.equal(await readFile(join(root,'dist/previous.txt'),'utf8'),'previous generation');
 assert.deepEqual(await readdir(join(root,'dist')),['previous.txt']);
});
test('build rejects a concurrent render or build without replacing output',async t=>{
 const root=await fixture(t);await mkdir(join(root,'.walkthrough-operation.lock'));
 await assert.rejects(build(root),/in progress|lock/i);
 assert.equal(await readFile(join(root,'dist/previous.txt'),'utf8'),'previous generation');
});
