/**
 * @create-something/orchestration
 *
 * Git-based checkpoint storage.
 * Checkpoints are committed to .orchestration/checkpoints/{epicId}/ for persistence.
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { StoredCheckpoint, OrchestrationContext } from '../types.js';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

const CHECKPOINT_DIR = '.orchestration/checkpoints';

/**
 * Save a checkpoint to Git storage.
 *
 * Philosophy: Checkpoints must survive crashes, so they're committed to Git.
 * The Git history becomes the audit trail of orchestration sessions.
 */
export async function saveCheckpoint(
  context: OrchestrationContext,
  reason: string,
  summary: string,
  sessionId: string,
  cwd: string = process.cwd()
): Promise<StoredCheckpoint> {
  // Generate checkpoint ID
  const checkpointId = `ckpt-${nanoid(10)}`;

  // Get current git commit
  let gitCommit: string;
  try {
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd });
    gitCommit = stdout.trim();
  } catch (error) {
    console.warn('Failed to get git commit, using "unknown"');
    gitCommit = 'unknown';
  }

  // Create checkpoint object
  const checkpoint: StoredCheckpoint = {
    id: checkpointId,
    epicId: context.epicId,
    sessionId,
    sessionNumber: context.sessionNumber,
    timestamp: new Date().toISOString(),
    gitCommit,
    context: { ...context, capturedAt: new Date().toISOString() },
    summary,
    reason,
  };

  // Ensure checkpoint directory exists
  const epicDir = path.join(cwd, CHECKPOINT_DIR, context.epicId);
  await fs.mkdir(epicDir, { recursive: true });

  // Write checkpoint file
  const checkpointPath = path.join(epicDir, `${checkpointId}.json`);
  await fs.writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');

  // Commit checkpoint to Git
  try {
    await execAsync(`git add "${checkpointPath}"`, { cwd });
    await execAsync(
      `git commit -m "Checkpoint: ${context.epicId} session ${context.sessionNumber}\n\nReason: ${reason}\nCheckpoint ID: ${checkpointId}"`,
      { cwd }
    );
  } catch (error) {
    console.warn('Failed to commit checkpoint to Git:', error);
  }

  return checkpoint;
}

/**
 * Load the latest checkpoint for an epic.
 *
 * Returns null if no checkpoints exist.
 */
export async function loadLatestCheckpoint(
  epicId: string,
  cwd: string = process.cwd()
): Promise<StoredCheckpoint | null> {
  const epicDir = path.join(cwd, CHECKPOINT_DIR, epicId);

  try {
    const files = await fs.readdir(epicDir);
    const checkpointFiles = files.filter((f) => f.startsWith('ckpt-') && f.endsWith('.json'));

    if (checkpointFiles.length === 0) {
      return null;
    }

    // Sort by modification time (latest first)
    const filesWithStats = await Promise.all(
      checkpointFiles.map(async (file) => {
        const filePath = path.join(epicDir, file);
        const stats = await fs.stat(filePath);
        return { file, mtime: stats.mtime };
      })
    );

    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Load the latest checkpoint
    const latestFile = filesWithStats[0].file;
    const checkpointPath = path.join(epicDir, latestFile);
    const content = await fs.readFile(checkpointPath, 'utf-8');
    return JSON.parse(content) as StoredCheckpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // Directory doesn't exist yet
    }
    throw error;
  }
}

/**
 * Load a specific checkpoint by ID.
 */
export async function loadCheckpoint(
  epicId: string,
  checkpointId: string,
  cwd: string = process.cwd()
): Promise<StoredCheckpoint | null> {
  const checkpointPath = path.join(cwd, CHECKPOINT_DIR, epicId, `${checkpointId}.json`);

  try {
    const content = await fs.readFile(checkpointPath, 'utf-8');
    return JSON.parse(content) as StoredCheckpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * List all checkpoints for an epic.
 */
export async function listCheckpoints(
  epicId: string,
  cwd: string = process.cwd()
): Promise<StoredCheckpoint[]> {
  const epicDir = path.join(cwd, CHECKPOINT_DIR, epicId);

  try {
    const files = await fs.readdir(epicDir);
    const checkpointFiles = files.filter((f) => f.startsWith('ckpt-') && f.endsWith('.json'));

    const checkpoints = await Promise.all(
      checkpointFiles.map(async (file) => {
        const filePath = path.join(epicDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as StoredCheckpoint;
      })
    );

    // Sort by timestamp (newest first)
    checkpoints.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return checkpoints;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []; // Directory doesn't exist yet
    }
    throw error;
  }
}

/**
 * Check if an epic has any checkpoints.
 */
export async function hasCheckpoints(epicId: string, cwd: string = process.cwd()): Promise<boolean> {
  const epicDir = path.join(cwd, CHECKPOINT_DIR, epicId);

  try {
    const files = await fs.readdir(epicDir);
    return files.some((f) => f.startsWith('ckpt-') && f.endsWith('.json'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Delete all checkpoints for an epic.
 * WARNING: This is destructive.
 */
export async function deleteEpicCheckpoints(
  epicId: string,
  cwd: string = process.cwd()
): Promise<void> {
  const epicDir = path.join(cwd, CHECKPOINT_DIR, epicId);

  try {
    await fs.rm(epicDir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return; // Already doesn't exist
    }
    throw error;
  }
}
