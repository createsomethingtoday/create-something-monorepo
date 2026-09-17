#!/usr/bin/env node
import { readFile, writeFile, open, rename, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { askJev } from '../../packages/jev-client/index.mjs';
import { selectCandidate, reviewEvidence } from '../../packages/jev-client/decisions.mjs';
import { prepareFailureRoute, interpretFailureRoute } from './test-failure-routing.mjs';

/** Single-host ledger. A concurrent holder causes abstention; failed calls retain reservations. */
export function fileBudget(path, maximumUsd) {
  if (!Number.isFinite(maximumUsd) || maximumUsd < 0.01 || maximumUsd > 5)
    throw Error('Budget must be between $0.01 and $5');
  return async ({ maximumUsd: amount }) => {
    if (!Number.isFinite(amount) || amount <= 0) throw Error('Invalid reservation');
    const lock = await open(`${path}.lock`, 'wx', 0o600);
    try {
      let ledger = { limitCents: Math.floor(maximumUsd * 100), reservedCents: 0 };
      try {
        ledger = JSON.parse(await readFile(path, 'utf8'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (
        !Number.isInteger(ledger.limitCents) ||
        ledger.limitCents < 1 ||
        !Number.isInteger(ledger.reservedCents) ||
        ledger.reservedCents < 0 ||
        ledger.reservedCents > ledger.limitCents
      )
        throw Error('Invalid ledger');
      const cents = Math.ceil(amount * 100);
      if (ledger.reservedCents + cents > Math.min(ledger.limitCents, Math.floor(maximumUsd * 100)))
        return false;
      ledger.reservedCents += cents;
      await writeFile(`${path}.tmp`, JSON.stringify(ledger), { mode: 0o600 });
      await rename(`${path}.tmp`, path);
      return true;
    } finally {
      await lock.close();
      await unlink(`${path}.lock`);
    }
  };
}
export async function review(mode, input, options) {
  if (mode === 'candidate') return selectCandidate({ ...input, ...options });
  if (mode === 'evidence') return reviewEvidence({ ...input, ...options });
  if (mode === 'failure') {
    const request = prepareFailureRoute(input.log);
    const result = await askJev({ ...options, request });
    return result.status === 'ok' ? interpretFailureRoute(request, result.response) : result;
  }
  throw Error('Mode must be candidate, evidence, or failure');
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 5)
    throw Error(
      'Usage: node ops/jev-runbooks/review.mjs <candidate|evidence|failure> <input.json> <new-output.json> <ledger.json> <maximum-usd>'
    );
  const [mode, inputPath, outputPath, ledgerPath, budget] = args;
  if (new Set([inputPath, outputPath, ledgerPath].map((p) => resolve(p))).size !== 3)
    throw Error('Input, output and ledger paths must differ');
  const source = await readFile(inputPath, 'utf8');
  const input = JSON.parse(source);
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  // Reserve the output path before spending; never overwrite an existing receipt.
  const output = await open(outputPath, 'wx', 0o600);
  try {
    const decision = await review(mode, input, {
      apiKey: process.env.TYPESAFE_API_KEY,
      reserve: fileBudget(ledgerPath, Number(budget))
    });
    await output.writeFile(
      JSON.stringify(
        {
          version: 1,
          mode,
          sourceSha256,
          createdAt: new Date().toISOString(),
          recommendationOnly: true,
          decision
        },
        null,
        2
      )
    );
  } catch (error) {
    await output.writeFile(
      JSON.stringify({ version: 1, mode, sourceSha256, status: 'failed', recommendationOnly: true })
    );
    throw error;
  } finally {
    await output.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('Jev review failed; check input, credential, ledger, and unused output path.');
    process.exitCode = 1;
  });
}
