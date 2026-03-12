import { readFile, stat, watch } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { SymphonyError, isSymphonyError } from './errors.js';
import type { Logger, ServiceConfig, WorkflowDefinition } from './types.js';
import { resolve_service_config, validate_dispatch_config } from './config.js';

function splitFrontMatter(source: string): { frontMatter: string | null; body: string } {
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

export async function load_workflow_definition(workflow_path?: string, cwd: string = process.cwd()): Promise<WorkflowDefinition> {
  const resolved_path = resolve(cwd, workflow_path ?? 'WORKFLOW.md');
  if (!existsSync(resolved_path)) {
    throw new SymphonyError('missing_workflow_file', `Workflow file not found: ${resolved_path}`);
  }

  const raw = await readFile(resolved_path, 'utf8');
  const { frontMatter, body } = splitFrontMatter(raw);

  let config: Record<string, unknown> = {};
  if (frontMatter !== null) {
    try {
      const parsed = YAML.parse(frontMatter);
      if (parsed === null) {
        config = {};
      } else if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        config = parsed as Record<string, unknown>;
      } else {
        throw new SymphonyError('workflow_front_matter_not_a_map', 'Workflow front matter must decode to a map.');
      }
    } catch (error) {
      if (isSymphonyError(error)) {
        throw error;
      }
      throw new SymphonyError('workflow_parse_error', `Failed to parse workflow front matter: ${(error as Error).message}`, {
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

export interface WorkflowManagerOptions {
  workflow_path?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  logger: Logger;
}

export class WorkflowManager {
  private readonly workflow_path?: string;
  private readonly cwd: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly logger: Logger;
  private current_definition: WorkflowDefinition | null = null;
  private current_config: ServiceConfig | null = null;
  private current_mtime_ms = 0;
  private watcher_abort: AbortController | null = null;
  private reload_listeners = new Set<(workflow: { definition: WorkflowDefinition; config: ServiceConfig }) => void>();

  constructor(options: WorkflowManagerOptions) {
    this.workflow_path = options.workflow_path;
    this.cwd = options.cwd ?? process.cwd();
    this.env = options.env ?? process.env;
    this.logger = options.logger;
  }

  async initialize(): Promise<{ definition: WorkflowDefinition; config: ServiceConfig }> {
    const definition = await load_workflow_definition(this.workflow_path, this.cwd);
    const config = resolve_service_config(definition, this.cwd, this.env);
    validate_dispatch_config(config);
    const info = await stat(definition.path);
    this.current_definition = definition;
    this.current_config = config;
    this.current_mtime_ms = info.mtimeMs;
    return { definition, config };
  }

  get_current(): { definition: WorkflowDefinition; config: ServiceConfig } {
    if (!this.current_definition || !this.current_config) {
      throw new Error('WorkflowManager has not been initialized.');
    }
    return { definition: this.current_definition, config: this.current_config };
  }

  async reload_if_changed(): Promise<boolean> {
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

  async reload_now(): Promise<void> {
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

  on_reload(listener: (workflow: { definition: WorkflowDefinition; config: ServiceConfig }) => void): () => void {
    this.reload_listeners.add(listener);
    return () => {
      this.reload_listeners.delete(listener);
    };
  }

  start_watching(): void {
    const current = this.get_current();
    this.watcher_abort = new AbortController();
    const signal = this.watcher_abort.signal;

    void (async () => {
      try {
        for await (const _event of watch(current.definition.path, { signal })) {
          try {
            await this.reload_now();
            this.logger.info('workflow reloaded completed', { workflow_path: current.definition.path });
          } catch (error) {
            const last = this.current_definition?.path ?? current.definition.path;
            this.logger.error('workflow reload failed', {
              workflow_path: last,
              error: (error as Error).message,
            });
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        this.logger.warn('workflow watch failed', { error: (error as Error).message });
      }
    })();
  }

  stop_watching(): void {
    this.watcher_abort?.abort();
    this.watcher_abort = null;
  }
}
