import type { ConnectOptions, ConnectionTransport } from 'puppeteer-core';

type PuppeteerLike = {
  connect(options: ConnectOptions): Promise<unknown>;
};

let cachedRuntime: Promise<PuppeteerLike> | null = null;
let configuredRuntime: 'node' | 'worker' | null = null;

function shouldUseBrowserRuntime(): boolean {
  return configuredRuntime === 'worker'
    || (configuredRuntime === null && process.env.WEBFLOW_SITE_ANALYZER_RUNTIME === 'worker');
}

export function configurePuppeteerRuntime(runtime: 'node' | 'worker'): void {
  if (configuredRuntime === runtime) return;
  configuredRuntime = runtime;
  cachedRuntime = null;
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
  static async create(url: string, headers?: Record<string, string>): Promise<NativeWebSocketTransport> {
    if (headers && Object.keys(headers).length > 0) {
      const fetchUrl = url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
      const response = await fetch(fetchUrl, {
        headers: {
          ...headers,
          Upgrade: 'websocket',
        },
      }) as Response & { webSocket?: WebSocket & { accept(): void } };
      if (!response.webSocket) {
        throw new Error(`Failed to open authenticated WebSocket transport (${response.status})`);
      }
      response.webSocket.accept();
      return new NativeWebSocketTransport(response.webSocket);
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => resolve(new NativeWebSocketTransport(ws)));
      ws.addEventListener('error', () => reject(new Error('Failed to open WebSocket transport')));
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
    const { browserWSEndpoint, headers, ...rest } = options;
    const transport = await NativeWebSocketTransport.create(browserWSEndpoint, headers);
    return runtime.connect({
      ...rest,
      transport,
    });
  }

  return runtime.connect(options);
}
