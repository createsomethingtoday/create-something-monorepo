#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { validateAssignment, validateStageEvidence, validateRecovery, validateDelegation } from './stage-evidence.mjs';
import { createManifest, verifyManifest } from './manifest.mjs';

const usage = 'Usage: cli.mjs assignment PACKET | stage PACKET NATIVE EVIDENCE TARGET | recovery PACKET NATIVE RECOVERY | delegation PACKET DELEGATION | manifest DIRECTORY | verify-manifest DIRECTORY MANIFEST';
const counts = {assignment:1,stage:4,recovery:3,delegation:2,manifest:1,'verify-manifest':2};
function read(path) {
 try { return JSON.parse(readFileSync(path,'utf8')); }
 catch { throw new Error('Input must be a readable JSON file'); }
}
try {
 const [command,...args] = process.argv.slice(2);
 if (!Object.hasOwn(counts,command) || counts[command] !== args.length) throw new Error(usage);
 let result;
 if (command === 'manifest') result = createManifest(args[0]);
 else if (command === 'verify-manifest') result = verifyManifest(args[0],read(args[1]));
 else {
  const packet = validateAssignment(read(args[0]));
  if (command === 'assignment') result = {valid:true,caseId:packet.paperclipCaseId,policyVersion:packet.policyVersion};
  if (command === 'stage') result = validateStageEvidence(packet,read(args[1]),read(args[2]),args[3]);
  if (command === 'recovery') result = validateRecovery(packet,read(args[1]),read(args[2]));
  if (command === 'delegation') result = validateDelegation(packet,read(args[1]));
  result = {...result,providerVerified:false};
 }
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
} catch(error) {
 process.stderr.write(`Validation failed: ${error.message}\n`);
 process.exitCode = 1;
}
