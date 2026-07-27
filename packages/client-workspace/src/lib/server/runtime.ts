import { homedir } from 'node:os';
import { join } from 'node:path';

import { ClientWorkspaceService, ClientWorkspaceServiceError } from './client-workspace-service.js';
import {
  connectCodexAppServer,
  probeCodexInstallation,
  type CodexInstallationStatus
} from './codex/app-server.js';
import {
  ClientWorkspaceDeliveryError,
  loadImportedWorkspaceDefinitions
} from './deliveries/importer.js';
import {
  ManagedDeliveryRuntime,
  type DeliveryUpdatePlan
} from './deliveries/managed-delivery-runtime.js';
import { loadClientWorkspaceTrustPolicy } from './deliveries/trust-policy.js';
import { PreviewSession } from './preview/preview-session.js';
import { createDefaultWorkspaceRegistry } from './workspaces/default-registry.js';
import type { PublicWorkspace } from './workspaces/registry.js';

export class ClientWorkspaceRuntime {
  readonly stateRoot =
    process.env.CLIENT_WORKSPACE_STATE_ROOT ??
    join(homedir(), 'Library', 'Application Support', 'CREATE SOMETHING', 'Client Workspace');
  readonly managedRoot =
    process.env.CLIENT_WORKSPACE_MANAGED_ROOT ?? join(this.stateRoot, 'workspaces');
  readonly codexCommand = process.env.CLIENT_WORKSPACE_CODEX_COMMAND ?? 'codex';
  readonly registry = createDefaultWorkspaceRegistry({
    managedRoot: this.managedRoot,
    includeDemo: process.env.CLIENT_WORKSPACE_DESKTOP !== '1',
    additionalDefinitions: loadImportedWorkspaceDefinitions({
      managedRoot: this.managedRoot,
      stateRoot: this.stateRoot
    })
  });
  readonly service = new ClientWorkspaceService({
    registry: this.registry,
    stateRoot: this.stateRoot,
    connectCodex: () => connectCodexAppServer({ command: this.codexCommand })
  });
  readonly #previews = new Map<string, PreviewSession>();

  preview(workspaceId: string): PreviewSession {
    const existing = this.#previews.get(workspaceId);
    if (existing) return existing;
    const preview = new PreviewSession({ workspace: this.registry.resolve(workspaceId) });
    this.#previews.set(workspaceId, preview);
    return preview;
  }

  async codexStatus(): Promise<CodexInstallationStatus> {
    return await probeCodexInstallation({ command: this.codexCommand });
  }

  async importDelivery(packageJson: string | Buffer): Promise<PublicWorkspace> {
    const managedDeliveries = await this.#managedDeliveries();
    const definition = await managedDeliveries.install(packageJson);
    this.registry.register(definition);
    return this.registry.get(definition.id);
  }

  async planDeliveryUpdate(packageJson: string | Buffer): Promise<DeliveryUpdatePlan> {
    return await (await this.#managedDeliveries()).planUpdate(packageJson);
  }

  async applyDeliveryUpdate(planId: string): Promise<DeliveryUpdatePlan> {
    const managedDeliveries = await this.#managedDeliveries();
    const plan = await managedDeliveries.applyUpdate(planId);
    await this.service.closeWorkspaceSessions(plan.workspaceId);
    this.#previews.get(plan.workspaceId)?.close();
    this.#previews.delete(plan.workspaceId);
    return plan;
  }

  async checkpoint(workspaceId: string): Promise<string> {
    this.registry.resolve(workspaceId);
    return await (await this.#managedDeliveries()).checkpoint(workspaceId);
  }

  async undo(workspaceId: string, checkpointId: string): Promise<void> {
    this.registry.resolve(workspaceId);
    await this.service.closeWorkspaceSessions(workspaceId);
    this.#previews.get(workspaceId)?.close();
    this.#previews.delete(workspaceId);
    await (await this.#managedDeliveries()).undo(workspaceId, checkpointId);
  }

  async rollback(workspaceId: string): Promise<void> {
    this.registry.resolve(workspaceId);
    await this.service.closeWorkspaceSessions(workspaceId);
    this.#previews.get(workspaceId)?.close();
    this.#previews.delete(workspaceId);
    await (await this.#managedDeliveries()).rollback(workspaceId);
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

  async #managedDeliveries(): Promise<ManagedDeliveryRuntime> {
    const keyringPath = process.env.CLIENT_WORKSPACE_TRUST_KEYRING_FILE;
    if (!keyringPath) {
      throw new ClientWorkspaceDeliveryError(
        'delivery_import_unavailable',
        'The delivery trust root is unavailable.'
      );
    }
    return new ManagedDeliveryRuntime({
      managedRoot: this.managedRoot,
      stateRoot: this.stateRoot,
      trustPolicy: await loadClientWorkspaceTrustPolicy(keyringPath)
    });
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
