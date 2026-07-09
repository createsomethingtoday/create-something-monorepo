#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_MODEL = process.env.OPERATOR_AGENT_MODEL || 'ornith:9b';
const DEFAULT_TIMEOUT_MS = 120_000;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    model: DEFAULT_MODEL,
    prompt: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    raw: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--') continue;
    else if (arg === '--model' && next) options.model = argv[++index];
    else if (arg === '--prompt' && next) options.prompt = argv[++index];
    else if (arg === '--timeout-ms' && next) options.timeoutMs = Number(argv[++index]);
    else if (arg === '--raw') options.raw = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.help && !options.prompt) {
    throw new Error('--prompt is required');
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000 || options.timeoutMs > 300_000) {
    throw new Error('--timeout-ms must be an integer between 1000 and 300000');
  }

  return options;
}

function usage() {
  return `Usage:
  pnpm ornith:visible-chat -- --prompt <text> [--model ornith:9b]

Runs a visible Ornith chat through Ollama and prints only the final answer by
default. Use --raw only for debugging model output.
`;
}

function stripTerminalControl(output) {
  return String(output || '')
    .replace(/\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g, '')
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s*/g, '');
}

function stripThinking(output) {
  const text = stripTerminalControl(output).trim();
  if (!text) return '';

  const doneMarker = '...done thinking.';
  const doneIndex = text.lastIndexOf(doneMarker);
  if (doneIndex !== -1) {
    return text.slice(doneIndex + doneMarker.length).trim();
  }

  const thinkingIndex = text.indexOf('Thinking...');
  if (thinkingIndex === -1) return text;

  const beforeThinking = text.slice(0, thinkingIndex).trim();
  return beforeThinking || text.replace(/^Thinking\.\.\.\s*/s, '').trim();
}

function runVisibleChat(options) {
  const result = spawnSync('ollama', ['run', options.model, options.prompt], {
    encoding: 'utf8',
    timeout: options.timeoutMs,
  });

  if (result.error) {
    return {
      ok: false,
      exitCode: result.status ?? 1,
      error: result.error.message,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      finalText: '',
    };
  }

  const stdout = result.stdout || '';
  return {
    ok: result.status === 0,
    exitCode: result.status ?? 0,
    error: null,
    stdout,
    stderr: result.stderr || '',
    finalText: options.raw ? stdout.trim() : stripThinking(stdout),
  };
}

function main() {
  const options = parseArgs();
  if (options.help) {
    console.log(usage());
    return;
  }

  const result = runVisibleChat(options);
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  if (result.finalText) console.log(result.finalText);
  if (!result.ok) {
    if (result.error) console.error(result.error);
    process.exitCode = result.exitCode || 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

export { parseArgs, runVisibleChat, stripTerminalControl, stripThinking };
