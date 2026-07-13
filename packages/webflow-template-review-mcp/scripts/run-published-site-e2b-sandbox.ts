import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import process from 'node:process';

import { Sandbox } from '@e2b/code-interpreter';

import { createCollectorReceipt } from '../src/unit-economics.js';

type CliOptions = {
  bundleDir?: string;
  outDir: string;
  template?: string;
  timeoutMs: number;
  requestTimeoutMs: number;
  sandboxTimeoutMs: number;
  bootstrapBrowser: boolean;
  bootstrapTimeoutMs: number;
  keepSandbox: boolean;
  normalize: boolean;
  preflightOnly: boolean;
  assetId?: string;
  versionId?: string;
  policySnapshotId?: string;
  artifactBaseUrl?: string;
};

type SandboxJob = {
  run_id?: string;
  source_url?: string;
  policy_snapshot_id?: string;
  sandbox_provider?: string;
  artifacts?: {
    output_file?: string;
    screenshot_dir?: string;
    network_log_file?: string;
    html_snapshot_file?: string;
  };
};

type CommandResultLike = {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
};

type E2BSecretStatus = {
  ok: boolean;
  selected_secret: 'E2B_API_KEY' | 'DIFY_E2B_API_KEY' | null;
  env: {
    E2B_API_KEY: 'present' | 'missing';
    DIFY_E2B_API_KEY: 'present' | 'missing';
  };
  message: string;
};

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT_DIR = '/tmp/webflow-template-review-direct-e2b';

