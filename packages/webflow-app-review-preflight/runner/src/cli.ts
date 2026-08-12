#!/usr/bin/env node
import { runRuntimeObservation } from './index.js';

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

const apiBaseUrl = option('--api-base');
const observationJobId = option('--job');
const outputDir = option('--output') ?? undefined;
const capability = process.env.RUNTIME_OBSERVATION_CAPABILITY;

if (!apiBaseUrl || !observationJobId || !capability) {
  console.error(
    'Usage: RUNTIME_OBSERVATION_CAPABILITY=<job-scoped value> webflow-app-review-runtime --api-base <url> --job <id>'
  );
  process.exitCode = 2;
} else {
  try {
    const result = await runRuntimeObservation({
      apiBaseUrl,
      observationJobId,
      capability,
      outputDir
    });
    console.log(
      `Webflow runtime observation complete: ${result.artifactCount} artifacts; proxy canary ${result.negativeProxyOutcome}. The Worker derives the security result.`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Runtime observation failed.');
    process.exitCode = 1;
  }
}
