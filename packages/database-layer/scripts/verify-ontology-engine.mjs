import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ontologyContract } from './lib/ontology.mjs';

let store;
try {
  const [bundle, binary, ...extra] = process.argv.slice(2);
  if (!bundle || !binary || extra.length) throw new Error('Usage: node scripts/verify-ontology-engine.mjs <bundle-directory> <binary-path>');
  store = fs.mkdtempSync(path.join(os.tmpdir(), 'substrate-ontology-engine-'));
  const artifactDigests = {};
  const file = (name) => {
    const resolved = path.resolve(bundle, name);
    if (!fs.statSync(resolved).isFile()) throw new Error(`not a file: ${resolved}`);
    const bytes = fs.readFileSync(resolved);
    artifactDigests[name] = createHash('sha256').update(bytes).digest('hex');
    const snapshot = path.join(store, name);
    fs.writeFileSync(snapshot, bytes, { flag: 'wx' });
    return snapshot;
  };
  const vocabulary = file('vocabulary.ttl'); const topology = file('topology.ttl'); const shapes = file('shapes.ttl');
  const batch = [
    { command: 'validate', args: [vocabulary] },
    { command: 'validate', args: [shapes] },
    { command: 'validate', args: [topology] },
    { command: 'load', args: [vocabulary] },
    { command: 'vocab-check', args: [topology] },
    { command: 'load', args: [topology] },
    { command: 'shacl', args: [shapes] }
  ];
  const execution = spawnSync(path.resolve(binary), ['--no-connect', '--json', '--data-dir', store, 'batch', '-', '--bail'], {
    input: JSON.stringify(batch), encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, OPEN_ONTOLOGIES_STORAGE_MODE: 'memory' }
  });
  if (execution.error) throw execution.error;
  if (execution.status !== 0) throw new Error(`Open Ontologies failed (${execution.status}): ${execution.stderr.slice(0, 1000)}`);
  const records = execution.stdout.trim().split('\n').map((line) => JSON.parse(line));
  if (records.length !== batch.length) throw new Error('incomplete Open Ontologies batch results');
  for (const [index, record] of records.entries()) {
    if (record.command !== batch[index].command || !record.result || record.result.error || record.result.stop_the_line || (record.result.exit_code !== undefined && record.result.exit_code !== 0)) throw new Error(`failed or unexpected result at batch position ${index}`);
  }
  const vocab = records[4].result;
  if (vocab.conforms !== true || !(vocab.ontology_terms > 0) || !vocab.checked_namespaces?.includes(ontologyContract.namespace)) throw new Error('vocabulary conformance or namespace coverage not established');
  if (records[6].result.conforms !== true) throw new Error('SHACL conformance not established');
  console.log(JSON.stringify({ ok: true, verification: 'open_ontologies_vocabulary_and_shacl', authority: 'descriptive_only', bundle: path.resolve(bundle), artifactDigests, engineDigest: createHash('sha256').update(fs.readFileSync(path.resolve(binary))).digest('hex'), formalCertificate: 'untested' }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message })); process.exitCode = 1;
} finally {
  if (store) fs.rmSync(store, { recursive: true, force: true });
}
