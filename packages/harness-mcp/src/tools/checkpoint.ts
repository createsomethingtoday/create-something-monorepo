import { isAbsolute, relative, resolve } from 'path';
import { existsSync, readdirSync } from 'fs';
import { findMonorepoRoot, readJsonFile, writeJsonFile, generateId } from '../utils.js';
import { getCurrentCommit } from './git.js';
import type { AgentContext, Checkpoint } from '../types.js';

const SAFE_CHECKPOINT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function validatePathId(value: string, label: 'sessionId' | 'checkpointId'): string {
  if (!SAFE_CHECKPOINT_ID.test(value)) {
    throw new Error(`Invalid ${label}: use 1-128 letters, numbers, dots, underscores, or hyphens`);
  }
  return value;
}

function containedPath(root: string, ...parts: string[]): string {
  const target = resolve(root, ...parts);
  const relativeTarget = relative(root, target);
  if (relativeTarget === '..' || relativeTarget.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(relativeTarget)) {
    throw new Error('Checkpoint path escapes the checkpoint root');
  }
  return target;
}

function checkpointsRoot(root: string): string {
  return resolve(root, '.orchestration', 'checkpoints');
}

export function saveCheckpoint(context: AgentContext): string {
  const root = findMonorepoRoot();
  const sessionId = validatePathId(context.sessionId, 'sessionId');
  const checkpointRoot = checkpointsRoot(root);
  const checkpointDir = containedPath(checkpointRoot, sessionId);
  const checkpointId = generateId('ckpt');

  const checkpoint: Checkpoint = {
    id: checkpointId,
    sessionId: context.sessionId,
    context,
    gitCommit: getCurrentCommit(),
    timestamp: new Date().toISOString()
  };

  const checkpointPath = containedPath(checkpointDir, `${checkpointId}.json`);
  writeJsonFile(checkpointPath, checkpoint);

  // Also write as "latest"
  const latestPath = containedPath(checkpointDir, 'latest.json');
  writeJsonFile(latestPath, checkpoint);

  return checkpointId;
}

export function loadCheckpoint(checkpointId: string, sessionId?: string): AgentContext {
  const root = findMonorepoRoot();
  const checkpointRoot = checkpointsRoot(root);
  const safeSessionId = sessionId ? validatePathId(sessionId, 'sessionId') : undefined;

  let checkpointPath: string;

  if (checkpointId === 'latest' && safeSessionId) {
    checkpointPath = containedPath(checkpointRoot, safeSessionId, 'latest.json');
  } else {
    // Try to find checkpoint by ID across all sessions
    const safeCheckpointId = validatePathId(checkpointId, 'checkpointId');
    // This is simplified - in production, you'd search across session dirs
    if (safeSessionId) {
      checkpointPath = containedPath(checkpointRoot, safeSessionId, `${safeCheckpointId}.json`);
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
  const safeSessionId = validatePathId(sessionId, 'sessionId');
  const checkpointDir = containedPath(checkpointsRoot(root), safeSessionId);

  if (!existsSync(checkpointDir)) {
    return [];
  }

  const files = readdirSync(checkpointDir).filter((f: string) =>
    f.endsWith('.json') && f !== 'latest.json'
  );

  return files
    .map((f: string) => readJsonFile<Checkpoint>(containedPath(checkpointDir, f)))
    .filter((c): c is Checkpoint => c !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
