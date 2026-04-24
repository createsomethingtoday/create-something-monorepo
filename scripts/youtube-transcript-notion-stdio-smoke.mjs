#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=ZDv4iYaLbpI';
const DEFAULT_PROTOCOL_VERSION = '2024-11-05';
const DEFAULT_TIMEOUT_MS = 120_000;
const PACKAGE_NAME = '@create-something/youtube-transcript-notion-mcp';

function parseArgs(argv) {
  const parsed = {
    json: false,
    mode: 'auto',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    videoUrl: DEFAULT_VIDEO_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--') {
      continue;
    }

    if (current === '--video' && next) {
      parsed.videoUrl = next;
      index += 1;
      continue;
    }

    if (current === '--language' && next) {
      parsed.language = next;
      index += 1;
      continue;
    }

    if (current === '--mode' && next) {
      if (next !== 'auto' && next !== 'browser-first') {
        throw new Error(`Unsupported mode: ${next}`);
      }
      parsed.mode = next;
      index += 1;
      continue;
    }

    if (current === '--timeout-ms' && next) {
      const timeoutMs = Number.parseInt(next, 10);
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error(`Invalid timeout: ${next}`);
      }
      parsed.timeoutMs = timeoutMs;
      index += 1;
      continue;
    }

    if (current === '--json') {
      parsed.json = true;
      continue;
    }

    if (current === '--help' || current === '-h') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${current}`);
  }

  return parsed;
}

function printUsage() {
  console.log(`Usage: pnpm mcp:youtube-transcript-notion:smoke [options]

Options:
  --video <url>            YouTube video URL or ID (default: ${DEFAULT_VIDEO_URL})
  --language <code>        Optional transcript language override
  --mode <mode>            direct provider mode: auto or browser-first (default: auto)
  --timeout-ms <ms>        Timeout per MCP request (default: ${DEFAULT_TIMEOUT_MS})
  --json                   Emit JSON summary
  --help                   Show this message
`);
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function runCommand(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}.`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const stdioEntry = path.join(
    repoRoot,
    'packages',
    'youtube-transcript-notion-mcp',
    'dist',
    'stdio.js',
  );

  await runCommand('pnpm', ['--filter', PACKAGE_NAME, 'build'], repoRoot);

  const child = spawn('node', [stdioEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      YOUTUBE_DIRECT_PROVIDER_MODE: args.mode,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let nextId = 1;
  let stdoutBuffer = '';
  const pending = new Map();
  const stderrLines = [];

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderrLines.push(chunk);
    if (!args.json) {
      process.stderr.write(chunk);
    }
  });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk;

    while (true) {
      const lineEnd = stdoutBuffer.indexOf('\n');
      if (lineEnd === -1) {
        break;
      }

      const line = stdoutBuffer.slice(0, lineEnd).replace(/\r$/, '');
      stdoutBuffer = stdoutBuffer.slice(lineEnd + 1);
      if (!line.trim()) {
        continue;
      }

      try {
        const payload = asRecord(JSON.parse(line));
        const id =
          typeof payload.id === 'string' || typeof payload.id === 'number'
            ? String(payload.id)
            : '';
        if (!id) {
          continue;
        }

        const waiter = pending.get(id);
        if (!waiter) {
          continue;
        }

        pending.delete(id);
        clearTimeout(waiter.timeout);

        if (payload.error) {
          const error = asRecord(payload.error);
          waiter.reject(
            new Error(error.message ?? `MCP request ${id} failed: ${JSON.stringify(payload.error)}`),
          );
          continue;
        }

        waiter.resolve(payload.result);
      } catch {
        // Ignore malformed frames and keep parsing subsequent messages.
      }
    }
  });

  child.on('exit', (code) => {
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timeout);
      waiter.reject(new Error(`Local MCP process exited with code ${code ?? 'unknown'}.`));
    }
    pending.clear();
  });

  async function send(method, params) {
    const id = String(nextId++);
    const payload =
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out waiting for MCP response to ${method}.`));
      }, args.timeoutMs);

      pending.set(id, { resolve, reject, timeout });
      child.stdin.write(payload, (error) => {
        if (error) {
          clearTimeout(timeout);
          pending.delete(id);
          reject(error);
        }
      });
    });
  }

  function notify(method, params) {
    const payload =
      JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
      }) + '\n';
    child.stdin.write(payload);
  }

  try {
    await send('initialize', {
      protocolVersion: DEFAULT_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'youtube-transcript-notion-stdio-smoke',
        version: '1.0.0',
      },
    });
    notify('notifications/initialized', {});

    const toolsResult = asRecord(await send('tools/list', {}));
    const tools = Array.isArray(toolsResult.tools)
      ? toolsResult.tools
          .map((tool) => asRecord(tool).name)
          .filter((name) => typeof name === 'string')
      : [];

    if (!tools.includes('extract_transcript')) {
      throw new Error('Local MCP did not advertise extract_transcript.');
    }

    const toolResult = asRecord(
      await send('tools/call', {
        name: 'extract_transcript',
        arguments: {
          videoUrl: args.videoUrl,
          ...(args.language ? { language: args.language } : {}),
        },
      }),
    );

    const structuredContent = asRecord(toolResult.structuredContent);
    const sourceDiagnostics = asRecord(structuredContent.sourceDiagnostics);
    const attempts = Array.isArray(sourceDiagnostics.attempts)
      ? sourceDiagnostics.attempts
          .map((attempt) => asRecord(attempt).provider)
          .filter((provider) => typeof provider === 'string')
      : [];
    const segmentSummary = asRecord(structuredContent.segmentSummary);
    const summary = {
      title: structuredContent.title,
      extractionMethod: structuredContent.extractionMethod,
      directProviderMode: sourceDiagnostics.directProviderMode,
      attemptProviders: attempts,
      segmentCount:
        typeof segmentSummary.count === 'number'
          ? segmentSummary.count
          : Array.isArray(structuredContent.segments)
            ? structuredContent.segments.length
            : undefined,
      warnings: Array.isArray(structuredContent.warnings) ? structuredContent.warnings : [],
      stderrPreview: stderrLines.join('').trim().split('\n').slice(-4),
    };

    if (toolResult.isError) {
      const structuredError = asRecord(structuredContent.error);
      throw new Error(
        JSON.stringify(
          {
            error: {
              ...structuredError,
              details: asRecord(structuredError.details),
            },
            summary,
          },
          null,
          2,
        ),
      );
    }

    if (args.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log(`Local stdio smoke succeeded for ${String(structuredContent.title ?? args.videoUrl)}.`);
    console.log(`mode=${String(summary.directProviderMode ?? args.mode)}`);
    console.log(`extractionMethod=${String(summary.extractionMethod ?? 'unknown')}`);
    console.log(`attemptProviders=${summary.attemptProviders.join(',') || 'none'}`);
    console.log(`segmentCount=${String(summary.segmentCount ?? 'unknown')}`);
    if (summary.warnings.length > 0) {
      console.log(`warnings=${summary.warnings.join(' | ')}`);
    }
  } finally {
    child.kill('SIGINT');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
