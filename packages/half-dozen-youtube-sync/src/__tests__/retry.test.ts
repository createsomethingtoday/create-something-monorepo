/**
 * Tests for retry utility with exponential backoff
 */

import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableError } from '../utils/retry.js';

describe('isRetryableError', () => {
  it('retries on 429 rate limit', () => {
    expect(isRetryableError(new Error('API error (429): Too many requests'))).toBe(true);
  });

  it('retries on 500 server error', () => {
    expect(isRetryableError(new Error('API error (500): Internal server error'))).toBe(true);
  });

  it('retries on 502 bad gateway', () => {
    expect(isRetryableError(new Error('API error (502): Bad gateway'))).toBe(true);
  });

  it('retries on 503 service unavailable', () => {
    expect(isRetryableError(new Error('API error (503): Service unavailable'))).toBe(true);
  });

  it('retries on network errors', () => {
    expect(isRetryableError(new Error('ECONNRESET: Connection reset'))).toBe(true);
    expect(isRetryableError(new Error('ECONNREFUSED: Connection refused'))).toBe(true);
    expect(isRetryableError(new Error('ETIMEDOUT: Connection timed out'))).toBe(true);
  });

  it('retries on rate limit text', () => {
    expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true);
  });

  it('retries on conflict errors', () => {
    expect(isRetryableError(new Error('Conflict: Page was updated'))).toBe(true);
  });

  it('does not retry on 400 bad request', () => {
    expect(isRetryableError(new Error('API error (400): Bad request'))).toBe(false);
  });

  it('does not retry on 401 unauthorized', () => {
    expect(isRetryableError(new Error('API error (401): Unauthorized'))).toBe(false);
  });

  it('does not retry on 404 not found', () => {
    expect(isRetryableError(new Error('API error (404): Not found'))).toBe(false);
  });

  it('does not retry on video unavailable', () => {
    expect(isRetryableError(new Error('Video unavailable'))).toBe(false);
  });

  it('does not retry on non-Error values', () => {
    expect(isRetryableError('string error')).toBe(false);
    expect(isRetryableError(42)).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxRetries: 3 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error then succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('API error (429): Rate limit'))
      .mockResolvedValue('success after retry');

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelay: 10, // Fast for tests
    });

    expect(result).toBe('success after retry');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('API error (400): Bad request'));

    await expect(withRetry(fn, { maxRetries: 3, baseDelay: 10 }))
      .rejects.toThrow('Bad request');
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries and throws last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('API error (429): Rate limit'));

    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10 }))
      .rejects.toThrow('Rate limit');
    
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('calls onRetry callback before each retry', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('API error (429): Rate limit'))
      .mockRejectedValueOnce(new Error('API error (429): Rate limit'))
      .mockResolvedValue('success');

    await withRetry(fn, {
      maxRetries: 3,
      baseDelay: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][0]).toBe(1); // attempt 1
    expect(onRetry.mock.calls[1][0]).toBe(2); // attempt 2
  });

  it('respects custom isRetryable function', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Custom error'));
    const customRetryable = vi.fn().mockReturnValue(false);

    await expect(withRetry(fn, {
      maxRetries: 3,
      baseDelay: 10,
      isRetryable: customRetryable,
    })).rejects.toThrow('Custom error');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(customRetryable).toHaveBeenCalledWith(expect.any(Error));
  });

  it('uses exponential backoff', async () => {
    const delays: number[] = [];
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('API error (429): Rate limit'))
      .mockRejectedValueOnce(new Error('API error (429): Rate limit'))
      .mockResolvedValue('success');

    await withRetry(fn, {
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 10000,
      onRetry: (_attempt, delay) => { delays.push(delay); },
    });

    // Second delay should be larger than first (exponential)
    // With jitter, exact values vary, but the trend should be increasing
    expect(delays).toHaveLength(2);
    // Base * 2^0 + jitter for first, base * 2^1 + jitter for second
    // First: 100-200, Second: 200-300
    expect(delays[0]).toBeGreaterThanOrEqual(100);
    expect(delays[1]).toBeGreaterThanOrEqual(200);
  });

  it('caps delay at maxDelay', async () => {
    const delays: number[] = [];
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('API error (429): Rate limit'))
      .mockRejectedValueOnce(new Error('API error (429): Rate limit'))
      .mockRejectedValueOnce(new Error('API error (429): Rate limit'))
      .mockResolvedValue('success');

    await withRetry(fn, {
      maxRetries: 5,
      baseDelay: 100,
      maxDelay: 250,
      onRetry: (_attempt, delay) => { delays.push(delay); },
    });

    // All delays should be capped at maxDelay
    delays.forEach(delay => {
      expect(delay).toBeLessThanOrEqual(250);
    });
  });
});
