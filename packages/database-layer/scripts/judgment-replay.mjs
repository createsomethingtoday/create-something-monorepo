#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { persistJudgmentArtifact as persist } from './judgment-artifact-store.mjs';
import {
  seal,
  prepareJudgment,
  recordJudgment,
  replayJudgment,
  verifyEvaluationSet,
  canonicalJudgmentJson
} from '../dist/judgment-data.js';

const read = async (path) => JSON.parse(await readFile(path, 'utf8'));

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'snapshot' && args.length === 2) {
    const input = seal(await read(args[0]));
    prepareJudgment(input);
    return persist(args[1], input);
  }
  if (command === 'request' && args.length === 1) return prepareJudgment(await read(args[0]));
  if (command === 'record' && args.length === 3) {
    const response = await read(args[1]);
    if (!response || Object.keys(response).sort().join(',') !== 'answers,provider,providerStatus')
      throw new Error('response must contain only answers, provider and providerStatus');
    return persist(
      args[2],
      recordJudgment(
        await read(args[0]),
        response.answers,
        response.provider,
        response.providerStatus
      )
    );
  }
  if (command === 'replay' && args.length === 2)
    return replayJudgment(await read(args[0]), await read(args[1]));
  if (command === 'check-evaluation' && args.length === 2)
    return verifyEvaluationSet(await read(args[0]), await read(args[1]));
  throw new Error(
    'Usage: judgment-replay.mjs snapshot input.json directory | request snapshot.json | record snapshot.json response.json directory | replay snapshot.json receipt.json | check-evaluation snapshots.json reviews.json'
  );
}
main()
  .then((result) => console.log(canonicalJudgmentJson(result)))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
