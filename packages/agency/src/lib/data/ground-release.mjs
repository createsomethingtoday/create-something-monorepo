import manifest from '../../../../ground/npm/package.json' with { type: 'json' };

export const groundVersion = manifest.version;
const packageSpec = `${manifest.name}@${groundVersion}`;
export const groundInstalls = [
  {
    id: 'claude', label: 'Claude Code',
    command: `claude mcp add --scope user --transport stdio ground -- npx --yes -p ${packageSpec} ground-mcp`,
    note: 'Register Ground for the current user'
  },
  {
    id: 'windsurf', label: 'Cursor or Windsurf',
    command: JSON.stringify({ mcpServers: { ground: { command: 'npx', args: ['--yes', '-p', packageSpec, 'ground-mcp'] } } }),
    note: 'Paste into the client MCP configuration'
  },
  {
    id: 'codex', label: 'Codex CLI',
    command: `codex mcp add ground -- npx --yes -p ${packageSpec} ground-mcp`,
    note: 'Register Ground as a local MCP server'
  },
  {
    id: 'npm', label: 'npm', command: `npm install -g ${packageSpec}`,
    note: 'Works with any MCP client'
  }
];
