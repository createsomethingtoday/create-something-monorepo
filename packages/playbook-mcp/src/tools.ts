/**
 * Tools — Automation tier (model-controlled).
 *
 * Exposes playbook content as tools for hosts that only support tools
 * (Codex, ChatGPT). Resources and Prompts are invisible to these hosts,
 * so the same content must be callable via tools.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HOST_PLAYBOOKS, HOST_COMPARISONS, GRADUATION_PATH, MCP_HOST_PATTERNS } from './playbooks.js';
import type { HostPlaybook } from './playbooks.js';
import { MCP_CATALOG, getCatalogByCategory, getCatalogEntry } from './catalog.js';
import { WORKFLOW_IDS, WORKFLOWS, getWorkflowById } from './workflows.js';
import { exportWorkflowToAtlasStudio, exportOutcomePlaybookToAtlasStudio } from './atlas-studio.js';
import { OUTCOME_PLAYBOOK_IDS, OUTCOME_PLAYBOOKS, getOutcomePlaybookById } from './outcome-playbooks.js';
import { parseCatalogHealthCheck, readJsonBodyLimited } from './connection-verification.js';

export function registerTools(server: McpServer) {
  const workflowIdSchema = z.enum(WORKFLOW_IDS as [string, ...string[]])
    .describe('Stable workflow id. Use list_workflows to discover available ids.');
  const outcomePlaybookIdSchema = z.enum(OUTCOME_PLAYBOOK_IDS as [string, ...string[]])
    .describe('Stable outcome playbook id. Use list_outcome_playbooks to discover available ids.');

  // ==========================================================================
  // get_playbook — retrieve workflow guidance for a specific host
  // ==========================================================================

  server.tool(
    'get_playbook',
    'Get the workflow playbook for an MCP host (Codex, Cursor, or Claude Desktop). Returns mental model, best practices, anti-patterns, workflow patterns, and recommended folder structure.',
    {
      host: z.enum(['codex', 'cursor', 'claude-desktop', 'claude-code', 'windsurf', 'vscode'])
        .describe('Which host to get the playbook for'),
      domain: z.enum(['construction', 'legal', 'agency', 'general']).optional()
        .describe('Work domain to filter workflow patterns (default: all)'),
    },
    async ({ host, domain }) => {
      const playbook = HOST_PLAYBOOKS.find(p => p.slug === host);
      if (!playbook) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown host: ${host}` }) }] };
      }

      const patterns = domain
        ? playbook.workflowPatterns.filter(wp => !wp.domain || wp.domain === domain || wp.domain === 'general')
        : playbook.workflowPatterns;

      return {
        content: [{
          type: 'text',
          text: formatPlaybook(playbook, patterns),
        }],
      };
    }
  );

  // ==========================================================================
  // compare_hosts — which host is best for a task type
  // ==========================================================================

  server.tool(
    'compare_hosts',
    'Compare Codex, Cursor, and Claude Desktop for a specific type of work. Returns ranked recommendations with reasons.',
    {
      task_type: z.enum(['project-management', 'research', 'document-drafting', 'data-analysis', 'coding', 'general']).optional()
        .describe('Type of work (default: general)'),
    },
    async ({ task_type }) => {
      const selectedType = task_type || 'general';
      const comparison = HOST_COMPARISONS.find(c => c.taskType === selectedType);

      if (!comparison) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown task type: ${selectedType}`, available: HOST_COMPARISONS.map(c => c.taskType) }) }] };
      }

      const lines = [
        `# Host Comparison: ${selectedType}`,
        '',
        ...comparison.recommendations.map(r =>
          `**${r.host}** [${r.fit.toUpperCase()}]: ${r.reason}`
        ),
        '',
        '## Graduation Path',
        ...GRADUATION_PATH.stages.map(s =>
          `Stage ${s.stage}: **${s.host}** — ${s.trigger}. Graduate when: ${s.graduationSignal}`
        ),
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  // ==========================================================================
  // get_folder_structure — recommended project structure for a host
  // ==========================================================================

  server.tool(
    'get_folder_structure',
    'Get the recommended folder structure for AI-assisted work in Codex or Cursor. Includes key files and their purposes.',
    {
      host: z.enum(['codex', 'cursor', 'claude-code', 'windsurf', 'vscode']).optional()
        .describe('Which host (default: codex)'),
    },
    async ({ host }) => {
      const selectedHost = host || 'codex';
      const playbook = HOST_PLAYBOOKS.find(p => p.slug === selectedHost);

      if (!playbook?.folderTemplate) {
        return { content: [{ type: 'text', text: `No folder template available for ${selectedHost}.` }] };
      }

      const lines = [
        `# ${playbook.name} — Recommended Folder Structure`,
        '',
        playbook.folderTemplate.description,
        '',
        '```',
        playbook.folderTemplate.structure,
        '```',
        '',
        '## Key Files',
        '',
        ...playbook.folderTemplate.keyFiles.map(f =>
          `**\`${f.path}\`**: ${f.purpose}`
        ),
        '',
        `## ${selectedHost === 'codex' ? 'AGENTS.md' : '.cursor/rules/'} Guidance`,
        '',
        selectedHost === 'codex'
          ? 'AGENTS.md is the most important file. Include: who you are, how you work, what MCPs are available, what to do, what NOT to do. Write it like onboarding a team member.'
          : '.cursor/rules/ holds .mdc files (style-guide, templates, data-sources, review-process, domain-knowledge). Auto-included when relevant.',
      ];

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  // ==========================================================================
  // list_workflows — structured workflows (machine-readable)
  // ==========================================================================

  server.tool(
    'list_workflows',
    'List structured workflows derived from host playbooks. Each workflow has a stable id and can be exported to Atlas Studio.',
    {},
    async () => ({
      content: [{
        type: 'text',
        text: JSON.stringify(WORKFLOWS.map((w) => ({
          id: w.id,
          hostSlug: w.hostSlug,
          hostName: w.hostName,
          name: w.name,
          description: w.description,
          domain: w.domain,
        })), null, 2),
      }],
    }),
  );

  // ==========================================================================
  // get_workflow — retrieve a structured workflow
  // ==========================================================================

  server.tool(
    'get_workflow',
    'Get a structured workflow by id. Returns machine-readable steps with Atlas reference ids.',
    {
      workflow_id: workflowIdSchema,
    },
    async ({ workflow_id }) => {
      const workflow = getWorkflowById(workflow_id);
      if (!workflow) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown workflow_id: ${workflow_id}` }, null, 2) }] };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(workflow, null, 2),
        }],
      };
    },
  );

  // ==========================================================================
  // export_workflow_atlas_studio — Atlas Studio BuilderState JSON
  // ==========================================================================

  server.tool(
    'export_workflow_atlas_studio',
    'Export a workflow in Atlas Studio import format (BuilderState JSON: { nodes, edges, personas }).',
    {
      workflow_id: workflowIdSchema,
    },
    async ({ workflow_id }) => {
      const workflow = getWorkflowById(workflow_id);
      if (!workflow) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown workflow_id: ${workflow_id}` }, null, 2) }] };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(exportWorkflowToAtlasStudio(workflow), null, 2),
        }],
      };
    },
  );

  // ==========================================================================
  // list_outcome_playbooks — AI-native workflow library
  // ==========================================================================

  server.tool(
    'list_outcome_playbooks',
    'List AI-native outcome playbooks (construction, agency, ops) with stable ids and metadata.',
    {
      vertical: z.enum(['construction', 'agency', 'ops', 'all']).optional()
        .describe('Filter by vertical (default: all)'),
    },
    async ({ vertical }) => {
      const selected = (vertical && vertical !== 'all')
        ? OUTCOME_PLAYBOOKS.filter((p) => p.vertical === vertical)
        : OUTCOME_PLAYBOOKS;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(selected.map((p) => ({
            id: p.id,
            name: p.name,
            vertical: p.vertical,
            priority: p.priority,
            description: p.description,
            oversight: p.oversight,
          })), null, 2),
        }],
      };
    },
  );

  // ==========================================================================
  // get_outcome_playbook — retrieve a playbook by id (machine-readable)
  // ==========================================================================

  server.tool(
    'get_outcome_playbook',
    'Get an AI-native outcome playbook by id (machine-readable). Includes Atlas-mapped steps, integrations, judgment notes, and test scenarios.',
    {
      playbook_id: outcomePlaybookIdSchema,
    },
    async ({ playbook_id }) => {
      const playbook = getOutcomePlaybookById(playbook_id);
      if (!playbook) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown playbook_id: ${playbook_id}` }, null, 2) }] };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(playbook, null, 2),
        }],
      };
    },
  );

  // ==========================================================================
  // export_outcome_playbook_atlas_studio — Atlas Studio BuilderState JSON
  // ==========================================================================

  server.tool(
    'export_outcome_playbook_atlas_studio',
    'Export an outcome playbook in Atlas Studio import format (BuilderState JSON: { nodes, edges, personas }).',
    {
      playbook_id: outcomePlaybookIdSchema,
    },
    async ({ playbook_id }) => {
      const playbook = getOutcomePlaybookById(playbook_id);
      if (!playbook) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown playbook_id: ${playbook_id}` }, null, 2) }] };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(exportOutcomePlaybookToAtlasStudio(playbook), null, 2),
        }],
      };
    },
  );

  // ==========================================================================
  // detect_host — identify which MCP host environment the user is in
  // ==========================================================================

  server.tool(
    'detect_host',
    'Detect which MCP host environment the user is in and return config file paths, format, and capabilities. Use this as the first step when helping a user set up MCP servers.',
    {
      host: z.enum(['codex', 'cursor', 'claude-desktop', 'claude-code', 'windsurf', 'vscode']).optional()
        .describe('Specify the host if known. Omit to get info for all hosts so the agent can ask the user.'),
    },
    async ({ host }) => {
      const hostConfigs = HOST_CONFIG_MAP;

      if (host) {
        const config = hostConfigs[host];
        if (!config) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown host: ${host}` }) }] };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              host,
              ...config,
              instructions: `The user is working in ${config.displayName}. Their MCP config file is at ${config.configPath}. Format: ${config.configFormat}.`,
            }, null, 2),
          }],
        };
      }

      // Return all hosts so the agent can ask which one
      const allHosts = Object.entries(hostConfigs).map(([slug, config]) => ({
        slug,
        ...config,
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            message: 'Could not auto-detect host. Ask the user which environment they are working in.',
            hosts: allHosts,
            detectionHints: [
              'If they mention "Cursor" or are in an IDE with a sidebar chat and Composer → cursor',
              'If they mention "Codex" or "codex" CLI or the Codex app → codex',
              'If they mention "Claude Desktop" or a chat window with Projects → claude-desktop',
              'If they mention "Claude Code" or are in a terminal with "claude" command → claude-code',
              'If they mention "Windsurf" or "Cascade" or "Codeium" → windsurf',
              'If they mention "VS Code", "Visual Studio Code", "Copilot", or "GitHub Copilot" → vscode',
            ],
          }, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // list_available_mcps — catalog of MCP servers available for installation
  // ==========================================================================

  server.tool(
    'list_available_mcps',
    'List MCP servers available for installation. Includes CREATE SOMETHING ecosystem, WORKWAY vertical, and common third-party servers. Use this to show users what they can connect.',
    {
      category: z.enum(['create-something', 'workway', 'third-party', 'all']).optional()
        .describe('Filter by category (default: all)'),
    },
    async ({ category }) => {
      const entries = getCatalogByCategory(category || 'all');

      const lines = [
        `# Available MCP Servers${category && category !== 'all' ? ` (${category})` : ''}`,
        '',
        `${entries.length} servers available:`,
        '',
      ];

      const grouped: Record<string, typeof entries> = {};
      for (const entry of entries) {
        const cat = entry.category;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(entry);
      }

      for (const [cat, items] of Object.entries(grouped)) {
        const label = cat === 'create-something' ? 'CREATE SOMETHING'
          : cat === 'workway' ? 'WORKWAY'
          : 'Third-Party';
        lines.push(`## ${label}`, '');
        for (const item of items) {
          lines.push(
            `**${item.name}** (\`${item.slug}\`)`,
            `  URL: ${item.url}`,
            `  ${item.description}`,
            `  Auth required: ${item.requiresAuth ? `Yes (${item.authType || 'bearer'})` : 'No'}`,
          );
          if (item.setupNotes) {
            lines.push(`  Setup: ${item.setupNotes.split('\n')[0]}`);
          }
          lines.push('');
        }
      }

      lines.push(
        '---',
        'Use `generate_mcp_config` with the server URL and your host to get the exact config entry to add.',
      );

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  // ==========================================================================
  // generate_mcp_config — generate the config entry for a specific host
  // ==========================================================================

  server.tool(
    'generate_mcp_config',
    'Generate the exact config entry to install an MCP server into a specific host. Returns the config file path, the entry to add, and step-by-step instructions. The agent should then write this config using its native file tools.',
    {
      server_name: z.string()
        .describe('Name/slug for the MCP server entry (e.g., "playbook", "procore", "cloudflare-docs")'),
      server_url: z.string()
        .describe('The MCP server URL (e.g., "https://playbook.mcp.createsomething.ltd")'),
      host: z.enum(['codex', 'cursor', 'claude-desktop', 'claude-code', 'windsurf', 'vscode'])
        .describe('Which host to generate config for'),
      transport: z.enum(['http', 'sse']).optional()
        .describe('Transport type. Defaults: Cursor uses SSE (/sse), others use HTTP (/mcp)'),
      auth_token: z.string().optional()
        .describe('Bearer token for authenticated servers. Adds Authorization header to generated config.'),
    },
    async ({ server_name, server_url, host, transport, auth_token }) => {
      const config = HOST_CONFIG_MAP[host];
      if (!config) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown host: ${host}` }) }] };
      }

      // Determine the full URL with transport path
      // All hosts now use Streamable HTTP (/mcp) by default.
      // SSE is deprecated in the MCP spec (2025-03-26) and kept only for legacy compatibility.
      const baseUrl = server_url.replace(/\/+$/, '');
      const selectedTransport = transport || 'http';
      const transportPath = selectedTransport === 'sse' ? '/sse' : '/mcp';
      const fullUrl = `${baseUrl}${transportPath}`;

      let entry: string;
      let fullExample: string;
      const instructions: string[] = [];

      // Look up catalog entry for setup notes
      const catalogEntry = getCatalogEntry(server_name);
      const setupNotes = catalogEntry?.setupNotes || '';

      if (config.configFormat === 'toml') {
        // Codex uses TOML
        const authEnvVar = `${server_name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_API_KEY`;
        const expectsBearer = catalogEntry?.requiresAuth && catalogEntry?.authType !== 'oauth';
        entry = auth_token
          ? `[mcp_servers."${server_name}"]\nurl = "${fullUrl}"\nhttp_headers = { Authorization = "Bearer ${auth_token}" }`
          : expectsBearer
            ? `[mcp_servers."${server_name}"]\nurl = "${fullUrl}"\nbearer_token_env_var = "${authEnvVar}"`
            : `[mcp_servers."${server_name}"]\nurl = "${fullUrl}"`;
        fullExample = `# Add to ${config.configPath}\n\n${entry}`;
        instructions.push(
          `1. Open ${config.configPath} in a text editor (or create it if it doesn't exist)`,
          `2. Add the following TOML section:`,
          ``,
          `\`\`\`toml`,
          entry,
          `\`\`\``,
          ``,
          `3. Save the file`,
          `4. Restart Codex or start a new session for the change to take effect`,
        );
        if (!auth_token && expectsBearer) {
          instructions.push(
            `5. Export \`${authEnvVar}\` in your shell before starting Codex (for example: \`export ${authEnvVar}=your_token_here\`)`,
          );
        }
      } else {
        // JSON format (Cursor, Claude Desktop, Claude Code, Windsurf, VS Code)
        // Windsurf uses "serverUrl" for remote HTTP servers; others use "url"
        const urlKey = host === 'windsurf' ? 'serverUrl' : 'url';
        const serverConfig: Record<string, unknown> = { [urlKey]: fullUrl };
        if (auth_token) {
          serverConfig.headers = { Authorization: `Bearer ${auth_token}` };
        }
        const jsonEntry = {
          [server_name]: serverConfig,
        };

        entry = JSON.stringify(jsonEntry, null, 2);

        const fullConfig = {
          mcpServers: jsonEntry,
        };
        fullExample = JSON.stringify(fullConfig, null, 2);

        const openInstruction = host === 'windsurf'
          ? `1. In Windsurf chat, click the MCP servers button (hammer icon) → Configure → Manage Plugins → View Raw Config`
          : host === 'claude-code'
            ? `1. Alternatively, run: claude mcp add --transport http ${server_name} ${fullUrl}`
            : `1. Open ${config.configPath}`;

        instructions.push(
          openInstruction,
          `2. If the file exists, add this entry inside the "mcpServers" object:`,
          ``,
          `\`\`\`json`,
          `"${server_name}": ${JSON.stringify(serverConfig, null, 2)}`,
          `\`\`\``,
          ``,
          `3. If the file doesn't exist, create it with this content:`,
          ``,
          `\`\`\`json`,
          fullExample,
          `\`\`\``,
          ``,
          `4. Save the file`,
          `5. ${config.restartInstruction}`,
        );
      }

      // Append setup notes if available
      if (setupNotes) {
        instructions.push('', '---', '**Setup Notes:**', setupNotes);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            host: config.displayName,
            configPath: config.configPath,
            configFormat: config.configFormat,
            serverName: server_name,
            serverUrl: fullUrl,
            transport: selectedTransport,
            requiresAuth: catalogEntry?.requiresAuth || !!auth_token,
            entry,
            fullExample,
            instructions: instructions.join('\n'),
            setupNotes: setupNotes || undefined,
            agentAction: config.configFormat === 'toml'
              ? `Read ${config.configPath}, append the TOML section, write the file back.`
              : `Read ${config.configPath} as JSON. If it exists, parse it, add the entry to mcpServers, write it back. If it doesn't exist, write the full example as a new file.`,
          }, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // scaffold_project — generate folder/file manifest for a new project
  // ==========================================================================

  server.tool(
    'scaffold_project',
    'Generate a complete folder and file manifest for a new AI-assisted project. Returns directories to create, files to write (with full content), and setup instructions. The agent should create the directories and write the files.',
    {
      host: z.enum(['codex', 'cursor', 'claude-code', 'windsurf', 'vscode'])
        .describe('Which host to optimize the project structure for'),
      domain: z.enum(['construction', 'legal', 'agency', 'general']).optional()
        .describe('Work domain for domain-specific folders and guidance (default: general)'),
      team_size: z.enum(['solo', 'small-team', 'organization']).optional()
        .describe('Team context for structure decisions (default: solo)'),
      project_name: z.string()
        .describe('Name of the project (used for folder name and config content)'),
    },
    async ({ host, domain, team_size, project_name }) => {
      const selectedDomain = domain || 'general';
      const selectedTeam = team_size || 'solo';

      const directories: string[] = [];
      const files: { path: string; content: string; purpose: string }[] = [];

      // Base directories for all projects
      directories.push(
        `${project_name}/templates`,
        `${project_name}/drafts`,
      );

      // Domain-specific directories
      const domainDirs: Record<string, string[]> = {
        construction: ['rfis', 'daily-logs', 'submittals', 'safety', 'photos', 'contacts'],
        legal: ['cases', 'research', 'correspondence', 'filings', 'deadlines'],
        agency: ['clients', 'proposals', 'deliverables', 'brand-guidelines', 'analytics'],
        general: ['documents', 'reference', 'reports'],
      };

      for (const dir of (domainDirs[selectedDomain] || domainDirs.general)) {
        directories.push(`${project_name}/${dir}`);
      }

      // Team-specific directories
      if (selectedTeam === 'small-team' || selectedTeam === 'organization') {
        directories.push(`${project_name}/shared`, `${project_name}/handoffs`);
      }
      if (selectedTeam === 'organization') {
        directories.push(
          `${project_name}/standards`,
          `${project_name}/reviews`,
          `${project_name}/approved`,
          `${project_name}/archive`,
        );
      }

      // Host-specific setup
      if (host === 'codex') {
        directories.push(`${project_name}/briefings`);

        files.push({
          path: `${project_name}/AGENTS.md`,
          purpose: 'Persistent instructions Codex follows every session. The single most important file.',
          content: generateAgentsMd(project_name, selectedDomain, selectedTeam),
        });
      } else {
        // Cursor
        directories.push(
          `${project_name}/.cursor`,
          `${project_name}/.cursor/rules`,
        );

        files.push({
          path: `${project_name}/.cursor/rules/style-guide.mdc`,
          purpose: 'Writing style and tone guidance that persists across conversations.',
          content: generateCursorStyleGuide(project_name, selectedDomain),
        });

        files.push({
          path: `${project_name}/.cursor/rules/data-sources.mdc`,
          purpose: 'Which MCP servers to use for what data.',
          content: generateCursorDataSources(),
        });

        files.push({
          path: `${project_name}/.cursor/mcp.json`,
          purpose: 'MCP server connections. Add servers here to give the AI access to external tools and data.',
          content: JSON.stringify({ mcpServers: {} }, null, 2),
        });
      }

      // Common files
      files.push({
        path: `${project_name}/templates/README.md`,
        purpose: 'Guide for using and creating templates.',
        content: `# Templates\n\nPlace document templates here. The AI uses these as starting points when drafting.\n\nThe more specific your templates, the better the output.\n\n## Creating Templates\n\n1. Start with an existing document that represents your standard\n2. Remove specific details, leave the structure\n3. Add placeholder comments where variable content goes\n4. Save with a descriptive name (e.g., \`rfi.md\`, \`daily-log.md\`)\n`,
      });

      const instructions = [
        `# Setup Instructions for ${project_name}`,
        '',
        `Host: **${host === 'codex' ? 'Codex' : 'Cursor'}**`,
        `Domain: **${selectedDomain}**`,
        `Team: **${selectedTeam}**`,
        '',
        '## Quick Start (5 minutes)',
        '',
        `1. Create the project folder: \`mkdir -p ${project_name}\``,
        `2. Create all directories listed below`,
        `3. Write all files listed below`,
        host === 'codex'
          ? '4. Review and customize AGENTS.md — this is the most important file'
          : '4. Review and customize .cursor/rules/ files',
        '5. Add your document templates to templates/',
        '',
        '## Next Steps',
        '',
        '- Connect MCP servers for your data sources',
        host === 'codex'
          ? '- Task Codex with your first workflow: "Review the project and create a morning briefing"'
          : '- Open the project in Cursor and try Agent mode: "Set up a weekly report template"',
        '- Add domain-specific templates as you discover patterns',
      ];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            projectName: project_name,
            host,
            domain: selectedDomain,
            teamSize: selectedTeam,
            directories,
            files: files.map(f => ({ path: f.path, purpose: f.purpose, content: f.content })),
            instructions: instructions.join('\n'),
            agentAction: `Create all directories, then write all files. The directories array lists paths to create. The files array contains path, content, and purpose for each file.`,
          }, null, 2),
        }],
      };
    }
  );

  // ==========================================================================
  // verify_mcp_connection — check if an MCP server is reachable
  // ==========================================================================

  server.tool(
    'verify_mcp_connection',
    'Check whether an MCP catalog server is reachable and responding. Automatically strips /mcp and /sse transport suffixes to find the health endpoint. Use this after installing a server returned by list_available_mcps.',
    {
      url: z.string().url()
        .describe('An HTTPS URL returned by list_available_mcps (e.g., "https://playbook.mcp.createsomething.ltd" or "https://youtube.mcp.workway.co/mcp")'),
    },
    async ({ url }) => {
      const { cleanedUrl, healthUrl, strippedSuffix, urlsToTry } = parseCatalogHealthCheck(url);
      const results: { url: string; status: number; ok: boolean; info?: Record<string, unknown> }[] = [];

      for (const tryUrl of urlsToTry) {
        try {
          const response = await fetch(tryUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            redirect: 'error',
            signal: AbortSignal.timeout(10000),
          });

          let serverInfo: Record<string, unknown> | undefined;
          const contentType = response.headers.get('content-type') || '';

          if (contentType.includes('application/json')) {
            try {
              serverInfo = await readJsonBodyLimited(response);
            } catch {
              // Non-JSON response body
            }
          }

          results.push({ url: tryUrl, status: response.status, ok: response.ok, info: serverInfo });

          // If the health URL worked, no need to try the transport URL
          if (response.ok) break;
        } catch (err) {
          results.push({ url: tryUrl, status: 0, ok: false });
        }
      }

      const bestResult = results.find(r => r.ok) || results[0];
      const reachable = bestResult.ok;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            url: cleanedUrl,
            healthUrl,
            reachable,
            statusCode: bestResult.status || null,
            serverInfo: bestResult.info || null,
            ...(strippedSuffix && {
              note: `Stripped transport suffix from URL. Health check used ${healthUrl} (root endpoint). Transport endpoint ${cleanedUrl} is for MCP protocol connections, not plain HTTP.`,
            }),
            message: reachable
              ? `Server at ${healthUrl} is reachable and responding.`
              : bestResult.status
                ? `Server returned status ${bestResult.status}. It may require authentication, or the URL may be incorrect.`
                : `Cannot reach server. Check the URL is correct and the server is deployed.`,
            results,
          }, null, 2),
        }],
      };
    }
  );
}

// ============================================================================
// Host config map — config paths, formats, and restart instructions per host
// ============================================================================

const HOST_CONFIG_MAP: Record<string, {
  displayName: string;
  configPath: string;
  configFormat: 'json' | 'toml';
  transport: string;
  restartInstruction: string;
  capabilities: string[];
}> = {
  codex: {
    displayName: 'Codex',
    configPath: '~/.codex/config.toml',
    configFormat: 'toml',
    transport: 'http',
    restartInstruction: 'Start a new Codex session for the change to take effect',
    capabilities: ['Autonomous execution', 'Git-native', 'Persistent project context', 'AGENTS.md instructions'],
  },
  cursor: {
    displayName: 'Cursor',
    configPath: '.cursor/mcp.json',
    configFormat: 'json',
    transport: 'http',
    restartInstruction: 'Restart Cursor or reload the window (Cmd+Shift+P → "Reload Window") for the change to take effect',
    capabilities: ['Real-time editing', 'File awareness', '.cursor/rules/ guidance', 'Diff review'],
  },
  'claude-desktop': {
    displayName: 'Claude Desktop',
    configPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
    configFormat: 'json',
    transport: 'http',
    restartInstruction: 'Restart Claude Desktop for the change to take effect',
    capabilities: ['Conversational', 'Projects for context', 'File uploads', 'Artifacts'],
  },
  'claude-code': {
    displayName: 'Claude Code',
    configPath: '.mcp.json',
    configFormat: 'json',
    transport: 'http',
    restartInstruction: 'Run "claude mcp list" to verify, then start a new session',
    capabilities: ['Terminal-native', 'Full filesystem access', 'Git integration', 'Project-scoped config'],
  },
  windsurf: {
    displayName: 'Windsurf',
    configPath: '~/.codeium/windsurf/mcp_config.json',
    configFormat: 'json',
    transport: 'http',
    restartInstruction: 'Click Refresh in the Manage Plugins tab, or restart Windsurf',
    capabilities: ['Cascade AI', 'Built-in MCP marketplace', 'Plugin management UI', 'OAuth support'],
  },
  vscode: {
    displayName: 'VS Code (Copilot)',
    configPath: '.vscode/mcp.json',
    configFormat: 'json',
    transport: 'http',
    restartInstruction: 'Reload the VS Code window (Cmd+Shift+P → "Reload Window") for the change to take effect',
    capabilities: ['Copilot agent mode', 'Largest editor ecosystem', 'Extension marketplace', 'Team config sharing'],
  },
};

// ============================================================================
// Formatting helper
// ============================================================================

function formatPlaybook(playbook: HostPlaybook, patterns: HostPlaybook['workflowPatterns']): string {
  const lines = [
    `# ${playbook.name} — Workflow Playbook`,
    '',
    `## Mental Model`,
    playbook.mentalModel,
    '',
    `## Best For`,
    ...playbook.bestFor.map(b => `- ${b}`),
    '',
    `## Anti-Patterns (Avoid These)`,
    ...playbook.antiPatterns.map(a => `- ${a}`),
    '',
    `## Strengths`,
    ...playbook.strengths.map(s => `- ${s}`),
    '',
    `## Workflow Patterns`,
  ];

  for (const p of patterns) {
    lines.push(
      '',
      `### ${p.name}`,
      p.description,
      '',
      ...p.steps.map((s, i) => `${i + 1}. ${s.notes || s.customLabel || s.referenceId}`),
    );
  }

  if (playbook.folderTemplate) {
    lines.push(
      '', '## Recommended Folder Structure', '',
      '```', playbook.folderTemplate.structure, '```', '',
      ...playbook.folderTemplate.keyFiles.map(f => `- **\`${f.path}\`**: ${f.purpose}`)
    );
  }

  lines.push('', `Config location: \`${playbook.configLocation}\``);

  return lines.join('\n');
}

// ============================================================================
// Scaffold content generators
// ============================================================================

function generateAgentsMd(projectName: string, domain: string, teamSize: string): string {
  const domainContext: Record<string, string> = {
    construction: `## Domain: Construction

This project manages construction documentation. Key document types:
- **RFIs** (Requests for Information) — use templates/rfi.md
- **Daily Logs** — use templates/daily-log.md
- **Submittals** — track in submittals/
- **Safety Reports** — maintain in safety/

Follow industry-standard formatting. Be precise with dates, quantities, and specifications.`,
    legal: `## Domain: Legal

This project manages legal documentation. Key document types:
- **Case Files** — organized in cases/ by matter number
- **Research Memos** — use templates for consistent formatting
- **Correspondence** — formal tone, proper citation format
- **Filings** — strict formatting requirements per jurisdiction

Always cite sources. Use formal professional language. Never fabricate case citations.`,
    agency: `## Domain: Agency

This project manages client deliverables. Key areas:
- **Proposals** — use templates for consistent formatting
- **Brand Guidelines** — reference client-specific guides in brand-guidelines/
- **Deliverables** — organized by client in deliverables/
- **Analytics** — reporting and performance data

Match each client's voice and brand standards. Review brand-guidelines/ before creating client-facing content.`,
    general: `## Domain: General

Adapt to the project's needs as they develop. Start with clear, professional communication.`,
  };

  const teamContext: Record<string, string> = {
    solo: 'You are working with a single user. Keep things simple and direct.',
    'small-team': 'This is a small team project. Use shared/ for collaborative documents and handoffs/ for work transitions between team members.',
    organization: 'This is an organizational project. Follow the approval workflow: drafts/ → reviews/ → approved/ → archive/. Maintain standards/ for organizational guidelines.',
  };

  return `# ${projectName} — Agent Instructions

## Who You Are
You are an AI assistant working on the ${projectName} project. You follow these instructions every session.

## How You Work
- Read this file at the start of every session
- Check briefings/ for the latest context
- Use templates/ as starting points for documents
- Write work-in-progress to drafts/
- Be specific and actionable — the user may not be technical

${domainContext[domain] || domainContext.general}

## Team Context
${teamContext[teamSize] || teamContext.solo}

## MCP Servers Available
<!-- Add your connected MCP servers here -->
<!-- Example: Procore MCP for project data, QuickBooks for financial data -->

## What NOT To Do
- Don't make up data — if you don't have it, say so
- Don't skip templates — always use them as starting points
- Don't put finished work in drafts/ — that's for work-in-progress only
- Don't modify approved/ documents without explicit permission
`;
}

function generateCursorStyleGuide(projectName: string, domain: string): string {
  const domainGuidance: Record<string, string> = {
    construction: `- Use industry-standard construction terminology
- Be precise with measurements, dates, and specifications
- Reference applicable building codes when relevant
- Format RFIs with clear subject, description, and requested action`,
    legal: `- Use formal professional language
- Cite sources and case law accurately
- Follow jurisdiction-specific formatting requirements
- Never fabricate or hallucinate citations`,
    agency: `- Match each client's brand voice (check brand-guidelines/)
- Use clear, persuasive language for proposals
- Include data and metrics where available
- Maintain consistent formatting across deliverables`,
    general: `- Use clear, professional language
- Be concise but thorough
- Format documents with headers, lists, and tables for readability`,
  };

  return `---
description: Writing style and tone guidance for ${projectName}
globs: ["**/*.md", "**/*.txt", "**/*.doc"]
---

# Style Guide

## Tone
Professional, clear, and actionable.

## Domain Guidance
${domainGuidance[domain] || domainGuidance.general}

## Formatting
- Use markdown headers (## for sections, ### for subsections)
- Use bullet lists for items, numbered lists for steps
- Use tables for comparisons and structured data
- Include dates in YYYY-MM-DD format
`;
}

function generateCursorDataSources(): string {
  return `---
description: MCP server data sources and how to use them
globs: ["**/*"]
---

# Data Sources

## Connected MCP Servers

<!-- Add entries as you connect MCP servers -->
<!-- Example:
### Procore
- **What**: Project management data (RFIs, daily logs, submittals)
- **When to use**: When the user asks about project status, open items, or needs to create project documents
- **Tools available**: get_rfis, create_rfi, get_daily_logs, etc.
-->

## Guidelines
- Always check MCP data sources before asking the user for information
- If data seems stale, note the last-updated timestamp
- Don't cache MCP data across conversations — always fetch fresh
`;
}
