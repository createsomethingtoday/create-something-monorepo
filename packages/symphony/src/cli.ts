import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ConsoleLogger } from './logger.js';
import { SymphonyService } from './orchestrator.js';

type CliArgs = {
  workflow_path?: string;
  once: boolean;
  port: number | null;
};

function parse_args(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const out: CliArgs = {
    once: false,
    port: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--once') {
      out.once = true;
      continue;
    }
    if (arg === '--port') {
      const raw = args[index + 1] ?? '';
      index += 1;
      const parsed = Number(raw);
      out.port = Number.isFinite(parsed) ? Math.trunc(parsed) : null;
      continue;
    }
    if (!arg.startsWith('-') && !out.workflow_path) {
      out.workflow_path = arg;
    }
  }

  return out;
}

async function main(): Promise<void> {
  const args = parse_args(process.argv);
  const workflow_path = resolve(process.cwd(), args.workflow_path ?? 'WORKFLOW.md');
  if (!existsSync(workflow_path)) {
    throw new Error(`Workflow file not found: ${workflow_path}`);
  }

  const logger = new ConsoleLogger();
  const service = new SymphonyService({
    workflow_path,
    logger,
    port: args.port,
  });

  if (args.once) {
    await service.run_once();
    return;
  }

  await service.start();
  logger.info('symphony started completed', { workflow_path, port: args.port ?? undefined });

  const shutdown = async () => {
    await service.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
