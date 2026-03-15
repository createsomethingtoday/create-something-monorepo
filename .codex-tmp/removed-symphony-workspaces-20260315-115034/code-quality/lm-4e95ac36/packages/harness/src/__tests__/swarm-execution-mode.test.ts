import { describe, expect, it } from 'vitest';
import { buildSwarmBranchName, buildSwarmWorktreePath, sanitizeIssueIdForRef } from '../runner.js';
import { DEFAULT_SWARM_CONFIG } from '../types.js';

describe('Swarm execution mode defaults', () => {
  it('defaults to isolated_worktree', () => {
    expect(DEFAULT_SWARM_CONFIG.executionMode).toBe('isolated_worktree');
  });
});

describe('Swarm worktree naming', () => {
  it('sanitizes issue ids for git refs', () => {
    expect(sanitizeIssueIdForRef('CSM/ABC 123')).toBe('csm-abc-123');
    expect(sanitizeIssueIdForRef('---')).toBe('issue');
  });

  it('builds deterministic branch names', () => {
    const branch = buildSwarmBranchName('harness-main', 'csm-123');
    expect(branch).toBe('harness/swarm/harness-main/csm-123');
  });

  it('builds deterministic worktree paths', () => {
    const path = buildSwarmWorktreePath('/tmp/repo', 'csm-123');
    expect(path).toBe('/tmp/repo/.harness/worktrees/csm-123');
  });
});
