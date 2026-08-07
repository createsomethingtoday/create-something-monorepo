#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { writeCompiledWorkflowArtifacts } from './artifacts.js';
import { compileWorkflowDefinition, WorkflowCompilationError } from './compile.js';
import { replayWorkflow } from './replay.js';
import { serveOperatorConsole } from './server.js';

interface CompileOptions {
  workflowPath: string;
  casesPath?: string;
  outDir: string;
}

function usage(): string {
  return [
    'Usage:',
    '  workflow-compiler compile --workflow <definition.json> [--cases <cases.json>] --out <directory>',
    '  workflow-compiler serve --dir <compiled-output> [--port <number>]',
  ].join('\n');
}

function compileOptions(args: string[]): CompileOptions {
  if (args[0] !== 'compile') throw new Error(usage());

  const workflowIndex = args.indexOf('--workflow');
  const outIndex = args.indexOf('--out');
  const casesIndex = args.indexOf('--cases');
  const workflowPath = workflowIndex >= 0 ? args[workflowIndex + 1] : undefined;
  const outDir = outIndex >= 0 ? args[outIndex + 1] : undefined;
  if (!workflowPath || !outDir) throw new Error(usage());

  const casesPath = casesIndex >= 0 ? args[casesIndex + 1] : undefined;
  return {
    workflowPath: resolve(workflowPath),
    ...(casesPath ? { casesPath: resolve(casesPath) } : {}),
    outDir: resolve(outDir),
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === 'serve') {
    const dirIndex = args.indexOf('--dir');
    const portIndex = args.indexOf('--port');
    const rootDir = dirIndex >= 0 ? args[dirIndex + 1] : undefined;
    const requestedPort = portIndex >= 0 ? Number(args[portIndex + 1]) : 4173;
    if (!rootDir || !Number.isInteger(requestedPort) || requestedPort < 0) throw new Error(usage());
    const { url } = await serveOperatorConsole(resolve(rootDir), { port: requestedPort });
    process.stdout.write(`${JSON.stringify({ ok: true, url, rootDir: resolve(rootDir) })}\n`);
    return;
  }

  const options = compileOptions(args);
  const definition = JSON.parse(await readFile(options.workflowPath, 'utf8'));
  const bundle = compileWorkflowDefinition(definition);
  const replay = options.casesPath
    ? replayWorkflow(
        bundle,
        JSON.parse(await readFile(options.casesPath, 'utf8')),
      )
    : undefined;
  const manifest = await writeCompiledWorkflowArtifacts(bundle, options.outDir, replay);
  process.stdout.write(
    `${JSON.stringify({ ok: true, outDir: options.outDir, manifest }, null, 2)}\n`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof WorkflowCompilationError) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: error.name, diagnostics: error.diagnostics }, null, 2)}\n`,
    );
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  }
  process.exitCode = 1;
});
