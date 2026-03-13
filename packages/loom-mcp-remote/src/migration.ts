import { z } from 'zod';

import { exportSnapshot, importSnapshot } from './db.js';
import type { Env, MigrationPayload } from './types.js';
import { jsonResponse, normalizePriority, normalizeIssueType, normalizeSessionStatus, normalizeStatus, verifyHmacSignature } from './utils.js';

const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().optional().default('ready'),
  priority: z.string().optional().default('normal'),
  issue_type: z.string().optional().default('task'),
  agent: z.string().nullable().optional(),
  labels_json: z.string().optional().default('[]'),
  parent: z.string().nullable().optional(),
  evidence: z.string().nullable().optional(),
  actual_cost_usd: z.number().nullable().optional(),
  repo: z.string().nullable().optional(),
  close_reason: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const DependencySchema = z.object({
  task_id: z.string().min(1),
  depends_on: z.string().min(1),
  dep_type: z.string().optional().default('blocks'),
  created_at: z.string().optional(),
});

const SessionSchema = z.object({
  id: z.string().min(1),
  agent_id: z.string().min(1),
  task_id: z.string().min(1),
  status: z.string().optional().default('active'),
  started_at: z.string().optional(),
  ended_at: z.string().nullable().optional(),
  working_dir: z.string().nullable().optional(),
  git_branch: z.string().nullable().optional(),
  last_checkpoint: z.string().nullable().optional(),
  context_json: z.string().optional().default('{}'),
});

