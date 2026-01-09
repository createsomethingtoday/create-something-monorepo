/**
 * @create-something/orchestration
 *
 * Worker pool management with Task subagent spawning.
 * Workers communicate via file-based signals.
 */

import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import type {
  Convoy,
  WorkerStatus,
  WorkerSignal,
  WorkerConfig,
  HealthReport,
} from '../types.js';
import type { BeadsIssue } from '@create-something/harness';

const WORKER_DIR = '.orchestration/workers';

/**
 * Generate worker ID.
 */
export function generateWorkerId(): string {
  return `worker-${nanoid(10)}`;
}

/**
 * Spawn a worker Task subagent for an issue.
 *
 * Philosophy: Task subagents run in background, communicate via file signals.
 * This is simpler than tmux and integrates natively with Claude Code.
 */
export async function spawnWorker(
  convoy: Convoy,
  issue: BeadsIssue,
  config: WorkerConfig
): Promise<WorkerStatus> {
  const workerId = generateWorkerId();
  const now = new Date().toISOString();

  // Write initial worker signal
  await writeWorkerSignal(
    {
      workerId,
      issueId: issue.id,
      status: 'running',
      costUsd: 0,
      updatedAt: now,
    },
    config.cwd
  );

  // Generate worker prompt
  const prompt = generateWorkerPrompt(convoy, issue, workerId, config);

  // Create worker status (Task spawn happens via CLI/API, not directly here)
  // In practice, this would call Claude Code's Task API
  // For now, we return the status and expect external orchestration
  const workerStatus: WorkerStatus = {
    workerId,
    issueId: issue.id,
    status: 'spawning',
    taskId: null, // Will be filled by external Task spawn
    checkpoint: null,
    costUsd: 0,
    startedAt: now,
    completedAt: null,
    error: null,
  };

  return workerStatus;
}

/**
 * Spawn multiple workers in parallel.
 */
export async function spawnWorkers(
  convoy: Convoy,
  issues: BeadsIssue[],
  config: WorkerConfig
): Promise<WorkerStatus[]> {
  return Promise.all(issues.map((issue) => spawnWorker(convoy, issue, config)));
}

/**
 * Generate prompt for a worker.
 *
 * Philosophy: Workers execute a single issue within convoy context.
 * They write checkpoints and signal completion via status files.
 */
function generateWorkerPrompt(
  convoy: Convoy,
  issue: BeadsIssue,
  workerId: string,
  config: WorkerConfig
): string {
  return `
You are a Convoy Worker (${workerId}) executing issue ${issue.id} within convoy ${convoy.id}.

## Issue Details

Title: ${issue.title}
Description: ${issue.description}

${issue.metadata?.seed?.acceptance?.length ? `## Acceptance Criteria\n\n${issue.metadata.seed.acceptance.map((a) => `- ${a.test}${a.verify ? `\n  Verify: ${a.verify}` : ''}`).join('\n')}\n` : ''}

## Your Responsibilities

1. Execute the work described in the issue
2. Create checkpoints every 15 minutes by calling:
   \`orch checkpoint create --reason "Progress update"\`
3. Write status updates to your signal file:
   \`.orchestration/workers/${workerId}/status.json\`
4. On completion:
   - Update issue status: \`bd update ${issue.id} --status completed\`
   - Write final signal with outcome
5. On error:
   - Write error signal
   - Document what failed

## Cost Tracking

${config.budget !== null ? `Budget for this worker: $${config.budget.toFixed(4)}\nTrack costs and stay within budget.` : 'No budget limit set.'}

## Signal Format

Write JSON to \`.orchestration/workers/${workerId}/status.json\`:

\`\`\`json
{
  "workerId": "${workerId}",
  "issueId": "${issue.id}",
  "status": "running" | "completed" | "failed",
  "outcome": "success" | "failure" | "partial",
  "checkpoint": "ckpt-xxx",
  "costUsd": 0.0,
  "error": "Error message if failed",
  "updatedAt": "ISO timestamp"
}
\`\`\`

## Checkpoints

Create checkpoints every 15 minutes:
\`\`\`bash
orch checkpoint create --reason "Worker ${workerId} progress"
\`\`\`

When you complete the work or encounter a fatal error, exit this session.
The coordinator will read your final signal and handle cleanup.
`.trim();
}

/**
 * Read worker signal file.
 */
