import { describe, expect, it, vi } from 'vitest';

import { attachRequestProps } from './request-context.js';

describe('attachRequestProps', () => {
  it('keeps Cloudflare runtime methods on the original ExecutionContext object', () => {
    class RuntimeContext {
      waitUntil = vi.fn();
      passThroughOnException = vi.fn();
    }
    const context = new RuntimeContext();
    const props = { accountId: 'acct_wf_pablo' };

    const attached = attachRequestProps(context, props);

    expect(attached).toBe(context);
    expect(attached.props).toBe(props);
    attached.waitUntil(Promise.resolve());
    expect(context.waitUntil).toHaveBeenCalledOnce();
  });
});
