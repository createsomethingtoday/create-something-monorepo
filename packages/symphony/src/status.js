import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { telemetry_root_from_workspace_root } from './telemetry.js';

function parse_jsonl_events(source) {
    return source
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line));
}

function sort_by_timestamp(events) {
    return [...events].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
}

function find_last(events, predicate) {
    for (let index = events.length - 1; index >= 0; index -= 1) {
        if (predicate(events[index])) {
            return events[index];
        }
    }
    return null;
}

export function summarize_task_events(events) {
    if (!Array.isArray(events) || events.length === 0) {
        return null;
    }
    const ordered = sort_by_timestamp(events);
    const latest = ordered.at(-1);
    const latest_run_id = latest.run_id ?? null;
    const current_run = latest_run_id ? ordered.filter((event) => event.run_id === latest_run_id) : ordered;
    const run_start = current_run[0];
    const run_end = current_run.at(-1);
    const last_success = find_last(current_run, (event) => event.status === 'succeeded');
    const last_failure = find_last(current_run, (event) => event.status === 'failed');
    const last_workspace = find_last(current_run, (event) => typeof event.workspace_path === 'string' && event.workspace_path.trim() !== '');
    const active_error = run_end.status === 'failed' ? run_end.error ?? last_failure?.error ?? null : null;
    return {
        task_id: run_end.task_id,
        run_id: latest_run_id,
        lane: run_end.lane ?? run_start.lane ?? null,
        agent_id: run_end.agent_id ?? run_start.agent_id ?? null,
        phase: run_end.phase ?? null,
        status: run_end.status ?? null,
        started_at: run_start.timestamp,
        updated_at: run_end.timestamp,
        elapsed_ms: Math.max(0, Date.parse(run_end.timestamp) - Date.parse(run_start.timestamp)),
        attempt: run_end.attempt ?? null,
        workspace_path: last_workspace?.workspace_path ?? null,
        last_successful_phase: last_success?.phase ?? null,
        last_error: active_error,
        last_failure: last_failure
            ? {
                phase: last_failure.phase ?? null,
                timestamp: last_failure.timestamp,
                error: last_failure.error ?? null,
            }
            : null,
    };
}

async function read_task_summary(file_path) {
    const raw = await readFile(file_path, 'utf8');
    return summarize_task_events(parse_jsonl_events(raw));
}

export async function load_lane_statuses(config, options = {}) {
    const lane = config.tracker.label ?? basename(config.workspace.root);
    const telemetry_root = telemetry_root_from_workspace_root(config.workspace.root, lane);
    const lane_dir = join(telemetry_root, lane);
    const task_id = typeof options.task_id === 'string' && options.task_id.trim() ? options.task_id.trim() : null;
    let files;
    if (task_id) {
        files = [`${task_id}.jsonl`];
    }
    else {
        try {
            files = (await readdir(lane_dir)).filter((entry) => entry.endsWith('.jsonl'));
        }
        catch (error) {
            if (error?.code === 'ENOENT') {
                files = [];
            }
            else {
                throw error;
            }
        }
    }
    const tasks = [];
    for (const file_name of files) {
        try {
            const summary = await read_task_summary(join(lane_dir, file_name));
            if (summary) {
                tasks.push(summary);
            }
        }
        catch (error) {
            if (error?.code === 'ENOENT') {
                continue;
            }
            throw error;
        }
    }
    tasks.sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at));
    return {
        lane,
        telemetry_dir: lane_dir,
        task_id,
        tasks,
    };
}

function format_duration(ms) {
    if (!Number.isFinite(ms) || ms < 1_000) {
        return `${ms}ms`;
    }
    const seconds = Math.round(ms / 1_000);
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const rem_seconds = seconds % 60;
    if (minutes < 60) {
        return rem_seconds === 0 ? `${minutes}m` : `${minutes}m ${rem_seconds}s`;
    }
    const hours = Math.floor(minutes / 60);
    const rem_minutes = minutes % 60;
    return rem_minutes === 0 ? `${hours}h` : `${hours}h ${rem_minutes}m`;
}

export function format_status_report(report) {
    if (report.tasks.length === 0) {
        return `No Symphony telemetry found for lane ${report.lane} in ${report.telemetry_dir}`;
    }
    if (report.task_id) {
        const task = report.tasks[0];
        const lines = [
            `task=${task.task_id} lane=${task.lane} status=${task.status} phase=${task.phase}`,
            `updated_at=${task.updated_at} elapsed=${format_duration(task.elapsed_ms)}`,
        ];
        if (task.last_successful_phase) {
            lines.push(`last_successful_phase=${task.last_successful_phase}`);
        }
        if (task.workspace_path) {
            lines.push(`workspace=${task.workspace_path}`);
        }
        if (task.last_error) {
            lines.push(`last_error=${task.last_error.class ?? 'Error'}: ${task.last_error.message ?? 'unknown error'}`);
        }
        else if (task.last_failure?.error) {
            lines.push(`last_failure=${task.last_failure.error.class ?? 'Error'}: ${task.last_failure.error.message ?? 'unknown error'}`);
        }
        return lines.join('\n');
    }
    return report.tasks
        .map((task) => {
        const parts = [
            `task=${task.task_id}`,
            `status=${task.status}`,
            `phase=${task.phase}`,
            `updated_at=${task.updated_at}`,
            `elapsed=${format_duration(task.elapsed_ms)}`,
        ];
        if (task.last_error?.message) {
            parts.push(`error=${task.last_error.message}`);
        }
        else if (task.last_failure?.error?.message) {
            parts.push(`last_failure=${task.last_failure.error.message}`);
        }
        return parts.join(' ');
    })
        .join('\n');
}
