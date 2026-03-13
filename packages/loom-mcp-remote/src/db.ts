import type {
  AgentProfile,
  AgentProfileRow,
  AgentExecutionRow,
  CheckpointRow,
  DispatchConfig,
  DependencyRow,
  LoomIssueType,
  LoomPriority,
  LoomSessionStatus,
  LoomStatus,
  MigrationPayload,
  ModelsConfig,
  NotionRuntimeConfig,
  RuntimeSettingRow,
  RuntimeSettings,
  SessionRow,
  TaskRow,
} from './types.js';
import {
  generateCheckpointId,
  nowIso,
  normalizeIssueType,
  normalizePriority,
  normalizeSessionStatus,
  normalizeStatus,
  parseJsonArray,
  parseJsonObject,
  parseJsonValue,
} from './utils.js';

interface SummaryRow {
  total: number;
  ready: number;
  claimed: number;
  blocked: number;
  done: number;
  cancelled: number;
  total_cost_usd: number;
}

const DISPATCH_CONFIG_KEY = 'dispatch_config';
const MODELS_CONFIG_KEY = 'models_config';
const NOTION_CONFIG_KEY = 'notion';

export async function getTask(db: D1Database, taskId: string): Promise<TaskRow | null> {
  return db
    .prepare(`SELECT id, title, description, status, priority, issue_type, agent, labels_json, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at FROM tasks WHERE id = ?1`)
    .bind(taskId)
    .first<TaskRow>();
}

export async function listTasks(
  db: D1Database,
  options: { status?: string; label?: string; repo?: string } = {},
): Promise<TaskRow[]> {
  const clauses: string[] = [];
  const binds: unknown[] = [];

  if (options.status) {
    clauses.push('status = ?');
    binds.push(normalizeStatus(options.status));
  }

  if (options.repo) {
    clauses.push('repo = ?');
    binds.push(options.repo);
  }

  if (options.label) {
    clauses.push('labels_json LIKE ?');
    binds.push(`%"${options.label.replace(/"/g, '')}"%`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await db
    .prepare(
      `SELECT id, title, description, status, priority, issue_type, agent, labels_json, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at FROM tasks ${where} ORDER BY updated_at DESC`,
    )
    .bind(...binds)
    .all<TaskRow>();

  return result.results ?? [];
}

export async function createTask(
  db: D1Database,
  input: {
    id: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    issueType?: string | null;
    labels?: string[];
    parent?: string | null;
    evidence?: string | null;
    repo?: string | null;
    status?: string | null;
    agent?: string | null;
  },
): Promise<TaskRow> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO tasks (id, title, description, status, priority, issue_type, agent, labels_json, parent, evidence, repo, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
    )
    .bind(
      input.id,
      input.title,
      input.description ?? null,
      normalizeStatus(input.status ?? 'ready'),
      normalizePriority(input.priority),
      normalizeIssueType(input.issueType),
      input.agent ?? null,
      JSON.stringify(input.labels ?? []),
      input.parent ?? null,
      input.evidence ?? null,
      input.repo ?? null,
      now,
      now,
    )
    .run();

  const created = await getTask(db, input.id);
  if (!created) throw new Error(`Failed to create task ${input.id}`);
  return created;
}

export async function updateTaskStatus(
  db: D1Database,
  taskId: string,
  status: LoomStatus,
  options: { agent?: string | null; closeReason?: string | null } = {},
): Promise<void> {
  await db
    .prepare('UPDATE tasks SET status = ?1, agent = ?2, close_reason = ?3, updated_at = ?4 WHERE id = ?5')
    .bind(status, options.agent ?? null, options.closeReason ?? null, nowIso(), taskId)
    .run();
}

export async function claimTask(db: D1Database, taskId: string, agent: string): Promise<TaskRow> {
  const task = await getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  if (task.status === 'done' || task.status === 'cancelled') {
    throw new Error(`Cannot claim task in status ${task.status}`);
  }

  if (task.status === 'claimed' && task.agent && task.agent !== agent) {
    throw new Error(`Task already claimed by ${task.agent}`);
  }

  if (task.status === 'blocked') {
    throw new Error(`Task is blocked: ${taskId}`);
  }

  await updateTaskStatus(db, taskId, 'claimed', { agent, closeReason: null });
  const updated = await getTask(db, taskId);
  if (!updated) throw new Error(`Task not found after claim: ${taskId}`);
  return updated;
}

export async function releaseTask(db: D1Database, taskId: string): Promise<void> {
  const task = await getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.status === 'done' || task.status === 'cancelled') {
    throw new Error(`Cannot release task in status ${task.status}`);
  }
  await updateTaskStatus(db, taskId, 'ready', { agent: null, closeReason: null });
}

