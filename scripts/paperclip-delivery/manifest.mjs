import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { POLICY_VERSION } from './stage-evidence.mjs';

// Inventory an immutable source checkout. The manifest excludes itself; its
// bytes are bound separately by the reviewed commit and release receipt.
export function createManifest(root) {
 const files = [];
 function walk(relative = '') {
  const path = join(root, relative), stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error('Manifest rejects symbolic links');
  if (stat.isDirectory()) {
   for (const name of readdirSync(path).sort()) walk(relative ? `${relative}/${name}` : name);
  } else {
   if (!stat.isFile()) throw new Error('Manifest requires a regular file');
   if (relative === 'manifest.json') return;
   if (/[\\\x00-\x1f\x7f]/.test(relative)) throw new Error('Manifest requires portable relative paths');
   const bytes = readFileSync(path);
   files.push({path:relative,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
 }
 if (!lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()) throw new Error('Manifest root must be a regular directory');
 walk();
 if (!files.length) throw new Error('Manifest requires a nonempty pack');
 return {version:1,policyVersion:POLICY_VERSION,algorithm:'sha256',files};
}
export function verifyManifest(root, expected) {
 const actual = createManifest(root);
 if (!isDeepStrictEqual(actual, expected)) throw new Error('Manifest inventory or content mismatch');
 return {valid:true,files:actual.files.length,policyVersion:POLICY_VERSION};
}
