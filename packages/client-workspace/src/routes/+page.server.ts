import { clientWorkspaceRuntime } from '$lib/server/runtime.js';

export async function load() {
  return {
    workspaces: clientWorkspaceRuntime.registry.list(),
    codex: await clientWorkspaceRuntime.codexStatus(),
    desktop: process.env.CLIENT_WORKSPACE_DESKTOP === '1',
    remote: process.env.CLIENT_WORKSPACE_REMOTE === '1',
    paperclipIssueUrl: process.env.CLIENT_WORKSPACE_PAPERCLIP_ISSUE_URL ?? null
  };
}