export async function completeTask(
  db: D1Database,
  taskId: string,
  options: { evidence?: string | null; costUsd?: number | null } = {},
): Promise<{ unblocked: string[] }> {
  const task = await getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const now = nowIso();
  await db
    .prepare(
      'UPDATE tasks SET status = ?1, evidence = COALESCE(?2, evidence), actual_cost_usd = COALESCE(?3, actual_cost_usd), close_reason = ?4, updated_at = ?5 WHERE id = ?6',
    )
    .bind('done', options.evidence ?? null, options.costUsd ?? null, 'completed', now, taskId)
    .run();

  const dependents = await db
    .prepare(
      `SELECT DISTINCT d.task_id as task_id
       FROM dependencies d
       INNER JOIN tasks t ON t.id = d.task_id
       WHERE d.depends_on = ?1
         AND d.dep_type = 'blocks'
         AND t.status = 'blocked'`,
    )
    .bind(taskId)
    .all<{ task_id: string }>();

  const unblocked: string[] = [];
  for (const dependent of dependents.results ?? []) {
    const stillBlocked = await db
      .prepare(
        `SELECT COUNT(*) as count
         FROM dependencies d
         INNER JOIN tasks blockers ON blockers.id = d.depends_on
         WHERE d.task_id = ?1
           AND d.dep_type = 'blocks'
           AND blockers.status NOT IN ('done', 'cancelled')`,
      )
      .bind(dependent.task_id)
      .first<{ count: number }>();

    if ((stillBlocked?.count ?? 0) === 0) {
      await db
        .prepare('UPDATE tasks SET status = ?1, agent = NULL, updated_at = ?2 WHERE id = ?3')
        .bind('ready', nowIso(), dependent.task_id)
        .run();
      unblocked.push(dependent.task_id);
    }
  }

  return { unblocked };
}

export async function cancelTask(db: D1Database, taskId: string): Promise<void> {
  const task = await getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  await updateTaskStatus(db, taskId, 'cancelled', { agent: null, closeReason: 'cancelled' });
}