export async function readWorkerSignal(
  workerId: string,
  cwd: string = process.cwd()
): Promise<WorkerSignal | null> {
  const signalPath = path.join(cwd, WORKER_DIR, workerId, 'status.json');

  try {
    const content = await fs.readFile(signalPath, 'utf-8');
    return JSON.parse(content) as WorkerSignal;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Write worker signal file.
 */
export async function writeWorkerSignal(signal: WorkerSignal, cwd: string = process.cwd()): Promise<void> {
  const workerDir = path.join(cwd, WORKER_DIR, signal.workerId);
  await fs.mkdir(workerDir, { recursive: true });

  const signalPath = path.join(workerDir, 'status.json');
  await fs.writeFile(signalPath, JSON.stringify(signal, null, 2), 'utf-8');
}

/**
 * Poll worker status by reading signal files.
 *
 * Philosophy: Polling-based monitoring (Phase 2).
 * Full witness pattern comes in Phase 3.
 */
export async function pollWorkerStatus(
  convoy: Convoy,
  workers: WorkerStatus[],
  cwd: string = process.cwd()
): Promise<WorkerStatus[]> {
  const updatedWorkers = await Promise.all(
    workers.map(async (worker) => {
      const signal = await readWorkerSignal(worker.workerId, cwd);

      if (!signal) {
        // No signal yet, worker still spawning or signal not written
        return worker;
      }

      // Update worker status from signal
      const status: 'spawning' | 'running' | 'completed' | 'failed' =
        signal.status === 'completed' || signal.status === 'failed' ? signal.status : 'running';

      return {
        ...worker,
        status,
        checkpoint: signal.checkpoint || worker.checkpoint,
        costUsd: signal.costUsd,
        completedAt: signal.status === 'completed' || signal.status === 'failed' ? signal.updatedAt : null,
        error: signal.error || null,
      };
    })
  );

  return updatedWorkers;
}

/**
 * Check worker health.
 *
 * Philosophy: Detect stale workers (>20 min no checkpoint).
 * In Phase 2, we just log warnings. Phase 3 adds intervention.
 */
export async function checkWorkerHealth(
  convoy: Convoy,
  workers: WorkerStatus[],
  cwd: string = process.cwd()
): Promise<HealthReport> {
  const now = Date.now();
  const staleThresholdMs = 20 * 60 * 1000; // 20 minutes

  const staleWorkers: string[] = [];
  let healthy = 0;
  let completed = 0;
  let failed = 0;

  for (const worker of workers) {
    if (worker.status === 'running') {
      const lastUpdate = worker.checkpoint
        ? new Date(worker.checkpoint).getTime()
        : new Date(worker.startedAt).getTime();

      if (now - lastUpdate > staleThresholdMs) {
        staleWorkers.push(worker.workerId);
      } else {
        healthy++;
      }
    } else if (worker.status === 'completed') {
      completed++;
    } else if (worker.status === 'failed') {
      failed++;
    }
  }

  if (staleWorkers.length > 0) {
    console.warn(`Warning: ${staleWorkers.length} workers appear stale (no checkpoint in 20+ minutes)`);
    console.warn('Stale workers:', staleWorkers.join(', '));
  }

  return {
    healthy,
    completed,
    failed,
    stale: staleWorkers.length,
    staleWorkerIds: staleWorkers,
  };
}

/**
 * Terminate a worker (cleanup).
 *
 * In Phase 2, this is manual cleanup. Phase 3 adds Task termination.
 */
export async function terminateWorker(workerId: string, cwd: string = process.cwd()): Promise<void> {
  // Write termination signal
  await writeWorkerSignal(
    {
      workerId,
      issueId: 'unknown', // We don't have issue context here
      status: 'failed',
      error: 'Worker terminated by coordinator',
      costUsd: 0,
      updatedAt: new Date().toISOString(),
    },
    cwd
  );

  console.log(`Worker ${workerId} terminated`);
}

/**
 * List all workers for a convoy.
 */
export async function listWorkers(convoy: Convoy, cwd: string = process.cwd()): Promise<WorkerStatus[]> {
  const workerDir = path.join(cwd, WORKER_DIR);

  try {
    const workerIds = await fs.readdir(workerDir);
    const workers: WorkerStatus[] = [];

    for (const workerId of workerIds) {
      const signal = await readWorkerSignal(workerId, cwd);
      if (!signal) continue;

      // Check if worker belongs to this convoy (by issue ID)
      if (!convoy.issueIds.includes(signal.issueId)) {
        continue;
      }

      const status: 'spawning' | 'running' | 'completed' | 'failed' =
        signal.status === 'completed' || signal.status === 'failed' ? signal.status : 'running';

      workers.push({
        workerId,
        issueId: signal.issueId,
        status,
        taskId: null, // Not stored in signal
        checkpoint: signal.checkpoint || null,
        costUsd: signal.costUsd,
        startedAt: signal.updatedAt, // Approximate
        completedAt: signal.status === 'completed' || signal.status === 'failed' ? signal.updatedAt : null,
        error: signal.error || null,
      });
    }

    return workers;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
