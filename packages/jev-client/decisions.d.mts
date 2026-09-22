import type { JevOptions } from './index.mjs';
export type Decision = {
  status: 'accepted' | 'fallback';
  choice: string;
  reason: string;
  model?: string;
  answer?: {
    type: 'choice';
    choice: string;
    confidence: number;
    probabilities: Record<string, number>;
  };
  usage?: { input_tokens: number; output_tokens: number };
  latencyMs?: number;
};
export type DecisionOptions = JevOptions & { minProbability?: number; minConfidence?: number };
export function choose(
  options: DecisionOptions & {
    state: unknown;
    instructions: string;
    criteria: Record<string, string | null>;
    fallback: string;
  }
): Promise<Decision>;
export function selectCandidate(
  options: DecisionOptions & {
    query: string;
    candidates: Array<{ id: string; description: string }>;
  }
): Promise<Decision>;
export function reviewEvidence(
  options: DecisionOptions & { claim: string; evidence: unknown }
): Promise<Decision>;