export async function setTaskPriority(db: D1Database, taskId: string, priority: LoomPriority): Promise<void> {
  const task = await getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  await db
    .prepare('UPDATE tasks SET priority = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(priority, nowIso(), taskId)
    .run();
}

export async function setTaskIssueType(db: D1Database, taskId: string, issueType: LoomIssueType): Promise<void> {
  const task = await getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  await db
    .prepare('UPDATE tasks SET issue_type = ?1, updated_at = ?2 WHERE id = ?3')
    .bind(issueType, nowIso(), taskId)
    .run();
}

export async function getTaskDependencies(db: D1Database, taskId: string): Promise<DependencyRow[]> {
  const result = await db
    .prepare('SELECT task_id, depends_on, dep_type, created_at FROM dependencies WHERE task_id = ?1 ORDER BY created_at ASC')
    .bind(taskId)
    .all<DependencyRow>();
  return result.results ?? [];
}

export async function blockTask(db: D1Database, taskId: string, blockedBy: string): Promise<void> {
  const task = await getTask(db, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const blocker = await getTask(db, blockedBy);
  if (!blocker) throw new Error(`Blocking task not found: ${blockedBy}`);

  await db
    .prepare(
      'INSERT OR IGNORE INTO dependencies (task_id, depends_on, dep_type, created_at) VALUES (?1, ?2, ?3, ?4)',
    )
    .bind(taskId, blockedBy, 'blocks', nowIso())
    .run();

  if (task.status !== 'done' && task.status !== 'cancelled') {
    await updateTaskStatus(db, taskId, 'blocked', { agent: null, closeReason: null });
  }
}

export async function unblockTask(db: D1Database, taskId: string, blockedBy: string): Promise<void> {
  await db
    .prepare('DELETE FROM dependencies WHERE task_id = ?1 AND depends_on = ?2 AND dep_type = ?3')
    .bind(taskId, blockedBy, 'blocks')
    .run();

  const task = await getTask(db, taskId);
  if (!task || task.status !== 'blocked') return;

  const blockers = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM dependencies d
       INNER JOIN tasks t ON t.id = d.depends_on
       WHERE d.task_id = ?1
         AND d.dep_type = 'blocks'
         AND t.status NOT IN ('done', 'cancelled')`,
    )
    .bind(taskId)
    .first<{ count: number }>();

  if ((blockers?.count ?? 0) === 0) {
    await updateTaskStatus(db, taskId, 'ready', { agent: null, closeReason: null });
  }
}

export async function getSummary(db: D1Database, label?: string): Promise<SummaryRow> {
  const labelFilter = label ? `%"${label.replace(/"/g, '')}"%` : null;

  const result = await db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
         SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed,
         SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
         COALESCE(SUM(actual_cost_usd), 0) as total_cost_usd
       FROM tasks
       WHERE (?1 IS NULL OR labels_json LIKE ?1)`,
    )
    .bind(labelFilter)
    .first<SummaryRow>();

  return {
    total: result?.total ?? 0,
    ready: result?.ready ?? 0,
    claimed: result?.claimed ?? 0,
    blocked: result?.blocked ?? 0,
    done: result?.done ?? 0,
    cancelled: result?.cancelled ?? 0,
    total_cost_usd: result?.total_cost_usd ?? 0,
  };
}

export async function startSession(
  db: D1Database,
  input: {
    sessionId: string;
    taskId: string;
    agent: string;
    workingDir?: string | null;
    gitBranch?: string | null;
  },
): Promise<SessionRow> {
  const task = await getTask(db, input.taskId);
  if (!task) throw new Error(`Task not found: ${input.taskId}`);

  await db
    .prepare('UPDATE sessions SET status = ?1, ended_at = ?2 WHERE task_id = ?3 AND status = ?4')
    .bind('interrupted', nowIso(), input.taskId, 'active')
    .run();

  const startedAt = nowIso();
  await db
    .prepare(
      `INSERT INTO sessions (id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json)
       VALUES (?1, ?2, ?3, 'active', ?4, NULL, ?5, ?6, NULL, '{}')`,
    )
    .bind(input.sessionId, input.agent, input.taskId, startedAt, input.workingDir ?? null, input.gitBranch ?? null)
    .run();

  await updateTaskStatus(db, input.taskId, 'claimed', { agent: input.agent, closeReason: null });

  const session = await getSession(db, input.sessionId);
  if (!session) throw new Error(`Failed to create session ${input.sessionId}`);
  return session;
}

export async function getSession(db: D1Database, sessionId: string): Promise<SessionRow | null> {
  return db
    .prepare(
      `SELECT id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json
       FROM sessions
       WHERE id = ?1`,
    )
    .bind(sessionId)
    .first<SessionRow>();
}

export async function endSession(db: D1Database, sessionId: string, status: LoomSessionStatus): Promise<void> {
  const session = await getSession(db, sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  await db
    .prepare('UPDATE sessions SET status = ?1, ended_at = ?2 WHERE id = ?3')
    .bind(status, nowIso(), sessionId)
    .run();

  if (status === 'completed') {
    await updateTaskStatus(db, session.task_id, 'done', { agent: null, closeReason: 'session_completed' });
  }
}

export async function createCheckpoint(
  db: D1Database,
  sessionId: string,
  summary: string,
  gitCommit?: string | null,
): Promise<CheckpointRow> {
  const session = await getSession(db, sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const next = await db
    .prepare('SELECT COALESCE(MAX(sequence), 0) + 1 as seq FROM checkpoints WHERE session_id = ?1')
    .bind(sessionId)
    .first<{ seq: number }>();

  const sequence = next?.seq ?? 1;
  const checkpointId = generateCheckpointId(sessionId, sequence);
  const createdAt = nowIso();

  await db
    .prepare(
      `INSERT INTO checkpoints (id, session_id, sequence, summary, context_json, git_commit, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(checkpointId, sessionId, sequence, summary, session.context_json ?? '{}', gitCommit ?? null, createdAt)
    .run();

  await db
    .prepare('UPDATE sessions SET last_checkpoint = ?1 WHERE id = ?2')
    .bind(checkpointId, sessionId)
    .run();

  const checkpoint = await getCheckpoint(db, checkpointId);
  if (!checkpoint) throw new Error(`Failed to create checkpoint ${checkpointId}`);
  return checkpoint;
}

export async function getCheckpoint(db: D1Database, checkpointId: string): Promise<CheckpointRow | null> {
  return db
    .prepare('SELECT id, session_id, sequence, summary, context_json, git_commit, created_at FROM checkpoints WHERE id = ?1')
    .bind(checkpointId)
    .first<CheckpointRow>();
}

export async function listRecoverableSessions(db: D1Database): Promise<SessionRow[]> {
  await db
    .prepare(
      `UPDATE sessions
       SET status = 'interrupted', ended_at = COALESCE(ended_at, ?1)
       WHERE status = 'active' AND started_at < datetime('now', '-1 hour')`,
    )
    .bind(nowIso())
    .run();

  const result = await db
    .prepare(
      `SELECT id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json
       FROM sessions
       WHERE status = 'interrupted'
       ORDER BY started_at DESC`,
    )
    .all<SessionRow>();

  return result.results ?? [];
}

export async function resumeSession(db: D1Database, sessionId: string): Promise<SessionRow> {
  const session = await getSession(db, sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  let contextJson = session.context_json;
  if (session.last_checkpoint) {
    const checkpoint = await getCheckpoint(db, session.last_checkpoint);
    if (checkpoint?.context_json) {
      contextJson = checkpoint.context_json;
    }
  }

  await db
    .prepare('UPDATE sessions SET status = ?1, context_json = ?2, ended_at = NULL WHERE id = ?3')
    .bind('active', contextJson ?? '{}', sessionId)
    .run();

  await updateTaskStatus(db, session.task_id, 'claimed', { agent: session.agent_id, closeReason: null });

  const updated = await getSession(db, sessionId);
  if (!updated) throw new Error(`Session not found after resume: ${sessionId}`);
  return updated;
}

export async function updateSessionContext(db: D1Database, sessionId: string, context: Record<string, unknown>): Promise<void> {
  const session = await getSession(db, sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  await db
    .prepare('UPDATE sessions SET context_json = ?1 WHERE id = ?2')
    .bind(JSON.stringify(context), sessionId)
    .run();
}

export async function listCheckpoints(db: D1Database, sessionId: string): Promise<CheckpointRow[]> {
  const result = await db
    .prepare(
      `SELECT id, session_id, sequence, summary, context_json, git_commit, created_at
       FROM checkpoints
       WHERE session_id = ?1
       ORDER BY sequence ASC`,
    )
    .bind(sessionId)
    .all<CheckpointRow>();
  return result.results ?? [];
}

export async function insertExecution(
  db: D1Database,
  input: {
    agentId: string;
    taskId: string;
    taskType?: string | null;
    success: boolean;
    durationSecs: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO agent_executions (agent_id, task_id, task_type, success, duration_secs, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(input.agentId, input.taskId, input.taskType ?? null, input.success ? 1 : 0, input.durationSecs, nowIso())
    .run();

  const profileRow = await db
    .prepare('SELECT id, profile_json, updated_at FROM agent_profiles WHERE id = ?1')
    .bind(input.agentId)
    .first<AgentProfileRow>();

  const profile = profileRow
    ? parseJsonObject<AgentProfile | null>(profileRow.profile_json, null)
    : ({
        id: input.agentId,
        name: input.agentId,
        cli_path: input.agentId,
        capabilities: {
          planning: 0.5,
          coding: 0.5,
          debugging: 0.5,
          ui: 0.5,
          docs: 0.5,
          refactor: 0.5,
          testing: 0.5,
          mcp: false,
          checkpoints: false,
          git_aware: false,
          sub_agents: false,
          max_context: 128000,
        },
        cost: {
          input_per_1k: 0,
          output_per_1k: 0,
          output_ratio: 2.5,
        },
        quality: {
          successes: 0,
          failures: 0,
          avg_duration_secs: 0,
          by_type: {},
        },
        max_concurrent: 1,
        active: 0,
        available: true,
        last_used: null,
      } satisfies AgentProfile);

  if (!profile) return;

  const taskType = input.taskType ?? 'task';
  const currentSuccesses = profile.quality.successes ?? 0;
  const currentFailures = profile.quality.failures ?? 0;
  const priorTotal = currentSuccesses + currentFailures;
  const nextTotal = priorTotal + 1;
  const byType = { ...(profile.quality.by_type ?? {}) };
  const existingByType = byType[taskType] ?? 0.5;

  profile.quality = {
    successes: input.success ? currentSuccesses + 1 : currentSuccesses,
    failures: input.success ? currentFailures : currentFailures + 1,
    avg_duration_secs:
      nextTotal > 0 ? (profile.quality.avg_duration_secs * priorTotal + input.durationSecs) / nextTotal : input.durationSecs,
    by_type: {
      ...byType,
      [taskType]: input.success ? existingByType * 0.9 + 0.1 : existingByType * 0.9,
    },
  };
  profile.last_used = nowIso();

  await db
    .prepare(
      `INSERT INTO agent_profiles (id, profile_json, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at`,
    )
    .bind(profile.id, JSON.stringify(profile), nowIso())
    .run();
}

export async function analytics(
  db: D1Database,
  options: { agent?: string; taskType?: string } = {},
): Promise<{
  summary: {
    total_tasks: number;
    completed: number;
    active: number;
    progress_pct: number;
    total_cost_usd: number;
  };
  executions: {
    total: number;
    success: number;
    failed: number;
    avg_duration_secs: number;
  };
  by_agent: Array<{ agent_id: string; runs: number; successes: number; failures: number; avg_duration_secs: number }>;
}> {
  const summary = await getSummary(db);
  const progress = summary.total === 0 ? 0 : Number(((summary.done / summary.total) * 100).toFixed(2));

  const clauses: string[] = [];
  const binds: unknown[] = [];

  if (options.agent) {
    clauses.push('agent_id = ?');
    binds.push(options.agent);
  }
  if (options.taskType) {
    clauses.push('task_type = ?');
    binds.push(options.taskType);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const executions = await db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
         COALESCE(AVG(duration_secs), 0) as avg_duration_secs
       FROM agent_executions
       ${where}`,
    )
    .bind(...binds)
    .first<{ total: number; success: number; failed: number; avg_duration_secs: number }>();

  const byAgent = await db
    .prepare(
      `SELECT
         agent_id,
         COUNT(*) as runs,
         SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures,
         COALESCE(AVG(duration_secs), 0) as avg_duration_secs
       FROM agent_executions
       ${where}
       GROUP BY agent_id
       ORDER BY runs DESC`,
    )
    .bind(...binds)
    .all<{ agent_id: string; runs: number; successes: number; failures: number; avg_duration_secs: number }>();

  return {
    summary: {
      total_tasks: summary.total,
      completed: summary.done,
      active: summary.ready + summary.claimed + summary.blocked,
      progress_pct: progress,
      total_cost_usd: summary.total_cost_usd,
    },
    executions: {
      total: executions?.total ?? 0,
      success: executions?.success ?? 0,
      failed: executions?.failed ?? 0,
      avg_duration_secs: Number((executions?.avg_duration_secs ?? 0).toFixed(2)),
    },
    by_agent: byAgent.results ?? [],
  };
}

export async function storePreference(
  db: D1Database,
  input: {
    taskId: string;
    category: string;
    question: string;
    decision: string;
    rationale?: string | null;
    options?: string[];
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO task_preferences (task_id, category, question, options_json, decision, rationale, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      input.taskId,
      input.category,
      input.question,
      JSON.stringify(input.options ?? []),
      input.decision,
      input.rationale ?? null,
      nowIso(),
    )
    .run();
}

export async function compactTasks(db: D1Database, olderThanDays: number): Promise<number> {
  const before = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM tasks
       WHERE status IN ('done', 'cancelled')
         AND updated_at < datetime('now', ?1)`,
    )
    .bind(`-${olderThanDays} days`)
    .first<{ count: number }>();

  const count = before?.count ?? 0;
  if (count === 0) return 0;

  await db
    .prepare(
      `DELETE FROM dependencies
       WHERE task_id IN (
         SELECT id FROM tasks WHERE status IN ('done', 'cancelled') AND updated_at < datetime('now', ?1)
       )
       OR depends_on IN (
         SELECT id FROM tasks WHERE status IN ('done', 'cancelled') AND updated_at < datetime('now', ?1)
       )`,
    )
    .bind(`-${olderThanDays} days`)
    .run();

  await db
    .prepare("DELETE FROM tasks WHERE status IN ('done', 'cancelled') AND updated_at < datetime('now', ?1)")
    .bind(`-${olderThanDays} days`)
    .run();

  return count;
}

export async function healthCounts(
  db: D1Database,
): Promise<{
  tasks: number;
  dependencies: number;
  sessions: number;
  checkpoints: number;
  agent_executions: number;
  agent_profiles: number;
  runtime_settings: number;
}> {
  const [tasks, dependencies, sessions, checkpoints, agentExecutions, agentProfiles, runtimeSettings] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM tasks').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM dependencies').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM sessions').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM checkpoints').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM agent_executions').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM agent_profiles').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM runtime_settings').first<{ count: number }>(),
  ]);

  return {
    tasks: tasks?.count ?? 0,
    dependencies: dependencies?.count ?? 0,
    sessions: sessions?.count ?? 0,
    checkpoints: checkpoints?.count ?? 0,
    agent_executions: agentExecutions?.count ?? 0,
    agent_profiles: agentProfiles?.count ?? 0,
    runtime_settings: runtimeSettings?.count ?? 0,
  };
}

