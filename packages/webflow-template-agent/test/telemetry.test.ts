import { describe, expect, it, vi } from 'vitest';

import { recordAbuseEvent } from '../src/telemetry.js';
import type { Env } from '../src/types.js';

describe('abuse telemetry', () => {
  it('writes only fixed event, model, environment, usage, and cost fields', () => {
    const writeDataPoint = vi.fn();
    const env = {
      AGENT_ANALYTICS: { writeDataPoint },
      ANTHROPIC_API_KEY: 'must-not-appear',
      ANTHROPIC_MODEL: 'claude-opus-4-8',
      ENVIRONMENT: 'test',
      SEARCH_API_BASE: 'https://search.test',
    } as unknown as Env;

    recordAbuseEvent(env, {
      type: 'turn_settled',
      actualCostMicroUsd: 2_700,
      inputTokens: 100,
      outputTokens: 10,
      cacheInputTokens: 70,
    });

    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['turn_settled'],
      blobs: ['turn_settled', '', 'claude-opus-4-8', 'test'],
      doubles: [2_700, 100, 10, 70],
    });
    expect(JSON.stringify(writeDataPoint.mock.calls)).not.toContain('must-not-appear');
  });
});

