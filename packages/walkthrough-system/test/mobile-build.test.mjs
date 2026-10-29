import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {build,STATIC_FILES} from '../build.mjs';
import {createWalkthroughServer} from '../serve.mjs';
const mobileFiles=['screen-mobile.mp4','walkthrough-mobile.mp4','poster-mobile.jpg'];
const hash=b=>createHash('sha256').update(b).digest('hex');
test('mobile build packages synchronized mobile media and rejects a stale mobile export',async t=>{
 const root=await mkdtemp(join(await realpath(tmpdir()),'mobile-build-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const m={title:'Mobile',source:{file:'screen.mp4',duration:2},scenes:[{id:'one',start:0,end:2,label:'One',title:'Read',prompt:'Read the result.',evidence:'Recorded result.'}],mobile:{file:'screen-mobile.mp4',poster:'poster-mobile.jpg',width:720,height:720,shots:[{start:0,end:2,crop:[100,100,0,0],label:'Result'}]}};
 const names=[...STATIC_FILES,...mobileFiles];
 for(const name of names)await writeFile(join(root,name),name.endsWith('.mp4')?Buffer.from([0,0,0,12,102,116,121,112,105,115,111,109]):'fixture');
 await writeFile(join(root,'manifest.json'),JSON.stringify(m));
 const output_sha256={};for(const n of ['screen.mp4','walkthrough.mp4','poster.jpg',...mobileFiles])output_sha256[n]=hash(await readFile(join(root,n)));
 await writeFile(join(root,'render-receipt.json'),JSON.stringify({manifest_sha256:hash(await readFile(join(root,'manifest.json'))),output_sha256}));
 await build(root);
 assert.deepEqual((await readdir(join(root,'dist'))).sort(),[...names,'_headers'].sort());
 assert.deepEqual(JSON.parse(await readFile(join(root,'dist/manifest.json'))).mobile,m.mobile);
 await writeFile(join(root,'screen-mobile.mp4'),'changed');await assert.rejects(build(root));
 assert.equal((await readFile(join(root,'dist/screen-mobile.mp4'))).length,12);
});
test('mobile media supports actual range requests on preview',async t=>{
 const root=await mkdtemp(join(await realpath(tmpdir()),'mobile-server-'));await writeFile(join(root,'screen-mobile.mp4'),'0123456789');
 const server=createWalkthroughServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});});
 const r=await fetch(`http://127.0.0.1:${server.address().port}/screen-mobile.mp4`,{headers:{Range:'bytes=2-4'}});assert.equal(r.status,206);assert.equal(await r.text(),'234');
});