export async function markTaskBlockedIfNeeded(db: D1Database, taskId: string): Promise<void> {
  const task = await getTask(db, taskId);
  if (!task) return;

  const blockers = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM dependencies d
       INNER JOIN tasks t ON t.id = d.depends_on
       WHERE d.task_id = ?1
         AND d.dep_type = 'blocks'
         AND t.status NOT IN ('done', 'cancelled')`,
    )
    .bind(taskId)
    .first<{ count: number }>();

  if ((blockers?.count ?? 0) > 0 && task.status !== 'done' && task.status !== 'cancelled') {
    await updateTaskStatus(db, taskId, 'blocked', { agent: null, closeReason: null });
  }
}

export async function getDoctorIssues(db: D1Database): Promise<string[]> {
  const issues: string[] = [];

  const blocked = await db
    .prepare(`SELECT id FROM tasks WHERE status = 'blocked'`)
    .all<{ id: string }>();

  for (const task of blocked.results ?? []) {
    const activeBlockers = await db
      .prepare(
        `SELECT COUNT(*) as count
         FROM dependencies d
         INNER JOIN tasks t ON t.id = d.depends_on
         WHERE d.task_id = ?1
           AND d.dep_type = 'blocks'
           AND t.status NOT IN ('done', 'cancelled')`,
      )
      .bind(task.id)
      .first<{ count: number }>();

    if ((activeBlockers?.count ?? 0) === 0) {
      issues.push(`Task ${task.id} is blocked but has no active blockers`);
    }
  }

  const claimedWithoutAgent = await db
    .prepare(`SELECT id FROM tasks WHERE status = 'claimed' AND (agent IS NULL OR agent = '')`)
    .all<{ id: string }>();

  for (const task of claimedWithoutAgent.results ?? []) {
    issues.push(`Task ${task.id} is claimed but has no agent`);
  }

  return issues;
}

export async function getRuntimeSetting<T>(db: D1Database, key: string): Promise<T | null> {
  const row = await db
    .prepare('SELECT key, value_json, updated_at FROM runtime_settings WHERE key = ?1')
    .bind(key)
    .first<RuntimeSettingRow>();

  if (!row) return null;
  return parseJsonValue<T | null>(row.value_json, null);
}

export async function setRuntimeSetting(db: D1Database, key: string, value: unknown): Promise<void> {
  await db
    .prepare(
      `INSERT INTO runtime_settings (key, value_json, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    )
    .bind(key, JSON.stringify(value ?? null), nowIso())
    .run();
}

