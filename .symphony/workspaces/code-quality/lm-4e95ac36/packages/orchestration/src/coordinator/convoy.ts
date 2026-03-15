/**
 * @create-something/orchestration
 *
 * Convoy creation and lifecycle management.
 * Convoys batch related issues for parallel execution within an epic.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { nanoid } from 'nanoid';
import type {
  Convoy,
  StoredConvoy,
  ConvoyCostTracker,
  ConvoyStatus,
  HealthReport,
  WorkerStatus,
} from '../types.js';

const execAsync = promisify(exec);

const CONVOY_DIR = '.orchestration/convoys';

/**
 * Generate convoy ID.
 */
export function generateConvoyId(): string {
  return `convoy-${nanoid(10)}`;
}

/**
 * Create a new convoy.
 *
 * Philosophy: Convoy is within an epic. An epic can have multiple convoys
 * for different batches of parallel work.
 */
export async function createConvoy(
  epicId: string,
  name: string,
  issueIds: string[],
  budget: number | null = null,
  cwd: string = process.cwd()
): Promise<Convoy> {
  const convoyId = generateConvoyId();
  const now = new Date().toISOString();

  const convoy: Convoy = {
    id: convoyId,
    epicId,
    name,
    issueIds,
    status: 'pending',
    createdAt: now,
    completedAt: null,
    workers: new Map(),
    costTracker: budget !== null ? { budget, consumed: 0, remaining: budget, exceeded: false, warnings: [] } : null,
  };

  // Save convoy to Git storage
  await saveConvoy(convoy, cwd);

  return convoy;
}

/**
 * Save convoy to Git storage.
 *
 * Philosophy: Convoys are committed to Git for persistence across crashes.
 */
export async function saveConvoy(convoy: Convoy, cwd: string = process.cwd()): Promise<void> {
  // Ensure convoy directory exists
  const epicDir = path.join(cwd, CONVOY_DIR, convoy.epicId);
  await fs.mkdir(epicDir, { recursive: true });

  // Create stored convoy with workers array
  const workers: WorkerStatus[] = Array.from(convoy.workers.entries()).map(([issueId, workerId]) => {
    // We don't have full worker status here, just the assignment
    // Full status comes from worker signals
    return {
      workerId,
      issueId,
      status: 'spawning',
      taskId: null,
      checkpoint: null,
      costUsd: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };
  });

  const costTracker: ConvoyCostTracker = {
    sessionCosts: {},
    workerCosts: {},
    convoyCost: 0,
    epicBudget: convoy.costTracker?.budget ?? null,
    epicRemaining: convoy.costTracker?.remaining ?? null,
  };

  const storedConvoy: StoredConvoy = {
    convoy,
    workers,
    costTracker,
    checkpointIds: [],
    createdAt: convoy.createdAt,
    updatedAt: new Date().toISOString(),
  };

  // Write convoy file
  const convoyPath = path.join(epicDir, `${convoy.id}.json`);
  await fs.writeFile(convoyPath, JSON.stringify(storedConvoy, null, 2), 'utf-8');

  // Commit to Git
  try {
    await execAsync(`git add "${convoyPath}"`, { cwd });
    await execAsync(
      `git commit -m "Convoy: ${convoy.name}\n\nConvoy ID: ${convoy.id}\nEpic: ${convoy.epicId}\nIssues: ${convoy.issueIds.join(', ')}"`,
      { cwd }
    );
  } catch (error) {
    console.warn('Failed to commit convoy to Git:', error);
  }
}

/**
 * Load a convoy by ID.
 */
