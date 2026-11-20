import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeTopology, exportTopologyRdf, exportShapes, exportVocabulary, topologyDigest, planTopologyChange, ontologyContract } from './lib/ontology.mjs';

const defaultTopology = fileURLToPath(new URL('../data/create-something-internal-topology.json', import.meta.url));
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const usage = 'Usage: node scripts/ontology.mjs check [module.json ...] | export <new-directory> [module.json ...] | plan <baseline.json> <proposed.json> [protected-node-id ...]';
try {
  const [command = 'check', ...args] = process.argv.slice(2);
  let report;
  if (command === 'plan') {
    if (args.length < 2) throw new Error(usage);
    report = planTopologyChange(read(args[0]), read(args[1]), { protectedNodeIds: args.slice(2) });
    if (!report.protectedContractsSatisfied) process.exitCode = 1;
  } else if (command === 'check' || command === 'export') {
    const output = command === 'export' ? args.shift() : undefined;
    if (command === 'export' && !output) throw new Error(usage);
    const files = args.length ? args : [defaultTopology];
    const graph = composeTopology(files.map(read));
    report = { schema: ontologyContract.version, verification: 'local_structural', authority: 'descriptive_only', digest: topologyDigest(graph), nodes: graph.nodes.length, edges: graph.edges.length, sources: files.map((file) => path.resolve(file)), upstreamRuntime: 'untested' };
    if (output) {
      // Refuse overwrites and source-directory reuse. The bundle is a local projection.
      fs.mkdirSync(output, { recursive: false });
      for (const [name, content] of Object.entries({ 'topology.ttl': exportTopologyRdf(graph), 'vocabulary.ttl': exportVocabulary(), 'shapes.ttl': exportShapes(), 'manifest.json': JSON.stringify(report, null, 2) + '\n' })) {
        fs.writeFileSync(path.join(output, name), content, { flag: 'wx' });
      }
      report.output = path.resolve(output);
    }
  } else throw new Error(usage);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
}
