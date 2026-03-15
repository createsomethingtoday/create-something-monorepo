/**
 * @create-something/harness
 *
 * Model Routing Tests: Verify that tasks route to appropriate models based on complexity.
 */

import { describe, it, expect } from 'vitest';
import { selectModelForTask } from '../runner.js';
import type { BeadsIssue } from '../types.js';

/**
 * Helper to create a mock Beads issue for testing.
 */
function createMockIssue(
  title: string,
  options: {
    labels?: string[];
    description?: string;
    priority?: number;
  } = {}
): BeadsIssue {
  return {
    id: 'test-issue-001',
    title,
    description: options.description || '',
    status: 'open',
    priority: options.priority ?? 2,
    issue_type: 'task',
    labels: options.labels || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    closed_at: null,
  };
}

describe('Model Routing', () => {
  describe('Explicit model labels', () => {
    it('should use haiku when model:haiku label is present', () => {
      const issue = createMockIssue('Complex architectural refactor', {
        labels: ['model:haiku'],
      });
      expect(selectModelForTask(issue)).toBe('haiku');
    });

    it('should use sonnet when model:sonnet label is present', () => {
      const issue = createMockIssue('Fix typo in README', {
        labels: ['model:sonnet'],
      });
      expect(selectModelForTask(issue)).toBe('sonnet');
    });

    it('should use opus when model:opus label is present', () => {
      const issue = createMockIssue('Rename variable', {
        labels: ['model:opus'],
      });
      expect(selectModelForTask(issue)).toBe('opus');
    });
  });

  describe('Complexity-based routing', () => {
    it('should route trivial complexity to haiku', () => {
      const issue = createMockIssue('Fix typo in variable name', {
        labels: ['complexity:trivial'],
      });
      expect(selectModelForTask(issue)).toBe('haiku');
    });

    it('should route simple complexity to sonnet', () => {
      const issue = createMockIssue('Add validation to form field', {
        labels: ['complexity:simple'],
      });
      expect(selectModelForTask(issue)).toBe('sonnet');
    });

    it('should route standard complexity to sonnet', () => {
      const issue = createMockIssue('Implement user registration endpoint', {
        labels: ['complexity:standard'],
      });
      expect(selectModelForTask(issue)).toBe('sonnet');
    });

    it('should route complex complexity to opus', () => {
      const issue = createMockIssue('Design distributed caching architecture', {
        labels: ['complexity:complex'],
      });
      expect(selectModelForTask(issue)).toBe('opus');
    });
  });

  describe('Pattern-based routing (fallback)', () => {
    it('should route simple mechanical tasks to haiku', () => {
      const patterns = ['rename variable', 'fix typo', 'add comment', 'update import', 'remove unused export'];

      for (const pattern of patterns) {
        const issue = createMockIssue(pattern);
        expect(selectModelForTask(issue)).toBe('haiku');
      }
    });

    it('should route standard implementations to sonnet', () => {
      const patterns = ['add button component', 'update login page', 'fix validation bug', 'implement search endpoint'];

      for (const pattern of patterns) {
        const issue = createMockIssue(pattern);
        expect(selectModelForTask(issue)).toBe('sonnet');
      }
    });

    it('should route complex tasks to opus', () => {
      const patterns = ['architect microservices', 'design new system', 'refactor authentication', 'migrate database'];

      for (const pattern of patterns) {
        const issue = createMockIssue(pattern);
        expect(selectModelForTask(issue)).toBe('opus');
      }
    });

    it('should default to sonnet for unmatched patterns', () => {
      const issue = createMockIssue('Do something unspecified');
      expect(selectModelForTask(issue)).toBe('sonnet');
    });
  });

  describe('Priority hierarchy', () => {
    it('should prioritize explicit model labels over complexity labels', () => {
      const issue = createMockIssue('Complex task', {
        labels: ['complexity:complex', 'model:haiku'],
      });
      expect(selectModelForTask(issue)).toBe('haiku');
    });

    it('should prioritize complexity labels over pattern matching', () => {
      const issue = createMockIssue('architect new system', {
        labels: ['complexity:trivial'], // Explicitly marked as trivial despite "architect" pattern
      });
      expect(selectModelForTask(issue)).toBe('haiku');
    });
  });

  describe('Cost optimization', () => {
    it('should use cheaper models for simple tasks', () => {
      const trivialIssue = createMockIssue('Fix typo', { labels: ['complexity:trivial'] });
      const simpleIssue = createMockIssue('Add field', { labels: ['complexity:simple'] });

      // Haiku is ~5% of Opus cost
      expect(selectModelForTask(trivialIssue)).toBe('haiku');
      // Sonnet is ~20% of Opus cost
      expect(selectModelForTask(simpleIssue)).toBe('sonnet');
    });

    it('should reserve opus for genuinely complex work', () => {
      const complexIssue = createMockIssue('Design distributed system', {
        labels: ['complexity:complex'],
      });
      expect(selectModelForTask(complexIssue)).toBe('opus');
    });
  });

  describe('Mixed complexity batches', () => {
    it('should route different complexity tasks to different models', () => {
      const tasks = [
        { title: 'Fix typo', labels: ['complexity:trivial'], expectedModel: 'haiku' as const },
        { title: 'Add component', labels: ['complexity:simple'], expectedModel: 'sonnet' as const },
        { title: 'Standard feature', labels: ['complexity:standard'], expectedModel: 'sonnet' as const },
        { title: 'Architectural design', labels: ['complexity:complex'], expectedModel: 'opus' as const },
      ];

      for (const task of tasks) {
        const issue = createMockIssue(task.title, { labels: task.labels });
        expect(selectModelForTask(issue)).toBe(task.expectedModel);
      }
    });
  });
});