function parseArgs(argv: string[]): CliOptions {
  const options: Partial<CliOptions> = {
    outDir: DEFAULT_OUT_DIR,
    timeoutMs: 120_000,
    requestTimeoutMs: 120_000,
    sandboxTimeoutMs: 300_000,
    bootstrapBrowser: false,
    bootstrapTimeoutMs: 240_000,
    keepSandbox: false,
    normalize: false,
    preflightOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--bundle-dir' && next) {
      options.bundleDir = next;
      i += 1;
      continue;
    }
    if (arg === '--out' && next) {
      options.outDir = next;
      i += 1;
      continue;
    }
    if (arg === '--template' && next) {
      options.template = next;
      i += 1;
      continue;
    }
    if (arg === '--timeout-ms' && next) {
      options.timeoutMs = boundedInt(next, 5_000, 600_000, '--timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--request-timeout-ms' && next) {
      options.requestTimeoutMs = boundedInt(next, 5_000, 600_000, '--request-timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--sandbox-timeout-ms' && next) {
      options.sandboxTimeoutMs = boundedInt(next, 60_000, 3_600_000, '--sandbox-timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--bootstrap-timeout-ms' && next) {
      options.bootstrapTimeoutMs = boundedInt(next, 30_000, 900_000, '--bootstrap-timeout-ms');
      i += 1;
      continue;
    }
    if (arg === '--bootstrap-browser') {
      options.bootstrapBrowser = true;
      continue;
    }
    if (arg === '--keep-sandbox') {
      options.keepSandbox = true;
      continue;
    }
    if (arg === '--normalize') {
      options.normalize = true;
      continue;
    }
    if (arg === '--preflight-only') {
      options.preflightOnly = true;
      continue;
    }
    if (arg === '--asset-id' && next) {
      options.assetId = next;
      i += 1;
      continue;
    }
    if (arg === '--version-id' && next) {
      options.versionId = next;
      i += 1;
      continue;
    }
    if (arg === '--policy-snapshot-id' && next) {
      options.policySnapshotId = next;
      i += 1;
      continue;
    }
    if (arg === '--artifact-base-url' && next) {
      options.artifactBaseUrl = next.replace(/\/+$/, '');
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.bundleDir && !options.preflightOnly) {
    throw new Error('Missing required --bundle-dir <prepared-sandbox-bundle-dir>.');
  }

  return {
    bundleDir: options.bundleDir,
    outDir: options.outDir ?? DEFAULT_OUT_DIR,
    template: options.template,
    timeoutMs: options.timeoutMs ?? 120_000,
    requestTimeoutMs: options.requestTimeoutMs ?? 120_000,
    sandboxTimeoutMs: options.sandboxTimeoutMs ?? 300_000,
    bootstrapBrowser: options.bootstrapBrowser ?? false,
    bootstrapTimeoutMs: options.bootstrapTimeoutMs ?? 240_000,
    keepSandbox: options.keepSandbox ?? false,
    normalize: options.normalize ?? false,
    preflightOnly: options.preflightOnly ?? false,
    assetId: options.assetId,
    versionId: options.versionId,
    policySnapshotId: options.policySnapshotId,
    artifactBaseUrl: options.artifactBaseUrl,
  };
}

function printHelp() {
  console.log(`Usage:
  pnpm --filter @create-something/webflow-template-review-mcp published-site:sandbox:e2b-run -- [options]

Options:
  --bundle-dir <dir>          Prepared sandbox bundle directory. Required.
  --out <dir>                 Local artifact output directory. Default: ${DEFAULT_OUT_DIR}
  --template <name-or-id>     Optional E2B template with browser dependencies preinstalled.
  --bootstrap-browser         Run the generated Playwright bootstrap command before the runner.
  --timeout-ms <n>            Runner execution timeout. Default: 120000
  --request-timeout-ms <n>    E2B API request timeout. Default: 120000
  --sandbox-timeout-ms <n>    E2B sandbox lifetime. Default: 300000
  --bootstrap-timeout-ms <n>  Browser bootstrap timeout. Default: 240000
  --normalize                 Run the local sandbox normalizer after downloading output JSON.
  --preflight-only            Check coordinator E2B credential readiness without creating a sandbox.
  --asset-id <id>             Optional asset id passed to normalizer.
  --version-id <id>           Optional version id passed to normalizer.
  --policy-snapshot-id <id>   Optional policy snapshot override passed to normalizer.
  --artifact-base-url <url>   Optional artifact base URL passed to normalizer.
  --keep-sandbox              Do not kill sandbox after the run. For debugging only.
  --help                      Show this help.

Behavior:
  Creates the E2B sandbox from the coordinator process using E2B_API_KEY
  or DIFY_E2B_API_KEY,
  executes the generated evidence-only Python runner, downloads JSON/html/network
  artifacts and screenshots, then kills the sandbox unless --keep-sandbox is set.
  E2B credentials are not passed into the sandbox runner or artifact files.
`);
}

function boundedInt(value: string, min: number, max: number, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${flag} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

function safeMetadataValue(value: string | undefined): string {
  return (value ?? '').replace(/[^a-zA-Z0-9._:/-]+/g, '_').slice(0, 128);
}

function commandResultFromError(error: unknown): CommandResultLike {
  const maybe = error as Partial<CommandResultLike>;
  return {
    exitCode: typeof maybe.exitCode === 'number' ? maybe.exitCode : undefined,
    stdout: typeof maybe.stdout === 'string' ? maybe.stdout : '',
    stderr: typeof maybe.stderr === 'string' ? maybe.stderr : '',
    error: error instanceof Error ? error.message : String(error),
  };
}

async function optionalRead(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

function stripRunnerFromBootstrap(command: string | undefined): string {
  const fallback = 'python -m pip install -q playwright && python -m playwright install chromium';
  const trimmed = command?.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/\s*&&\s*python\s+published-site-sandbox-e2b-run\.py\s*$/u, '') || fallback;
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getE2BSecretStatus(): { status: E2BSecretStatus; apiKey?: string } {
  const e2b = process.env.E2B_API_KEY;
  const difyE2b = process.env.DIFY_E2B_API_KEY;
  const selected = e2b ? 'E2B_API_KEY' : difyE2b ? 'DIFY_E2B_API_KEY' : null;
  return {
    apiKey: e2b || difyE2b,
    status: {
      ok: Boolean(selected),
      selected_secret: selected,
      env: {
        E2B_API_KEY: e2b ? 'present' : 'missing',
        DIFY_E2B_API_KEY: difyE2b ? 'present' : 'missing',
      },
      message: selected
        ? 'Coordinator E2B credential is present. It will not be forwarded into the sandbox runner or artifacts.'
        : 'Missing E2B_API_KEY or DIFY_E2B_API_KEY in the coordinator process.',
    },
  };
}

async function downloadTextArtifact(sandbox: Sandbox, sandboxPath: string | undefined, outFile: string): Promise<string | undefined> {
  if (!sandboxPath || !(await sandbox.files.exists(sandboxPath))) return undefined;
  const content = await sandbox.files.read(sandboxPath);
  await writeFile(outFile, content);
  return outFile;
}

async function downloadScreenshots(sandbox: Sandbox, screenshotDir: string | undefined, outDir: string): Promise<string[]> {
  if (!screenshotDir || !(await sandbox.files.exists(screenshotDir))) return [];
  const entries = await sandbox.files.list(screenshotDir);
  const written: string[] = [];
  await mkdir(outDir, { recursive: true });
  for (const entry of entries) {
    if (entry.type !== 'file' || !entry.name.toLowerCase().endsWith('.png')) continue;
    const bytes = await sandbox.files.read(entry.path, { format: 'bytes' });
    const localPath = path.join(outDir, path.basename(entry.name));
    await writeFile(localPath, bytes);
    written.push(localPath);
  }
  return written;
}

async function runNormalizer(options: CliOptions, inputFile: string, outDir: string) {
  const normalizeOutDir = path.join(outDir, 'normalized');
  const args = [
    '--import',
    'tsx',
    path.join(SCRIPT_DIR, 'normalize-published-site-sandbox-output.ts'),
    '--input',
    inputFile,
    '--out',
    normalizeOutDir,
  ];
  if (options.assetId) args.push('--asset-id', options.assetId);
  if (options.versionId) args.push('--version-id', options.versionId);
  if (options.policySnapshotId) args.push('--policy-snapshot-id', options.policySnapshotId);
  if (options.artifactBaseUrl) args.push('--artifact-base-url', options.artifactBaseUrl);

  const result = await execFileAsync(process.execPath, args, { cwd: path.dirname(SCRIPT_DIR) });
  return {
    out_dir: normalizeOutDir,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await mkdir(options.outDir, { recursive: true });

  const secretCheck = getE2BSecretStatus();
  await writeJson(path.join(options.outDir, 'published-site-sandbox-e2b-preflight.json'), secretCheck.status);
  if (options.preflightOnly) {
    console.log(JSON.stringify(secretCheck.status, null, 2));
    process.exit(secretCheck.status.ok ? 0 : 1);
  }
  if (!secretCheck.apiKey) {
    throw new Error(
      'Missing E2B_API_KEY or DIFY_E2B_API_KEY. Run through Infisical, for example: infisical run --env=prod --path=/ --include-imports=true -- <command>',
    );
  }

  const bundleDir = options.bundleDir;
  if (!bundleDir) throw new Error('Missing required --bundle-dir <prepared-sandbox-bundle-dir>.');
  const jobFile = path.join(bundleDir, 'published-site-sandbox-job.json');
  const runnerFile = path.join(bundleDir, 'published-site-sandbox-e2b-run.py');
  const bootstrapFile = path.join(bundleDir, 'published-site-sandbox-e2b-bootstrap-command.txt');
  const job = JSON.parse(await readFile(jobFile, 'utf8')) as SandboxJob;
  const runnerCode = await readFile(runnerFile, 'utf8');
  const runId = job.run_id ?? `direct-e2b-${randomUUID()}`;

  let sandbox: Sandbox | undefined;
  let sandboxInfo: { startedAt: Date; cpuCount: number; memoryMB: number } | undefined;
  let sandboxKilled = false;
  let runCompleted = false;
  let bootstrapResult: CommandResultLike | undefined;
  let normalizerResult: unknown;
  const stdout: string[] = [];
  const stderr: string[] = [];

  try {
    const sandboxOptions = {
      apiKey: secretCheck.apiKey,
      timeoutMs: options.sandboxTimeoutMs,
      requestTimeoutMs: options.requestTimeoutMs,
      allowInternetAccess: true,
      envs: {},
      metadata: {
        lane: 'published_site_validation',
        run_id: safeMetadataValue(runId),
        source_host: safeMetadataValue(job.source_url ? new URL(job.source_url).hostname : undefined),
        coordinator: 'webflow-template-review-mcp',
      },
    };
    sandbox = options.template
      ? await Sandbox.create(options.template, sandboxOptions)
      : await Sandbox.create(sandboxOptions);
    const observedInfo = await sandbox.getInfo({ requestTimeoutMs: options.requestTimeoutMs });
    sandboxInfo = {
      startedAt: observedInfo.startedAt,
      cpuCount: observedInfo.cpuCount,
      memoryMB: observedInfo.memoryMB,
    };

    if (options.bootstrapBrowser) {
      const bootstrapCommand = stripRunnerFromBootstrap(await optionalRead(bootstrapFile));
      try {
        bootstrapResult = await sandbox.commands.run(bootstrapCommand, {
          timeoutMs: options.bootstrapTimeoutMs,
          requestTimeoutMs: options.requestTimeoutMs,
          user: 'root',
        });
      } catch (error) {
        bootstrapResult = commandResultFromError(error);
      }
      await writeJson(path.join(options.outDir, 'published-site-sandbox-e2b-bootstrap-result.json'), bootstrapResult);
    }

    const execution = await sandbox.runCode(runnerCode, {
      timeoutMs: options.timeoutMs,
      requestTimeoutMs: options.requestTimeoutMs,
      onStdout: (message) => stdout.push(message.line),
      onStderr: (message) => stderr.push(message.line),
    });
    await writeJson(path.join(options.outDir, 'published-site-sandbox-e2b-execution.json'), {
      text: execution.text,
      error: execution.error,
      logs: execution.logs,
      callback_stdout: stdout,
      callback_stderr: stderr,
    });

    const outputFile = path.join(options.outDir, 'published-site-sandbox-output.json');
    const downloadedOutput = await downloadTextArtifact(sandbox, job.artifacts?.output_file, outputFile);
    const downloadedNetworkLog = await downloadTextArtifact(
      sandbox,
      job.artifacts?.network_log_file,
      path.join(options.outDir, 'network-log.json'),
    );
    const downloadedHtmlSnapshot = await downloadTextArtifact(
      sandbox,
      job.artifacts?.html_snapshot_file,
      path.join(options.outDir, 'html-snapshot.html'),
    );
    const downloadedScreenshots = await downloadScreenshots(sandbox, job.artifacts?.screenshot_dir, path.join(options.outDir, 'screenshots'));
    runCompleted = Boolean(downloadedOutput);

    if (downloadedOutput && options.normalize) {
      normalizerResult = await runNormalizer(options, downloadedOutput, options.outDir);
      await writeJson(path.join(options.outDir, 'published-site-sandbox-normalizer-result.json'), normalizerResult);
    }

    const summary = {
      ok: Boolean(downloadedOutput),
      run_id: runId,
      source_url: job.source_url,
      provider: 'direct_e2b',
      bundle_provider: job.sandbox_provider,
      sandbox_id: sandbox.sandboxId,
      sandbox_template: options.template,
      sandbox_kept: options.keepSandbox,
      bootstrap_requested: options.bootstrapBrowser,
      bootstrap_ok: bootstrapResult ? bootstrapResult.exitCode === 0 : undefined,
      execution_error: execution.error,
      artifacts: {
        output_file: downloadedOutput,
        network_log_file: downloadedNetworkLog,
        html_snapshot_file: downloadedHtmlSnapshot,
        screenshots: downloadedScreenshots,
        normalized_out_dir: options.normalize ? path.join(options.outDir, 'normalized') : undefined,
        unit_economics_receipt:
          downloadedOutput && !options.keepSandbox
            ? path.join(options.outDir, 'published-site-sandbox-unit-economics-receipt.json')
            : undefined,
      },
    };
    await writeJson(path.join(options.outDir, 'published-site-sandbox-e2b-run-summary.json'), summary);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (sandbox && !options.keepSandbox) {
      try {
        await sandbox.kill();
        sandboxKilled = true;
      } finally {
        await writeJson(path.join(options.outDir, 'published-site-sandbox-e2b-cleanup.json'), {
          sandbox_id: sandbox.sandboxId,
          killed: sandboxKilled,
        });
      }
      if (runCompleted && sandboxKilled && sandboxInfo) {
        const completedAt = new Date().toISOString();
        await writeJson(
          path.join(options.outDir, 'published-site-sandbox-unit-economics-receipt.json'),
          createCollectorReceipt({
            packetId: runId,
            startedAt: sandboxInfo.startedAt.toISOString(),
            completedAt,
            cpuCount: sandboxInfo.cpuCount,
            memoryMiB: sandboxInfo.memoryMB,
            evidenceNote:
              'Completed direct E2B evidence collection. Sandbox resources came from Sandbox.getInfo; duration ends after coordinator kill completed. Storage and tool costs require separate observed inputs.',
          }),
        );
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