export async function getRuntimeSettings(db: D1Database): Promise<RuntimeSettings> {
  const rows = await db
    .prepare('SELECT key, value_json, updated_at FROM runtime_settings ORDER BY key ASC')
    .all<RuntimeSettingRow>();

  const settings: RuntimeSettings = {};
  for (const row of rows.results ?? []) {
    if (row.key === DISPATCH_CONFIG_KEY || row.key === MODELS_CONFIG_KEY) continue;
    settings[row.key] = parseJsonValue(row.value_json, null);
  }

  return settings;
}

export async function getDispatchConfig(db: D1Database): Promise<DispatchConfig | null> {
  return getRuntimeSetting<DispatchConfig>(db, DISPATCH_CONFIG_KEY);
}

export async function getModelsConfig(db: D1Database): Promise<ModelsConfig | null> {
  return getRuntimeSetting<ModelsConfig>(db, MODELS_CONFIG_KEY);
}

export async function getNotionConfig(db: D1Database): Promise<NotionRuntimeConfig | null> {
  return getRuntimeSetting<NotionRuntimeConfig>(db, NOTION_CONFIG_KEY);
}

export async function setNotionConfig(db: D1Database, config: NotionRuntimeConfig): Promise<void> {
  await setRuntimeSetting(db, NOTION_CONFIG_KEY, config);
}

