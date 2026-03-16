import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { SymphonyError } from '../errors.js';
import { render_prompt_template } from '../template.js';

const MAX_CAPTURED_OUTPUT_CHARS = 4000;

function now_iso() {
    return new Date().toISOString();
}

function normalize_state(state) {
    return state.trim().toLowerCase();
}

function is_active_state(state, config) {
    const normalized = normalize_state(state);
    return config.tracker.active_states.some((entry) => normalize_state(entry) === normalized);
}

function continuation_prompt(issue, attempt, turn_number, max_turns) {
    return [
        `Continue working on ${issue.identifier}: ${issue.title}.`,
        `The issue is still active in state "${issue.state}".`,
        `This is continuation turn ${turn_number} of ${max_turns}.`,
        `Attempt: ${attempt ?? 'initial'}.`,
        'Do not restate the original task prompt. Continue from the existing run summary and repository state.',
    ].join('\n');
}

function shell_quote(value) {
    return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function create_output_capture(limit = MAX_CAPTURED_OUTPUT_CHARS) {
    return {
        limit,
        truncated: false,
        value: '',
    };
}

function append_output_capture(capture, chunk) {
    const text = String(chunk);
    if (capture.truncated) {
        return;
    }
    const remaining = capture.limit - capture.value.length;
    if (remaining <= 0) {
        capture.truncated = true;
        return;
    }
    if (text.length > remaining) {
        capture.value += text.slice(0, remaining);
        capture.truncated = true;
        return;
    }
    capture.value += text;
}

function finalize_output_capture(capture) {
    const text = capture.value.trim();
    if (!text) {
        return undefined;
    }
    return capture.truncated ? `${text}…` : text;
}

function kill_process_group(pid, signal = 'SIGTERM') {
    if (!Number.isInteger(pid) || pid <= 0) {
        return;
    }
    try {
        process.kill(-pid, signal);
        return;
    }
    catch (error) {
        if (error?.code !== 'ESRCH') {
            throw error;
        }
    }
    try {
        process.kill(pid, signal);
    }
    catch (error) {
        if (error?.code !== 'ESRCH') {
            throw error;
        }
    }
}

function build_codex_cli_command(config, output_path) {
    const configured = config.execution.command?.trim();
    if (configured) {
        return `${configured} --json --output-last-message ${shell_quote(output_path)} -`;
    }
    const sandbox = config.codex.thread_sandbox || 'danger-full-access';
    const approval = config.codex.approval_policy || 'never';
    return `codex exec -s ${shell_quote(sandbox)} -c ${shell_quote(`approval_policy="${approval}"`)} --json --output-last-message ${shell_quote(output_path)} -`;
}

async function run_codex_cli_turn(config, workspace_path, prompt, title, on_event, on_child_pid) {
    const output_path = join(workspace_path, '.symphony-codex-cli-last-message.txt');
    const command = build_codex_cli_command(config, output_path);
    const stdout = create_output_capture();
    const stderr = create_output_capture();
    const child = spawn('bash', ['-lc', command], {
        cwd: workspace_path,
        detached: true,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    on_child_pid?.(child.pid ?? null);
    const synthetic_thread_id = `codex-cli-${child.pid ?? 'pending'}`;
    const synthetic_turn_id = `${synthetic_thread_id}-${Date.now()}`;
    on_event?.({
        event: 'session_started',
        timestamp: now_iso(),
        codex_app_server_pid: child.pid ?? null,
        session_id: synthetic_thread_id,
        thread_id: synthetic_thread_id,
        message: title,
    });
    on_event?.({
        event: 'turn_started',
        timestamp: now_iso(),
        codex_app_server_pid: child.pid ?? null,
        session_id: synthetic_turn_id,
        thread_id: synthetic_thread_id,
        turn_id: synthetic_turn_id,
        message: title,
    });
    child.stdout.on('data', (chunk) => append_output_capture(stdout, chunk));
    child.stderr.on('data', (chunk) => append_output_capture(stderr, chunk));
    child.stdin.write(prompt);
    child.stdin.end();
    const exit = await new Promise((resolve, reject) => {
        let settled = false;
        const timeout_ms = config.codex.turn_timeout_ms;
        const timeout_handle = timeout_ms > 0
            ? setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                kill_process_group(child.pid, 'SIGTERM');
                setTimeout(() => kill_process_group(child.pid, 'SIGKILL'), 1_000).unref();
                reject(new SymphonyError('turn_timeout', `Turn timed out after ${timeout_ms}ms`));
            }, timeout_ms)
            : null;
        const cleanup = () => {
            if (timeout_handle) {
                clearTimeout(timeout_handle);
            }
        };
        child.once('exit', (code, signal) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            resolve({ code, signal });
        });
        child.once('error', (error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            reject(error);
        });
    });
    let text = null;
    try {
        text = (await readFile(output_path, 'utf8')).trim() || null;
    }
    catch {
        text = null;
    }
    if (exit.code === 0) {
        on_event?.({
            event: 'turn_completed',
            timestamp: now_iso(),
            codex_app_server_pid: child.pid ?? null,
            session_id: synthetic_turn_id,
            thread_id: synthetic_thread_id,
            turn_id: synthetic_turn_id,
            message: text ?? finalize_output_capture(stdout) ?? 'codex cli turn completed',
        });
        return {
            text,
        };
    }
    const stderr_text = finalize_output_capture(stderr);
    const stdout_text = finalize_output_capture(stdout);
    const message = stderr_text ?? stdout_text ?? `codex cli exited with code ${exit.code ?? 'null'} signal ${exit.signal ?? 'null'}`;
    on_event?.({
        event: 'turn_failed',
        timestamp: now_iso(),
        codex_app_server_pid: child.pid ?? null,
        session_id: synthetic_turn_id,
        thread_id: synthetic_thread_id,
        turn_id: synthetic_turn_id,
        message,
    });
    throw new SymphonyError('runner_exit', message);
}

