import { CodexAppServerClient } from './codex-client.js';
import { render_prompt_template } from './template.js';
import type { CodexEvent, Issue, Logger, ServiceConfig, TrackerClient, WorkerRun, WorkerRunResult } from './types.js';
import { WorkspaceManager } from './workspace.js';

function normalize_state(state: string): string {
  return state.trim().toLowerCase();
}

function is_active_state(state: string, config: ServiceConfig): boolean {
  const normalized = normalize_state(state);
  return config.tracker.active_states.some((entry) => normalize_state(entry) === normalized);
}

function continuation_prompt(issue: Issue, attempt: number | null, turn_number: number, max_turns: number): string {
  return [
    `Continue working on ${issue.identifier}: ${issue.title}.`,
    `The issue is still active in state "${issue.state}".`,
    `This is continuation turn ${turn_number} of ${max_turns}.`,
    `Attempt: ${attempt ?? 'initial'}.`,
    'Do not restate the original task prompt. Continue from the existing thread history.',
  ].join('\n');
}

export function create_agent_worker_run(
  issue: Issue,
  attempt: number | null,
  prompt_template: string,
  config: ServiceConfig,
  tracker: TrackerClient,
  workspace_manager: WorkspaceManager,
  logger: Logger,
  on_event: (event: CodexEvent) => void
): WorkerRun {
  let stopped = false;
  let stop_reason = 'cancelled';
  let client: CodexAppServerClient | null = null;

  const promise = (async (): Promise<WorkerRunResult> => {
    let workspace = null;
    let current_issue = issue;
    let turn_count = 0;

    try {
      workspace = await workspace_manager.ensure_workspace(issue.identifier);
      await workspace_manager.run_before_run(workspace);

      client = new CodexAppServerClient({
        config,
        cwd: workspace.path,
        logger,
        on_event,
      });

      await client.start_session();

      while (true) {
        if (stopped) {
          return {
            status: 'cancelled',
            error: stop_reason,
            turn_count,
            issue: current_issue,
          };
        }

        const prompt =
          turn_count === 0
            ? await render_prompt_template(prompt_template, { issue: current_issue, attempt })
            : continuation_prompt(current_issue, attempt, turn_count + 1, config.agent.max_turns);

        await client.run_turn(prompt, `${current_issue.identifier}: ${current_issue.title}`);
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
      };
    } catch (error) {
      if (stopped) {
        return {
          status: 'cancelled',
          error: stop_reason,
          turn_count,
          issue: current_issue,
        };
      }
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        turn_count,
        issue: current_issue,
      };
    } finally {
      await client?.close();
      if (workspace) {
        await workspace_manager.run_after_run(workspace);
      }
    }
  })();

  return {
    promise,
    async terminate(reason: string): Promise<void> {
      stopped = true;
      stop_reason = reason;
      await client?.close();
    },
  };
}
