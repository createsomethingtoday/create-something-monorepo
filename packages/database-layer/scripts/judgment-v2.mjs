#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import {
  seal,
  canonicalJudgmentJson,
  validateSnapshot,
  validateQuestions,
  compileRequest,
  recordInference,
  decide,
  replayDecision,
  validateLabels
} from '../dist/judgment-data-v2.js';
import { persistJudgmentArtifact } from './judgment-artifact-store.mjs';
const read = async (path) => JSON.parse(await readFile(path, 'utf8'));
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'snapshot' && args.length === 2) {
    const value = await read(args[0]);
    validateSnapshot(value);
    return persistJudgmentArtifact(args[1], seal(value));
  }
  if (command === 'questions' && args.length === 2) {
    const value = await read(args[0]);
    validateQuestions(value);
    return persistJudgmentArtifact(args[1], seal(value));
  }
  if (command === 'compile' && args.length === 3)
    return compileRequest(await read(args[0]), await read(args[1]), args[2]);
  if (command === 'record' && args.length === 5) {
    const artifact = await read(args[3]);
    if (!artifact || Object.keys(artifact).sort().join(',') !== 'error,response,trace')
      throw new Error('record requires response, trace and error');
    return persistJudgmentArtifact(
      args[4],
      recordInference(
        await read(args[0]),
        await read(args[1]),
        args[2],
        artifact.response,
        artifact.trace,
        artifact.error
      )
    );
  }
  if (command === 'decide' && args.length === 5) {
    const policy = seal(await read(args[3]));
    const decision = decide(await read(args[0]), await read(args[1]), await read(args[2]), policy);
    return {
      policy: await persistJudgmentArtifact(args[4], policy),
      decision: await persistJudgmentArtifact(args[4], decision)
    };
  }
  if (command === 'replay' && args.length === 5)
    return replayDecision(...(await Promise.all(args.map(read))));
  if (command === 'labels' && args.length === 3)
    return validateLabels(await read(args[0]), await read(args[1]), args[2]);
  throw new Error(
    'Usage: judgment-v2.mjs snapshot raw.json directory | questions raw.json directory | compile snapshot.json questions.json model | record snapshot.json questions.json model response-trace.json directory | decide snapshot.json questions.json inference.json raw-policy.json directory | replay snapshot.json questions.json inference.json policy.json decision.json | labels snapshots.json labels.json development|effectiveness'
  );
}
main()
  .then((value) => console.log(canonicalJudgmentJson(value)))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
