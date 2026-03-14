import { readFile, stat, watch } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { SymphonyError, isSymphonyError } from './errors.js';
import { resolve_service_config, validate_dispatch_config } from './config.js';
function splitFrontMatter(source) {
    if (!source.startsWith('---')) {
        return { frontMatter: null, body: source };
    }
    const end = source.indexOf('\n---', 3);
    if (end === -1) {
        return { frontMatter: null, body: source };
    }
    const frontMatter = source.slice(4, end).trim();
    const bodyStart = source.indexOf('\n', end + 4);
    const body = bodyStart === -1 ? '' : source.slice(bodyStart + 1);
    return { frontMatter, body };
}
export async function load_workflow_definition(workflow_path, cwd = process.cwd()) {
    const resolved_path = resolve(cwd, workflow_path ?? 'WORKFLOW.md');
    if (!existsSync(resolved_path)) {
        throw new SymphonyError('missing_workflow_file', `Workflow file not found: ${resolved_path}`);
    }
    const raw = await readFile(resolved_path, 'utf8');
    const { frontMatter, body } = splitFrontMatter(raw);
    let config = {};
    if (frontMatter !== null) {
        try {
            const parsed = YAML.parse(frontMatter);
            if (parsed === null) {
                config = {};
            }
            else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
                config = parsed;
            }
            else {
                throw new SymphonyError('workflow_front_matter_not_a_map', 'Workflow front matter must decode to a map.');
            }
        }
        catch (error) {
            if (isSymphonyError(error)) {
                throw error;
            }
            throw new SymphonyError('workflow_parse_error', `Failed to parse workflow front matter: ${error.message}`, {
                cause: error,
            });
        }
    }
    return {
        path: resolved_path,
        config,
        prompt_template: body.trim(),
    };
}
export class WorkflowManager {
    workflow_path;
    cwd;
    env;
    logger;
    current_definition = null;
    current_config = null;
    current_mtime_ms = 0;
    watcher_abort = null;
    reload_listeners = new Set();
    constructor(options) {
        this.workflow_path = options.workflow_path;
        this.cwd = options.cwd ?? process.cwd();
        this.env = options.env ?? process.env;
        this.logger = options.logger;
    }
    async initialize() {
        const definition = await load_workflow_definition(this.workflow_path, this.cwd);
        const config = resolve_service_config(definition, this.cwd, this.env);
        validate_dispatch_config(config);
        const info = await stat(definition.path);
        this.current_definition = definition;
        this.current_config = config;
        this.current_mtime_ms = info.mtimeMs;
        return { definition, config };
    }
    get_current() {
        if (!this.current_definition || !this.current_config) {
            throw new Error('WorkflowManager has not been initialized.');
        }
        return { definition: this.current_definition, config: this.current_config };
    }
    async reload_if_changed() {
        if (!this.current_definition) {
            await this.initialize();
            return true;
        }
        const info = await stat(this.current_definition.path);
        if (info.mtimeMs <= this.current_mtime_ms) {
            return false;
        }
        await this.reload_now();
        return true;
    }
    async reload_now() {
        const next = await load_workflow_definition(this.workflow_path, this.cwd);
        const config = resolve_service_config(next, this.cwd, this.env);
        validate_dispatch_config(config);
        const info = await stat(next.path);
        this.current_definition = next;
        this.current_config = config;
        this.current_mtime_ms = info.mtimeMs;
        for (const listener of this.reload_listeners) {
            listener({ definition: next, config });
        }
    }
    on_reload(listener) {
        this.reload_listeners.add(listener);
        return () => {
            this.reload_listeners.delete(listener);
        };
    }
    start_watching() {
        const current = this.get_current();
        this.watcher_abort = new AbortController();
        const signal = this.watcher_abort.signal;
        void (async () => {
            try {
                for await (const _event of watch(current.definition.path, { signal })) {
                    try {
                        await this.reload_now();
                        this.logger.info('workflow reloaded completed', { workflow_path: current.definition.path });
                    }
                    catch (error) {
                        const last = this.current_definition?.path ?? current.definition.path;
                        this.logger.error('workflow reload failed', {
                            workflow_path: last,
                            error: error.message,
                        });
                    }
                }
            }
            catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }
                this.logger.warn('workflow watch failed', { error: error.message });
            }
        })();
    }
    stop_watching() {
        this.watcher_abort?.abort();
        this.watcher_abort = null;
    }
}
//# sourceMappingURL=workflow.js.map