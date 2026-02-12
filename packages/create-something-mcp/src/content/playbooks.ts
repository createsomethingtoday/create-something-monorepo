/**
 * Host Playbooks — Re-exported from @create-something/playbook-mcp (canonical source).
 *
 * The playbook-mcp package owns this data. This file re-exports it so that
 * existing imports throughout create-something-mcp continue to work unchanged.
 *
 * DRY: "Have I built this before?" → Yes. Unified.
 */

export {
  HOST_PLAYBOOKS,
  HOST_COMPARISONS,
  GRADUATION_PATH,
  MCP_HOST_PATTERNS,
} from '@create-something/playbook-mcp/playbooks';

export type {
  HostPlaybook,
  HostComparison,
  WorkflowPattern,
  FolderTemplate,
} from '@create-something/playbook-mcp/playbooks';
