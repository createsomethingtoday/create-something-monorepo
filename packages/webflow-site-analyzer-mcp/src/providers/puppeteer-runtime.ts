import type { ConnectOptions, ConnectionTransport } from 'puppeteer-core';

type PuppeteerLike = {
  connect(options: ConnectOptions): Promise<unknown>;
};

let cachedRuntime: Promise<PuppeteerLike> | null = null;

function shouldUseBrowserRuntime(): boolean {
  return process.env.WEBFLOW_SITE_ANALYZER_RUNTIME === 'worker';
}

async function loadRuntime(): Promise<PuppeteerLike> {
  if (shouldUseBrowserRuntime()) {
    const browserModule = await import('puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js');
    const runtime = browserModule.default ?? browserModule;
    if (typeof runtime.connect !== 'function') {
      throw new Error('Worker Puppeteer runtime does not expose connect().');
    }
    return runtime as PuppeteerLike;
  }

  const nodeModule = await import('puppeteer-core');
  const runtime = nodeModule.default ?? nodeModule;
  if (typeof runtime.connect !== 'function') {
    throw new Error('Node Puppeteer runtime does not expose connect().');
  }
  return runtime as PuppeteerLike;
}

class NativeWebSocketTransport implements ConnectionTransport {
  static create(url: string): Promise<NativeWebSocketTransport> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => resolve(new NativeWebSocketTransport(ws)));
      ws.addEventListener('error', () => reject(new Error(`Failed to open WebSocket transport for ${url}`)));
    });
  }

  onmessage?: (message: string) => void;
  onclose?: () => void;

  constructor(private readonly socket: WebSocket) {
    this.socket.addEventListener('message', (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        this.onmessage?.(data);
        return;
      }

      if (data instanceof ArrayBuffer) {
        this.onmessage?.(new TextDecoder().decode(data));
      }
    });
    this.socket.addEventListener('close', () => {
      this.onclose?.();
    });
    this.socket.addEventListener('error', () => {});
  }

  send(message: string): void {
    this.socket.send(message);
  }

  close(): void {
    this.socket.close();
  }
}

export async function connectPuppeteer(options: ConnectOptions) {
  if (!cachedRuntime) {
    cachedRuntime = loadRuntime();
  }

  const runtime = await cachedRuntime;

  if (shouldUseBrowserRuntime() && options.browserWSEndpoint && !options.transport) {
    const { browserWSEndpoint, headers: _headers, ...rest } = options;
    const transport = await NativeWebSocketTransport.create(browserWSEndpoint);
    return runtime.connect({
      ...rest,
      transport,
    });
  }

  return runtime.connect(options);
}
