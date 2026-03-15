#!/usr/bin/env node
import { appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ConsoleLogger, MemoryLogger } from './logger.js';
import { SymphonyService } from './orchestrator.js';
import { format_status_report, load_lane_statuses } from './status.js';
import { WorkflowManager } from './workflow.js';
function parse_args(argv) {
    const args = argv.slice(2);
    const out = {
        command: 'run',
        once: false,
        port: null,
        task_id: null,
        json: false,
    };
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (index === 0 && (arg === 'run' || arg === 'status')) {
            out.command = arg;
            continue;
        }
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
        if (arg === '--task-id') {
            out.task_id = args[index + 1] ?? null;
            index += 1;
            continue;
        }
        if (arg === '--json') {
            out.json = true;
            continue;
        }
        if (!arg.startsWith('-') && !out.workflow_path) {
            out.workflow_path = arg;
        }
    }
    return out;
}
function bootstrap_log_path(workflow_path) {
    return process.env.SYMPHONY_BOOTSTRAP_LOG || join(dirname(workflow_path), '.symphony-bootstrap.jsonl');
}
async function write_bootstrap_log(workflow_path, phase, details = {}) {
    const path = bootstrap_log_path(workflow_path);
    const entry = {
        timestamp: new Date().toISOString(),
        phase,
        ...details,
    };
    try {
        await mkdir(dirname(path), { recursive: true });
        await appendFile(path, `${JSON.stringify(entry)}\n`, 'utf8');
    }
    catch {
        // Best-effort only. Startup logging must never block process execution.
    }
}
async function main() {
    const args = parse_args(process.argv);
    const workflow_path = resolve(process.cwd(), args.workflow_path ?? 'WORKFLOW.md');
    if (args.command === 'status') {
        const workflow_manager = new WorkflowManager({
            workflow_path,
            logger: new MemoryLogger(),
        });
        const { config } = await workflow_manager.initialize();
        const report = await load_lane_statuses(config, {
            task_id: args.task_id,
        });
        if (args.json) {
            process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        }
        else {
            process.stdout.write(`${format_status_report(report)}\n`);
        }
        return;
    }
    await write_bootstrap_log(workflow_path, 'cli_entered', {
        once: args.once,
        port: args.port ?? null,
        task_id: args.task_id ?? null,
    });
    if (!existsSync(workflow_path)) {
        await write_bootstrap_log(workflow_path, 'workflow_missing', {});
        throw new Error(`Workflow file not found: ${workflow_path}`);
    }
    const logger = new ConsoleLogger();
    logger.info('cli bootstrap started', {
        workflow_path,
        once: args.once,
        port: args.port ?? undefined,
        task_id: args.task_id ?? undefined,
    });
    await write_bootstrap_log(workflow_path, 'workflow_resolved', { workflow_path });
    const service = new SymphonyService({
        workflow_path,
        logger,
        port: args.port,
        task_id_filter: args.task_id,
    });
    await write_bootstrap_log(workflow_path, 'service_created', {});
    if (args.once) {
        const startup_timeout_ms = Number(process.env.SYMPHONY_STARTUP_TIMEOUT_MS ?? 10_000);
        const run_once_promise = service.run_once();
        let startup_timer;
        const startup_timeout_promise = new Promise((_, reject) => {
            startup_timer = setTimeout(() => {
                reject(new Error(`Symphony startup stalled before first tracker call after ${startup_timeout_ms}ms`));
            }, startup_timeout_ms);
        });
        try {
            await write_bootstrap_log(workflow_path, 'run_once_started', { startup_timeout_ms });
            await Promise.race([
                run_once_promise,
                service.wait_for_startup_ready().then(async (phase) => {
                    clearTimeout(startup_timer);
                    logger.info('cli startup checkpoint reached', { phase });
                    await write_bootstrap_log(workflow_path, 'startup_ready', { phase });
                }),
                startup_timeout_promise,
            ]);
            await run_once_promise;
            await write_bootstrap_log(workflow_path, 'run_once_completed', {});
        }
        catch (error) {
            clearTimeout(startup_timer);
            await write_bootstrap_log(workflow_path, 'startup_failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            await service.stop().catch(() => {});
            throw error;
        }
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
//# sourceMappingURL=cli.js.map
