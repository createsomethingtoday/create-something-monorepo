import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { validateLocalRemediation, verifyRecordFiles, validateInstallReceipt, verifyInstall } from '../security-local-remediation.mjs';
import { validateSecurityAdvisoryPolicy, findDirectPackageImports } from '../security-advisory-exceptions.mjs';
const root = resolve(import.meta.dirname, '../..');
const policy = JSON.parse(readFileSync(join(root, 'config/security-advisory-exceptions.v1.json')));
const record = policy.remediations[0];
const clone = () => structuredClone(record);

test('current record binds both advisories, exact evidence and complete installation scope', () => {
  validateLocalRemediation(record); verifyRecordFiles(root, record);
  assert.deepEqual(validateSecurityAdvisoryPolicy(policy), []);
});
test('empty policy cannot silently retire the only security obligation', () => {
  assert.ok(validateSecurityAdvisoryPolicy({...policy, remediations: []}).length);
});
test('missing coverage, provenance, review, or suppression fails closed', () => {
  for (const field of ['installRoots','provenance','backportSourceCommit','regressionSuiteSha256','historicalExceptionSha256','standaloneRemoval']) {
    const item=clone(); delete item[field]; assert.throws(()=>validateLocalRemediation(item));
  }
  for (const change of [{installRoots:['workspace']},{suppressesScanner:true},{humanReviewRequired:false},{advisories:[record.advisories[0]]}]) {
    assert.throws(()=>validateLocalRemediation({...clone(),...change}));
  }
});
test('mismatched or missing on-disk evidence blocks policy verification', t => {
  const dir=mkdtempSync(join(tmpdir(),'remediation-evidence-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  assert.throws(()=>verifyRecordFiles(dir,record));
  for (const file of ['security/extract-zip/provenance.json','security/extract-zip/security.test.cjs',record.historicalException,...Object.keys(record.standaloneRemoval.files).map(file=>'packages/huggingface-spaces/motion-ontology/'+file)]) {
    mkdirSync(dirname(join(dir,file)),{recursive:true});copyFileSync(join(root,file),join(dir,file));
  }
  verifyRecordFiles(dir,record);
  for (const field of ['regressionSuiteSha256','historicalExceptionSha256']) assert.throws(()=>verifyRecordFiles(dir,{...clone(),[field]:'0'.repeat(64)}));
  const removalChanged=clone();removalChanged.standaloneRemoval.files['package-lock.json']='0'.repeat(64);assert.throws(()=>verifyRecordFiles(dir,removalChanged));
  const changed=clone();changed.provenance.patchedIndexSha256='0'.repeat(64);assert.throws(()=>verifyRecordFiles(dir,changed));
});
test('missing and forged byte receipts fail', () => {
  for (const value of [null,{}, {sha256:record.provenance.patchedIndexSha256,packagesChecked:1,verifiedExtractZip:[]}, {sha256:'0'.repeat(64),packagesChecked:1,verifiedExtractZip:['x']}]) assert.throws(()=>validateInstallReceipt(value,record.provenance.patchedIndexSha256));
});
test('actual missing installation and unpatched installed code block promotion', t => {
  const dir=mkdtempSync(join(tmpdir(),'remediation-unpatched-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  assert.throws(()=>verifyInstall(root,dir,record.provenance.patchedIndexSha256));
  const pkg=join(dir,'node_modules/extract-zip');mkdirSync(pkg,{recursive:true});
  writeFileSync(join(pkg,'package.json'),JSON.stringify({name:'extract-zip',version:'2.0.1'}));
  writeFileSync(join(pkg,'index.js'),'module.exports = async () => {}');
  assert.throws(()=>verifyInstall(root,dir,record.provenance.patchedIndexSha256),/Unpatched extract-zip/);
});
test('direct import detection remains independent of retired exception entries', () => {
  assert.deepEqual(findDirectPackageImports(new Map([['src/new.ts',"import extract from 'extract-zip'"]]),record.package),['src/new.ts']);
});

test('basic-ftp version metadata cannot substitute for official installed bytes', t => {
  const dir=mkdtempSync(join(tmpdir(),'remediation-ftp-bytes-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const pkg=join(dir,'node_modules/basic-ftp');mkdirSync(join(pkg,'dist'),{recursive:true});
  writeFileSync(join(pkg,'package.json'),JSON.stringify({name:'basic-ftp',version:'6.2.1'}));
  const manifest=JSON.parse(readFileSync(join(root,'security/basic-ftp/provenance.json')));
  for(const file of Object.keys(manifest.files)) writeFileSync(join(pkg,file),'changed implementation');
  assert.throws(()=>verifyInstall(root,dir,record.provenance.patchedIndexSha256),/Changed basic-ftp bytes/);
});
