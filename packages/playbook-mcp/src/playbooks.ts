/**
 * Host Playbooks — Workflow intelligence for MCP host environments.
 *
 * Non-technical users can install MCPs but don't know how to work effectively
 * within each host. This content closes the gap between connectivity (Database tier)
 * and producing outcomes (Automation/Judgment tiers).
 *
 * Each host implies a different workflow model. These playbooks encode
 * opinionated positions about how to organize AI-assisted work.
 */

// ============================================================================
// Types (self-contained — no external dependencies)
// ============================================================================

export interface HostPlaybook {
  slug: string;
  name: string;
  description: string;
  mentalModel: string;
  strengths: string[];
  antiPatterns: string[];
  bestFor: string[];
  configLocation: string;
  workflowPatterns: WorkflowPattern[];
  folderTemplate?: FolderTemplate;
}

export interface WorkflowPattern {
  name: string;
  description: string;
  domain?: string;
  steps: string[];
}

export interface FolderTemplate {
  description: string;
  structure: string;
  keyFiles: { path: string; purpose: string }[];
}

export interface HostComparison {
  taskType: string;
  recommendations: {
    host: string;
    fit: 'best' | 'good' | 'adequate' | 'poor';
    reason: string;
  }[];
}

// ============================================================================
// Host Playbooks
// ============================================================================

