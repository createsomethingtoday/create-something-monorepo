import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  analytics,
  blockTask,
  cancelTask,
  claimTask,
  compactTasks,
  completeTask,
  createCheckpoint,
  createTask,
  endSession,
  getAgentProfiles,
  getDoctorIssues,
  getDispatchConfig,
  getModelsConfig,
  getNotionConfig,
  getRuntimeSettings,
  getSession,
  getSummary,
  getTask,
  getTaskDependencies,
  insertExecution,
  listCheckpoints,
  listRecoverableSessions,
  listTasks,
  markTaskBlockedIfNeeded,
  parseLabelsForTask,
  releaseTask,
  repositoryIds,
  resumeSession,
  sessionResumeBrief,
  setNotionConfig,
  setTaskIssueType,
  setTaskPriority,
  startSession,
  storePreference,
  unblockTask,
  updateSessionContext,
} from './db.js';
import type { Env, LoomPriority } from './types.js';
import { getBuiltInFormula, listBuiltInFormulas } from './formulas.js';
import { createDatabase, notionStatus, syncTasksToNotion } from './notion.js';
import { agentViews, buildRoutingState, chooseAgent } from './runtime-routing.js';
import {
  ageWeight,
  errorToolResult,
  generateSessionId,
  generateTaskId,
  issueTypeWeight,
  normalizeIssueType,
  normalizePriority,
  normalizeSessionStatus,
  nowIso,
  parseJsonObject,
  priorityWeight,
  textToolResult,
  toCheckpointView,
  toTaskView,
} from './utils.js';

function calculateProgress(summary: { total: number; done: number }): number {
  if (summary.total === 0) return 0;
  return Number(((summary.done / summary.total) * 100).toFixed(2));
}

function validateStatus(value: string | null | undefined): 'ready' | 'claimed' | 'blocked' | 'done' | 'cancelled' {
  if (!value) return 'ready';
  if (value === 'ready' || value === 'claimed' || value === 'blocked' || value === 'done' || value === 'cancelled') {
    return value;
  }
  throw new Error(`Unknown status: ${value}`);
}

