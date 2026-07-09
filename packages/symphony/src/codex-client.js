import { spawn } from 'node:child_process';
import { SymphonyError } from './errors.js';
function now_iso() {
    return new Date().toISOString();
}
function to_error_message(error) {
    return error instanceof Error ? error.message : String(error);
}
function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function find_number(source, keys) {
    for (const key of keys) {
        const value = source[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
    }
    return null;
}
function extract_usage(message) {
    const params = asObject(message.params);
    const candidates = [
        asObject(params?.total_token_usage),
        asObject(params?.totalTokenUsage),
        asObject(asObject(params?.thread)?.tokenUsage),
        asObject(asObject(params?.thread)?.token_usage),
        message.method === 'thread/tokenUsage/updated' ? params : null,
    ].filter((entry) => entry !== null);
    for (const candidate of candidates) {
        const input = find_number(candidate, ['input_tokens', 'inputTokens']);
        const output = find_number(candidate, ['output_tokens', 'outputTokens']);
        const total = find_number(candidate, ['total_tokens', 'totalTokens']);
        if (input !== null || output !== null || total !== null) {
            return {
                input_tokens: input ?? 0,
                output_tokens: output ?? 0,
                total_tokens: total ?? (input ?? 0) + (output ?? 0),
            };
        }
    }
    return undefined;
}
function extract_rate_limits(message) {
    const params = asObject(message.params);
    return (asObject(params?.rate_limits) ??
        asObject(params?.rateLimits) ??
        asObject(params?.rate_limit) ??
        asObject(params?.rateLimit) ??
        null);
}
function summarize_item(item) {
    if (!item)
        return null;
    const type = typeof item.type === 'string' ? item.type : null;
    if (type === 'agentMessage') {
        return typeof item.text === 'string' ? item.text : null;
    }
    if (type === 'commandExecution') {
        return typeof item.command === 'string' ? item.command : 'command execution';
    }
    if (type === 'fileChange') {
        const changes = Array.isArray(item.changes) ? item.changes.length : 0;
        return `file change (${changes} changes)`;
    }
    return typeof item.id === 'string' ? `${type ?? 'item'}:${item.id}` : type;
}
export class CodexAppServerClient {
    config;
    cwd;
    logger;
    on_event;
    env;
    proc = null;
    stdout_buffer = '';
    pending = new Map();
    next_id = 1;
    started = false;
    thread_id = null;
    active_turn = null;
    agent_messages = new Map();
    last_agent_message_id = null;
    constructor(options) {
        this.config = options.config;
        this.cwd = options.cwd;
        this.logger = options.logger;
        this.on_event = options.on_event;
        this.env = options.env ?? process.env;
    }
    async start_session() {
        this.ensure_process();
        try {
            await this.request('initialize', {
                clientInfo: { name: 'symphony', version: '0.1.0' },
                capabilities: {},
            });
            this.notify('initialized', {});
            const thread = await this.request('thread/start', {
                approvalPolicy: this.config.codex.approval_policy,
                sandbox: this.config.codex.thread_sandbox,
                cwd: this.cwd,
            });
            const thread_id = String(asObject(thread.thread)?.id ?? '');
            if (!thread_id) {
                throw new SymphonyError('response_error', 'thread/start response did not include thread.id');
            }
            this.thread_id = thread_id;
            this.started = true;
            return { thread_id, codex_app_server_pid: this.proc?.pid ?? null };
        }
        catch (error) {
            this.emit({
                event: 'startup_failed',
                timestamp: now_iso(),
                codex_app_server_pid: this.proc?.pid ?? null,
                message: to_error_message(error),
            });
            throw error;
        }
    }
    async run_turn(prompt, title) {
        if (!this.started || !this.thread_id) {
            throw new Error('start_session() must be called before run_turn().');
        }
        if (this.active_turn) {
            throw new Error('A turn is already in progress.');
        }
        const turn_result = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.active_turn = null;
                reject(new SymphonyError('turn_timeout', `Turn timed out after ${this.config.codex.turn_timeout_ms}ms`));
            }, this.config.codex.turn_timeout_ms);
            this.active_turn = {
                thread_id: this.thread_id,
                turn_id: null,
                resolve,
                reject,
                timer,
            };
        });
        const started = await this.request('turn/start', {
            threadId: this.thread_id,
            input: [{ type: 'text', text: prompt }],
            cwd: this.cwd,
            title,
            approvalPolicy: this.config.codex.approval_policy,
            sandboxPolicy: this.config.codex.turn_sandbox_policy,
        });
        const turn_id = String(asObject(started.turn)?.id ?? '');
        if (!turn_id) {
            this.reject_active_turn(new SymphonyError('response_error', 'turn/start response did not include turn.id'));
            throw new SymphonyError('response_error', 'turn/start response did not include turn.id');
        }
        this.set_active_turn_id(turn_id);
        this.emit({
            event: 'session_started',
            timestamp: now_iso(),
            codex_app_server_pid: this.proc?.pid ?? null,
            session_id: `${this.thread_id}-${turn_id}`,
            thread_id: this.thread_id,
            turn_id,
        });
        return turn_result;
    }
    async close() {
        for (const [id, pending] of this.pending) {
            if (pending.timer)
                clearTimeout(pending.timer);
            pending.reject(new SymphonyError('port_exit', 'Codex app-server closed before request completed.'));
            this.pending.delete(id);
        }
        if (this.active_turn) {
            clearTimeout(this.active_turn.timer);
            this.active_turn.reject(new SymphonyError('port_exit', 'Codex app-server closed before turn completed.'));
            this.active_turn = null;
        }
        if (this.proc) {
            this.proc.kill('SIGTERM');
            this.proc = null;
        }
    }
    ensure_process() {
        if (this.proc)
            return;
        try {
            this.proc = spawn('bash', ['-lc', this.config.codex.command], {
                cwd: this.cwd,
                env: this.env,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        }
        catch (error) {
            throw new SymphonyError('codex_not_found', `Failed to spawn Codex app-server: ${to_error_message(error)}`, {
                cause: error,
            });
        }
        this.proc.stdout.on('data', (chunk) => {
            this.stdout_buffer += String(chunk);
            if (this.stdout_buffer.length > 10 * 1024 * 1024) {
                this.stdout_buffer = '';
                this.emit({
                    event: 'malformed',
                    timestamp: now_iso(),
                    codex_app_server_pid: this.proc?.pid ?? null,
                    message: 'stdout line exceeded 10MB safety buffer',
                });
                return;
            }
            while (true) {
                const newline = this.stdout_buffer.indexOf('\n');
                if (newline === -1)
                    break;
                const line = this.stdout_buffer.slice(0, newline);
                this.stdout_buffer = this.stdout_buffer.slice(newline + 1);
                this.handle_stdout_line(line);
            }
        });
        this.proc.stderr.on('data', (chunk) => {
            const text = String(chunk).trim();
            if (text) {
                this.logger.debug('codex stderr notification', { stderr: text });
            }
        });
        this.proc.once('exit', (code, signal) => {
            const error = new SymphonyError('port_exit', `Codex app-server exited code=${code ?? 'null'} signal=${signal ?? 'null'}`);
            for (const [id, pending] of this.pending) {
                if (pending.timer)
                    clearTimeout(pending.timer);
                pending.reject(error);
                this.pending.delete(id);
            }
            this.reject_active_turn(error);
            this.proc = null;
        });
    }
    handle_stdout_line(line) {
        if (line.trim() === '')
            return;
        let message;
        try {
            message = JSON.parse(line);
        }
        catch {
            this.emit({
                event: 'malformed',
                timestamp: now_iso(),
                codex_app_server_pid: this.proc?.pid ?? null,
                message: line,
            });
            return;
        }
        const id = typeof message.id === 'number' ? message.id : null;
        if (id !== null && message.method === undefined && (message.result !== undefined || message.error !== undefined)) {
            const pending = this.pending.get(id);
            if (!pending)
                return;
            if (pending.timer)
                clearTimeout(pending.timer);
            this.pending.delete(id);
            if (message.error !== undefined) {
                pending.reject(new SymphonyError('response_error', `App-server responded with error for request ${id}`));
            }
            else {
                pending.resolve(asObject(message.result) ?? {});
            }
            return;
        }
        void this.handle_server_message(message);
    }
    async handle_server_message(message) {
        const method = typeof message.method === 'string' ? message.method : '';
        const params = asObject(message.params);
        const usage = extract_usage(message);
        const rate_limits = extract_rate_limits(message);
        const base = {
            timestamp: now_iso(),
            codex_app_server_pid: this.proc?.pid ?? null,
            raw: message,
            usage,
            rate_limits,
        };
        if (typeof message.id === 'number' && method.endsWith('requestApproval')) {
            const deny = this.config.codex.approval_policy === 'never';
            this.respond(message.id, { decision: deny ? 'decline' : 'acceptForSession' });
            this.emit({
                ...base,
                event: deny ? 'approval_declined' : 'approval_auto_approved',
                message: method,
            });
            return;
        }
        if (method.includes('requestUserInput') || method.includes('inputRequired')) {
            if (typeof message.id === 'number') {
                this.respond(message.id, { error: 'turn_input_required' });
            }
            const error = new SymphonyError('turn_input_required', 'Codex requested user input during an unattended run.');
            this.emit({
                ...base,
                event: 'turn_input_required',
                message: method,
            });
            this.reject_active_turn(error);
            return;
        }
        if (typeof message.id === 'number' && (method === 'item/tool/call' || method.endsWith('/tool/call'))) {
            this.respond(message.id, { success: false, error: 'unsupported_tool_call' });
            this.emit({
                ...base,
                event: 'unsupported_tool_call',
                message: method,
            });
            return;
        }
        if (method === 'item/started') {
            const item = asObject(params?.item);
            if (item) {
                const item_id = typeof item.id === 'string' ? item.id : null;
                if (typeof item_id === 'string' && item.type === 'agentMessage') {
                    this.last_agent_message_id = item_id;
                    this.agent_messages.set(item_id, typeof item.text === 'string' ? item.text : '');
                }
            }
            this.emit({
                ...base,
                event: 'notification',
                message: summarize_item(item),
            });
            return;
        }
        if (method === 'item/agentMessage/delta') {
            const item_id = typeof params?.itemId === 'string' ? params.itemId : null;
            const delta = typeof params?.delta === 'string' ? params.delta : '';
            if (item_id) {
                this.last_agent_message_id = item_id;
                this.agent_messages.set(item_id, `${this.agent_messages.get(item_id) ?? ''}${delta}`);
            }
            this.emit({
                ...base,
                event: 'notification',
                message: delta || null,
            });
            return;
        }
        if (method === 'item/completed') {
            const item = asObject(params?.item);
            const item_id = typeof item?.id === 'string' ? item.id : null;
            if (item_id && item?.type === 'agentMessage') {
                this.last_agent_message_id = item_id;
                this.agent_messages.set(item_id, typeof item.text === 'string' ? item.text : this.agent_messages.get(item_id) ?? '');
            }
            this.emit({
                ...base,
                event: 'notification',
                message: summarize_item(item),
            });
            return;
        }
        if (method === 'turn/completed') {
            const turn = asObject(params?.turn);
            const turn_id = String(turn?.id ?? this.active_turn?.turn_id ?? '');
            const final_text = (this.last_agent_message_id ? this.agent_messages.get(this.last_agent_message_id) : null) ??
                [...this.agent_messages.values()].join('');
            if (this.active_turn) {
                const active = this.active_turn;
                clearTimeout(active.timer);
                this.active_turn = null;
                active.resolve({
                    thread_id: active.thread_id,
                    turn_id: turn_id || active.turn_id || '',
                    status: 'completed',
                    text: final_text.trim(),
                });
            }
            this.emit({
                ...base,
                event: 'turn_completed',
                session_id: this.thread_id && turn_id ? `${this.thread_id}-${turn_id}` : null,
                thread_id: this.thread_id,
                turn_id: turn_id || null,
                message: final_text.trim() || null,
            });
            return;
        }
        if (method === 'turn/failed') {
            const error = new SymphonyError('turn_failed', 'Codex turn failed.');
            this.emit({
                ...base,
                event: 'turn_failed',
                message: method,
            });
            this.reject_active_turn(error);
            return;
        }
        if (method === 'turn/cancelled') {
            const error = new SymphonyError('turn_cancelled', 'Codex turn was cancelled.');
            this.emit({
                ...base,
                event: 'turn_cancelled',
                message: method,
            });
            this.reject_active_turn(error);
            return;
        }
        this.emit({
            ...base,
            event: 'other_message',
            message: method || null,
        });
    }
    reject_active_turn(error) {
        if (!this.active_turn)
            return;
        clearTimeout(this.active_turn.timer);
        const active = this.active_turn;
        this.active_turn = null;
        active.reject(error);
    }
    set_active_turn_id(turn_id) {
        if (!this.active_turn)
            return;
        this.active_turn = {
            ...this.active_turn,
            turn_id,
        };
    }
    emit(event) {
        this.on_event?.(event);
    }
    notify(method, params) {
        this.proc?.stdin.write(`${JSON.stringify({ method, params })}\n`);
    }
    respond(id, result) {
        this.proc?.stdin.write(`${JSON.stringify({ id, result })}\n`);
    }
    async request(method, params) {
        const id = this.next_id++;
        const payload = `${JSON.stringify({ id, method, params })}\n`;
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new SymphonyError('response_timeout', `Timed out waiting for ${method} response.`));
            }, this.config.codex.read_timeout_ms);
            this.pending.set(id, { resolve, reject, timer });
            this.proc?.stdin.write(payload, (error) => {
                if (error) {
                    clearTimeout(timer);
                    this.pending.delete(id);
                    reject(new SymphonyError('response_error', `Failed to write ${method} request: ${error.message}`, { cause: error }));
                }
            });
        });
    }
}
//# sourceMappingURL=codex-client.js.map
