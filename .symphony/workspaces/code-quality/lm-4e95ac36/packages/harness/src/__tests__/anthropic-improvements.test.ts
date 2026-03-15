/**
 * Tests for Anthropic prompt engineering best practices integration.
 * Validates prefilled responses, quote-based prompting, and CoT instructions.
 */

import { describe, it, expect } from 'vitest';
import {
  ARCHITECTURE_REVIEWER_PROMPT,
  SECURITY_REVIEWER_PROMPT,
  QUALITY_REVIEWER_PROMPT,
} from '../reviewer-prompts.js';
import { generateBaselinePrompt } from '../ralph-escalation.js';
import type { ReviewFinding } from '../types.js';

describe('Anthropic Prompt Engineering Improvements', () => {
  describe('Prefilled Response Handling', () => {
    it('should handle output that starts with prefilled response', () => {
      // Simulating what extractJsonFromOutput does
      const outputWithPrefill = `"pass", "confidence": 0.95, "summary": "Code looks good", "findings": []}`;
      const expectedJson = `{\n  "outcome":"pass", "confidence": 0.95, "summary": "Code looks good", "findings": []}`;

      // Prepend prefill if output doesn't start with {
      let workingOutput = outputWithPrefill.trim();
      if (!workingOutput.startsWith('{')) {
        workingOutput = '{\n  "outcome":' + workingOutput;
      }

      expect(workingOutput).toBe(expectedJson);
      expect(workingOutput.startsWith('{')).toBe(true);
    });

    it('should not duplicate prefill if output already starts with {', () => {
      const outputWithJson = `{"outcome": "pass", "confidence": 0.95, "findings": []}`;

      let workingOutput = outputWithJson.trim();
      if (!workingOutput.startsWith('{')) {
        workingOutput = '{\n  "outcome":' + workingOutput;
      }

      expect(workingOutput).toBe(outputWithJson);
    });
  });

  describe('Quote-Based Architecture Prompts', () => {
    it('should include quote grounding requirement in Architecture prompt', () => {
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('Critical Requirement: Quote Grounding');
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('You MUST include a verbatim quote');
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('"quote":');
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('If you cannot quote the exact code');
    });

    it('should show example with quote field', () => {
      expect(ARCHITECTURE_REVIEWER_PROMPT).toMatch(/"quote":\s*"@media/);
    });

    it('should enforce quote requirement as non-negotiable', () => {
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('non-negotiable');
    });
  });

  describe('Explicit Chain-of-Thought for Opus', () => {
    it('should include thinking tags in Architecture prompt', () => {
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('<thinking>');
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('</thinking>');
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('Reasoning Process');
    });

    it('should list specific reasoning steps', () => {
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('What patterns do I see repeated');
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('Are there opportunities for abstraction');
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('Does this change introduce coupling');
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('What are the downstream impacts');
    });

    it('should clarify thinking is not in JSON output', () => {
      expect(ARCHITECTURE_REVIEWER_PROMPT).toContain('will NOT be included in your final JSON');
    });
  });

  describe('Quote-Based Baseline Prompts', () => {
    it('should wrap test output in XML tags', () => {
      const sampleOutput = 'FAIL: test failed\nExpected 5, got 3';
      const { prompt } = generateBaselinePrompt('tests', sampleOutput);

      expect(prompt).toContain('<test_output>');
      expect(prompt).toContain('</test_output>');
      expect(prompt).toContain(sampleOutput);
    });

    it('should require verbatim quotes from test output', () => {
      const { prompt } = generateBaselinePrompt('tests', 'sample output');

      expect(prompt).toContain('Quote the exact error messages');
      expect(prompt).toContain('quote verbatim');
      expect(prompt).toContain('Critical');
    });

    it('should instruct to quote test name, expected/actual, and stack trace', () => {
      const { prompt } = generateBaselinePrompt('tests', 'sample output');

      expect(prompt).toContain('Test name (quote verbatim)');
      expect(prompt).toContain('Expected vs actual (quote verbatim)');
      expect(prompt).toContain('Stack trace file/line');
    });
  });

  describe('ReviewFinding Type', () => {
    it('should accept quote field', () => {
      const finding: ReviewFinding = {
        id: 'test-1',
        severity: 'high',
        category: 'dry',
        title: 'Duplicate code',
        description: 'Same pattern in 2 files',
        file: 'src/test.ts',
        line: 42,
        quote: 'const foo = () => bar();',
        suggestion: 'Extract to shared function',
      };

      expect(finding.quote).toBe('const foo = () => bar();');
    });

    it('should allow optional quote field', () => {
      const findingWithoutQuote: ReviewFinding = {
        id: 'test-2',
        severity: 'low',
        category: 'clarity',
        title: 'Minor improvement',
        description: 'Could be clearer',
      };

      expect(findingWithoutQuote.quote).toBeUndefined();
    });
  });

  describe('Security and Quality Prompts (No Changes Expected)', () => {
    it('should not have quote requirements in Security prompt', () => {
      // Security doesn't enforce quotes (Haiku model, pattern-based)
      expect(SECURITY_REVIEWER_PROMPT).not.toContain('Critical Requirement: Quote Grounding');
    });

    it('should not have quote requirements in Quality prompt', () => {
      // Quality doesn't enforce quotes (focus on runtime issues, not DRY)
      expect(QUALITY_REVIEWER_PROMPT).not.toContain('Critical Requirement: Quote Grounding');
    });

    it('should not have CoT in Security/Quality prompts', () => {
      // Only Architecture (Opus) gets CoT
      expect(SECURITY_REVIEWER_PROMPT).not.toContain('<thinking>');
      expect(QUALITY_REVIEWER_PROMPT).not.toContain('<thinking>');
    });
  });
});