export const HOST_PLAYBOOKS: HostPlaybook[] = [
  // --------------------------------------------------------------------------
  // Codex
  // --------------------------------------------------------------------------
  {
    slug: 'codex',
    name: 'Codex',
    description: 'Autonomous agent environment with persistent project context. Git-native, folder-aware, and capable of working independently on multi-step tasks. Available as CLI, IDE extension, and desktop app. Think of it as a team member who works from your shared drive.',
    mentalModel: 'Codex is a persistent project workspace. Your folder structure IS your context window. The AGENTS.md file is your "team lead\'s brain" — it encodes institutional knowledge about how things should be done. Codex excels when given structured projects with clear instructions, not ad-hoc chat messages. Place AGENTS.md at the project root; in monorepos, place additional AGENTS.md files in subdirectories for scoped guidance (closest file takes precedence).',
    strengths: [
      'Persistent project context across sessions — no re-explaining',
      'Git-native with worktree support: agent-generated code stays on separate branches until reviewed',
      'Codex cloud app supports long-running tasks (hours, days, weeks) with scheduled automations',
      'Folder-aware: understands project structure and file relationships',
      'AGENTS.md serves as persistent instructions the agent always follows (supports subdirectory scoping for monorepos)',
      'Three autonomy modes: Read Only (safe exploration), Auto Edit (file changes auto-approved), Full Auto (completely autonomous)',
      'Ideal for repeatable workflows that compound over time'
    ],
    antiPatterns: [
      'Treating Codex like a chat — sending one-off questions instead of structured tasks',
      'No AGENTS.md file — the agent starts fresh every session with no guidance',
      'Flat folder structure — everything in one directory destroys context',
      'Not using git — Codex loses its ability to track and branch work',
      'Expecting real-time conversation — Codex is async-first, not interactive',
      'Over-specifying steps — tell Codex WHAT you want, not HOW to do it'
    ],
    bestFor: [
      'Recurring workflows (weekly RFI reviews, daily log synthesis)',
      'Document generation and maintenance',
      'Code modifications across multiple files',
      'Data processing and report generation',
      'Any task you want done while you sleep'
    ],
    configLocation: '~/.codex/config.toml',
    workflowPatterns: [
      {
        name: 'Morning Briefing',
        description: 'Codex autonomously prepares a summary of overnight changes, open items, and priorities for the day.',
        domain: 'general',
        steps: [
          'Create a briefings/ folder in your project',
          'Add instructions in AGENTS.md: "Each morning, review open items and create a briefing in briefings/YYYY-MM-DD.md"',
          'Include what data sources to check (connected MCPs, files, etc.)',
          'Codex generates the briefing before you start work'
        ]
      },
      {
        name: 'Document Drafter',
        description: 'Codex drafts documents following templates and institutional standards.',
        domain: 'construction',
        steps: [
          'Create a templates/ folder with your standard document formats',
          'Create a drafts/ folder for output',
          'In AGENTS.md, describe your organization\'s style, tone, and standards',
          'Task Codex: "Draft an RFI for [issue] following the template in templates/rfi.md"',
          'Review the draft in drafts/, provide feedback, iterate'
        ]
      },
      {
        name: 'Recurring Analysis',
        description: 'Codex runs periodic analysis across your project data.',
        domain: 'general',
        steps: [
          'Create an analysis/ folder with your analysis scripts or instructions',
          'Connect relevant MCP servers (data sources) in config.toml',
          'Describe the analysis cadence and output format in AGENTS.md',
          'Codex reads data via MCP Resources, processes it, writes results',
          'Results accumulate over time — building institutional knowledge'
        ]
      }
    ],
    folderTemplate: {
      description: 'Recommended project structure for non-technical users working with Codex. Treat this like a shared team drive that your AI team member works from.',
      structure: `project-name/
├── AGENTS.md             # Agent instructions (the "team lead's brain")
├── briefings/            # Daily/weekly summaries generated by Codex
│   └── 2026-02-10.md
├── templates/            # Document templates and standard formats
│   ├── rfi.md
│   ├── daily-log.md
│   └── meeting-notes.md
├── drafts/               # Work in progress — Codex writes here
│   └── rfi-concrete-delay.md
├── approved/             # Reviewed and approved documents
├── data/                 # Reference data, imports, lookups
│   └── contacts.csv
└── archive/              # Completed work (moved from approved/)`,
      keyFiles: [
        {
          path: 'AGENTS.md',
          purpose: 'Persistent instructions Codex follows every session. Include: your role, your organization\'s standards, preferred tone, what MCPs are available, what kinds of tasks you\'ll assign. This is the single most important file in your project. In monorepos, place additional AGENTS.md files in subdirectories — closest file to the working directory takes precedence.'
        },
        {
          path: 'templates/',
          purpose: 'Standard document formats. Codex uses these as starting points when drafting. The more specific your templates, the better the output.'
        },
        {
          path: 'drafts/',
          purpose: 'Where Codex puts work-in-progress. Review items here, leave feedback as comments or in a feedback.md file, and Codex will iterate.'
        }
      ]
    }
  },

  // --------------------------------------------------------------------------
  // Cursor
  // --------------------------------------------------------------------------
  {
    slug: 'cursor',
    name: 'Cursor',
    description: 'AI-powered IDE with real-time editing, file awareness, and inline agent capabilities. Best for hands-on work where you want to see changes as they happen and maintain tight control over the output.',
    mentalModel: 'Cursor is your intelligent desk. You see everything — files, changes, diffs — as the AI works. The .cursor/rules/ directory is institutional knowledge that persists across sessions. Use Agent mode (Cmd+I to open Composer, Cmd+. to toggle Agent) for multi-step tasks, Cmd+K for quick inline edits. Cursor also supports AGENTS.md as a simpler alternative to .cursor/rules/. Cursor excels when you want collaborative, visible work.',
    strengths: [
      'Real-time visibility — watch changes as the AI makes them',
      'File-aware: understands your entire project structure',
      '.cursor/rules/ files (.mdc format) encode persistent guidance per-topic, with glob-based auto-activation',
      'Also supports AGENTS.md as a simpler alternative to rule files',
      'Agent mode for multi-step tasks, inline edit (Cmd+K) for quick changes',
      'MCP integration for connecting external tools and data',
      'Diff view lets you accept/reject each change individually'
    ],
    antiPatterns: [
      'Only using inline edit (Cmd+K) — Agent mode is far more powerful for multi-step work',
      'No .cursor/rules/ files — the AI has no persistent guidance',
      'Ignoring the diff view — accepting all changes blindly',
      'Not scoping your workspace — too many files overwhelm context',
      'Using Cursor for tasks that should be autonomous (use Codex instead)',
      'Not leveraging MCP servers — doing manual copy-paste of data'
    ],
    bestFor: [
      'Editing and refining documents with real-time feedback',
      'Building spreadsheets, reports, and structured content',
      'Code development and modification',
      'Tasks where you want to see and control every change',
      'Collaborative iteration — you guide, the AI executes'
    ],
    configLocation: '.cursor/mcp.json (project) or ~/.cursor/mcp.json (global)',
    workflowPatterns: [
      {
        name: 'Guided Editing',
        description: 'Use Agent mode to make multi-file changes while you watch and guide.',
        domain: 'general',
        steps: [
          'Open your project folder in Cursor',
          'Create .cursor/rules/ with guidance files for your work patterns',
          'Use Agent mode (Cmd+I to open Composer, then Cmd+. to toggle Agent) for multi-step tasks',
          'Review each change in the diff view before accepting',
          'Use follow-up prompts to refine — "make this more formal" or "add the client name"'
        ]
      },
      {
        name: 'Data Dashboard',
        description: 'Connect MCP servers to pull live data and build reports in Cursor.',
        domain: 'general',
        steps: [
          'Add MCP servers to .cursor/mcp.json for your data sources',
          'Ask the agent to pull data: "Get the latest project updates from Procore"',
          'The agent uses MCP tools to fetch data and format it',
          'Iterate on the format: "Make this a table" or "Highlight overdue items"',
          'Save the output as a document or report'
        ]
      },
      {
        name: 'Template Refinement',
        description: 'Collaboratively build and refine document templates.',
        domain: 'general',
        steps: [
          'Open an existing template or start a new document',
          'Describe what you need: "Create an RFI template for concrete work"',
          'Review the generated template in real-time',
          'Request specific changes: "Add a field for weather conditions"',
          'Save the refined template for reuse (in Codex projects too)'
        ]
      }
    ],
    folderTemplate: {
      description: 'Recommended Cursor workspace structure. The .cursor/ directory holds your persistent AI configuration.',
      structure: `project-name/
├── .cursor/
│   ├── mcp.json            # MCP server connections
│   └── rules/
│       ├── style-guide.mdc  # Writing style and tone rules
│       ├── templates.mdc    # How to use document templates
│       └── data-sources.mdc # Which MCP servers to use for what
├── documents/              # Your working documents
├── templates/              # Reusable templates
├── reports/                # Generated reports
└── reference/              # Reference materials`,
      keyFiles: [
        {
          path: '.cursor/mcp.json',
          purpose: 'Connects MCP servers to Cursor. Each server gives the AI access to external tools and data. This is where you add Procore, QuickBooks, scheduling, etc.'
        },
        {
          path: '.cursor/rules/',
          purpose: 'Persistent AI guidance files. Each .mdc file teaches the AI about a specific aspect of your work. These persist across conversations — institutional knowledge that compounds.'
        }
      ]
    }
  },

  // --------------------------------------------------------------------------
  // Claude Desktop
  // --------------------------------------------------------------------------
  {
    slug: 'claude-desktop',
    name: 'Claude Desktop',
    description: 'Conversational AI with Projects for persistent context. The lowest barrier to entry — if you can send a message, you can use Claude Desktop. Best for ad-hoc questions, exploration, and quick document work.',
    mentalModel: 'Claude Desktop is your smart colleague you can message anytime. Use Projects to give Claude persistent context about your work. Conversations are threads — good for focused questions, not for maintaining long-running projects. When you find yourself re-explaining context, it\'s time to graduate to Codex or Cursor.',
    strengths: [
      'Lowest barrier to entry — just type a message',
      'Projects feature provides persistent context across conversations',
      'File uploads for quick document analysis',
      'MCP integration for connecting to external tools',
      'Excellent for brainstorming, analysis, and Q&A',
      'Artifacts for generating documents, code, and visualizations'
    ],
    antiPatterns: [
      'Re-explaining your role and context in every conversation (use Projects)',
      'Trying to maintain state across threads — each thread is independent',
      'Using Claude Desktop for tasks that need file-system persistence (use Codex)',
      'Uploading the same documents repeatedly (put them in a Project)',
      'Long multi-step tasks in a single thread — context degrades over time',
      'Not using MCP servers — manually copy-pasting data from other tools'
    ],
    bestFor: [
      'Quick questions and ad-hoc analysis',
      'Brainstorming and ideation sessions',
      'Analyzing uploaded documents (PDFs, images, spreadsheets)',
      'One-off document drafting',
      'Learning and exploration — "how does X work?"'
    ],
    configLocation: '~/Library/Application Support/Claude/claude_desktop_config.json (macOS)',
    workflowPatterns: [
      {
        name: 'Project Hub',
        description: 'Use Claude Desktop Projects to maintain persistent context for ongoing work.',
        domain: 'general',
        steps: [
          'Create a Project for each major work area (e.g., "Highway 101 Bridge Project")',
          'Add context documents to the Project: specs, contacts, standards',
          'Write Project Instructions that describe your role and preferences',
          'Start new conversations within the Project — context carries over',
          'Star important conversations for quick retrieval later'
        ]
      },
      {
        name: 'Document Analysis',
        description: 'Upload documents for quick analysis, comparison, or summarization.',
        domain: 'general',
        steps: [
          'Upload the document(s) to analyze',
          'Ask specific questions: "What are the key risks in this contract?"',
          'Request structured output: "Create a comparison table of these two bids"',
          'Use follow-ups to drill deeper: "Elaborate on the insurance clause"',
          'Copy the output — Claude Desktop Artifacts make this easy'
        ]
      },
      {
        name: 'MCP Quick Access',
        description: 'Use connected MCP servers for quick data lookups without leaving the conversation.',
        domain: 'general',
        steps: [
          'Ensure MCP servers are configured in claude_desktop_config.json',
          'Ask Claude to use the connected tools: "Check Procore for open RFIs on Project X"',
          'Claude calls the MCP tool and returns the data in conversation',
          'Ask follow-up questions about the data',
          'For recurring workflows, consider graduating to Codex'
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // Claude Code
  // --------------------------------------------------------------------------
  {
    slug: 'claude-code',
    name: 'Claude Code',
    description: 'Terminal-native AI coding agent with full filesystem access, git integration, and MCP support. Runs in your terminal as a CLI. Best for developers who live in the terminal and want an autonomous agent that can read, write, and execute code directly.',
    mentalModel: 'Claude Code is your senior developer pair-programming in the terminal. It sees your entire project, can run commands, edit files, and use MCP tools — all from the command line. It supports project-scoped config (.mcp.json in the project root) and user-scoped config (~/.claude.json). Use CLAUDE.md at the project root for persistent instructions, similar to AGENTS.md in Codex.',
    strengths: [
      'Full filesystem access — reads, writes, and executes from your terminal',
      'Git-native: understands branches, diffs, commits',
      'Project-scoped MCP via .mcp.json — different servers per project',
      'User-scoped MCP via ~/.claude.json — global servers across all projects',
      'CLAUDE.md for persistent project instructions',
      'CLI-first: claude mcp add/remove/list for managing servers',
      'Can import MCP servers from Claude Desktop config',
      'Supports HTTP and stdio transports natively'
    ],
    antiPatterns: [
      'Not using .mcp.json for project-specific servers — everything goes global',
      'No CLAUDE.md file — the agent has no project context between sessions',
      'Manually editing ~/.claude.json when claude mcp add is simpler',
      'Using Claude Code for tasks that need a visual interface (use Cursor instead)',
      'Not reviewing diffs before committing agent-generated changes',
      'Ignoring the /mcp command to verify server connections'
    ],
    bestFor: [
      'Terminal-native development workflows',
      'Autonomous code generation and refactoring',
      'Multi-file edits with full project context',
      'Git operations — branching, committing, reviewing',
      'Running tests and debugging from the terminal',
      'Developers who prefer CLI over GUI'
    ],
    configLocation: '~/.claude.json (user) or .mcp.json (project)',
    workflowPatterns: [
      {
        name: 'Project Bootstrap',
        description: 'Use Claude Code to scaffold a new project with MCP servers configured from the start.',
        domain: 'general',
        steps: [
          'Create CLAUDE.md with project context, standards, and instructions',
          'Add project-specific MCP servers: claude mcp add --transport http <name> <url>',
          'Verify servers: claude then /mcp to check connections',
          'Start working: "Set up the project structure following CLAUDE.md"',
          'Review changes in git before committing'
        ]
      },
      {
        name: 'Code Review',
        description: 'Claude Code reviews your changes, runs tests, and suggests improvements.',
        domain: 'general',
        steps: [
          'Stage your changes: git add .',
          'Ask Claude Code: "Review the staged changes for bugs, style issues, and test coverage"',
          'Claude reads diffs, checks test results, and provides feedback',
          'Iterate on suggestions',
          'Commit when satisfied'
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // Windsurf
  // --------------------------------------------------------------------------
  {
    slug: 'windsurf',
    name: 'Windsurf',
    description: 'AI-powered IDE with Cascade, an agentic assistant that can use MCP tools. Built on the Codeium platform. Supports stdio, Streamable HTTP, and SSE transports with OAuth. Good for teams that want a managed IDE experience with built-in MCP discovery.',
    mentalModel: 'Windsurf is your AI-augmented workshop with a built-in plugin marketplace for MCP servers. Cascade (the AI assistant) uses MCP tools when relevant to your queries. The key difference from Cursor: Windsurf has a built-in MCP server browser with one-click install for official servers. For custom servers, edit the mcp_config.json directly.',
    strengths: [
      'Built-in MCP server marketplace with one-click install',
      'Official servers show a verified checkmark',
      'Cascade AI automatically uses relevant MCP tools',
      'Supports stdio, Streamable HTTP, and SSE transports',
      'OAuth support for authenticated servers',
      'Environment variable interpolation in config',
      'Visual plugin management UI'
    ],
    antiPatterns: [
      'Only using the marketplace — many useful servers require manual config',
      'Global-only config — Windsurf lacks project-level MCP config (all servers are shared across projects)',
      'Not checking View Raw Config to understand what is actually configured',
      'Ignoring the Refresh button after config changes',
      'Using Windsurf for tasks that need autonomous execution (use Codex instead)'
    ],
    bestFor: [
      'Teams wanting managed MCP discovery and installation',
      'Developers who prefer a visual plugin management experience',
      'Projects that use popular, well-supported MCP servers',
      'Coding workflows with Cascade AI assistance',
      'Quick prototyping with connected data sources'
    ],
    configLocation: '~/.codeium/windsurf/mcp_config.json',
    workflowPatterns: [
      {
        name: 'Marketplace Setup',
        description: 'Browse and install MCP servers from Windsurf\'s built-in marketplace.',
        domain: 'general',
        steps: [
          'Open Windsurf and click the Plugins icon in the sidebar',
          'Browse available MCP servers (look for the blue verified checkmark)',
          'Click Install on the server you want',
          'Enter your API key or authentication credentials',
          'Click Save — Cascade can now use the server\'s tools'
        ]
      },
      {
        name: 'Manual Server Config',
        description: 'Add custom or self-hosted MCP servers via the raw config file.',
        domain: 'general',
        steps: [
          'In Windsurf chat, click the MCP servers button (hammer icon)',
          'Click Configure → Manage Plugins → View Raw Config',
          'Add your server entry to mcp_config.json',
          'For remote HTTP: use serverUrl field with /mcp endpoint',
          'Click Refresh to load the new server'
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // VS Code (Copilot)
  // --------------------------------------------------------------------------
  {
    slug: 'vscode',
    name: 'VS Code (Copilot)',
    description: 'The most widely-used code editor with GitHub Copilot agent mode supporting MCP. MCP servers connect through VS Code settings or .vscode/mcp.json. Massive ecosystem reach — if you can make it work in VS Code, you reach the largest developer audience.',
    mentalModel: 'VS Code with Copilot is the mainstream gateway to MCP. Copilot\'s agent mode can invoke MCP tools during conversations. Config is through VS Code settings (settings.json) or a dedicated .vscode/mcp.json file. The key advantage: VS Code has the largest installed base of any editor, so supporting it means maximum reach.',
    strengths: [
      'Largest installed base of any code editor',
      'Copilot agent mode integrates MCP tool calls into chat',
      'Project-level config via .vscode/mcp.json',
      'User-level config via VS Code settings.json',
      'Massive extension ecosystem that complements MCP',
      'Familiar interface for most developers'
    ],
    antiPatterns: [
      'Confusing Copilot completions with Copilot agent mode — MCP only works in agent mode',
      'Adding too many MCP servers — causes token bloat and degrades Copilot performance',
      'Not using .vscode/mcp.json for project-specific config (putting everything in user settings)',
      'Expecting the same level of agentic capability as Cursor or Claude Code'
    ],
    bestFor: [
      'Developers already in the VS Code ecosystem',
      'Teams with standardized VS Code configurations',
      'Projects that need maximum editor compatibility',
      'Supplementing Copilot with domain-specific data sources',
      'Gradual MCP adoption without switching editors'
    ],
    configLocation: '.vscode/mcp.json (project) or VS Code settings.json (user)',
    workflowPatterns: [
      {
        name: 'Copilot Agent Setup',
        description: 'Configure MCP servers for use with Copilot agent mode.',
        domain: 'general',
        steps: [
          'Open VS Code Settings (Cmd+,)',
          'Search for "MCP" in settings',
          'Add server entries under the MCP configuration section',
          'Alternatively, create .vscode/mcp.json in your project root',
          'Open Copilot chat and switch to Agent mode to use MCP tools'
        ]
      }
    ]
  }
];

// ============================================================================
// Host Comparisons — task-type-specific recommendations
// ============================================================================

export const HOST_COMPARISONS: HostComparison[] = [
  {
    taskType: 'project-management',
    recommendations: [
      {
        host: 'Codex',
        fit: 'best',
        reason: 'Project management involves recurring tasks (status updates, RFI tracking, daily logs) that benefit from persistent project context, autonomous execution, and compounding institutional knowledge. Codex can maintain your project folder, generate recurring reports, and work while you\'re on-site.'
      },
      {
        host: 'Cursor',
        fit: 'good',
        reason: 'Good for hands-on report building, template creation, and data-driven document editing. Use when you need to see and control the output in real-time. Best for the creation phase before handing recurring work to Codex.'
      },
      {
        host: 'Claude Desktop',
        fit: 'adequate',
        reason: 'Fine for quick questions ("What\'s the standard RFI response time for concrete work?") and ad-hoc document analysis. Not ideal for recurring project management tasks because conversation context doesn\'t persist between threads.'
      }
    ]
  },
  {
    taskType: 'research',
    recommendations: [
      {
        host: 'Claude Desktop',
        fit: 'best',
        reason: 'Research is inherently conversational — you ask questions, explore tangents, upload documents for analysis, and iterate on understanding. Claude Desktop\'s Projects feature lets you maintain research context. Artifacts let you capture structured findings.'
      },
      {
        host: 'Cursor',
        fit: 'good',
        reason: 'Good when research involves creating structured documents, comparison tables, or reports. The real-time editing is great for building research deliverables. MCP connections can pull live data.'
      },
      {
        host: 'Codex',
        fit: 'adequate',
        reason: 'Useful for systematic research tasks — "analyze all RFIs from the past year and identify patterns." Less suited for exploratory, conversational research where you\'re discovering what to ask next.'
      }
    ]
  },
  {
    taskType: 'document-drafting',
    recommendations: [
      {
        host: 'Codex',
        fit: 'best',
        reason: 'For recurring document types (daily logs, RFIs, meeting notes), Codex with templates is unbeatable. It follows your AGENTS.md standards, uses your templates, and produces consistent output. Set it up once, use it forever.'
      },
      {
        host: 'Cursor',
        fit: 'best',
        reason: 'For one-off or complex documents that need real-time refinement, Cursor is ideal. You see the document taking shape, make corrections inline, and iterate collaboratively. The diff view ensures nothing unexpected slips in.'
      },
      {
        host: 'Claude Desktop',
        fit: 'good',
        reason: 'Quick drafts and simple documents work well in Claude Desktop. Artifacts make it easy to generate and copy documents. Less ideal for complex multi-section documents or anything requiring file-system awareness.'
      }
    ]
  },
  {
    taskType: 'data-analysis',
    recommendations: [
      {
        host: 'Cursor',
        fit: 'best',
        reason: 'Data analysis often requires iterating on queries, visualizations, and formats. Cursor lets you see results in real-time, adjust parameters, and build analysis documents incrementally. MCP servers provide live data access.'
      },
      {
        host: 'Codex',
        fit: 'good',
        reason: 'Excellent for recurring analyses — weekly cost reports, daily safety metrics, monthly progress summaries. Set up the analysis once in your project folder, and Codex reproduces it on schedule.'
      },
      {
        host: 'Claude Desktop',
        fit: 'good',
        reason: 'Good for quick, one-off analysis — upload a spreadsheet and ask questions. Projects can hold reference data. Less ideal for complex multi-step analysis that needs intermediate results.'
      }
    ]
  },
  {
    taskType: 'coding',
    recommendations: [
      {
        host: 'Cursor',
        fit: 'best',
        reason: 'Purpose-built AI IDE with the deepest MCP integration, real-time diff review, and .cursor/rules/ for persistent coding guidance. The gold standard for AI-assisted development with visual feedback.'
      },
      {
        host: 'Claude Code',
        fit: 'best',
        reason: 'Terminal-native with full filesystem access and git integration. Best for developers who live in the terminal. CLAUDE.md and .mcp.json provide persistent project context. Autonomous multi-file edits.'
      },
      {
        host: 'Windsurf',
        fit: 'good',
        reason: 'Strong alternative to Cursor with Cascade AI and built-in MCP marketplace. Good for teams wanting managed plugin discovery. Lacks project-level MCP config (global only).'
      },
      {
        host: 'VS Code (Copilot)',
        fit: 'good',
        reason: 'Largest editor ecosystem. Copilot agent mode supports MCP, but agentic capabilities are less mature than Cursor or Claude Code. Best for teams already standardized on VS Code.'
      },
      {
        host: 'Codex',
        fit: 'good',
        reason: 'Excellent for autonomous coding tasks — multi-file refactoring, test generation, code review. Works while you\'re away. Less suited for interactive development.'
      }
    ]
  },
  {
    taskType: 'general',
    recommendations: [
      {
        host: 'Claude Desktop',
        fit: 'best',
        reason: 'Start here. Claude Desktop has the lowest barrier to entry. Use it to learn what AI can do for your work. When you find yourself doing the same thing repeatedly, that\'s when you graduate to Codex.'
      },
      {
        host: 'Cursor',
        fit: 'good',
        reason: 'Graduate to Cursor when you need to work with files, see real-time changes, or build documents collaboratively. The learning curve is moderate but the payoff is significant.'
      },
      {
        host: 'Codex',
        fit: 'good',
        reason: 'Graduate to Codex when you have repeatable workflows and want autonomous execution. The setup takes more thought (folder structure, AGENTS.md), but the compounding returns are the highest.'
      },
      {
        host: 'Claude Code',
        fit: 'good',
        reason: 'For developers comfortable in the terminal. Full project context, git-native, and supports both project-scoped and global MCP config.'
      },
      {
        host: 'Windsurf',
        fit: 'good',
        reason: 'Good all-around IDE with managed MCP discovery. Lower learning curve than Cursor for MCP setup thanks to the built-in marketplace.'
      },
      {
        host: 'VS Code (Copilot)',
        fit: 'adequate',
        reason: 'Familiar editor with growing MCP support via Copilot agent mode. Best for teams already invested in the VS Code ecosystem.'
      }
    ]
  }
];

// ============================================================================
// The Graduation Path — the opinionated progression
// ============================================================================

export const GRADUATION_PATH = {
  title: 'The Graduation Path',
  description: 'Start with Claude Desktop (lowest barrier). Move to Cursor when you need to see and edit files. Move to Codex when you need autonomous, persistent workflows. Each step up increases both capability and required structure.',
  stages: [
    {
      stage: 1,
      host: 'Claude Desktop',
      trigger: 'You want to try AI for your work',
      skills: [
        'Ask clear, specific questions',
        'Use Projects to maintain context',
        'Upload documents for analysis',
        'Connect MCP servers for live data access'
      ],
      graduationSignal: 'You find yourself re-explaining context, wanting to edit files directly, or doing the same task repeatedly'
    },
    {
      stage: 2,
      host: 'Cursor',
      trigger: 'You need to see and control file changes in real-time',
      skills: [
        'Organize your workspace with clear folder structure',
        'Write .cursor/rules/ files for persistent guidance',
        'Use Agent mode for multi-step tasks',
        'Review diffs before accepting changes'
      ],
      graduationSignal: 'You have repeatable workflows you want automated, or you want work done while you\'re away'
    },
    {
      stage: 3,
      host: 'Codex',
      trigger: 'You want autonomous execution and compounding institutional knowledge',
      skills: [
        'Design folder structures that serve as context architecture',
        'Write effective AGENTS.md instructions',
        'Create templates that encode your standards',
        'Trust the agent to work autonomously on well-defined tasks'
      ],
      graduationSignal: 'You\'re producing outcomes while you sleep — the automation layer is working'
    }
  ]
};

// ============================================================================
// Cross-host MCP patterns — how MCP usage differs by host
// ============================================================================

export const MCP_HOST_PATTERNS = {
  title: 'MCP Usage Across Hosts',
  description: 'The same MCP server behaves differently depending on which host you use it from. Understanding these differences helps you choose the right host for each task.',
  patterns: [
    {
      aspect: 'Data Access (Resources)',
      codex: 'Agent reads Resources autonomously as part of multi-step tasks. Data feeds into documents, reports, and analysis without user prompting.',
      cursor: 'Agent reads Resources on request or as part of agent-mode workflows. You see the data appear in your files and can immediately edit it.',
      claudeDesktop: 'Agent reads Resources in response to your questions. Data appears in the conversation thread. Good for exploration, less for persistence.'
    },
    {
      aspect: 'Action Execution (Tools)',
      codex: 'Agent calls Tools autonomously — can create records, send notifications, update systems as part of automated workflows. Most powerful but requires clear guardrails in AGENTS.md.',
      cursor: 'Agent calls Tools during agent-mode sessions. You see each tool call and can intervene. Good balance of automation and control.',
      claudeDesktop: 'Agent calls Tools in response to your requests. Each tool call is visible in the conversation. Lowest automation, highest visibility.'
    },
    {
      aspect: 'Workflow Guidance (Prompts)',
      codex: 'Prompts in AGENTS.md guide every session. Combined with MCP Prompts, this creates layered guidance: project-level (AGENTS.md) + domain-level (MCP Prompts).',
      cursor: '.cursor/rules/ files + MCP Prompts create persistent guidance. Rules are workspace-scoped, Prompts are MCP-scoped. Together they encode comprehensive institutional knowledge.',
      claudeDesktop: 'Project Instructions + MCP Prompts guide conversations. Less persistent than Codex/Cursor, but Projects help maintain context across threads.'
    }
  ]
};