export function registerLoomTools(server: McpServer, env: Env): void {
  const db = env.DB;

  async function currentRepoId(): Promise<string | null> {
    if (typeof env.LOOM_REPO_ID === 'string' && env.LOOM_REPO_ID.trim().length > 0) {
      return env.LOOM_REPO_ID.trim();
    }
    const settings = await getRuntimeSettings(db);
    return typeof settings.repoId === 'string' && settings.repoId.length > 0 ? settings.repoId : null;
  }

  async function routingState() {
    const [profiles, dispatchConfig, modelsConfig] = await Promise.all([
      getAgentProfiles(db),
      getDispatchConfig(db),
      getModelsConfig(db),
    ]);
    return buildRoutingState(profiles, dispatchConfig, modelsConfig);
  }

  server.tool(
    'loom_work',
    'Start working on something (creates and claims task atomically). Use this for single-agent work to avoid ceremony.',
    {
      title: z.string().min(1),
      agent: z.string().min(1),
      priority: z.enum(['critical', 'high', 'normal', 'low']).optional(),
      labels: z.array(z.string()).optional(),
    },
    async ({ title, agent, priority, labels }) => {
      try {
        const taskId = generateTaskId();
        const repoId = await currentRepoId();
        await createTask(db, {
          id: taskId,
          title,
          priority,
          labels,
          repo: repoId,
          status: 'ready',
        });
        const claimed = await claimTask(db, taskId, agent);
        return textToolResult({
          task_id: claimed.id,
          status: claimed.status,
          agent,
          priority: claimed.priority,
          message: 'Task created and claimed. Start working.',
        });
      } catch (error) {
        return errorToolResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.tool(
    'loom_create',
    'Create a new task in Loom (for multi-agent coordination - use loom_work for solo work)',
    {
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(['critical', 'high', 'normal', 'low']).optional(),
      labels: z.array(z.string()).optional(),
      parent: z.string().optional(),
    },
    async ({ title, description, priority, labels, parent }) => {
      try {
        const repoId = await currentRepoId();
        const task = await createTask(db, {
          id: generateTaskId(),
          title,
          description,
          priority,
          labels,
          parent,
          repo: repoId,
          status: 'ready',
        });
        return textToolResult({
          id: task.id,
          title: task.title,
          priority: task.priority,
          status: task.status,
        });
      } catch (error) {
        return errorToolResult(error instanceof Error ? error.message : String(error));
      }
    },
  );

  server.tool('loom_claim', 'Claim a task for this agent to work on', {
    task_id: z.string().min(1),
    agent: z.string().min(1),
  }, async ({ task_id, agent }) => {
    try {
      const task = await claimTask(db, task_id, agent);
      return textToolResult({ id: task.id, agent: task.agent, status: task.status });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_release', 'Release a claimed task back to ready status', {
    task_id: z.string().min(1),
  }, async ({ task_id }) => {
    try {
      await releaseTask(db, task_id);
      return textToolResult({ released: task_id });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_complete', 'Mark a task as complete with optional evidence. Auto-unblocks dependent tasks.', {
    task_id: z.string().min(1),
    evidence: z.string().optional(),
    cost_usd: z.number().optional(),
  }, async ({ task_id, evidence, cost_usd }) => {
    try {
      const result = await completeTask(db, task_id, { evidence: evidence ?? null, costUsd: cost_usd ?? null });
      return textToolResult({ completed: task_id, evidence: evidence ?? null, cost_usd: cost_usd ?? null, unblocked: result.unblocked });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_cancel', 'Cancel a task', {
    task_id: z.string().min(1),
  }, async ({ task_id }) => {
    try {
      await cancelTask(db, task_id);
      return textToolResult({ cancelled: task_id });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_spawn', 'Create a sub-task under a parent task', {
    parent_id: z.string().min(1),
    title: z.string().min(1),
  }, async ({ parent_id, title }) => {
    try {
      const parent = await getTask(db, parent_id);
      if (!parent) return errorToolResult(`Parent task not found: ${parent_id}`);
      const task = await createTask(db, {
        id: generateTaskId(),
        title,
        parent: parent_id,
        repo: parent.repo,
      });

      await db
        .prepare('INSERT OR IGNORE INTO dependencies (task_id, depends_on, dep_type, created_at) VALUES (?1, ?2, ?3, ?4)')
        .bind(task.id, parent_id, 'parent-child', nowIso())
        .run();

      return textToolResult({ id: task.id, title: task.title, parent: task.parent });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_ready', 'Get all tasks ready to work on', {}, async () => {
    try {
      const tasks = await listTasks(db, { status: 'ready' });
      return textToolResult({
        items: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          labels: JSON.parse(task.labels_json || '[]'),
        })),
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_mine', 'Get tasks claimed by a specific agent', {
    agent: z.string().min(1),
  }, async ({ agent }) => {
    try {
      const tasks = await db
        .prepare(
          `SELECT id, title, description, status, priority, issue_type, agent, labels_json, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at
           FROM tasks
           WHERE agent = ?1
           ORDER BY updated_at DESC`,
        )
        .bind(agent)
        .all();

      return textToolResult({
        items: (tasks.results ?? []).map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status,
        })),
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_blocked', 'Get all blocked tasks', {}, async () => {
    try {
      const tasks = await listTasks(db, { status: 'blocked' });
      return textToolResult({
        items: tasks.map((task) => ({ id: task.id, title: task.title })),
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_get', 'Get a task by ID', {
    task_id: z.string().min(1),
  }, async ({ task_id }) => {
    try {
      const task = await getTask(db, task_id);
      if (!task) return textToolResult({ error: 'Task not found' });
      const deps = await getTaskDependencies(db, task_id);
      return textToolResult({
        ...toTaskView(task),
        dependencies: deps.map((dep) => ({ depends_on: dep.depends_on, type: dep.dep_type })),
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_list', 'List tasks with optional filtering', {
    status: z.enum(['ready', 'claimed', 'blocked', 'done', 'cancelled']).optional(),
    label: z.string().optional(),
    repo: z.string().optional(),
  }, async ({ status, label, repo }) => {
    try {
      const tasks = await listTasks(db, { status, label, repo });
      return textToolResult({ items: tasks.map(toTaskView) });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_summary', 'Get a summary of work status (optionally filtered by label)', {
    label: z.string().optional(),
  }, async ({ label }) => {
    try {
      const summary = await getSummary(db, label);
      return textToolResult({
        total: summary.total,
        ready: summary.ready,
        claimed: summary.claimed,
        blocked: summary.blocked,
        done: summary.done,
        cancelled: summary.cancelled,
        total_cost_usd: Number(summary.total_cost_usd.toFixed(2)),
        progress_pct: calculateProgress(summary),
        label: label ?? null,
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_block', 'Add a dependency (task is blocked by another)', {
    task_id: z.string().min(1),
    blocked_by: z.string().min(1),
  }, async ({ task_id, blocked_by }) => {
    try {
      await blockTask(db, task_id, blocked_by);
      return textToolResult({ blocked: task_id, by: blocked_by });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_unblock', 'Remove a dependency', {
    task_id: z.string().min(1),
    blocked_by: z.string().min(1),
  }, async ({ task_id, blocked_by }) => {
    try {
      await unblockTask(db, task_id, blocked_by);
      return textToolResult({ unblocked: task_id, from: blocked_by });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_route', 'Get routing recommendation for a task (which agent should work on it)', {
    task_id: z.string().min(1),
    strategy: z.enum(['best', 'cheapest', 'fastest']).optional(),
    max_cost: z.number().optional(),
  }, async ({ task_id, strategy, max_cost }) => {
    try {
      const task = await getTask(db, task_id);
      if (!task) return errorToolResult('Task not found');
      const decision = chooseAgent(task, strategy ?? 'best', max_cost, await routingState());
      return textToolResult(decision as unknown as Record<string, unknown>);
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_agents', 'List all available agents and their capabilities', {}, async () => {
    try {
      return textToolResult({
        items: agentViews(await routingState()),
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_session_start', 'Start a work session for a task', {
    task_id: z.string().min(1),
    agent: z.string().min(1),
  }, async ({ task_id, agent }) => {
    try {
      const session = await startSession(db, {
        sessionId: generateSessionId(),
        taskId: task_id,
        agent,
      });
      return textToolResult({
        session_id: session.id,
        task_id: session.task_id,
        agent: session.agent_id,
        status: session.status,
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_session_end', 'End a work session', {
    session_id: z.string().min(1),
    status: z.enum(['completed', 'failed', 'cancelled']).optional(),
  }, async ({ session_id, status }) => {
    try {
      const targetStatus = normalizeSessionStatus(status ?? 'completed');
      await endSession(db, session_id, targetStatus);
      return textToolResult({ session_id, status: targetStatus });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_checkpoint', 'Create a checkpoint (save progress for crash recovery)', {
    session_id: z.string().min(1),
    summary: z.string().min(1),
  }, async ({ session_id, summary }) => {
    try {
      const checkpoint = await createCheckpoint(db, session_id, summary, null);
      return textToolResult(toCheckpointView(checkpoint));
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_recover', 'List sessions that can be recovered after a crash', {}, async () => {
    try {
      const sessions = await listRecoverableSessions(db);
      return textToolResult({
        items: sessions.map((session) => ({
          session_id: session.id,
          agent: session.agent_id,
          task_id: session.task_id,
          last_checkpoint: session.last_checkpoint,
        })),
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_resume', 'Resume an interrupted session', {
    session_id: z.string().min(1),
  }, async ({ session_id }) => {
    try {
      const session = await resumeSession(db, session_id);
      return textToolResult({
        session_id: session.id,
        task_id: session.task_id,
        agent: session.agent_id,
        restored_checkpoint: session.last_checkpoint,
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_formulas', 'List available workflow formulas', {}, async () => {
    const items = listBuiltInFormulas().map((formula) => ({
      name: formula.name,
      description: formula.description,
      quality: formula.quality,
      agent: formula.agent,
      labels: formula.labels,
      estimated_tokens: formula.estimated_tokens,
    }));
    return textToolResult({ items });
  });

  server.tool('loom_formula', 'Get details of a specific formula', {
    name: z.string().min(1),
  }, async ({ name }) => {
    const formula = getBuiltInFormula(name);
    if (!formula) {
      return errorToolResult(`Formula not found: ${name}`);
    }
    return textToolResult(formula as unknown as Record<string, unknown>);
  });

  server.tool('loom_record_execution', 'Record task execution result for learning (improves future routing)', {
    agent_id: z.string().min(1),
    task_id: z.string().min(1),
    task_type: z.string().optional(),
    success: z.boolean(),
    duration_secs: z.number().positive(),
  }, async ({ agent_id, task_id, task_type, success, duration_secs }) => {
    try {
      await insertExecution(db, {
        agentId: agent_id,
        taskId: task_id,
        taskType: task_type,
        success,
        durationSecs: duration_secs,
      });
      return textToolResult({ recorded: true, agent_id, task_id, success });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_repos', 'List configured repositories (for multi-repo coordination between projects)', {}, async () => {
    try {
      const reposInDb = await repositoryIds(db);
      const settings = await getRuntimeSettings(db);
      const currentRepo = await currentRepoId();
      return textToolResult({
        current_repo: currentRepo,
        configured: currentRepo
          ? [{
              id: currentRepo,
              name: typeof settings.repoName === 'string' && settings.repoName.length > 0 ? settings.repoName : currentRepo,
              path: typeof settings?.source === 'object' && settings.source && typeof settings.source.repoPath === 'string' ? settings.source.repoPath : null,
              is_primary: true,
              available: true,
            }]
          : [],
        repos_in_database: reposInDb,
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_list_all', 'List tasks from ALL configured repositories (primary + additional). Use for unified views across projects.', {
    status: z.enum(['ready', 'claimed', 'blocked', 'done', 'cancelled']).optional(),
  }, async ({ status }) => {
    try {
      const tasks = await listTasks(db, { status });
      return textToolResult({ items: tasks.map(toTaskView) });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_backfill', 'Import historical work from Git commits and Beads issues. Creates tasks and execution records for analytics.', {
    repo_path: z.string().optional(),
    since: z.string().optional(),
    until: z.string().optional(),
    author: z.string().optional(),
    beads_path: z.string().optional(),
    dry_run: z.boolean().optional(),
  }, async () => {
    return errorToolResult('loom_backfill is intentionally unavailable on remote Loom. Run local backfill into .loom, export a snapshot, then import that snapshot into the remote worker.');
  });

  server.tool('loom_analytics', 'Get analytics from historical execution data (after backfill)', {
    agent: z.string().optional(),
    task_type: z.string().optional(),
  }, async ({ agent, task_type }) => {
    try {
      const result = await analytics(db, { agent, taskType: task_type });
      return textToolResult(result as unknown as Record<string, unknown>);
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_discuss', 'Capture implementation preferences before planning. Use for ambiguous features to align on visual style, API design, content structure, etc.', {
    task_id: z.string().min(1),
    category: z.string().min(1),
    question: z.string().min(1),
    options: z.array(z.string()).optional(),
    decision: z.string().min(1),
    rationale: z.string().optional(),
  }, async ({ task_id, category, question, options, decision, rationale }) => {
    try {
      const task = await getTask(db, task_id);
      if (!task) return errorToolResult(`Task not found: ${task_id}`);
      await storePreference(db, {
        taskId: task_id,
        category,
        question,
        options,
        decision,
        rationale,
      });
      return textToolResult({
        recorded: true,
        task_id,
        category,
        question,
        decision,
        rationale: rationale ?? null,
        message: 'Preference captured. This will inform planning.',
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_verify_plan', 'Verify a plan BEFORE execution. Checks plan against task requirements, validates file paths, ensures no scope creep.', {
    task_id: z.string().min(1),
    plan: z.object({
      steps: z.array(z.object({ description: z.string().optional() }).passthrough()).optional(),
      files_to_modify: z.array(z.string()).optional(),
      files_to_create: z.array(z.string()).optional(),
      estimated_changes: z.number().optional(),
    }).passthrough(),
  }, async ({ task_id, plan }) => {
    try {
      const task = await getTask(db, task_id);
      if (!task) return errorToolResult('Task not found');

      const issues: string[] = [];
      const warnings: string[] = [];

      const filesToModify = plan.files_to_modify ?? [];
      const filesToCreate = plan.files_to_create ?? [];
      const estimatedChanges = plan.estimated_changes ?? 0;

      for (const file of filesToModify) {
        if (file.trim().length === 0) issues.push('files_to_modify contains an empty path');
      }

      for (const file of filesToCreate) {
        if (file.trim().length === 0) issues.push('files_to_create contains an empty path');
      }

      if (estimatedChanges > 500) {
        warnings.push(`Large change set (${estimatedChanges} lines) - consider splitting into smaller tasks.`);
      }

      const titleWords = task.title
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3);
      const stepText = (plan.steps ?? []).map((step) => String(step.description ?? '')).join(' ').toLowerCase();

      if (titleWords.length > 2) {
        const overlap = titleWords.filter((word) => stepText.includes(word)).length;
        if (overlap < Math.floor(titleWords.length / 2)) {
          warnings.push('Plan steps may have scope creep - low overlap with task title keywords.');
        }
      }

      return textToolResult({
        passed: issues.length === 0,
        task_id,
        issues,
        warnings,
        message: issues.length === 0 ? 'Plan verified. Proceed with execution.' : 'Plan has issues. Address before proceeding.',
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_update_context', 'Update session context with rich metadata for resume/recovery. Use to track file modifications, decisions, test state, and progress.', {
    session_id: z.string().min(1),
    file_modified: z.record(z.unknown()).optional(),
    decision: z.record(z.unknown()).optional(),
    test_state: z.record(z.unknown()).optional(),
    task_progress: z.record(z.unknown()).optional(),
    blocker: z.string().optional(),
    note: z.string().optional(),
  }, async ({ session_id, file_modified, decision, test_state, task_progress, blocker, note }) => {
    try {
      const session = await getSession(db, session_id);
      if (!session) return errorToolResult('Session not found');

      const context = parseJsonObject<Record<string, unknown>>(session.context_json, {});
      const updates: string[] = [];

      if (file_modified) {
        const files = Array.isArray(context.files_modified) ? (context.files_modified as unknown[]) : [];
        context.files_modified = [...files, file_modified];
        updates.push('file_modified');
      }

      if (decision) {
        const decisions = Array.isArray(context.decisions) ? (context.decisions as unknown[]) : [];
        context.decisions = [...decisions, { ...decision, made_at: nowIso() }];
        updates.push('decision');
      }

      if (test_state) {
        context.test_state = test_state;
        updates.push('test_state');
      }

      if (task_progress) {
        context.current_task = task_progress;
        updates.push('task_progress');
      }

      if (typeof blocker === 'string' && blocker.trim().length > 0) {
        const blockers = Array.isArray(context.blockers) ? (context.blockers as unknown[]) : [];
        context.blockers = [...blockers, blocker];
        updates.push('blocker');
      }

      if (typeof note === 'string' && note.trim().length > 0) {
        const existing = typeof context.agent_notes === 'string' ? context.agent_notes : '';
        context.agent_notes = existing ? `${existing}\n\n${note}` : note;
        updates.push('note');
      }

      context.captured_at = nowIso();
      await updateSessionContext(db, session_id, context);

      return textToolResult({
        session_id,
        updates,
        context_has_resumable:
          Boolean(context.current_task)
          || (Array.isArray(context.files_modified) && context.files_modified.length > 0)
          || (Array.isArray(context.blockers) && context.blockers.length > 0)
          || (typeof context.agent_notes === 'string' && context.agent_notes.length > 0),
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_get_resume_brief', 'Get a resume brief for a session. This is a markdown summary of context that can be injected into a priming prompt for session continuity.', {
    session_id: z.string().min(1),
  }, async ({ session_id }) => {
    try {
      const brief = await sessionResumeBrief(db, session_id);
      const session = await getSession(db, session_id);
      const context = parseJsonObject<Record<string, unknown>>(session?.context_json ?? '{}', {});
      return textToolResult({
        session_id,
        brief,
        has_resumable_context:
          Boolean(context.current_task)
          || (Array.isArray(context.files_modified) && context.files_modified.length > 0)
          || (Array.isArray(context.blockers) && context.blockers.length > 0)
          || (typeof context.agent_notes === 'string' && context.agent_notes.length > 0),
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_priority', 'Get prioritized list of ready tasks with robot-optimized ranking (PageRank + Critical Path). Use this instead of loom_ready for smarter work selection.', {
    limit: z.number().int().min(1).max(100).optional(),
  }, async ({ limit }) => {
    try {
      const capped = limit ?? 10;
      const ready = await listTasks(db, { status: 'ready' });

      const scored = await Promise.all(ready.map(async (task) => {
        const deps = await getTaskDependencies(db, task.id);
        const blockingDependents = await db
          .prepare(
            `SELECT COUNT(*) as count
             FROM dependencies d
             INNER JOIN tasks t ON t.id = d.task_id
             WHERE d.depends_on = ?1
               AND d.dep_type = 'blocks'
               AND t.status NOT IN ('done', 'cancelled')`,
          )
          .bind(task.id)
          .first<{ count: number }>();

        const p = priorityWeight(task.priority as LoomPriority);
        const impact = Math.min(1, (blockingDependents?.count ?? 0) / 5);
        const age = ageWeight(task.created_at);
        const connectivity = Math.min(1, deps.length / 5);
        const type = issueTypeWeight(task.issue_type);

        const factors = [
          { name: 'priority', value: p, weight: 0.3 },
          { name: 'impact', value: impact, weight: 0.35 },
          { name: 'age', value: age, weight: 0.1 },
          { name: 'connectivity', value: connectivity, weight: 0.15 },
          { name: 'type', value: type, weight: 0.1 },
        ];

        const score = Number(factors.reduce((sum, f) => sum + f.value * f.weight, 0).toFixed(2));
        const topFactors = [...factors]
          .sort((a, b) => (b.value * b.weight) - (a.value * a.weight))
          .slice(0, 2)
          .map((factor) => factor.name)
          .join(', ');

        return {
          id: task.id,
          title: task.title,
          score,
          reason: topFactors ? `High ${topFactors}` : 'Default priority',
          priority: task.priority,
          issue_type: task.issue_type,
          labels: await parseLabelsForTask(task),
          factors,
        };
      }));

      scored.sort((a, b) => b.score - a.score);
      return textToolResult({ items: scored.slice(0, capped) });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_update', 'Update task fields (status, priority, issue_type). For status changes that have side effects (like done/cancelled), use complete/cancel instead.', {
    task_id: z.string().min(1),
    priority: z.enum(['critical', 'high', 'normal', 'low']).optional(),
    issue_type: z.enum(['bug', 'feature', 'task', 'epic', 'chore']).optional(),
    status: z.enum(['ready', 'claimed', 'blocked', 'done', 'cancelled']).optional(),
  }, async ({ task_id, priority, issue_type, status }) => {
    try {
      const updates: string[] = [];
      if (priority) {
        await setTaskPriority(db, task_id, normalizePriority(priority));
        updates.push(`priority=${priority}`);
      }
      if (issue_type) {
        await setTaskIssueType(db, task_id, normalizeIssueType(issue_type));
        updates.push(`issue_type=${issue_type}`);
      }
      if (status) {
        const normalized = validateStatus(status);
        await db
          .prepare('UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3')
          .bind(normalized, nowIso(), task_id)
          .run();
        updates.push(`status=${status}`);

        if (normalized === 'blocked') {
          await markTaskBlockedIfNeeded(db, task_id);
        }
      }

      if (updates.length === 0) {
        return textToolResult({ task_id, message: 'No updates specified. Use status, priority, and/or issue_type.' });
      }

      return textToolResult({ task_id, updates });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_compact', 'Remove old done/cancelled tasks from the database. Use for cleanup.', {
    older_than_days: z.number().int().min(1).max(3650).optional(),
  }, async ({ older_than_days }) => {
    try {
      const removed = await compactTasks(db, older_than_days ?? 30);
      return textToolResult({ removed_count: removed, older_than_days: older_than_days ?? 30 });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_doctor', 'Health check for the loom database. Reports task statistics and potential issues.', {}, async () => {
    try {
      const summary = await getSummary(db);
      const issues = await getDoctorIssues(db);
      return textToolResult({
        summary: {
          ready: summary.ready,
          claimed: summary.claimed,
          blocked: summary.blocked,
          done: summary.done,
          cancelled: summary.cancelled,
          total: summary.total,
          progress_pct: calculateProgress(summary),
          total_cost_usd: Number(summary.total_cost_usd.toFixed(2)),
        },
        issues,
        healthy: issues.length === 0,
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_notion_init', 'Initialize Notion database for Loom work analytics. Creates a database with the proper schema in the specified parent page.', {
    parent_page_id: z.string().min(1),
    token: z.string().optional(),
  }, async ({ parent_page_id, token }) => {
    try {
      if (token) {
        return errorToolResult('Raw Notion token injection is disabled for remote Loom. Configure LOOM_NOTION_TOKEN via Infisical/Worker secrets.');
      }
      if (!env.LOOM_NOTION_TOKEN) {
        return errorToolResult('LOOM_NOTION_TOKEN is not configured on the remote worker.');
      }
      const databaseId = await createDatabase(env.LOOM_NOTION_TOKEN, parent_page_id);
      const existing = (await getNotionConfig(db)) ?? {};
      await setNotionConfig(db, {
        ...existing,
        databaseId,
      });
      return textToolResult({
        database_id: databaseId,
        message: 'Notion database created and config saved. Use loom_notion_sync to sync tasks.',
      });
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_notion_sync', 'Sync Loom tasks to Notion database. Creates new pages, updates changed pages, skips unchanged.', {
    dry_run: z.boolean().optional(),
    force: z.boolean().optional(),
    status: z.enum(['ready', 'claimed', 'blocked', 'done', 'cancelled']).optional(),
    since: z.string().optional(),
  }, async ({ dry_run, force, status, since }) => {
    try {
      if (!env.LOOM_NOTION_TOKEN) {
        return errorToolResult('LOOM_NOTION_TOKEN is not configured on the remote worker.');
      }
      const config = await getNotionConfig(db);
      const databaseId = config?.databaseId ?? null;
      if (!databaseId) {
        return errorToolResult('Notion database is not configured. Run loom_notion_init first.');
      }
      const tasks = await listTasks(db, status ? { status } : {});
      const result = await syncTasksToNotion(env.LOOM_NOTION_TOKEN, databaseId, tasks, {
        dry_run,
        force,
        status,
        since,
      });
      await setNotionConfig(db, {
        ...(config ?? {}),
        databaseId,
        lastSyncAt: new Date().toISOString(),
        lastSyncSummary: {
          total: result.total,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors,
          dryRun: result.dry_run,
        },
      });
      return textToolResult(result as unknown as Record<string, unknown>);
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.tool('loom_notion_status', 'Check Notion sync configuration status.', {}, async () => {
    try {
      return textToolResult(notionStatus(await getNotionConfig(db), Boolean(env.LOOM_NOTION_TOKEN)));
    } catch (error) {
      return errorToolResult(error instanceof Error ? error.message : String(error));
    }
  });
}
