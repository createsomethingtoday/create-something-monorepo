import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { findMonorepoRoot, readJsonFile, writeJsonFile, generateId } from '../utils.js';
import { getCurrentCommit } from './git.js';
import type { AgentContext, Checkpoint } from '../types.js';

export function saveCheckpoint(context: AgentContext): string {
  const root = findMonorepoRoot();
  const checkpointDir = join(root, '.orchestration', 'checkpoints', context.sessionId);
  const checkpointId = generateId('ckpt');

  const checkpoint: Checkpoint = {
    id: checkpointId,
    sessionId: context.sessionId,
    context,
    gitCommit: getCurrentCommit(),
    timestamp: new Date().toISOString()
  };

  const checkpointPath = join(checkpointDir, `${checkpointId}.json`);
  writeJsonFile(checkpointPath, checkpoint);

  // Also write as "latest"
  const latestPath = join(checkpointDir, 'latest.json');
  writeJsonFile(latestPath, checkpoint);

  return checkpointId;
}

export function loadCheckpoint(checkpointId: string, sessionId?: string): AgentContext {
  const root = findMonorepoRoot();

  let checkpointPath: string;

  if (checkpointId === 'latest' && sessionId) {
    checkpointPath = join(root, '.orchestration', 'checkpoints', sessionId, 'latest.json');
  } else {
    // Try to find checkpoint by ID across all sessions
    const checkpointsRoot = join(root, '.orchestration', 'checkpoints');
    // This is simplified - in production, you'd search across session dirs
    if (sessionId) {
      checkpointPath = join(checkpointsRoot, sessionId, `${checkpointId}.json`);
    } else {
      throw new Error('sessionId required when loading checkpoint by ID');
    }
  }

  if (!existsSync(checkpointPath)) {
    throw new Error(`Checkpoint not found: ${checkpointId}`);
  }

  const checkpoint = readJsonFile<Checkpoint>(checkpointPath);
  if (!checkpoint) {
    throw new Error(`Failed to load checkpoint: ${checkpointId}`);
  }

  return checkpoint.context;
}

export function listCheckpoints(sessionId: string): Checkpoint[] {
  const root = findMonorepoRoot();
  const checkpointDir = join(root, '.orchestration', 'checkpoints', sessionId);

  if (!existsSync(checkpointDir)) {
    return [];
  }

  const files = readdirSync(checkpointDir).filter((f: string) =>
    f.endsWith('.json') && f !== 'latest.json'
  );

  return files
    .map((f: string) => readJsonFile<Checkpoint>(join(checkpointDir, f)))
    .filter((c): c is Checkpoint => c !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
