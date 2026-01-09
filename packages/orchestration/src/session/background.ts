/**
 * @create-something/orchestration
 *
 * Background convoy execution.
 * Enables autonomous background execution with active monitoring.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import type { Convoy, WorkerConfig, WorkerStatus } from '../types.js';
import { getIssue } from '../integration/beads.js';
import { loadConvoy, saveConvoy } from '../coordinator/convoy.js';
import { generateWorkerId, writeWorkerSignal } from '../coordinator/worker-pool.js';

const execAsync = promisify(exec);

/**
 * Background execution configuration.
 */
export interface BackgroundConfig {
  convoy: Convoy;
  detach: boolean;           // Exit coordinator after spawn
  witnessEnabled: boolean;   // Launch witness monitoring
  workerConfig?: Partial<WorkerConfig>;
}

/**
 * Task spawning result (for tracking what was attempted).
 */
interface TaskSpawnResult {
  method: 'task-api' | 'cli-wrapper' | 'manual';
  success: boolean;
  taskId?: string;
  error?: string;
  instructions?: string;
}

/**
 * Start a convoy in background mode.
 *
 * Philosophy: Coordinator spawns workers, optionally launches witness, then exits.
 * Workers continue in background. Witness monitors and intervenes autonomously.
 *
 * Three-tier approach (Task API not yet exposed programmatically):
 * 1. Direct Task API (future)
 * 2. CLI wrapper via claude --background (interim)
 * 3. Manual Ctrl+B (current)
 */
export async function startBackgroundConvoy(config: BackgroundConfig): Promise<void> {
  console.log(`Starting background convoy: ${config.convoy.id}`);
  console.log(`Issues: ${config.convoy.issueIds.length}`);
  console.log(`Witness: ${config.witnessEnabled ? 'enabled' : 'disabled'}`);
  console.log('');

  // 1. Spawn workers as background tasks
  const spawnResults: TaskSpawnResult[] = [];

  for (const issueId of config.convoy.issueIds) {
    const issue = await getIssue(issueId);
    if (!issue) {
      console.warn(`Issue ${issueId} not found, skipping`);
      continue;
    }

    console.log(`Spawning worker for ${issueId}...`);

    const result = await spawnWorkerInBackground(
      config.convoy,
      issue,
      config.workerConfig || {}
    );

    spawnResults.push(result);

    if (result.success) {
      console.log(`  ✓ Worker spawned (${result.method})`);
    } else {
      console.warn(`  ✗ Failed to spawn worker: ${result.error}`);
      if (result.instructions) {
        console.log(`  → ${result.instructions}`);
      }
    }
  }

  console.log('');

  // 2. Launch witness if enabled
  if (config.witnessEnabled) {
    console.log('Launching witness monitor...');
    const witnessResult = await spawnWitnessInBackground(config.convoy);

    if (witnessResult.success) {
      console.log(`  ✓ Witness spawned (${witnessResult.method})`);
    } else {
      console.warn(`  ✗ Failed to spawn witness: ${witnessResult.error}`);
      if (witnessResult.instructions) {
        console.log(`  → ${witnessResult.instructions}`);
      }
    }

    console.log('');
  }

  // 3. Exit coordinator if detach enabled
  if (config.detach) {
    console.log('Convoy running in background.');
    console.log('');
    console.log('Monitor status:');
    console.log(`  orch convoy show ${config.convoy.id}`);
    console.log('');
    console.log('Workers will continue autonomously.');
    console.log('Witness will monitor health and intervene as needed.');
    console.log('');

    // Give workers a moment to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    process.exit(0);
  }
}

/**
 * Spawn a worker in background mode using three-tier approach.
 */
async function spawnWorkerInBackground(
  convoy: Convoy,
  issue: any,
  config: Partial<WorkerConfig>
): Promise<TaskSpawnResult> {
  const workerId = generateWorkerId();

  // Write initial worker signal (status: spawning)
  await writeWorkerSignal({
    workerId,
    issueId: issue.id,
    status: 'running', // Start as running
    costUsd: 0,
    updatedAt: new Date().toISOString()
  });

  // Record worker in convoy
  const loaded = await loadConvoy(convoy.id, convoy.epicId);
  if (loaded) {
    loaded.convoy.workers.set(issue.id, workerId);
    await saveConvoy(loaded.convoy);
  }

  // Tier 1: Try direct Task API (not yet available)
  const tier1 = await tryDirectTaskAPI(workerId, convoy, issue, config);
  if (tier1.success) {
    return tier1;
  }

  // Tier 2: Try CLI wrapper
  const tier2 = await tryCLIWrapper(workerId, convoy, issue, config);
  if (tier2.success) {
    return tier2;
  }

  // Tier 3: Manual instructions (current approach)
  return {
    method: 'manual',
    success: true,
    instructions: `Background worker ${workerId} for ${issue.id}. Use Ctrl+B to background the session.`
  };
}

/**
 * Tier 1: Try direct Task API (future).
 */
async function tryDirectTaskAPI(
  workerId: string,
  convoy: Convoy,
  issue: any,
  config: Partial<WorkerConfig>
): Promise<TaskSpawnResult> {
  // Task API not yet exposed programmatically
  // This is a placeholder for future implementation
  return {
    method: 'task-api',
    success: false,
    error: 'Task API not yet available'
  };
}

/**
 * Tier 2: Try CLI wrapper (interim).
 */
