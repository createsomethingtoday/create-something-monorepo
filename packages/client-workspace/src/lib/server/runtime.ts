import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  ClientWorkspaceService,
  ClientWorkspaceServiceError
} from './client-workspace-service.js';
import { connectCodexAppServer } from './codex/app-server.js';
import { PreviewSession } from './preview/preview-session.js';
import { workspaceRegistry } from './workspaces/default-registry.js';

export class ClientWorkspaceRuntime {
  readonly registry = workspaceRegistry;
  readonly stateRoot =
    process.env.CLIENT_WORKSPACE_STATE_ROOT ??
    join(
      homedir(),
      'Library',
      'Application Support',
      'CREATE SOMETHING',
      'Client Workspace'
    );
  readonly service = new ClientWorkspaceService({
    registry: this.registry,
    stateRoot: this.stateRoot,
    connectCodex: connectCodexAppServer
  });
  readonly #previews = new Map<string, PreviewSession>();

  preview(workspaceId: string): PreviewSession {
    const existing = this.#previews.get(workspaceId);
    if (existing) return existing;
    const preview = new PreviewSession({ workspace: this.registry.resolve(workspaceId) });
    this.#previews.set(workspaceId, preview);
    return preview;
  }

  async reset(workspaceId: string): Promise<void> {
    const immutableSeedRoot = process.env.CLIENT_WORKSPACE_SEED_ROOT;
    if (!immutableSeedRoot) {
      throw new ClientWorkspaceServiceError(
        'reset_unavailable',
        'The immutable workspace seed is unavailable.'
      );
    }
    this.#previews.get(workspaceId)?.close();
    this.#previews.delete(workspaceId);
    await this.service.resetWorkspace(workspaceId, immutableSeedRoot);
  }

  async close(): Promise<void> {
    await this.service.close();
    for (const preview of this.#previews.values()) preview.close();
    this.#previews.clear();
  }
}

declare global {
  // Vite dev reloads server modules; keep one runtime so declared preview processes are reused.
  var __createSomethingClientWorkspaceRuntime: ClientWorkspaceRuntime | undefined;
}

export const clientWorkspaceRuntime =
  globalThis.__createSomethingClientWorkspaceRuntime ?? new ClientWorkspaceRuntime();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__createSomethingClientWorkspaceRuntime = clientWorkspaceRuntime;
}
