import { describe, expect, it } from 'vitest';
import {
  assertUniqueSwarmIssueIds,
  buildSwarmBranchName,
  buildSwarmWorktreePath,
  findDuplicateSwarmIssueIds,
  sanitizeIssueIdForRef,
} from '../runner.js';
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

  it('namespaces branch names across swarm workers', () => {
    const firstBranch = buildSwarmBranchName('harness-main', 'csm-123', 'swarm-alpha-agent-000');
    const secondBranch = buildSwarmBranchName('harness-main', 'csm-123', 'swarm-beta-agent-000');

    expect(firstBranch).toBe('harness/swarm/harness-main/csm-123/swarm-alpha-agent-000');
    expect(firstBranch).not.toBe(secondBranch);
  });

  it('builds deterministic worktree paths scoped to the harness run', () => {
    const path = buildSwarmWorktreePath('/tmp/repo', 'harness-main', 'csm-123');
    expect(path).toBe('/tmp/repo/.harness/worktrees/harness-main/csm-123');
  });

  it('namespaces worktree paths across swarm workers in the same harness run', () => {
    const firstPath = buildSwarmWorktreePath('/tmp/repo', 'harness-main', 'csm-123', 'swarm-alpha-agent-000');
    const secondPath = buildSwarmWorktreePath('/tmp/repo', 'harness-main', 'csm-123', 'swarm-beta-agent-000');

    expect(firstPath).toBe('/tmp/repo/.harness/worktrees/harness-main/csm-123/swarm-alpha-agent-000');
    expect(firstPath).not.toBe(secondPath);
  });

  it('namespaces the same issue id across different harness runs', () => {
    const firstPath = buildSwarmWorktreePath('/tmp/repo', 'harness-alpha', 'csm-123');
    const secondPath = buildSwarmWorktreePath('/tmp/repo', 'harness-beta', 'csm-123');

    expect(firstPath).not.toBe(secondPath);
  });

  it('finds duplicate issue ids before starting a swarm batch', () => {
    const duplicateIssueIds = findDuplicateSwarmIssueIds([
      { id: 'csm-123' },
      { id: 'csm-456' },
      { id: 'csm-123' },
      { id: 'csm-456' },
    ]);

    expect(duplicateIssueIds).toEqual(['csm-123', 'csm-456']);
  });

  it('rejects duplicate issue ids inside a swarm batch', () => {
    expect(() =>
      assertUniqueSwarmIssueIds([
        { id: 'csm-123' },
        { id: 'csm-123' },
      ])
    ).toThrow('Swarm batch contains duplicate issue ids: csm-123');
  });
});
