import type { ClientWorkspaceSandboxGateway } from './worker.js';
import type { SnapshotSandbox, WorkspaceSnapshotStore } from './snapshot-store.js';

const SANDBOX_ID_PATTERN = /^client-workspace-[a-f0-9]{32}$/;
const APP_PROCESS_ID = 'client-workspace-app';
const APP_PORT = 4173;

type SandboxOptions = {
  normalizeId: true;
  transport: 'rpc';
  sleepAfter: '10m';
  keepAlive: false;
};

type SandboxProcess = {
  status: 'starting' | 'running' | 'completed' | 'failed' | 'killed' | 'error';
  waitForPort?(port: number, options: { path: string; status: number; timeout: number }): Promise<void>;
};

type StartedSandboxProcess = {
  waitForPort(port: number, options: { path: string; status: number; timeout: number }): Promise<void>;
};

type SandboxLike = {
  getProcess(processId: string): Promise<SandboxProcess | null>;
  startProcess(
    command: string,
    options: {
      processId: string;
      cwd: string;
      env: Record<string, string>;
    }
  ): Promise<StartedSandboxProcess>;
  containerFetch(request: Request, port: number): Promise<Response>;
  destroy(): Promise<void>;
} & Partial<SnapshotSandbox>;

export interface CloudflareSandboxGatewayOptions {
  binding: unknown;
  openaiApiKey: string;
  getSandbox(binding: unknown, sandboxId: string, options: SandboxOptions): SandboxLike;
  snapshots?: Pick<WorkspaceSnapshotStore, 'restoreLatest' | 'capture'>;
  activity?: {
    recordResponse(sandboxId: string, request: Request, response: Response): Promise<void>;
  };
  waitUntil?: (task: Promise<unknown>) => void;
  onSnapshotError?: (context: { sandboxId: string; kind: string }) => void;
  onActivityError?: (context: { sandboxId: string; kind: string }) => void;
}

export class CloudflareSandboxGateway implements ClientWorkspaceSandboxGateway {
  readonly #binding: unknown;
  readonly #openaiApiKey: string;
  readonly #getSandbox: CloudflareSandboxGatewayOptions['getSandbox'];
  readonly #snapshots: CloudflareSandboxGatewayOptions['snapshots'];
  readonly #activity: CloudflareSandboxGatewayOptions['activity'];
  readonly #waitUntil: (task: Promise<unknown>) => void;
  readonly #onSnapshotError: NonNullable<CloudflareSandboxGatewayOptions['onSnapshotError']>;
  readonly #onActivityError: NonNullable<CloudflareSandboxGatewayOptions['onActivityError']>;

  constructor(options: CloudflareSandboxGatewayOptions) {
    this.#binding = options.binding;
    this.#openaiApiKey = options.openaiApiKey;
    this.#getSandbox = options.getSandbox;
    this.#snapshots = options.snapshots;
    this.#activity = options.activity;
    this.#waitUntil = options.waitUntil ?? (() => undefined);
    this.#onSnapshotError = options.onSnapshotError ?? (() => undefined);
    this.#onActivityError = options.onActivityError ?? (() => undefined);
  }

  async fetch(sandboxId: string, request: Request): Promise<Response> {
    if (!SANDBOX_ID_PATTERN.test(sandboxId)) throw new Error('sandbox_id_invalid');

    const sandbox = this.#getSandbox(this.#binding, sandboxId, {
      normalizeId: true,
      transport: 'rpc',
      sleepAfter: '10m',
      keepAlive: false
    });
    await this.#ensureApp(sandboxId, sandbox);
    let response = await sandbox.containerFetch(request, APP_PORT);
    if (this.#shouldDestroy(request, response)) {
      response = await this.#checkpointAndDestroy(sandboxId, sandbox, response);
    }
    if (this.#activity) {
      this.#waitUntil(
        this.#activity.recordResponse(sandboxId, request, response).catch((error) => {
          this.#onActivityError({
            sandboxId,
            kind: error instanceof Error ? error.name : 'unknown'
          });
        })
      );
    }
    if (this.#shouldCapture(request, response) && this.#snapshots) {
      this.#waitUntil(
        this.#snapshots
          .capture(sandboxId, sandbox as SnapshotSandbox)
          .catch((error) => {
            this.#onSnapshotError({
              sandboxId,
              kind: error instanceof Error ? error.name : 'unknown'
            });
          })
      );
    }
    return response;
  }

  async #ensureApp(sandboxId: string, sandbox: SandboxLike): Promise<void> {
    let existing: SandboxProcess | null = null;
    try {
      existing = await sandbox.getProcess(APP_PROCESS_ID);
    } catch {
      existing = null;
    }
    if (existing?.status === 'running') return;

    if (existing?.status === 'starting' && existing.waitForPort) {
      try {
        await existing.waitForPort(APP_PORT, {
          path: '/',
          status: 200,
          timeout: 120_000
        });
        return;
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'ProcessExitedBeforeReadyError') {
          throw error;
        }
      }
    }

    if (this.#snapshots) {
      await this.#snapshots.restoreLatest(sandboxId, sandbox as SnapshotSandbox);
    }

    const process = await sandbox.startProcess('/app/start-client-workspace.sh', {
      processId: APP_PROCESS_ID,
      cwd: '/app',
      env: {
        HOST: '0.0.0.0',
        PORT: String(APP_PORT),
        NODE_ENV: 'production',
        BODY_SIZE_LIMIT: '6M',
        OPENAI_API_KEY: this.#openaiApiKey,
        CLIENT_WORKSPACE_STATE_ROOT: '/workspace/state',
        CLIENT_WORKSPACE_MANAGED_ROOT: '/workspace/projects',
        CLIENT_WORKSPACE_SEED_ROOT: '/app/seed'
      }
    });
    await process.waitForPort(APP_PORT, { path: '/', status: 200, timeout: 120_000 });
  }

  #shouldCapture(request: Request, response: Response): boolean {
    if (!response.ok) return false;
    const pathname = new URL(request.url).pathname;
    return request.method === 'GET' && /^\/api\/sessions\/[^/]+\/diff$/.test(pathname);
  }

  #shouldDestroy(request: Request, response: Response): boolean {
    if (!response.ok || request.method !== 'POST') return false;
    const pathname = new URL(request.url).pathname;
    return (
      /^\/api\/sessions\/[^/]+\/close$/.test(pathname) ||
      /^\/api\/workspaces\/[^/]+\/reset$/.test(pathname)
    );
  }

  async #checkpointAndDestroy(
    sandboxId: string,
    sandbox: SandboxLike,
    response: Response
  ): Promise<Response> {
    const body = await response.arrayBuffer();
    if (!this.#snapshots) throw new Error('sandbox_close_snapshot_unavailable');
    try {
      await this.#snapshots.capture(sandboxId, sandbox as SnapshotSandbox);
    } catch (error) {
      this.#onSnapshotError({
        sandboxId,
        kind: error instanceof Error ? error.name : 'unknown'
      });
      throw new Error('sandbox_close_checkpoint_failed');
    }
    await sandbox.destroy();
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
}
