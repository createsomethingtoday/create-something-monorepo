import puppeteer, { type ConnectOptions, type ConnectionTransport } from 'puppeteer-core';

function shouldUseWorkerRuntime(): boolean {
  const userAgent = globalThis.navigator?.userAgent ?? '';
  return 'WebSocketPair' in globalThis || /Cloudflare-Workers/i.test(userAgent);
}

class NativeWebSocketTransport implements ConnectionTransport {
  static create(url: string): Promise<NativeWebSocketTransport> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => resolve(new NativeWebSocketTransport(ws)));
      ws.addEventListener('error', () =>
        reject(new Error(`Failed to open WebSocket transport for ${url}`)),
      );
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
  if (shouldUseWorkerRuntime() && options.browserWSEndpoint && !options.transport) {
    const { browserWSEndpoint, headers: _headers, ...rest } = options;
    const transport = await NativeWebSocketTransport.create(browserWSEndpoint);
    return puppeteer.connect({
      ...rest,
      transport,
    });
  }

  return puppeteer.connect(options);
}
