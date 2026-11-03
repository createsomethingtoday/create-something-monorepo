#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { evidenceDigest, projectExecutionEvidence } from './evidence.mjs';

const usage =
  'Usage: graph:evidence project --input <export.json> --trusted-key <public.pem> | demo';
async function readBounded(path, maximum) {
  if ((await stat(path)).size > maximum) throw new TypeError('Input exceeds size limit');
  const bytes = await readFile(path);
  if (bytes.byteLength > maximum) throw new TypeError('Input exceeds size limit');
  return bytes.toString('utf8');
}
async function main(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log(usage);
    return;
  }
  if (args.length === 1 && args[0] === 'demo') {
    const { createFixture } = await import('./fixtures.mjs');
    const { createReviewFixture } = await import('./review-fixture.mjs');
    const { input, trustedPublicKey } = await createFixture();
    const receipt = await createReviewFixture();
    input.reviews.push({
      sourceId: 'synthetic-review',
      evidenceRef: 'fixture:synthetic-review',
      scope: input.scope,
      observedAt: input.runtime.observedAt,
      freshness: 'current',
      receipt
    });
    input.bindings.push({
      runtimeRunId: input.runtime.run.id,
      runtimeManifestSha256: input.runtime.run.runtimeManifestSha256,
      artifactManifestSha256: input.runtime.run.artifactManifestSha256,
      reviewSourceId: 'synthetic-review',
      reviewDigest: evidenceDigest(receipt)
    });
    console.log(
      JSON.stringify(
        {
          evidence: 'synthetic_no_live_execution',
          graph: await projectExecutionEvidence(input, { trustedPublicKey })
        },
        null,
        2
      )
    );
    return;
  }
  if (args.length !== 5 || args[0] !== 'project') throw new TypeError(usage);
  const options = new Map();
  for (let index = 1; index < args.length; index += 2) {
    if (
      !['--input', '--trusted-key'].includes(args[index]) ||
      options.has(args[index]) ||
      !args[index + 1]
    )
      throw new TypeError(usage);
    options.set(args[index], args[index + 1]);
  }
  if (options.size !== 2) throw new TypeError(usage);
  const input = JSON.parse(await readBounded(options.get('--input'), 32 * 1024 * 1024));
  const trustedPublicKey = await readBounded(options.get('--trusted-key'), 16384);
  const graph = await projectExecutionEvidence(input, { trustedPublicKey });
  console.log(JSON.stringify(graph, null, 2));
}
try {
  await main(process.argv.slice(2));
} catch (error) {
  // Do not echo raw exported data or JSON parser snippets to the terminal.
  console.error(
    error.message === usage
      ? usage
      : `Evidence rejected (${error.code ?? error.name}). Check schema, trusted signer, artifact bindings, scope and receipt consistency.`
  );
  process.exitCode = 1;
}
