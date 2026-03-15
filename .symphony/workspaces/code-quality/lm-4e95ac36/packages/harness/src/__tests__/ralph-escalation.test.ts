import { describe, it, expect } from 'vitest';
import {
  selectModel,
  estimateCost,
  generateRalphCommand,
  generateBaselinePrompt,
  type EscalationConfig,
  DEFAULT_ESCALATION,
} from '../ralph-escalation';

describe('Ralph Escalation', () => {
  const config: EscalationConfig = {
    enabled: true,
    initialModel: 'haiku',
    escalationThreshold: 5,
    maxEscalations: 2,
  };

  describe('selectModel', () => {
    it('starts with haiku for iterations 0-4', () => {
      expect(selectModel(0, config)).toBe('haiku');
      expect(selectModel(1, config)).toBe('haiku');
      expect(selectModel(4, config)).toBe('haiku');
    });

    it('escalates to sonnet at iteration 5', () => {
      expect(selectModel(5, config)).toBe('sonnet');
      expect(selectModel(6, config)).toBe('sonnet');
      expect(selectModel(9, config)).toBe('sonnet');
    });

    it('escalates to opus at iteration 10', () => {
      expect(selectModel(10, config)).toBe('opus');
      expect(selectModel(11, config)).toBe('opus');
      expect(selectModel(15, config)).toBe('opus');
    });

    it('stays at opus for iterations beyond maxEscalations', () => {
      expect(selectModel(20, config)).toBe('opus');
      expect(selectModel(50, config)).toBe('opus');
    });

    it('respects custom start model (sonnet)', () => {
      const sonnetConfig: EscalationConfig = { ...config, initialModel: 'sonnet' };
      expect(selectModel(0, sonnetConfig)).toBe('sonnet');
      expect(selectModel(4, sonnetConfig)).toBe('sonnet');
      expect(selectModel(5, sonnetConfig)).toBe('opus'); // Escalates from sonnet to opus
      expect(selectModel(10, sonnetConfig)).toBe('opus');
    });

    it('respects custom start model (opus)', () => {
      const opusConfig: EscalationConfig = { ...config, initialModel: 'opus' };
      expect(selectModel(0, opusConfig)).toBe('opus');
      expect(selectModel(10, opusConfig)).toBe('opus');
      expect(selectModel(50, opusConfig)).toBe('opus'); // Already at top
    });

    it('stays at initial model when escalation disabled', () => {
      const disabled: EscalationConfig = { ...config, enabled: false };
      expect(selectModel(0, disabled)).toBe('haiku');
      expect(selectModel(5, disabled)).toBe('haiku');
      expect(selectModel(10, disabled)).toBe('haiku');
      expect(selectModel(50, disabled)).toBe('haiku');
    });

    it('respects custom escalation threshold', () => {
      const customThreshold: EscalationConfig = { ...config, escalationThreshold: 3 };
      expect(selectModel(0, customThreshold)).toBe('haiku');
      expect(selectModel(2, customThreshold)).toBe('haiku');
      expect(selectModel(3, customThreshold)).toBe('sonnet'); // Escalates at 3
      expect(selectModel(5, customThreshold)).toBe('sonnet');
      expect(selectModel(6, customThreshold)).toBe('opus'); // Escalates at 6
    });

    it('handles single escalation (maxEscalations: 1)', () => {
      const singleEscalation: EscalationConfig = { ...config, maxEscalations: 1 };
      expect(selectModel(0, singleEscalation)).toBe('haiku');
      expect(selectModel(5, singleEscalation)).toBe('sonnet');
      expect(selectModel(10, singleEscalation)).toBe('sonnet'); // Stops at sonnet
    });

    it('handles no escalation (maxEscalations: 0)', () => {
      const noEscalation: EscalationConfig = { ...config, maxEscalations: 0 };
      expect(selectModel(0, noEscalation)).toBe('haiku');
      expect(selectModel(5, noEscalation)).toBe('haiku');
      expect(selectModel(10, noEscalation)).toBe('haiku');
    });
  });

  describe('estimateCost', () => {
    it('calculates cost for 15 iterations with default escalation', () => {
      // 5 haiku ($0.005) + 5 sonnet ($0.05) + 5 opus ($0.50) = $0.555
      const cost = estimateCost(15, config);
      expect(cost).toBeCloseTo(0.555, 3);
    });

    it('calculates cost for early completion', () => {
      // 3 haiku = $0.003
      const cost = estimateCost(3, config);
      expect(cost).toBeCloseTo(0.003, 3);
    });

    it('calculates cost for partial batch (7 iterations)', () => {
      // 5 haiku ($0.005) + 2 sonnet ($0.02) = $0.025
      const cost = estimateCost(7, config);
      expect(cost).toBeCloseTo(0.025, 3);
    });

    it('calculates cost without escalation (15 haiku)', () => {
      const disabled: EscalationConfig = { ...config, enabled: false };
      // 15 haiku = $0.015
      const cost = estimateCost(15, disabled);
      expect(cost).toBeCloseTo(0.015, 3);
    });

    it('calculates cost with sonnet as initial model', () => {
      const sonnetConfig: EscalationConfig = { ...config, initialModel: 'sonnet' };
      // 5 sonnet ($0.05) + 5 opus ($0.5) = $0.55
      const cost = estimateCost(10, sonnetConfig);
      expect(cost).toBeCloseTo(0.55, 3);
    });

    it('calculates cost with opus as initial model', () => {
      const opusConfig: EscalationConfig = { ...config, initialModel: 'opus' };
      // 10 opus = $1.00
      const cost = estimateCost(10, opusConfig);
      expect(cost).toBeCloseTo(1.0, 3);
    });

    it('calculates cost with custom threshold (3)', () => {
      const customThreshold: EscalationConfig = { ...config, escalationThreshold: 3 };
      // 3 haiku ($0.003) + 3 sonnet ($0.03) + 3 opus ($0.3) = $0.333
      const cost = estimateCost(9, customThreshold);
      expect(cost).toBeCloseTo(0.333, 3);
    });
  });

  describe('generateRalphCommand', () => {
    it('generates basic command', () => {
      const command = generateRalphCommand({
        prompt: 'Fix tests',
        maxIterations: 15,
        model: 'haiku',
      });
      expect(command).toBe('/ralph-loop "Fix tests" --max-iterations 15');
    });

    it('includes completion promise when provided', () => {
      const command = generateRalphCommand({
        prompt: 'Fix tests',
        maxIterations: 15,
        completionPromise: 'DONE',
        model: 'sonnet',
      });
      expect(command).toBe('/ralph-loop "Fix tests" --max-iterations 15 --completion-promise "DONE"');
    });

    it('escapes quotes in prompt', () => {
      const command = generateRalphCommand({
        prompt: 'Fix "auth" tests',
        maxIterations: 10,
        model: 'haiku',
      });
      expect(command).toBe('/ralph-loop "Fix \\"auth\\" tests" --max-iterations 10');
    });

    it('handles multiline prompts', () => {
      const command = generateRalphCommand({
        prompt: 'Fix tests\nOutput <promise>DONE</promise>',
        maxIterations: 10,
        model: 'haiku',
      });
      expect(command).toContain('Fix tests\nOutput <promise>DONE</promise>');
    });
  });

  describe('generateBaselinePrompt', () => {
    it('generates test baseline prompt', () => {
      const { prompt, completionPromise } = generateBaselinePrompt('tests', 'FAIL: 3 tests');
      expect(prompt).toContain('Fix failing baseline tests');
      expect(prompt).toContain('FAIL: 3 tests');
      expect(completionPromise).toBe('BASELINE_CLEAN');
    });

    it('generates typecheck baseline prompt', () => {
      const { prompt, completionPromise } = generateBaselinePrompt('typecheck', 'Error: Type X');
      expect(prompt).toContain('Fix TypeScript errors');
      expect(prompt).toContain('Error: Type X');
      expect(completionPromise).toBe('TYPES_CLEAN');
    });

    it('generates lint baseline prompt', () => {
      const { prompt, completionPromise } = generateBaselinePrompt('lint', 'unused-var');
      expect(prompt).toContain('Fix linting errors');
      expect(prompt).toContain('unused-var');
      expect(completionPromise).toBe('LINT_CLEAN');
    });
  });

  describe('DEFAULT_ESCALATION', () => {
    it('has expected default values', () => {
      expect(DEFAULT_ESCALATION.enabled).toBe(false);
      expect(DEFAULT_ESCALATION.initialModel).toBe('haiku');
      expect(DEFAULT_ESCALATION.escalationThreshold).toBe(5);
      expect(DEFAULT_ESCALATION.maxEscalations).toBe(2);
    });

    it('works with selectModel', () => {
      // Disabled by default, so should always return initialModel
      expect(selectModel(0, DEFAULT_ESCALATION)).toBe('haiku');
      expect(selectModel(10, DEFAULT_ESCALATION)).toBe('haiku');
    });
  });

  describe('Cost comparisons', () => {
    it('escalation costs ~2.3x more on average but succeeds more often', () => {
      const withoutEscalation = estimateCost(15, { ...config, enabled: false });
      const withEscalation = estimateCost(15, config);

      expect(withoutEscalation).toBeCloseTo(0.015, 3);
      expect(withEscalation).toBeCloseTo(0.555, 3);
      expect(withEscalation / withoutEscalation).toBeCloseTo(37, 0); // ~37x more expensive for full run

      // But average case (completes at iteration 8 = 5 haiku + 3 sonnet)
      const averageCase = estimateCost(8, config);
      expect(averageCase).toBeCloseTo(0.035, 3);
      expect(averageCase / withoutEscalation).toBeCloseTo(2.3, 1); // ~2.3x
    });

    it('best case (haiku solves) is cheaper than non-escalation', () => {
      const haiku3iterations = estimateCost(3, config);
      const nonEscalation3iterations = estimateCost(3, { ...config, enabled: false });

      // Both are haiku, so same cost
      expect(haiku3iterations).toBe(nonEscalation3iterations);
    });
  });
});
