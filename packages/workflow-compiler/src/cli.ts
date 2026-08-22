#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  verifyWorkflowArtifactBundle,
  WorkflowArtifactOutputError,
  WorkflowArtifactVerificationError,
  writeCompiledWorkflowArtifacts
} from './artifacts.js';
import { WorkflowArtifactAttestationError } from './attestation.js';
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
  signingKeyPath?: string;
  keyId?: string;
}

function usage(): string {
  return [
    'Usage:',
    '  workflow-compiler compile --workflow <definition.json> [--cases <cases.json>] --out <directory> [--signing-key <private.pem> --key-id <id>]',
    '  workflow-compiler verify --dir <compiled-output> [--public-key <public.pem>]',
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
  const values = flagValues(args, ['--workflow', '--cases', '--out', '--signing-key', '--key-id']);
  const workflowPath = values.get('--workflow');
  const outDir = values.get('--out');
  if (!workflowPath || !outDir) throw new WorkflowCliUsageError();
  const casesPath = values.get('--cases');
  const signingKeyPath = values.get('--signing-key');
  const keyId = values.get('--key-id');
  if ((signingKeyPath === undefined) !== (keyId === undefined)) {
    throw new WorkflowCliUsageError();
  }
  return {
    workflowPath: resolve(workflowPath),
    ...(casesPath ? { casesPath: resolve(casesPath) } : {}),
    outDir: resolve(outDir),
    ...(signingKeyPath ? { signingKeyPath: resolve(signingKeyPath), keyId } : {})
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

  if (args[0] === 'verify') {
    const values = flagValues(args, ['--dir', '--public-key']);
    const rootDir = values.get('--dir');
    const publicKeyPath = values.get('--public-key');
    if (!rootDir) throw new WorkflowCliUsageError();
    const receipt = await verifyWorkflowArtifactBundle(resolve(rootDir), {
      ...(publicKeyPath ? { publicKey: await readFile(resolve(publicKeyPath), 'utf8') } : {})
    });
    process.stdout.write(`${JSON.stringify({ ok: true, receipt }, null, 2)}\n`);
    return;
  }

  const options = compileOptions(args);
  const definition = parseJsonInput(await readFile(options.workflowPath, 'utf8'), 'workflow');
  const bundle = compileWorkflowDefinition(definition);
  const replay = options.casesPath
    ? replayWorkflow(bundle, parseJsonInput(await readFile(options.casesPath, 'utf8'), 'replay'))
    : undefined;
  const signing =
    options.signingKeyPath && options.keyId
      ? { privateKey: await readFile(options.signingKeyPath, 'utf8'), keyId: options.keyId }
      : undefined;
  const manifest = await writeCompiledWorkflowArtifacts(bundle, options.outDir, replay, signing);
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
  } else if (error instanceof WorkflowArtifactVerificationError) {
    process.stderr.write(
      `${JSON.stringify(
        {
          ok: false,
          error: error.name,
          code: error.code,
          message: error.message,
          ...(error.path ? { path: error.path } : {})
        },
        null,
        2
      )}\n`
    );
    process.exitCode = 3;
  } else if (error instanceof WorkflowArtifactAttestationError) {
    process.stderr.write(
      `${JSON.stringify(
        { ok: false, error: error.name, code: error.code, message: error.message },
        null,
        2
      )}\n`
    );
    process.exitCode = [
      'INVALID_KEY_ID',
      'INVALID_PRIVATE_KEY',
      'INVALID_PUBLIC_KEY',
      'UNSUPPORTED_KEY_TYPE'
    ].includes(error.code)
      ? 2
      : 3;
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