export async function getAgentProfiles(db: D1Database): Promise<AgentProfile[]> {
  const rows = await db
    .prepare('SELECT id, profile_json, updated_at FROM agent_profiles ORDER BY id ASC')
    .all<AgentProfileRow>();

  return (rows.results ?? [])
    .map((row) => parseJsonObject<AgentProfile | null>(row.profile_json, null))
    .filter((profile): profile is AgentProfile => Boolean(profile?.id));
}

export async function exportSnapshot(
  db: D1Database,
): Promise<{
  payload: MigrationPayload;
  counts: Record<string, number>;
}> {
  const [tasks, dependencies, sessions, checkpoints, agentExecutions, agentProfiles, runtimeSettings, dispatchConfig, modelsConfig] =
    await Promise.all([
      db
        .prepare(
          `SELECT id, title, description, status, priority, issue_type, agent, labels_json, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at
           FROM tasks
           ORDER BY created_at ASC`,
        )
        .all<TaskRow>(),
      db
        .prepare('SELECT task_id, depends_on, dep_type, created_at FROM dependencies ORDER BY created_at ASC')
        .all<DependencyRow>(),
      db
        .prepare(
          `SELECT id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json
           FROM sessions
           ORDER BY started_at ASC`,
        )
        .all<SessionRow>(),
      db
        .prepare(
          `SELECT id, session_id, sequence, summary, context_json, git_commit, created_at
           FROM checkpoints
           ORDER BY created_at ASC`,
        )
        .all<CheckpointRow>(),
      db
        .prepare(
          `SELECT agent_id, task_id, task_type, success, duration_secs, created_at
           FROM agent_executions
           ORDER BY created_at ASC`,
        )
        .all<Omit<AgentExecutionRow, 'id'>>(),
      db.prepare('SELECT id, profile_json, updated_at FROM agent_profiles ORDER BY id ASC').all<AgentProfileRow>(),
      getRuntimeSettings(db),
      getDispatchConfig(db),
      getModelsConfig(db),
    ]);

  const payload: MigrationPayload = {
    tasks: tasks.results ?? [],
    dependencies: dependencies.results ?? [],
    sessions: sessions.results ?? [],
    checkpoints: checkpoints.results ?? [],
    ...(agentExecutions.results && agentExecutions.results.length > 0 ? { agentExecutions: agentExecutions.results } : {}),
    ...(agentProfiles.results && agentProfiles.results.length > 0 ? { agentProfiles: agentProfiles.results } : {}),
    ...(dispatchConfig ? { dispatchConfig } : {}),
    ...(modelsConfig ? { modelsConfig } : {}),
    ...(Object.keys(runtimeSettings).length > 0 ? { runtimeSettings } : {}),
  };

  const counts = {
    tasks: payload.tasks.length,
    dependencies: payload.dependencies.length,
    sessions: payload.sessions.length,
    checkpoints: payload.checkpoints.length,
    agentExecutions: payload.agentExecutions?.length ?? 0,
    agentProfiles: payload.agentProfiles?.length ?? 0,
    runtimeSettings: Object.keys(payload.runtimeSettings ?? {}).length,
  };

  return { payload, counts };
}