export async function loadConvoy(
  convoyId: string,
  epicId?: string,
  cwd: string = process.cwd()
): Promise<{ convoy: Convoy; stored: StoredConvoy } | null> {
  // If epicId not provided, search all epic directories
  if (!epicId) {
    const convoyBaseDir = path.join(cwd, CONVOY_DIR);
    try {
      const epicDirs = await fs.readdir(convoyBaseDir);

      for (const dir of epicDirs) {
        const convoyPath = path.join(convoyBaseDir, dir, `${convoyId}.json`);
        try {
          const content = await fs.readFile(convoyPath, 'utf-8');
          const stored: StoredConvoy = JSON.parse(content);

          // Reconstruct convoy with Map
          const convoy = { ...stored.convoy, workers: new Map(Object.entries(stored.convoy.workers)) };

          return { convoy, stored };
        } catch (error) {
          // File doesn't exist in this epic dir, continue searching
          continue;
        }
      }

      return null; // Not found in any epic
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  // Epic ID provided, load directly
  const convoyPath = path.join(cwd, CONVOY_DIR, epicId, `${convoyId}.json`);

  try {
    const content = await fs.readFile(convoyPath, 'utf-8');
    const stored: StoredConvoy = JSON.parse(content);

    // Reconstruct convoy with Map
    const convoy = { ...stored.convoy, workers: new Map(Object.entries(stored.convoy.workers)) };

    return { convoy, stored };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * List all convoys for an epic.
 */
export async function listConvoys(epicId: string, cwd: string = process.cwd()): Promise<StoredConvoy[]> {
  const epicDir = path.join(cwd, CONVOY_DIR, epicId);

  try {
    const files = await fs.readdir(epicDir);
    const convoyFiles = files.filter((f) => f.startsWith('convoy-') && f.endsWith('.json'));

    const convoys = await Promise.all(
      convoyFiles.map(async (file) => {
        const filePath = path.join(epicDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const stored: StoredConvoy = JSON.parse(content);
        return stored;
      })
    );

    // Sort by creation time (newest first)
    convoys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return convoys;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Get convoy status with worker health.
 */
export async function getConvoyStatus(
  convoyId: string,
  epicId?: string,
  cwd: string = process.cwd()
): Promise<ConvoyStatus | null> {
  const loaded = await loadConvoy(convoyId, epicId, cwd);
  if (!loaded) return null;

  const { convoy, stored } = loaded;

  // Calculate health from worker statuses
  const health: HealthReport = {
    healthy: 0,
    completed: 0,
    failed: 0,
    stale: 0,
    staleWorkerIds: [],
  };

  const now = Date.now();
  const staleThresholdMs = 20 * 60 * 1000; // 20 minutes

  for (const worker of stored.workers) {
    if (worker.status === 'running') {
      // Check if stale (no checkpoint for 20+ minutes)
      const lastUpdate = worker.checkpoint
        ? new Date(worker.checkpoint).getTime()
        : new Date(worker.startedAt).getTime();

      if (now - lastUpdate > staleThresholdMs) {
        health.stale++;
        health.staleWorkerIds.push(worker.workerId);
      } else {
        health.healthy++;
      }
    } else if (worker.status === 'completed') {
      health.completed++;
    } else if (worker.status === 'failed') {
      health.failed++;
    }
  }

  // Calculate completion counts
  const completedIssues = stored.workers.filter((w) => w.status === 'completed').length;
  const failedIssues = stored.workers.filter((w) => w.status === 'failed').length;
  const inProgressIssues = stored.workers.filter((w) => w.status === 'running' || w.status === 'spawning').length;

  return {
    convoyId: convoy.id,
    name: convoy.name,
    status: convoy.status,
    totalIssues: convoy.issueIds.length,
    completedIssues,
    failedIssues,
    inProgressIssues,
    health,
    totalCost: stored.costTracker.convoyCost,
    budgetRemaining: stored.costTracker.epicRemaining,
    createdAt: convoy.createdAt,
    estimatedCompletion: null, // TODO: Estimate based on average worker time
  };
}

/**
 * Update convoy status.
 */
export async function updateConvoyStatus(
  convoyId: string,
  status: 'pending' | 'active' | 'completing' | 'completed' | 'failed',
  epicId?: string,
  cwd: string = process.cwd()
): Promise<void> {
  const loaded = await loadConvoy(convoyId, epicId, cwd);
  if (!loaded) {
    throw new Error(`Convoy ${convoyId} not found`);
  }

  const { convoy } = loaded;
  convoy.status = status;

  if (status === 'completed' || status === 'failed') {
    convoy.completedAt = new Date().toISOString();
  }

  await saveConvoy(convoy, cwd);
}

/**
 * Delete a convoy (destructive operation).
 */
export async function deleteConvoy(
  convoyId: string,
  epicId?: string,
  cwd: string = process.cwd()
): Promise<void> {
  const loaded = await loadConvoy(convoyId, epicId, cwd);
  if (!loaded) return;

  const { convoy } = loaded;
  const convoyPath = path.join(cwd, CONVOY_DIR, convoy.epicId, `${convoyId}.json`);

  try {
    await fs.unlink(convoyPath);

    // Commit deletion to Git
    try {
      await execAsync(`git add "${convoyPath}"`, { cwd });
      await execAsync(`git commit -m "Delete convoy: ${convoy.name}\n\nConvoy ID: ${convoyId}"`, { cwd });
    } catch (error) {
      console.warn('Failed to commit convoy deletion to Git:', error);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return; // Already deleted
    }
    throw error;
  }
}
