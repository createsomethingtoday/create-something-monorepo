import type { BrowserRoutingReceipt } from './index.js';

export interface BrowserExecutionReceipt extends BrowserRoutingReceipt {
  url: string;
  durationMs: number;
  resultHash: string;
  usage: {
    browserMsUsed: number | null;
    source: 'quick-action-header' | 'unavailable';
  };
}

function encodeResult(result: unknown): Uint8Array {
  if (result instanceof Uint8Array) return result;
  const serialized = JSON.stringify(result) ?? String(result);
  return new TextEncoder().encode(serialized);
}

export async function createBrowserExecutionReceipt(
  routing: BrowserRoutingReceipt,
  input: {
    url: string;
    durationMs: number;
    result: unknown;
    browserMsUsed?: number;
  },
): Promise<BrowserExecutionReceipt> {
  const digest = await crypto.subtle.digest('SHA-256', encodeResult(input.result));
  const resultHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return {
    ...routing,
    url: input.url,
    durationMs: input.durationMs,
    resultHash: `sha256:${resultHash}`,
    usage: input.browserMsUsed === undefined
      ? { browserMsUsed: null, source: 'unavailable' }
      : { browserMsUsed: input.browserMsUsed, source: 'quick-action-header' },
  };
}