const CheckpointSchema = z.object({
  id: z.string().min(1),
  session_id: z.string().min(1),
  sequence: z.number().int().min(1),
  summary: z.string().min(1),
  context_json: z.string().nullable().optional(),
  git_commit: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

const AgentExecutionSchema = z.object({
  agent_id: z.string().min(1),
  task_id: z.string().min(1),
  task_type: z.string().nullable().optional(),
  success: z.union([z.number().int(), z.boolean()]).transform((value) => (typeof value === 'boolean' ? value : value === 1)),
  duration_secs: z.number().positive(),
  created_at: z.string().optional(),
});

const AgentProfileSchema = z.object({
  id: z.string().min(1),
  profile_json: z.string().min(2),
  updated_at: z.string().optional(),
});

const MigrationRequestSchema = z.object({
  snapshot_version: z.string().optional(),
  generated_at: z.string().optional(),
  source: z.string().optional(),
  payload: z.object({
    tasks: z.array(TaskSchema),
    dependencies: z.array(DependencySchema),
    sessions: z.array(SessionSchema),
    checkpoints: z.array(CheckpointSchema),
    agentExecutions: z.array(AgentExecutionSchema).optional(),
    agentProfiles: z.array(AgentProfileSchema).optional(),
    dispatchConfig: z.record(z.unknown()).optional(),
    modelsConfig: z.record(z.unknown()).optional(),
    runtimeSettings: z.record(z.unknown()).optional(),
  }),
});

function parseBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim();
}

function validateMigrationAdminAuth(request: Request, env: Env): Response | null {
  if (!env.MIGRATION_ADMIN_TOKEN) {
    return jsonResponse({ error: 'Migration endpoint disabled. Configure MIGRATION_ADMIN_TOKEN to enable.' }, 503);
  }

  const token = parseBearerToken(request);
  if (!token || token !== env.MIGRATION_ADMIN_TOKEN) {
    return jsonResponse({ error: 'Unauthorized. Valid migration bearer token required.' }, 401);
  }

  return null;
}

export async function handleMigrationExport(request: Request, env: Env): Promise<Response> {
  const authError = validateMigrationAdminAuth(request, env);
  if (authError) return authError;

  try {
    const snapshot = await exportSnapshot(env.DB);
    return jsonResponse({
      snapshot_version: 'loom-remote-v2',
      generated_at: new Date().toISOString(),
      source: 'remote-backup',
      payload: snapshot.payload,
      counts: snapshot.counts,
    });
  } catch (error) {
    return jsonResponse({
      error: 'Migration export failed.',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}

export async function handleMigrationImport(request: Request, env: Env): Promise<Response> {
  const authError = validateMigrationAdminAuth(request, env);
  if (authError) return authError;

  const rawBody = await request.text();
  if (!rawBody || rawBody.trim().length === 0) {
    return jsonResponse({ error: 'Request body is required.' }, 400);
  }

  if (env.MIGRATION_SIGNING_SECRET) {
    const signature = request.headers.get('X-Migration-Signature');
    if (!signature) {
      return jsonResponse({ error: 'Missing X-Migration-Signature header.' }, 401);
    }

    const valid = await verifyHmacSignature(rawBody, signature, env.MIGRATION_SIGNING_SECRET);
    if (!valid) {
      return jsonResponse({ error: 'Invalid migration payload signature.' }, 401);
    }
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const parsed = MigrationRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return jsonResponse({
      error: 'Invalid migration payload.',
      details: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    }, 400);
  }

  const { payload } = parsed.data;

  const localTaskIds = new Set(payload.tasks.map((task) => task.id));
  for (const dependency of payload.dependencies) {
    if (!localTaskIds.has(dependency.task_id)) {
      return jsonResponse({ error: `Dependency references missing task_id: ${dependency.task_id}` }, 400);
    }
    if (!localTaskIds.has(dependency.depends_on)) {
      return jsonResponse({ error: `Dependency references missing depends_on: ${dependency.depends_on}` }, 400);
    }
  }

  const localSessionIds = new Set(payload.sessions.map((session) => session.id));
  for (const checkpoint of payload.checkpoints) {
    if (!localSessionIds.has(checkpoint.session_id)) {
      return jsonResponse({ error: `Checkpoint references missing session_id: ${checkpoint.session_id}` }, 400);
    }
  }

  const normalizedPayload: MigrationPayload = {
    tasks: payload.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      status: normalizeStatus(task.status),
      priority: normalizePriority(task.priority),
      issue_type: normalizeIssueType(task.issue_type),
      agent: task.agent ?? null,
      labels_json: task.labels_json,
      parent: task.parent ?? null,
      evidence: task.evidence ?? null,
      actual_cost_usd: task.actual_cost_usd ?? null,
      repo: task.repo ?? null,
      close_reason: task.close_reason ?? null,
      created_at: task.created_at ?? '',
      updated_at: task.updated_at ?? '',
    })),
    dependencies: payload.dependencies.map((dependency) => ({
      task_id: dependency.task_id,
      depends_on: dependency.depends_on,
      dep_type: dependency.dep_type,
      created_at: dependency.created_at ?? '',
    })),
    sessions: payload.sessions.map((session) => ({
      id: session.id,
      agent_id: session.agent_id,
      task_id: session.task_id,
      status: normalizeSessionStatus(session.status),
      started_at: session.started_at ?? '',
      ended_at: session.ended_at ?? null,
      working_dir: session.working_dir ?? null,
      git_branch: session.git_branch ?? null,
      last_checkpoint: session.last_checkpoint ?? null,
      context_json: session.context_json,
    })),
    checkpoints: payload.checkpoints.map((checkpoint) => ({
      id: checkpoint.id,
      session_id: checkpoint.session_id,
      sequence: checkpoint.sequence,
      summary: checkpoint.summary,
      context_json: checkpoint.context_json ?? null,
      git_commit: checkpoint.git_commit ?? null,
      created_at: checkpoint.created_at ?? '',
    })),
    agentExecutions: (payload.agentExecutions ?? []).map((execution) => ({
      agent_id: execution.agent_id,
      task_id: execution.task_id,
      task_type: execution.task_type ?? null,
      success: execution.success ? 1 : 0,
      duration_secs: execution.duration_secs,
      created_at: execution.created_at ?? '',
    })),
    agentProfiles: (payload.agentProfiles ?? []).map((profile) => ({
      id: profile.id,
      profile_json: profile.profile_json,
      updated_at: profile.updated_at ?? '',
    })),
    dispatchConfig: payload.dispatchConfig,
    modelsConfig: payload.modelsConfig,
    runtimeSettings: payload.runtimeSettings,
  };

  try {
    const result = await importSnapshot(env.DB, normalizedPayload);
    return jsonResponse({
      ok: true,
      counts: result.counts,
      imported_at: new Date().toISOString(),
      snapshot_version: parsed.data.snapshot_version ?? 'loom-remote-v2',
      source: parsed.data.source ?? 'unknown',
    });
  } catch (error) {
    return jsonResponse({
      error: 'Migration import failed.',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
