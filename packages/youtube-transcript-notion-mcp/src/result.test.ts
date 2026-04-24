import { describe, expect, it } from 'vitest';

import { appErrorResult } from './result.js';

describe('appErrorResult', () => {
  it('preserves details inside the error payload for diagnostics', () => {
    const result = appErrorResult('TEST_ERROR', 'Something failed.', {
      details: {
        attempt: 'browser',
        status: 400,
      },
      warnings: ['First attempt failed.'],
    });

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        error: {
          code: 'TEST_ERROR',
          message: 'Something failed.',
          details: {
            attempt: 'browser',
            status: 400,
          },
        },
        details: {
          attempt: 'browser',
          status: 400,
        },
        warnings: ['First attempt failed.'],
      },
    });
  });
});
