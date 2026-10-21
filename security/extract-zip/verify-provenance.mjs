import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
const digest=(bytes,algorithm='sha256',encoding='hex')=>createHash(algorithm).update(bytes).digest(encoding);
export function verifyProvenance() {
  const base=new URL('../../',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('./provenance.json',import.meta.url)));
  const read=path=>readFileSync(new URL(path,base));
  assert.equal(digest(read('security/extract-zip/upstream-2.0.1.tgz'),'sha512','base64'),manifest.upstreamSha512,'Upstream archive changed');
  assert.equal(digest(read('patches/extract-zip@2.0.1.patch')),manifest.patchSha256,'Patch bytes changed');
  const tarball=read('packages/huggingface-spaces/motion-ontology/vendor/extract-zip-2.0.1-backport.tgz');
  assert.equal(digest(tarball),manifest.standaloneTarballSha256,'Standalone archive changed');
  const tar=gunzipSync(tarball,{maxOutputLength:1024*1024});
  let found=false;
  for(let offset=0;offset+512<=tar.length;) {
    const name=tar.subarray(offset,offset+100).toString().replace(/\0.*$/s,'');
    if(!name)break;
    const size=Number.parseInt(tar.subarray(offset+124,offset+136).toString().replace(/\0.*$/s,'').trim(),8);
    assert.ok(Number.isSafeInteger(size)&&size>=0&&offset+512+size<=tar.length);
    if(name==='package/index.js') {
      assert.equal(found,false,'Duplicate index in archive');found=true;
      assert.equal(digest(tar.subarray(offset+512,offset+512+size)),manifest.patchedIndexSha256,'Archive code does not match reviewed bytes');
    }
    offset+=512+Math.ceil(size/512)*512;
  }
  assert.ok(found,'Missing index in archive');
  return manifest;
}