export async function importSnapshot(db: D1Database, payload: MigrationPayload): Promise<{ counts: Record<string, number> }> {
  await db.exec(`
    DELETE FROM staging_dependencies;
    DELETE FROM staging_tasks;
    DELETE FROM staging_checkpoints;
    DELETE FROM staging_sessions;
    DELETE FROM staging_agent_executions;
    DELETE FROM staging_agent_profiles;
    DELETE FROM staging_runtime_settings;
  `);

  if (payload.tasks.length > 0) {
    const inserts = payload.tasks.map((task) =>
      db
        .prepare(
          `INSERT INTO staging_tasks
            (id, title, description, status, priority, issue_type, agent, labels_json, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
        )
        .bind(
          task.id,
          task.title,
          task.description ?? null,
          normalizeStatus(task.status),
          normalizePriority(task.priority),
          normalizeIssueType(task.issue_type),
          task.agent ?? null,
          JSON.stringify(parseJsonArray(task.labels_json)),
          task.parent ?? null,
          task.evidence ?? null,
          task.actual_cost_usd ?? null,
          task.repo ?? null,
          task.close_reason ?? null,
          task.created_at || nowIso(),
          task.updated_at || nowIso(),
        ),
    );
    await db.batch(inserts);
  }

  if (payload.dependencies.length > 0) {
    const inserts = payload.dependencies.map((dep) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO staging_dependencies (task_id, depends_on, dep_type, created_at)
           VALUES (?1, ?2, ?3, ?4)`,
        )
        .bind(dep.task_id, dep.depends_on, dep.dep_type || 'blocks', dep.created_at || nowIso()),
    );
    await db.batch(inserts);
  }

  if (payload.sessions.length > 0) {
    const inserts = payload.sessions.map((session) =>
      db
        .prepare(
          `INSERT INTO staging_sessions
            (id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
        )
        .bind(
          session.id,
          session.agent_id,
          session.task_id,
          normalizeSessionStatus(session.status),
          session.started_at || nowIso(),
          session.ended_at ?? null,
          session.working_dir ?? null,
          session.git_branch ?? null,
          session.last_checkpoint ?? null,
          session.context_json || '{}',
        ),
    );
    await db.batch(inserts);
  }

  if (payload.checkpoints.length > 0) {
    const inserts = payload.checkpoints.map((checkpoint) =>
      db
        .prepare(
          `INSERT INTO staging_checkpoints
            (id, session_id, sequence, summary, context_json, git_commit, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        )
        .bind(
          checkpoint.id,
          checkpoint.session_id,
          checkpoint.sequence,
          checkpoint.summary,
          checkpoint.context_json ?? '{}',
          checkpoint.git_commit ?? null,
          checkpoint.created_at || nowIso(),
        ),
    );
    await db.batch(inserts);
  }

  if ((payload.agentExecutions ?? []).length > 0) {
    const inserts = (payload.agentExecutions ?? []).map((execution) =>
      db
        .prepare(
          `INSERT INTO staging_agent_executions (agent_id, task_id, task_type, success, duration_secs, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        )
        .bind(
          execution.agent_id,
          execution.task_id,
          execution.task_type ?? null,
          execution.success ? 1 : 0,
          execution.duration_secs,
          execution.created_at || nowIso(),
        ),
    );
    await db.batch(inserts);
  }

  const hasExtendedState =
    payload.agentProfiles !== undefined ||
    payload.dispatchConfig !== undefined ||
    payload.modelsConfig !== undefined ||
    payload.runtimeSettings !== undefined;

  if ((payload.agentProfiles ?? []).length > 0) {
    const inserts = (payload.agentProfiles ?? []).map((profile) =>
      db
        .prepare(
          `INSERT INTO staging_agent_profiles (id, profile_json, updated_at)
           VALUES (?1, ?2, ?3)`,
        )
        .bind(profile.id, profile.profile_json, profile.updated_at || nowIso()),
    );
    await db.batch(inserts);
  }

  const runtimeSettingEntries: Array<[string, unknown]> = [];
  if (payload.dispatchConfig !== undefined) {
    runtimeSettingEntries.push([DISPATCH_CONFIG_KEY, payload.dispatchConfig ?? null]);
  }
  if (payload.modelsConfig !== undefined) {
    runtimeSettingEntries.push([MODELS_CONFIG_KEY, payload.modelsConfig ?? null]);
  }
  if (payload.runtimeSettings !== undefined) {
    for (const [key, value] of Object.entries(payload.runtimeSettings)) {
      runtimeSettingEntries.push([key, value]);
    }
  }

  if (runtimeSettingEntries.length > 0) {
    const inserts = runtimeSettingEntries.map(([key, value]) =>
      db
        .prepare(
          `INSERT INTO staging_runtime_settings (key, value_json, updated_at)
           VALUES (?1, ?2, ?3)`,
        )
        .bind(key, JSON.stringify(value ?? null), nowIso()),
    );
    await db.batch(inserts);
  }

  const replacementStatements = [
    db.prepare('DELETE FROM dependencies'),
    db.prepare('DELETE FROM checkpoints'),
    db.prepare('DELETE FROM sessions'),
    db.prepare('DELETE FROM agent_executions'),
    db.prepare('DELETE FROM tasks'),
    db.prepare(
      `INSERT INTO tasks (id, title, description, status, priority, issue_type, agent, labels_json, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at)
       SELECT id, title, description, status, priority, issue_type, agent, labels_json, parent, evidence, actual_cost_usd, repo, close_reason, created_at, updated_at
       FROM staging_tasks`,
    ),
    db.prepare(
      `INSERT INTO dependencies (task_id, depends_on, dep_type, created_at)
       SELECT task_id, depends_on, dep_type, created_at FROM staging_dependencies`,
    ),
    db.prepare(
      `INSERT INTO sessions (id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json)
       SELECT id, agent_id, task_id, status, started_at, ended_at, working_dir, git_branch, last_checkpoint, context_json
       FROM staging_sessions`,
    ),
    db.prepare(
      `INSERT INTO checkpoints (id, session_id, sequence, summary, context_json, git_commit, created_at)
       SELECT id, session_id, sequence, summary, context_json, git_commit, created_at
       FROM staging_checkpoints`,
    ),
    db.prepare(
      `INSERT INTO agent_executions (agent_id, task_id, task_type, success, duration_secs, created_at)
       SELECT agent_id, task_id, task_type, success, duration_secs, created_at
       FROM staging_agent_executions`,
    ),
  ];

  if (hasExtendedState) {
    replacementStatements.push(
      db.prepare('DELETE FROM agent_profiles'),
      db.prepare('DELETE FROM runtime_settings'),
      db.prepare(
        `INSERT INTO agent_profiles (id, profile_json, updated_at)
         SELECT id, profile_json, updated_at FROM staging_agent_profiles`,
      ),
      db.prepare(
        `INSERT INTO runtime_settings (key, value_json, updated_at)
         SELECT key, value_json, updated_at FROM staging_runtime_settings`,
      ),
    );
  }

  await db.batch(replacementStatements);

  const counts = {
    tasks: (await db.prepare('SELECT COUNT(*) as count FROM tasks').first<{ count: number }>())?.count ?? 0,
    dependencies: (await db.prepare('SELECT COUNT(*) as count FROM dependencies').first<{ count: number }>())?.count ?? 0,
    sessions: (await db.prepare('SELECT COUNT(*) as count FROM sessions').first<{ count: number }>())?.count ?? 0,
    checkpoints: (await db.prepare('SELECT COUNT(*) as count FROM checkpoints').first<{ count: number }>())?.count ?? 0,
    agentExecutions: (await db.prepare('SELECT COUNT(*) as count FROM agent_executions').first<{ count: number }>())?.count ?? 0,
    agentProfiles: (await db.prepare('SELECT COUNT(*) as count FROM agent_profiles').first<{ count: number }>())?.count ?? 0,
    runtimeSettings: (await db.prepare('SELECT COUNT(*) as count FROM runtime_settings').first<{ count: number }>())?.count ?? 0,
  };

  return { counts };
}

export async function parseLabelsForTask(task: TaskRow): Promise<string[]> {
  return parseJsonArray(task.labels_json);
}

export async function repositoryIds(db: D1Database): Promise<string[]> {
  const rows = await db.prepare('SELECT DISTINCT repo FROM tasks WHERE repo IS NOT NULL AND repo != \"\" ORDER BY repo ASC').all<{ repo: string }>();
  return (rows.results ?? []).map((row) => row.repo);
}

export async function sessionResumeBrief(db: D1Database, sessionId: string): Promise<string> {
  const session = await getSession(db, sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const checkpoints = await listCheckpoints(db, sessionId);
  const context = typeof session.context_json === 'string' ? JSON.parse(session.context_json || '{}') : {};

  const lines: string[] = [];
  lines.push('## Session Resume Brief');
  lines.push('');
  lines.push(`- Session: ${session.id}`);
  lines.push(`- Agent: ${session.agent_id}`);
  lines.push(`- Task: ${session.task_id}`);
  lines.push(`- Status: ${session.status}`);
  lines.push(`- Started: ${session.started_at}`);
  lines.push(`- Last checkpoint: ${session.last_checkpoint ?? 'none'}`);
  lines.push('');

  const notes = typeof context?.agent_notes === 'string' ? context.agent_notes : '';
  const blockers = Array.isArray(context?.blockers) ? context.blockers : [];
  const filesModified = Array.isArray(context?.files_modified) ? context.files_modified : [];

  if (filesModified.length > 0) {
    lines.push('### Files Modified');
    for (const file of filesModified.slice(0, 10)) {
      const path = typeof file?.path === 'string' ? file.path : 'unknown';
      const summary = typeof file?.summary === 'string' ? file.summary : '';
      lines.push(`- ${path}${summary ? `: ${summary}` : ''}`);
    }
    lines.push('');
  }

  if (blockers.length > 0) {
    lines.push('### Blockers');
    for (const blocker of blockers.slice(0, 10)) {
      lines.push(`- ${String(blocker)}`);
    }
    lines.push('');
  }

  if (notes) {
    lines.push('### Notes');
    lines.push(notes.length > 1200 ? `${notes.slice(0, 1200)}...` : notes);
    lines.push('');
  }

  if (checkpoints.length > 0) {
    lines.push('### Checkpoints');
    for (const checkpoint of checkpoints.slice(-5)) {
      lines.push(`- #${checkpoint.sequence} ${checkpoint.summary} (${checkpoint.created_at})`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
