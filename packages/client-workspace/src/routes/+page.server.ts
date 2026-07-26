import { workspaceRegistry } from '$lib/server/workspaces/default-registry.js';

export function load() {
  return {
    workspaces: workspaceRegistry.list()
  };
}