export function create_codex_cli_runner_run(issue, attempt, workspace, prompt_template, config, tracker, workspace_manager, logger, on_event) {
    let stopped = false;
    let stop_reason = 'cancelled';
    let active_child_pid = null;
    const promise = (async () => {
        let current_issue = issue;
        let turn_count = 0;
        let final_message = null;
        try {
            await workspace_manager.run_before_run(workspace, attempt);
            while (true) {
                if (stopped) {
                    return {
                        status: 'cancelled',
                        error: stop_reason,
                        turn_count,
                        issue: current_issue,
                        final_message,
                    };
                }
                const prompt = turn_count === 0
                    ? await render_prompt_template(prompt_template, { issue: current_issue, attempt })
                    : continuation_prompt(current_issue, attempt, turn_count + 1, config.agent.max_turns);
                const turn = await run_codex_cli_turn(config, workspace.path, prompt, `${current_issue.identifier}: ${current_issue.title}`, on_event, (pid) => {
                    active_child_pid = pid;
                });
                active_child_pid = null;
                if (stopped) {
                    return {
                        status: 'cancelled',
                        error: stop_reason,
                        turn_count,
                        issue: current_issue,
                        final_message,
                    };
                }
                final_message = typeof turn.text === 'string' && turn.text.trim() ? turn.text.trim() : final_message;
                turn_count += 1;
                const refreshed = await tracker.fetch_issue_states_by_ids([issue.id]);
                current_issue = refreshed[0] ?? current_issue;
                if (!is_active_state(current_issue.state, config)) {
                    break;
                }
                if (turn_count >= config.agent.max_turns) {
                    break;
                }
            }
            return {
                status: 'completed',
                error: null,
                turn_count,
                issue: current_issue,
                final_message,
            };
        }
        catch (error) {
            if (stopped) {
                return {
                    status: 'cancelled',
                    error: stop_reason,
                    turn_count,
                    issue: current_issue,
                    final_message,
                };
            }
            logger.warn('codex cli runner failed', {
                issue_id: issue.id,
                issue_identifier: issue.identifier,
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
                turn_count,
                issue: current_issue,
                final_message,
            };
        }
        finally {
            active_child_pid = null;
            if (workspace) {
                await workspace_manager.run_after_run(workspace, attempt);
            }
        }
    })();
    return {
        promise,
        async terminate(reason) {
            stopped = true;
            stop_reason = reason;
            kill_process_group(active_child_pid, 'SIGTERM');
            setTimeout(() => kill_process_group(active_child_pid, 'SIGKILL'), 1_000).unref();
        },
    };
}
