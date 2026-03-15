import { SymphonyError } from '../errors.js';
function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function asString(value) {
    return typeof value === 'string' ? value : null;
}
function normalize_state(value) {
    return value.trim().toLowerCase();
}
function normalize_timestamp(value) {
    if (typeof value !== 'string')
        return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}
function normalize_priority(value) {
    const normalized = typeof value === 'string' ? normalize_state(value) : '';
    if (normalized === 'critical')
        return 1;
    if (normalized === 'high')
        return 2;
    if (normalized === 'normal')
        return 3;
    if (normalized === 'low')
        return 4;
    return null;
}
function normalize_loom_status(value) {
    const normalized = normalize_state(value);
    if (normalized === 'todo')
        return 'ready';
    if (normalized === 'in progress')
        return 'claimed';
    if (normalized === 'closed')
        return 'done';
    if (normalized === 'canceled')
        return 'cancelled';
    return normalized;
}
function dedupe(values) {
    return [...new Set(values.filter(Boolean))];
}
function tool_result_text(result) {
    const text = result?.content?.find((entry) => typeof entry?.text === 'string')?.text;
    return typeof text === 'string' ? text : null;
}
function parse_tool_payload(payload, tool_name) {
    const result = asObject(payload?.result);
    if (!result) {
        throw new SymphonyError('loom_unknown_payload', `Loom ${tool_name} response missing result payload.`);
    }
    if (result.isError === true) {
        throw new SymphonyError('loom_tool_error', tool_result_text(result) ?? `${tool_name} returned an error result.`);
    }
    if (result.structuredContent && typeof result.structuredContent === 'object') {
        return result.structuredContent;
    }
    const text = tool_result_text(result);
    if (!text) {
        return {};
    }
    try {
        return JSON.parse(text);
    }
    catch (error) {
        throw new SymphonyError('loom_unknown_payload', `Loom ${tool_name} returned non-JSON content: ${error.message}`, {
            cause: error,
        });
    }
}
function task_labels(task) {
    return dedupe((Array.isArray(task.labels) ? task.labels : [])
        .filter((entry) => typeof entry === 'string')
        .map((entry) => entry.trim().toLowerCase()));
}
function blocker_refs(task) {
    return (Array.isArray(task.dependencies) ? task.dependencies : [])
        .filter((entry) => entry && typeof entry.depends_on === 'string')
        .map((entry) => ({
        id: entry.depends_on,
        identifier: entry.depends_on,
        state: null,
    }));
}
function normalize_task(task) {
    return {
        id: String(task.id ?? ''),
        identifier: String(task.id ?? task.identifier ?? ''),
        title: String(task.title ?? ''),
        description: typeof task.description === 'string' ? task.description : null,
        priority: normalize_priority(task.priority),
        state: String(task.status ?? ''),
        branch_name: null,
        url: null,
        labels: task_labels(task),
        blocked_by: blocker_refs(task),
        created_at: normalize_timestamp(task.created_at),
        updated_at: normalize_timestamp(task.updated_at),
    };
}
export class LoomTrackerClient {
    config;
    logger;
    fetch_impl;
    constructor(config, logger, fetch_impl = fetch) {
        this.config = config;
        this.logger = logger;
        this.fetch_impl = fetch_impl;
    }
    repo_filter() {
        return (this.config.tracker.repo ?? this.config.tracker.project_slug) || null;
    }
    required_labels() {
        const labels = [];
        if (this.config.tracker.label) {
            labels.push(this.config.tracker.label);
        }
        labels.push(...this.config.tracker.labels);
        return dedupe(labels.map((entry) => entry.trim().toLowerCase()));
    }
    matches_required_labels(task) {
        const required = this.required_labels();
        if (required.length === 0) {
            return true;
        }
        const available = new Set(task_labels(task));
        return required.every((entry) => available.has(entry));
    }
    matches_agent(task) {
        const agent = asString(task.agent);
        if (normalize_loom_status(asString(task.status) ?? '') !== 'claimed') {
            return true;
        }
        return agent === this.config.tracker.agent_id;
    }
    list_arguments(state) {
        const args = {
            status: normalize_loom_status(state),
        };
        const repo = this.repo_filter();
        if (repo) {
            args.repo = repo;
        }
        const required = this.required_labels();
        if (required.length > 0) {
            args.label = required[0];
        }
        return args;
    }
    async fetch_candidate_issues() {
        const issues = await this.fetch_issues_by_states(this.config.tracker.active_states);
        return issues.filter((issue) => this.config.tracker.active_states
            .map((entry) => normalize_loom_status(entry))
            .includes(normalize_loom_status(issue.state)));
    }
    async fetch_issues_by_states(states) {
        if (states.length === 0) {
            return [];
        }
        const seen = new Map();
        for (const state of dedupe(states.map((entry) => normalize_loom_status(entry)))) {
            const payload = await this.call_tool('loom_list', this.list_arguments(state));
            const items = Array.isArray(payload.items) ? payload.items : [];
            for (const task of items) {
                if (!this.matches_required_labels(task) || !this.matches_agent(task)) {
                    continue;
                }
                const issue = normalize_task(task);
                if (!issue.id) {
                    continue;
                }
                seen.set(issue.id, issue);
            }
        }
        return [...seen.values()];
    }
    async fetch_issue_states_by_ids(issue_ids) {
        const issues = await Promise.all(issue_ids.map(async (issue_id) => {
            const payload = await this.call_tool('loom_get', { task_id: issue_id });
            if (!payload?.id) {
                return null;
            }
            return normalize_task(payload);
        }));
        return issues.filter((issue) => issue !== null);
    }
    async claim_issue(issue) {
        await this.call_tool('loom_claim', {
            task_id: issue.id,
            agent: this.config.tracker.agent_id,
        });
        const refreshed = await this.fetch_issue_states_by_ids([issue.id]);
        return refreshed[0] ?? {
            ...issue,
            state: 'claimed',
        };
    }
    async complete_issue(issue, outcome) {
        const message = typeof outcome.message === 'string' ? outcome.message.trim() : '';
        await this.call_tool('loom_complete', {
            task_id: issue.id,
            evidence: message || `Completed by ${this.config.tracker.agent_id} after ${outcome.turn_count} turn(s).`,
        });
        const refreshed = await this.fetch_issue_states_by_ids([issue.id]);
        return refreshed[0] ?? null;
    }
    async release_issue(issue, reason) {
        try {
            await this.call_tool('loom_release', { task_id: issue.id });
        }
        catch (error) {
            this.logger.warn('loom release failed', {
                issue_id: issue.id,
                issue_identifier: issue.identifier,
                reason,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    async call_tool(name, args) {
        let response;
        try {
            response = await this.fetch_impl(this.config.tracker.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json, text/event-stream',
                    Authorization: `Bearer ${this.config.tracker.api_key}`,
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: `${name}-${Date.now()}`,
                    method: 'tools/call',
                    params: {
                        name,
                        arguments: args ?? {},
                    },
                }),
                signal: AbortSignal.timeout(this.config.tracker.network_timeout_ms),
            });
        }
        catch (error) {
            throw new SymphonyError('loom_api_request', `Loom request failed: ${error.message}`, {
                cause: error,
            });
        }
        const text = await response.text();
        if (!response.ok) {
            throw new SymphonyError('loom_api_status', `Loom request failed with status ${response.status}: ${text}`, {
                details: { status: response.status },
            });
        }
        let payload;
        try {
            payload = JSON.parse(text);
        }
        catch (error) {
            throw new SymphonyError('loom_unknown_payload', `Loom response JSON parse failed: ${error.message}`, {
                cause: error,
            });
        }
        return parse_tool_payload(payload, name);
    }
}
//# sourceMappingURL=loom.js.map
