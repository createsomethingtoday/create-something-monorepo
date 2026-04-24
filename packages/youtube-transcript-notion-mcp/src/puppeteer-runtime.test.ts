import { afterEach, describe, expect, it, vi } from 'vitest';

const nodeConnect = vi.fn(async (options: unknown) => ({
  runtime: 'node',
  options,
}));

vi.mock('puppeteer-core', () => ({
  default: {
    connect: nodeConnect,
  },
}));

class FakeWebSocket {
  private readonly listeners = new Map<string, Array<(event?: any) => void>>();

  constructor(public readonly url: string) {
    queueMicrotask(() => {
      this.dispatch('open');
    });
  }

  addEventListener(type: string, listener: (event?: any) => void) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  send(_message: string) {}

  close() {
    this.dispatch('close');
  }

  private dispatch(type: string, event?: any) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe('connectPuppeteer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    nodeConnect.mockClear();
  });

  it('uses a native WebSocket transport in worker-like runtimes', async () => {
    vi.stubGlobal('WebSocketPair', class WebSocketPair {});
    vi.stubGlobal('WebSocket', FakeWebSocket as any);

    const { connectPuppeteer } = await import('./puppeteer-runtime.js');

    const browser = await connectPuppeteer({
      browserWSEndpoint: 'wss://connect.steel.dev?sessionId=test',
    });

    expect(browser).toMatchObject({ runtime: 'node' });
    expect(nodeConnect).toHaveBeenCalledOnce();

    const [options] = nodeConnect.mock.calls[0]!;
    expect(options).toMatchObject({
      transport: expect.any(Object),
    });
    expect(options).not.toHaveProperty('browserWSEndpoint');
  });

  it('uses the node runtime outside worker-like runtimes', async () => {
    const { connectPuppeteer } = await import('./puppeteer-runtime.js');

    const browser = await connectPuppeteer({
      browserWSEndpoint: 'wss://connect.steel.dev?sessionId=test',
    });

    expect(browser).toMatchObject({ runtime: 'node' });
    expect(nodeConnect).toHaveBeenCalledOnce();

    const [options] = nodeConnect.mock.calls[0]!;
    expect(options).toMatchObject({
      browserWSEndpoint: 'wss://connect.steel.dev?sessionId=test',
    });
  });
});
