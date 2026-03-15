/**
 * Lightweight CDP (Chrome DevTools Protocol) Client for Cloudflare Workers
 *
 * Sends CDP JSON messages over the Workers WebSocket API — no Playwright or
 * Puppeteer required. Designed for Steel.dev remote browser sessions.
 *
 * Supports:
 *   - Page.navigate
 *   - Runtime.evaluate (JavaScript execution)
 *   - Page lifecycle events (wait for load/networkidle)
 *   - Graceful cleanup
 *
 * Usage:
 *   const cdp = new CdpClient(websocketUrl);
 *   await cdp.connect();
 *   await cdp.navigate('https://example.com');
 *   const result = await cdp.evaluate('document.title');
 *   cdp.close();
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CdpMessage {
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface CdpResponse {
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

interface CdpEvent {
  method: string;
  params?: Record<string, unknown>;
}

interface PendingRequest {
  resolve: (result: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class CdpClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pending = new Map<number, PendingRequest>();
  private eventListeners = new Map<string, Array<(params: Record<string, unknown>) => void>>();
  private connected = false;

  constructor(
    private readonly wsUrl: string,
    private readonly defaultTimeout = 30_000,
  ) {}

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  /**
   * Establish the CDP WebSocket connection.
   *
   * Uses the Cloudflare Workers `fetch` upgrade pattern for WebSocket
   * connections. Falls back to `new WebSocket()` for non-Workers runtimes.
   */
  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const ws = new WebSocket(this.wsUrl);

        ws.addEventListener('open', () => {
          this.connected = true;
          resolve();
        });

        ws.addEventListener('message', (event: MessageEvent) => {
          this.handleMessage(typeof event.data === 'string' ? event.data : '');
        });

        ws.addEventListener('error', (event: Event) => {
          const err = new Error('CDP WebSocket error');
          if (!this.connected) reject(err);
        });

        ws.addEventListener('close', () => {
          this.connected = false;
          // Reject all pending requests
          for (const [id, req] of this.pending) {
            clearTimeout(req.timeout);
            req.reject(new Error('CDP connection closed'));
          }
          this.pending.clear();
        });

        this.ws = ws;
      } catch (err) {
        reject(err);
      }
    });
  }

  /** Close the WebSocket connection. */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  // -------------------------------------------------------------------------
  // Core messaging
  // -------------------------------------------------------------------------

  /**
   * Send a CDP command and wait for the matching response.
   */
  async send(
    method: string,
    params?: Record<string, unknown>,
    timeout = this.defaultTimeout,
  ): Promise<Record<string, unknown>> {
    if (!this.ws || !this.connected) {
      throw new Error('CDP client not connected');
    }

    const id = ++this.messageId;
    const message: CdpMessage = { id, method };
    if (params) message.params = params;

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method} (${timeout}ms)`));
      }, timeout);

      this.pending.set(id, { resolve, reject, timeout: timer });
      this.ws!.send(JSON.stringify(message));
    });
  }

  /**
   * Register a listener for a CDP event (e.g., 'Page.loadEventFired').
   */
  on(method: string, handler: (params: Record<string, unknown>) => void): void {
    const listeners = this.eventListeners.get(method) || [];
    listeners.push(handler);
    this.eventListeners.set(method, listeners);
  }

  /**
   * Wait for a specific CDP event to fire (one-shot).
   */
  async waitForEvent(
    method: string,
    timeout = this.defaultTimeout,
  ): Promise<Record<string, unknown>> {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`CDP event timed out: ${method} (${timeout}ms)`));
      }, timeout);

      const handler = (params: Record<string, unknown>) => {
        clearTimeout(timer);
        // Remove this one-shot listener
        const listeners = this.eventListeners.get(method) || [];
        const idx = listeners.indexOf(handler);
        if (idx >= 0) listeners.splice(idx, 1);
        resolve(params);
      };

      this.on(method, handler);
    });
  }

  // -------------------------------------------------------------------------
  // High-level helpers
  // -------------------------------------------------------------------------

  /**
   * Enable required CDP domains for page interaction.
   */
  async enableDomains(): Promise<void> {
    await Promise.all([
      this.send('Page.enable'),
      this.send('Runtime.enable'),
      this.send('Network.enable'),
    ]);
  }

  /**
   * Navigate to a URL and wait for the page to load.
   */
  async navigate(url: string, timeout = this.defaultTimeout): Promise<string> {
    const loadPromise = this.waitForEvent('Page.loadEventFired', timeout);
    const navResult = await this.send('Page.navigate', { url });

    if (navResult.errorText) {
      throw new Error(`Navigation failed: ${navResult.errorText}`);
    }

    await loadPromise;

    // Small delay for dynamic content to render
    await this.sleep(1000);

    return (navResult.frameId as string) || '';
  }

  /**
   * Execute JavaScript in the page context and return the result.
   */
  async evaluate<T = unknown>(
    expression: string,
    timeout = this.defaultTimeout,
  ): Promise<T> {
    const result = await this.send(
      'Runtime.evaluate',
      {
        expression,
        returnByValue: true,
        awaitPromise: true,
      },
      timeout,
    );

    if (result.exceptionDetails) {
      const details = result.exceptionDetails as Record<string, unknown>;
      const text =
        (details.text as string) ||
        ((details.exception as Record<string, unknown>)?.description as string) ||
        'Unknown evaluation error';
      throw new Error(`CDP evaluate error: ${text}`);
    }

    const remoteObject = result.result as Record<string, unknown>;
    return remoteObject?.value as T;
  }

  /**
   * Get the current page URL.
   */
  async getCurrentUrl(): Promise<string> {
    return this.evaluate<string>('window.location.href');
  }

  /**
   * Wait for a specified number of milliseconds.
   */
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wait for a selector to appear in the DOM.
   * Returns true if found, false if timed out.
   */
  async waitForSelector(
    selector: string,
    timeout = 10_000,
  ): Promise<boolean> {
    const start = Date.now();
    const pollInterval = 500;

    while (Date.now() - start < timeout) {
      const found = await this.evaluate<boolean>(
        `!!document.querySelector(${JSON.stringify(selector)})`,
      );
      if (found) return true;
      await this.sleep(pollInterval);
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private handleMessage(data: string): void {
    let parsed: CdpResponse | CdpEvent;
    try {
      parsed = JSON.parse(data);
    } catch {
      return; // Ignore malformed messages
    }

    // Response to a command we sent
    if ('id' in parsed && typeof parsed.id === 'number') {
      const pending = this.pending.get(parsed.id);
      if (pending) {
        this.pending.delete(parsed.id);
        clearTimeout(pending.timeout);

        if ((parsed as CdpResponse).error) {
          pending.reject(
            new Error(
              `CDP error: ${(parsed as CdpResponse).error!.message} (code ${(parsed as CdpResponse).error!.code})`,
            ),
          );
        } else {
          pending.resolve((parsed as CdpResponse).result || {});
        }
      }
      return;
    }

    // Event from the browser
    if ('method' in parsed) {
      const listeners = this.eventListeners.get((parsed as CdpEvent).method);
      if (listeners) {
        const params = (parsed as CdpEvent).params || {};
        for (const handler of listeners) {
          try {
            handler(params);
          } catch {
            // Don't let event handler errors break the client
          }
        }
      }
    }
  }
}
