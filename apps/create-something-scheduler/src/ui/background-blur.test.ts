import { describe, expect, it, vi } from 'vitest';
import { createBackgroundBlurController } from './background-blur.js';

describe('background blur controller', () => {
  it('removes the exact middleware instance before reporting blur as off', async () => {
    const middleware = { id: 'blur-middleware' };
    const remove = vi.fn(async () => ({ status: 'success' }));
    const controller = createBackgroundBlurController({
      meeting: {
        self: {
          setVideoMiddlewareGlobalConfig: vi.fn(async () => undefined),
          addVideoMiddleware: vi.fn(async () => ({ status: 'success' })),
          removeVideoMiddleware: remove
        }
      },
      factory: {
        isSupported: () => true,
        init: vi.fn(async () => ({
          createBackgroundBlurVideoMiddleware: vi.fn(async () => middleware)
        }))
      }
    });

    await expect(controller.toggle()).resolves.toBe(true);
    await expect(controller.toggle()).resolves.toBe(false);
    expect(remove).toHaveBeenCalledWith(middleware);
  });
});
