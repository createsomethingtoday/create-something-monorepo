import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WorkspaceRegistry, type WorkspaceDefinition } from './registry.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../../');

export function createDefaultWorkspaceRegistry(options?: {
  managedRoot?: string;
  includeDemo?: boolean;
  additionalDefinitions?: WorkspaceDefinition[];
}): WorkspaceRegistry {
  const managedRoot = options?.managedRoot ?? join(packageRoot, 'clients');
  return new WorkspaceRegistry({
    managedRoot,
    definitions: [
      ...(options?.includeDemo === false
        ? []
        : [
            {
              id: 'demo-frontend',
              label: 'Demo frontend',
              sourceRoot: join(managedRoot, 'demo-frontend'),
              editableRoots: ['src'],
              preview: {
                command: 'pnpm',
                args: ['dev', '--host', '127.0.0.1', '--port', '4310', '--strictPort'],
                port: 4310,
                healthPath: '/api/workspaces/demo-frontend/preview'
              }
            }
          ]),
      ...(options?.additionalDefinitions ?? [])
    ]
  });
}

export const workspaceRegistry = createDefaultWorkspaceRegistry({
  managedRoot: process.env.CLIENT_WORKSPACE_MANAGED_ROOT
});
