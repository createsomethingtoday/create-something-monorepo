#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { WorkflowArtifactOutputError, writeCompiledWorkflowArtifacts } from './artifacts.js';
import { compileWorkflowDefinition, WorkflowCompilationError } from './compile.js';
import { ReplayInputValidationError, WorkflowInputValidationError } from './input.js';
import { replayWorkflow } from './replay.js';
import { serveOperatorConsole } from './server.js';

class WorkflowCliInputError extends Error {
  readonly code = 'INVALID_JSON';
  readonly input: 'workflow' | 'replay';

  constructor(input: 'workflow' | 'replay') {
    super(
      input === 'workflow'
        ? 'Workflow definition is not valid JSON.'
        : 'Replay manifest is not valid JSON.'
    );
    this.name = 'WorkflowCliInputError';
    this.input = input;
  }
}

class WorkflowCliUsageError extends Error {
  readonly code = 'INVALID_ARGUMENTS';
  readonly usage: string;

  constructor() {
    const value = usage();
    super(value);
    this.name = 'WorkflowCliUsageError';
    this.usage = value;
  }
}

interface CompileOptions {
  workflowPath: string;
  casesPath?: string;
  outDir: string;
}

function usage(): string {
  return [
    'Usage:',
    '  workflow-compiler compile --workflow <definition.json> [--cases <cases.json>] --out <directory>',
    '  workflow-compiler serve --dir <compiled-output> [--port <number>]'
  ].join('\n');
}

function flagValues(args: string[], allowed: readonly string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !allowed.includes(flag) || values.has(flag) || !value || value.startsWith('--')) {
      throw new WorkflowCliUsageError();
    }
    values.set(flag, value);
  }
  return values;
}

function compileOptions(args: string[]): CompileOptions {
  if (args[0] !== 'compile') throw new WorkflowCliUsageError();
  const values = flagValues(args, ['--workflow', '--cases', '--out']);
  const workflowPath = values.get('--workflow');
  const outDir = values.get('--out');
  if (!workflowPath || !outDir) throw new WorkflowCliUsageError();
  const casesPath = values.get('--cases');
  return {
    workflowPath: resolve(workflowPath),
    ...(casesPath ? { casesPath: resolve(casesPath) } : {}),
    outDir: resolve(outDir)
  };
}

function parseJsonInput(content: string, input: 'workflow' | 'replay'): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new WorkflowCliInputError(input);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === 'serve') {
    const values = flagValues(args, ['--dir', '--port']);
    const rootDir = values.get('--dir');
    const requestedPort = values.has('--port') ? Number(values.get('--port')) : 4173;
    if (!rootDir || !Number.isInteger(requestedPort) || requestedPort < 0) {
      throw new WorkflowCliUsageError();
    }
    const { url } = await serveOperatorConsole(resolve(rootDir), { port: requestedPort });
    process.stdout.write(`${JSON.stringify({ ok: true, url, rootDir: resolve(rootDir) })}\n`);
    return;
  }

  const options = compileOptions(args);
  const definition = parseJsonInput(await readFile(options.workflowPath, 'utf8'), 'workflow');
  const bundle = compileWorkflowDefinition(definition);
  const replay = options.casesPath
    ? replayWorkflow(bundle, parseJsonInput(await readFile(options.casesPath, 'utf8'), 'replay'))
    : undefined;
  const manifest = await writeCompiledWorkflowArtifacts(bundle, options.outDir, replay);
  process.stdout.write(
    `${JSON.stringify({ ok: true, outDir: options.outDir, manifest }, null, 2)}\n`
  );
}

main().catch((error: unknown) => {
  if (error instanceof WorkflowCliUsageError) {
    process.stderr.write(
      `${JSON.stringify(
        { ok: false, error: error.name, code: error.code, usage: error.usage },
        null,
        2
      )}\n`
    );
    process.exitCode = 2;
  } else if (error instanceof WorkflowCliInputError) {
    process.stderr.write(
      `${JSON.stringify(
        {
          ok: false,
          error: error.name,
          code: error.code,
          input: error.input,
          message: error.message
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 2;
  } else if (error instanceof WorkflowArtifactOutputError) {
    process.stderr.write(
      `${JSON.stringify(
        { ok: false, error: error.name, code: error.code, message: error.message },
        null,
        2
      )}\n`
    );
    process.exitCode = 2;
  } else if (
    error instanceof WorkflowInputValidationError ||
    error instanceof ReplayInputValidationError
  ) {
    process.stderr.write(
      `${JSON.stringify(
        {
          ok: false,
          error: error.name,
          code: error.code,
          diagnostics: error.diagnostics
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 2;
  } else if (error instanceof WorkflowCompilationError) {
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: error.name, diagnostics: error.diagnostics }, null, 2)}\n`
    );
    process.exitCode = 3;
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
});