async function tryCLIWrapper(
  workerId: string,
  convoy: Convoy,
  issue: any,
  config: Partial<WorkerConfig>
): Promise<TaskSpawnResult> {
  try {
    // Attempt to spawn via claude CLI with --background flag
    // This is theoretical - the actual CLI may not support this yet

    const prompt = generateWorkerPrompt(convoy, issue, workerId);

    const { stdout, stderr } = await execAsync(
      `claude --background "${prompt}"`,
      { timeout: 5000 }
    );

    // Check if stdout contains a task ID
    const taskIdMatch = stdout.match(/task-[a-zA-Z0-9]+/);

    if (taskIdMatch) {
      return {
        method: 'cli-wrapper',
        success: true,
        taskId: taskIdMatch[0]
      };
    }

    return {
      method: 'cli-wrapper',
      success: false,
      error: 'No task ID returned from CLI'
    };
  } catch (error) {
    return {
      method: 'cli-wrapper',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Spawn witness monitor in background.
 */
async function spawnWitnessInBackground(convoy: Convoy): Promise<TaskSpawnResult> {
  // Same three-tier approach as workers

  // Tier 1: Direct Task API
  const tier1 = await tryDirectWitnessAPI(convoy);
  if (tier1.success) {
    return tier1;
  }

  // Tier 2: CLI wrapper
  const tier2 = await tryCLIWitnessWrapper(convoy);
  if (tier2.success) {
    return tier2;
  }

  // Tier 3: Manual instructions
  return {
    method: 'manual',
    success: true,
    instructions: `Run: orch witness start ${convoy.id}`
  };
}

async function tryDirectWitnessAPI(convoy: Convoy): Promise<TaskSpawnResult> {
  // Placeholder for future implementation
  return {
    method: 'task-api',
    success: false,
    error: 'Task API not yet available'
  };
}

async function tryCLIWitnessWrapper(convoy: Convoy): Promise<TaskSpawnResult> {
  try {
    const prompt = `Monitor convoy ${convoy.id} for worker health. Use orchestration witness pattern.`;

    const { stdout } = await execAsync(
      `claude --background "${prompt}"`,
      { timeout: 5000 }
    );

    const taskIdMatch = stdout.match(/task-[a-zA-Z0-9]+/);

    if (taskIdMatch) {
      return {
        method: 'cli-wrapper',
        success: true,
        taskId: taskIdMatch[0]
      };
    }

    return {
      method: 'cli-wrapper',
      success: false,
      error: 'No task ID returned'
    };
  } catch (error) {
    return {
      method: 'cli-wrapper',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate worker prompt from convoy and issue context.
 */
function generateWorkerPrompt(convoy: Convoy, issue: any, workerId: string): string {
  return `
Execute issue ${issue.id} for convoy ${convoy.id}.

Worker ID: ${workerId}

Issue: ${issue.title}
${issue.description || ''}

Protocol:
1. Check hook: gt hook (if Gastown installed)
2. Read issue: bd show ${issue.id}
3. Execute work autonomously
4. Run tests
5. Commit with issue reference
6. Signal completion: write worker signal to .orchestration/workers/${workerId}/status.json

Work until completion, then signal via worker status file.
  `.trim();
}

/**
 * Attach to a running background convoy.
 *
 * Allows coordinator to reconnect to a detached convoy.
 */
export async function attachToBackgroundConvoy(
  convoyId: string,
  epicId?: string
): Promise<void> {
  const loaded = await loadConvoy(convoyId, epicId);

  if (!loaded) {
    throw new Error(`Convoy ${convoyId} not found`);
  }

  console.log(`Attaching to convoy: ${loaded.convoy.id}`);
  console.log(`Status: ${loaded.convoy.status}`);
  console.log(`Workers: ${loaded.convoy.workers.size}`);
  console.log('');

  // Show current worker status
  console.log('Worker Status:');
  for (const [issueId, workerId] of loaded.convoy.workers.entries()) {
    const signalPath = path.join(
      process.cwd(),
      '.orchestration',
      'workers',
      workerId,
      'status.json'
    );

    try {
      const signalContent = await fs.readFile(signalPath, 'utf-8');
      const signal = JSON.parse(signalContent);
      console.log(`  ${issueId}: ${signal.status} (cost: $${signal.costUsd.toFixed(4)})`);
    } catch (error) {
      console.log(`  ${issueId}: unknown (no signal file)`);
    }
  }

  console.log('');
  console.log('Attached to convoy. Use orch convoy show for detailed status.');
}

/**
 * Gracefully detach from convoy.
 *
 * Exits coordinator cleanly, workers continue.
 */
export function detachFromConvoy(convoyId: string): void {
  console.log(`Detaching from convoy: ${convoyId}`);
  console.log('Workers will continue in background.');
  console.log('');
  console.log(`Reattach with: orch convoy attach ${convoyId}`);
  console.log('');

  process.exit(0);
}

/**
 * Check if convoy is running in background.
 *
 * Useful for CLI to determine if attach vs start is needed.
 */
export async function isConvoyInBackground(
  convoyId: string,
  epicId?: string
): Promise<boolean> {
  const loaded = await loadConvoy(convoyId, epicId);

  if (!loaded) {
    return false;
  }

  // Check if any workers have recent status updates
  const now = Date.now();
  const recentThreshold = 5 * 60 * 1000; // 5 minutes

  for (const [issueId, workerId] of loaded.convoy.workers.entries()) {
    const signalPath = path.join(
      process.cwd(),
      '.orchestration',
      'workers',
      workerId,
      'status.json'
    );

    try {
      const signalContent = await fs.readFile(signalPath, 'utf-8');
      const signal = JSON.parse(signalContent);

      const lastUpdate = new Date(signal.updatedAt).getTime();

      if (now - lastUpdate < recentThreshold) {
        // At least one worker updated recently = running
        return true;
      }
    } catch (error) {
      // Signal file missing or invalid
      continue;
    }
  }

  return false;
}
