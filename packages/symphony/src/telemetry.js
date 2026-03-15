import { appendFile, mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
function create_run_id() {
    return `sym-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function telemetry_root_from_workspace_root(workspace_root, lane) {
    const absolute_root = resolve(workspace_root);
    const base = basename(absolute_root);
    if (base === lane) {
        return join(dirname(dirname(absolute_root)), 'logs');
    }
    return join(dirname(absolute_root), 'logs');
}
export function create_telemetry(config, logger, options = {}) {
    return new SymphonyTelemetry(config, logger, options.run_id ?? create_run_id());
}
export class SymphonyTelemetry {
    config;
    logger;
    run_id;
    lane;
    constructor(config, logger, run_id) {
        this.config = config;
        this.logger = logger;
        this.run_id = run_id;
        this.lane = config.tracker.label ?? basename(config.workspace.root);
    }
    log_path(task_id) {
        return join(telemetry_root_from_workspace_root(this.config.workspace.root, this.lane), this.lane, `${task_id}.jsonl`);
    }
    async emit(event) {
        const log_path = this.log_path(event.task_id);
        const payload = {
            timestamp: new Date().toISOString(),
            run_id: this.run_id,
            lane: this.lane,
            agent_id: this.config.tracker.agent_id,
            correlation_id: event.correlation_id ?? event.task_id,
            ...event,
        };
        try {
            await mkdir(dirname(log_path), { recursive: true });
            await appendFile(log_path, `${JSON.stringify(payload)}\n`, 'utf8');
        }
        catch (error) {
            this.logger.warn('telemetry emit failed', {
                task_id: event.task_id,
                phase: event.phase,
                status: event.status,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}
