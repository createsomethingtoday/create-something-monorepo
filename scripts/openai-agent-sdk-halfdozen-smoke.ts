#!/usr/bin/env tsx

import { dirname } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import {
  Agent,
  type MCPServer,
  MCPServerStreamableHttp,
  RunContext,
  Runner,
  connectMcpServers,
  getAllMcpTools,
} from '@openai/agents';

type ServerKey = 'telemetry' | 'youtube' | 'gmail' | 'zoom' | 'notion';
type ScenarioKey = 'internal-agent-builder' | 'dedup' | 'inbox-triage' | 'fleet-watchdog';

type ContractBundle = {
  agent_contract: string;
  mcp_contract: string;
  outcome_contract: string;
  golden_tasks: string;
};

type ScenarioPreset = {
  description: string;
  defaults: {
    query: string;
    servers: ServerKey[];
    model: string;
    maxTurns: number;
    agentName: string;
    agentInstructions: string;
    blockedToolNames: string[];
    requiredToolNames: string[];
  };
  contractBundle: ContractBundle;
};

type ParsedCliArgs = {
  query?: string;
  servers?: ServerKey[];
  model?: string;
  maxTurns?: number;
  scenario?: ScenarioKey;
  timeoutMs: number;
  listServers: boolean;
  listScenarios: boolean;
  connectOnly: boolean;
  governanceEval: boolean;
  outputPath?: string;
};

type CliOptions = {
  query: string;
  servers: ServerKey[];
  model: string;
  maxTurns: number;
  scenario?: ScenarioKey;
  agentName: string;
  agentInstructions: string;
  contractBundle?: ContractBundle;
  blockedToolNames: string[];
  requiredToolNames: string[];
  timeoutMs: number;
  connectOnly: boolean;
};

const SERVER_ENDPOINTS: Record<ServerKey, { url: string; description: string }> = {
  telemetry: {
    url: 'https://halfdozen-telemetry-mcp.half-dozen.workers.dev/mcp',
    description: 'Fleet health, usage, errors, trends',
  },
  youtube: {
    url: 'https://youtube.mcp.workway.co/mcp',
    description: 'YouTube transcript + Notion sync tools',
  },
  gmail: {
    url: 'https://gmail.mcp.workway.co/mcp',
    description: 'Gmail search/sync/automation tools',
  },
  zoom: {
    url: 'https://zoom.mcp.workway.co/mcp',
    description: 'Zoom clips sync + search tools',
  },
  notion: {
    url: 'https://createsomething-notion.mcp.workway.co/mcp',
    description: 'Half Dozen Notion CRUD tools',
  },
};

const DEFAULT_MODEL = 'gpt-5.5';
const DEFAULT_MAX_TURNS = 8;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_SERVERS: ServerKey[] = ['telemetry'];

const DEFAULT_QUERY =
  'Review the Half Dozen MCP fleet health for the last 24 hours. Identify any degraded or unhealthy servers and summarize top error patterns.';

const MULTI_SERVER_GENERIC_BLOCKLIST = ['search', 'fetch', 'submit_feedback'];

const DEFAULT_AGENT_NAME = 'Half Dozen MCP Ops Agent';
const DEFAULT_AGENT_INSTRUCTIONS =
  'You are an operations agent for Half Dozen. Use MCP tools for factual claims. Keep output concise and evidence-based.';

const INTERNAL_AGENT_BUILDER_INSTRUCTIONS = [
  'You are the Internal Agent Builder for the Half Dozen team.',
  '',
  'Your job is to help teammates think through potential Notion agent use cases, clarify requirements, and produce ready-to-paste instructions for configuring a separate production agent.',
  '',
  'Operating modes:',
  '- Discovery mode: ask the smallest useful set of clarifying questions and inspect source-of-truth inventory before proposing a new agent.',
  '- Spec mode: produce the final Agent Spec, Instructions, Install / Enablement notes, and Test Plan.',
  '- Draft creation mode: create the AI Agents [HD] Draft row/page only after the user explicitly confirms that the spec is ready.',
  '- Agent creation mode: only attempt programmatic Notion agent creation when Notion agent API/private beta access is available and the user explicitly asks for creation.',
  '',
  'Mandatory preflight before proposing a new agent:',
  '1. Search AI Agents [HD] for similar agents with the same trigger surface, target database/page, workflow, or tools.',
  '2. Prioritize matches with Status = Validated, Building, Testing, or Updating.',
  '3. If strong matches exist, return the agent name, link, status, and 1 to 2 bullets explaining similarity; then ask whether to extend the existing agent or start a new one.',
  '4. Search AI Toolkits [HD] before recommending any external tool. Treat Validated toolkits as usable, unvalidated toolkits as build/validation requirements, and missing toolkits as new toolkit requests.',
  '5. If AI Agents [HD] or AI Toolkits [HD] is unavailable, mark the source-of-truth check as blocked and proceed only with an explicit caveat.',
  '',
  'Default design posture:',
  '- Notion-native first. Use native Notion databases, pages, relations, buttons, forms, automations, and Notion agent surfaces whenever they can satisfy the workflow.',
  '- Recommend external tools only when the workflow is outside Notion or Notion-native capabilities cannot meet the requirement.',
  '- Web search may be used for directional research only; never claim a toolkit is available unless AI Toolkits [HD] says it is available and Validated.',
  '- Default Usage is Internal, Stack is Notion, Reviewer is DM, and safety posture is no irreversible actions without explicit confirmation.',
  '',
  'Clarifying flow:',
  '- Always ask the routing question first: Database agent, Workflow agent, Integration agent, or Unknown/mixed.',
  '- Ask for goal, users/surface area, trigger, guardrails, and examples.',
  '- For database agents, gather the source database/view, exact input and output property names/types, examples, good output examples, and skip-row rules.',
  '- For workflow agents, gather the current process, failure points, human checkpoints, and produced artifacts.',
  '- For integration agents, gather the system of record, read/write/admin actions, forbidden actions, auth owner, logging/audit expectations, and irreversible-action guards.',
  '- Confirm the output contract by summarizing inputs, decision rules, outputs, and safety constraints before finalizing.',
  '',
  'Candidate design rubric:',
  '- For each serious design option, score or label complexity/risk, maintainability, permissions footprint, testability, and time-to-first-value.',
  '- Recommend one option explicitly and explain why.',
  '',
  'Final output contract:',
  '1. Agent Spec: Name, Purpose, Primary users, Where it lives, Triggers, Inputs, Outputs, Property mapping, Tooling plan, Permissions needed, Edge cases/failure modes, and Success criteria.',
  '2. Instructions: what the agent does, inputs, decision rules, outputs, output formatting requirements, and safety rules.',
  '3. Install / Enablement: access, connections, how to run, and first-run success check when the agent is multi-user or requires setup.',
  '4. Test Plan: 3 to 5 test cases. Each case must include Starting state, Action/trigger, Expected changes, and Must NOT change.',
  '5. Database row fields: Name, Status = Draft, Usage = Internal unless changed by the user, Creator/requester, Stack = Notion, Agent URL blank until created, Agent Description, Attributes, and reviewer tag.',
  '6. Open risks / missing permissions: unresolved schemas, auth owners, private-beta limitations, or unavailable toolkits.',
  '',
  'Definition of done before draft creation:',
  '- Triggers are fully specified.',
  '- Inputs and outputs map to concrete Notion surfaces and exact database property names/types where applicable.',
  '- Decision rules and edge cases are explicit.',
  '- Install / enablement notes are included when multi-user setup is required.',
  '- The Test Plan has 3 to 5 cases, including happy path, missing-input, permission failure, and must-not-change assertions.',
  '',
  'Stop conditions:',
  '- Missing target database/page or trigger surface.',
  '- Missing required property names/types.',
  '- Missing auth owner for external systems.',
  '- Destructive or irreversible action requested without explicit confirmation.',
  '- Programmatic Notion agent creation requested but Notion agent API/private beta access is unavailable.',
  '- No examples are available for a judgment-heavy workflow.',
  '',
  'Failure behavior:',
  '- If required inputs are missing or ambiguous, ask a targeted follow-up instead of guessing.',
  '- If a destructive or irreversible action is requested, require explicit confirmation before continuing.',
  '- If a required tool or permission is missing, say so, propose the closest Notion-native alternative, and list the ideal permission/tool.',
  '- Do not create or modify other agents unless the user explicitly asks to proceed with agent creation.',
  '- Do not change existing database schemas.',
  '- Do not include credentials, secrets, bearer tokens, API keys, or private connection tokens in specs, tests, logs, or draft pages.',
  '',
  'Style: direct, practical, neutral, with checklists and short sections over long prose.',
].join('\n');

const SCENARIO_PRESETS: Record<ScenarioKey, ScenarioPreset> = {
  'internal-agent-builder': {
    description: 'Notion-first agent-building agent for Half Dozen production-agent specs, drafts, and governance checks.',
    defaults: {
      query:
        'Help a teammate design a Notion-native agent for classifying new internal requests. Start with AI Agents [HD] and AI Toolkits [HD] source-of-truth checks, ask only the next most important clarifying questions, and do not create a Draft row until the user confirms the spec is ready.',
      servers: ['notion'],
      model: DEFAULT_MODEL,
      maxTurns: 12,
      agentName: 'Half Dozen Internal Agent Builder',
      agentInstructions: INTERNAL_AGENT_BUILDER_INSTRUCTIONS,
      blockedToolNames: [
        'notion_create_database',
        'notion_update_database',
        'notion_archive_page',
        'notion_archive_block',
        'notion_bulk_update',
        'notion_bulk_archive',
        'delete_automation',
        'search',
        'fetch',
        'submit_feedback',
      ],
      requiredToolNames: [],
    },
    contractBundle: {
      agent_contract: 'templates/agent_contract_halfdozen_internal_agent_builder.yaml',
      mcp_contract: 'templates/mcp_contract_halfdozen_internal_agent_builder.yaml',
      outcome_contract: 'templates/outcome_contract_halfdozen_internal_agent_builder.md',
      golden_tasks: 'templates/golden_tasks_halfdozen_internal_agent_builder.yaml',
    },
  },
  dedup: {
    description: 'Duplicate detection, canonicalization, and safe merge planning.',
    defaults: {
      query:
        'Find likely duplicate contacts in the target Notion source, propose canonical records with confidence scores, and provide a merge plan. Do not execute destructive archive actions without explicit human approval.',
      servers: ['notion', 'gmail'],
      model: DEFAULT_MODEL,
      maxTurns: 10,
      agentName: 'Half Dozen Dedup Agent',
      agentInstructions:
        'You are a deduplication and canonicalization agent for Half Dozen. Use schema-first workflows, include evidence for every merge recommendation, and avoid destructive writes unless explicitly approved.',
      blockedToolNames: [
        'notion_create_database',
        'notion_update_database',
        'delete_automation',
        'search',
        'fetch',
        'submit_feedback',
      ],
      requiredToolNames: [],
    },
    contractBundle: {
      agent_contract: 'templates/agent_contract_halfdozen_dedup.yaml',
      mcp_contract: 'templates/mcp_contract_halfdozen_dedup.yaml',
      outcome_contract: 'templates/outcome_contract_halfdozen_dedup.md',
      golden_tasks: 'templates/golden_tasks_halfdozen_dedup.yaml',
    },
  },
  'inbox-triage': {
    description: 'Inbox triage, sync, contact resolution, and policy-based escalation.',
    defaults: {
      query:
        'Triage unread client-relevant Gmail threads from the last 24 hours, summarize which threads should sync to Notion interactions, and identify any threads that require escalation instead of autonomous writes.',
      servers: ['gmail'],
      model: DEFAULT_MODEL,
      maxTurns: 10,
      agentName: 'Half Dozen Inbox Triage Agent',
      agentInstructions:
        'You are an inbox triage agent for Half Dozen. Prioritize policy-compliant thread handling, contact-linking safety, and concise evidence-based recommendations for escalation.',
      blockedToolNames: [
        'delete_automation',
        'notion_bulk_archive',
        'notion_update_database',
        'search',
        'fetch',
        'submit_feedback',
      ],
      requiredToolNames: [],
    },
    contractBundle: {
      agent_contract: 'templates/agent_contract_halfdozen_inbox_triage.yaml',
      mcp_contract: 'templates/mcp_contract_halfdozen_inbox_triage.yaml',
      outcome_contract: 'templates/outcome_contract_halfdozen_inbox_triage.md',
      golden_tasks: 'templates/golden_tasks_halfdozen_inbox_triage.yaml',
    },
  },
  'fleet-watchdog': {
    description: 'Hourly reliability checks, anomaly detection, and incident-ready diagnostics.',
    defaults: {
      query:
        'Run a 24-hour fleet watchdog review using query_health, query_errors, query_activity, and query_trends before finalizing. Report degraded or unhealthy services, top recurring error clusters with counts, period-over-period regressions, and first remediation step per issue. If any required tool fails or returns no data, state that explicitly.',
      servers: ['telemetry'],
      model: DEFAULT_MODEL,
      maxTurns: 10,
      agentName: 'Half Dozen Fleet Watchdog Agent',
      agentInstructions:
        'You are a reliability watchdog for the Half Dozen MCP fleet. Before final output, call query_health, query_errors, query_activity, and query_trends. Tie every incident claim to tool evidence with concrete values, and provide concise remediation guidance without performing writes.',
      blockedToolNames: ['cleanup', 'notion_bulk_archive', 'delete_automation', 'search', 'fetch', 'submit_feedback'],
      requiredToolNames: ['query_health', 'query_errors', 'query_activity', 'query_trends'],
    },
    contractBundle: {
      agent_contract: 'templates/agent_contract_halfdozen_fleet_watchdog.yaml',
      mcp_contract: 'templates/mcp_contract_halfdozen_fleet_watchdog.yaml',
      outcome_contract: 'templates/outcome_contract_halfdozen_fleet_watchdog.md',
      golden_tasks: 'templates/golden_tasks_halfdozen_fleet_watchdog.yaml',
    },
  },
};

function printUsage(): void {
  console.log(`Usage:
  pnpm exec tsx scripts/openai-agent-sdk-halfdozen-smoke.ts [options]

Options:
  --scenario "<name>"    Scenario preset (${Object.keys(SCENARIO_PRESETS).join(',')})
  --query "<text>"       Prompt to run through the agent
  --servers "<list>"     Comma-separated server keys (telemetry,youtube,gmail,zoom,notion)
  --model "<name>"       Model name (default: ${DEFAULT_MODEL})
  --max-turns <number>   Max agent turns (default: ${DEFAULT_MAX_TURNS})
  --timeout-ms <number>  MCP request timeout in ms (default: ${DEFAULT_TIMEOUT_MS})
  --connect-only         Validate MCP connectivity + tool discovery only (no OpenAI call)
  --governance-eval      Validate scenario governance without Notion/OpenAI execution
  --output "<path>"      Write governance eval JSON to a file
  --list-servers         Print available server keys and exit
  --list-scenarios       Print available scenarios and linked contract bundles
  --help                 Show this help
`);
}

function parseServerList(input: string): ServerKey[] {
  const requested = input
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const parsed: ServerKey[] = [];
  for (const item of requested) {
    if (!(item in SERVER_ENDPOINTS)) {
      const valid = Object.keys(SERVER_ENDPOINTS).join(', ');
      throw new Error(`Unknown server key "${item}". Valid values: ${valid}`);
    }
    parsed.push(item as ServerKey);
  }

  if (parsed.length === 0) {
    throw new Error('No valid servers specified.');
  }

  return parsed;
}

function parseScenario(input: string): ScenarioKey {
  const normalized = input.trim().toLowerCase();
  if (!(normalized in SCENARIO_PRESETS)) {
    const valid = Object.keys(SCENARIO_PRESETS).join(', ');
    throw new Error(`Unknown scenario "${input}". Valid values: ${valid}`);
  }
  return normalized as ScenarioKey;
}

function parseArgs(argv: string[]): ParsedCliArgs {
  let query: string | undefined;
  let servers: ServerKey[] | undefined;
  let model: string | undefined;
  let maxTurns: number | undefined;
  let scenario: ScenarioKey | undefined;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let listServers = false;
  let listScenarios = false;
  let connectOnly = false;
  let governanceEval = false;
  let outputPath: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--list-servers') {
      listServers = true;
      continue;
    }

    if (arg === '--list-scenarios') {
      listScenarios = true;
      continue;
    }

    if (arg === '--connect-only') {
      connectOnly = true;
      continue;
    }

    if (arg === '--governance-eval') {
      governanceEval = true;
      continue;
    }

    if (arg === '--output') {
      const raw = argv[i + 1]?.trim();
      if (!raw) {
        throw new Error('--output requires a file path.');
      }
      outputPath = raw;
      i += 1;
      continue;
    }

    if (arg === '--scenario') {
      const raw = argv[i + 1] ?? '';
      scenario = parseScenario(raw);
      i += 1;
      continue;
    }

    if (arg === '--query') {
      query = argv[i + 1] ?? query;
      i += 1;
      continue;
    }

    if (arg === '--servers') {
      const raw = argv[i + 1] ?? '';
      servers = parseServerList(raw);
      i += 1;
      continue;
    }

    if (arg === '--model') {
      model = argv[i + 1] ?? model;
      i += 1;
      continue;
    }

    if (arg === '--max-turns') {
      const parsed = Number(argv[i + 1]);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error(`Invalid --max-turns value: ${argv[i + 1] ?? ''}`);
      }
      maxTurns = parsed;
      i += 1;
      continue;
    }

    if (arg === '--timeout-ms') {
      const parsed = Number(argv[i + 1]);
      if (!Number.isFinite(parsed) || parsed < 1000) {
        throw new Error(`Invalid --timeout-ms value: ${argv[i + 1] ?? ''}`);
      }
      timeoutMs = parsed;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    query,
    servers,
    model,
    maxTurns,
    scenario,
    timeoutMs,
    listServers,
    listScenarios,
    connectOnly,
    governanceEval,
    outputPath,
  };
}

function resolveOptions(args: ParsedCliArgs): CliOptions {
  let query = DEFAULT_QUERY;
  let servers = [...DEFAULT_SERVERS];
  let model = DEFAULT_MODEL;
  let maxTurns = DEFAULT_MAX_TURNS;
  let agentName = DEFAULT_AGENT_NAME;
  let agentInstructions = DEFAULT_AGENT_INSTRUCTIONS;
  let contractBundle: ContractBundle | undefined;
  let blockedToolNames = [...MULTI_SERVER_GENERIC_BLOCKLIST];
  let requiredToolNames: string[] = [];

  if (args.scenario) {
    const preset = SCENARIO_PRESETS[args.scenario];
    query = preset.defaults.query;
    servers = [...preset.defaults.servers];
    model = preset.defaults.model;
    maxTurns = preset.defaults.maxTurns;
    agentName = preset.defaults.agentName;
    agentInstructions = preset.defaults.agentInstructions;
    contractBundle = preset.contractBundle;
    blockedToolNames = [...preset.defaults.blockedToolNames];
    requiredToolNames = [...preset.defaults.requiredToolNames];
  }

  if (args.query !== undefined) {
    query = args.query;
  }
  if (args.servers !== undefined) {
    servers = args.servers;
  }
  if (args.model !== undefined) {
    model = args.model;
  }
  if (args.maxTurns !== undefined) {
    maxTurns = args.maxTurns;
  }

  return {
    query,
    servers,
    model,
    maxTurns,
    scenario: args.scenario,
    agentName,
    agentInstructions,
    contractBundle,
    blockedToolNames,
    requiredToolNames,
    timeoutMs: args.timeoutMs,
    connectOnly: args.connectOnly,
  };
}

function createMcpServers(keys: ServerKey[], timeoutMs: number, blockedToolNames: string[]): MCPServer[] {
  const useGenericMultiServerFilter = keys.length > 1;
  const blocked = new Set<string>(blockedToolNames);
  if (useGenericMultiServerFilter) {
    for (const tool of MULTI_SERVER_GENERIC_BLOCKLIST) {
      blocked.add(tool);
    }
  }
  const blockedList = [...blocked];
  const toolFilter = blockedList.length > 0 ? { blockedToolNames: blockedList } : undefined;

  return keys.map((key) => {
    const endpoint = SERVER_ENDPOINTS[key];
    return new MCPServerStreamableHttp({
      name: key,
      url: endpoint.url,
      cacheToolsList: true,
      timeout: timeoutMs,
      toolFilter,
    });
  });
}

function getServerInfo(): Array<{ key: string; url: string; description: string }> {
  return Object.entries(SERVER_ENDPOINTS).map(([key, value]) => ({
    key,
    url: value.url,
    description: value.description,
  }));
}

function getScenarioInfo(): Array<{
  key: string;
  description: string;
  default_servers: ServerKey[];
  default_model: string;
  default_max_turns: number;
  default_blocked_tools: string[];
  default_required_tools: string[];
  contract_bundle: ContractBundle;
}> {
  return Object.entries(SCENARIO_PRESETS).map(([key, preset]) => ({
    key,
    description: preset.description,
    default_servers: [...preset.defaults.servers],
    default_model: preset.defaults.model,
    default_max_turns: preset.defaults.maxTurns,
    default_blocked_tools: [...preset.defaults.blockedToolNames],
    default_required_tools: [...preset.defaults.requiredToolNames],
    contract_bundle: preset.contractBundle,
  }));
}

type GovernanceCheck = {
  scenario: ScenarioKey;
  id: string;
  status: 'pass' | 'fail';
  message: string;
  evidence?: unknown;
};

function emitJson(payload: unknown, outputPath?: string): void {
  const json = JSON.stringify(payload, null, 2);
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${json}\n`);
  }
  console.log(json);
}

function addGovernanceCheck(
  checks: GovernanceCheck[],
  scenario: ScenarioKey,
  id: string,
  passed: boolean,
  message: string,
  evidence?: unknown,
): void {
  checks.push({
    scenario,
    id,
    status: passed ? 'pass' : 'fail',
    message,
    evidence,
  });
}

function hasAllNeedles(text: string, needles: string[]): boolean {
  return needles.every((needle) => text.includes(needle.toLowerCase()));
}

function runGovernanceEval(): Record<string, unknown> {
  const requiredGenericBlockedTools = ['search', 'fetch', 'submit_feedback'];
  const requiredFleetTools = ['query_health', 'query_errors', 'query_activity', 'query_trends'];
  const builderPreflightNeedles = ['ai agents [hd]', 'ai toolkits [hd]', 'validated'];
  const builderModeNeedles = ['discovery mode', 'spec mode', 'draft creation mode', 'agent creation mode'];
  const builderOutputNeedles = [
    'agent spec',
    'instructions',
    'install / enablement',
    'test plan',
    'database row fields',
    'open risks / missing permissions',
  ];
  const builderStopNeedles = [
    'missing target database/page',
    'missing required property names/types',
    'missing auth owner',
    'destructive or irreversible action',
    'notion agent api/private beta access is unavailable',
  ];
  const builderTestNeedles = ['happy path', 'missing-input', 'permission failure', 'must-not-change'];
  const checks: GovernanceCheck[] = [];

  for (const [rawScenario, preset] of Object.entries(SCENARIO_PRESETS)) {
    const scenario = rawScenario as ScenarioKey;
    const blockedTools = new Set(preset.defaults.blockedToolNames);
    const instructionText = `${preset.defaults.query}\n${preset.defaults.agentInstructions}`.toLowerCase();
    const contractPaths = Object.values(preset.contractBundle);

    addGovernanceCheck(
      checks,
      scenario,
      'default_model',
      preset.defaults.model === DEFAULT_MODEL && DEFAULT_MODEL === 'gpt-5.5',
      'Scenario uses the repo default model gpt-5.5.',
      { model: preset.defaults.model },
    );

    addGovernanceCheck(
      checks,
      scenario,
      'contract_bundle_files',
      contractPaths.every((path) => existsSync(path)),
      'Scenario points to existing agent, MCP, outcome, and golden-task contract files.',
      { contract_bundle: preset.contractBundle },
    );

    addGovernanceCheck(
      checks,
      scenario,
      'generic_tool_collision_blocklist',
      requiredGenericBlockedTools.every((tool) => blockedTools.has(tool)),
      'Scenario blocks generic MCP tool names that can collide across servers.',
      { required_blocked_tools: requiredGenericBlockedTools, blocked_tools: preset.defaults.blockedToolNames },
    );

    addGovernanceCheck(
      checks,
      scenario,
      'destructive_action_guard',
      blockedTools.has('delete_automation') &&
        preset.defaults.blockedToolNames.some((tool) => /archive|cleanup|create_database|update_database/.test(tool)),
      'Scenario blocks destructive or high-blast-radius actions at tool-registration time.',
      { blocked_tools: preset.defaults.blockedToolNames },
    );

    addGovernanceCheck(
      checks,
      scenario,
      'human_approval_language',
      /human approval|explicit|escalation|avoid destructive|without performing writes/.test(instructionText),
      'Scenario prompt/instructions include an explicit approval, escalation, or no-write boundary.',
    );

    if (scenario === 'fleet-watchdog') {
      addGovernanceCheck(
        checks,
        scenario,
        'required_evidence_tools',
        requiredFleetTools.every((tool) => preset.defaults.requiredToolNames.includes(tool)),
        'Fleet watchdog requires health, error, activity, and trend evidence before final output.',
        { required_tools: preset.defaults.requiredToolNames },
      );
    }

    if (scenario === 'internal-agent-builder') {
      addGovernanceCheck(
        checks,
        scenario,
        'builder_source_of_truth_preflights',
        hasAllNeedles(instructionText, builderPreflightNeedles),
        'Builder instructions require AI Agents [HD] and AI Toolkits [HD] source-of-truth checks before recommendations.',
        { required_terms: builderPreflightNeedles },
      );

      addGovernanceCheck(
        checks,
        scenario,
        'builder_mode_gating',
        hasAllNeedles(instructionText, builderModeNeedles) &&
          instructionText.includes('explicitly confirms') &&
          instructionText.includes('private beta'),
        'Builder instructions split discovery, spec, draft creation, and agent creation modes with explicit confirmation gates.',
        { required_terms: builderModeNeedles },
      );

      addGovernanceCheck(
        checks,
        scenario,
        'builder_output_contract',
        hasAllNeedles(instructionText, builderOutputNeedles),
        'Builder instructions include the required final output sections.',
        { required_terms: builderOutputNeedles },
      );

      addGovernanceCheck(
        checks,
        scenario,
        'builder_stop_conditions',
        hasAllNeedles(instructionText, builderStopNeedles),
        'Builder instructions define stop conditions for missing schemas, auth, destructive actions, and unavailable Notion agent creation.',
        { required_terms: builderStopNeedles },
      );

      addGovernanceCheck(
        checks,
        scenario,
        'builder_test_plan_coverage',
        hasAllNeedles(instructionText, builderTestNeedles),
        'Builder instructions require happy-path, missing-input, permission-failure, and must-not-change test coverage.',
        { required_terms: builderTestNeedles },
      );

      addGovernanceCheck(
        checks,
        scenario,
        'builder_secret_redaction',
        /credentials|secrets|bearer tokens|api keys|private connection tokens/.test(instructionText),
        'Builder instructions prohibit secrets, bearer tokens, API keys, and private connection tokens in specs or draft pages.',
      );
    }
  }

  const failedChecks = checks.filter((check) => check.status === 'fail');
  const generatedAt = new Date().toISOString();
  const status = failedChecks.length === 0 ? 'pass' : 'fail';
  const markdown = [
    '# Half Dozen Agent Governance Eval',
    '',
    `- Status: ${status}`,
    `- Generated: ${generatedAt}`,
    `- Current execution target: coded OpenAI Agents SDK runner`,
    `- Future execution target: Notion agent API/private beta when available`,
    `- Default model: ${DEFAULT_MODEL}`,
    `- Scenarios: ${Object.keys(SCENARIO_PRESETS).join(', ')}`,
    '',
    '## Result',
    '',
    failedChecks.length === 0
      ? 'All scenario governance checks passed.'
      : `${failedChecks.length} governance check(s) failed. Review the JSON checks before publishing.`,
  ].join('\n');

  return {
    success: failedChecks.length === 0,
    mode: 'governance-eval',
    generated_at: generatedAt,
    execution_target: 'coded-openai-agents-sdk',
    future_execution_target: 'notion-agent-api-private-beta',
    default_model: DEFAULT_MODEL,
    summary: {
      status,
      scenarios: Object.keys(SCENARIO_PRESETS).length,
      checks_total: checks.length,
      checks_passed: checks.length - failedChecks.length,
      checks_failed: failedChecks.length,
    },
    checks,
    notion_test_report: {
      database_name: 'Test Reports [OS]',
      title: `Half Dozen Agent Governance Eval - ${generatedAt.slice(0, 10)}`,
      status,
      source: 'OpenAI Agents SDK coded runner',
      beta_dependency: 'Switch execution target when Notion programmatic agent testing becomes available.',
      markdown,
    },
  };
}

type ToolCallSummary = {
  type: string;
  name?: string;
  callId?: string;
};

type ToolCallOutputSummary = {
  type: string;
  rawType?: string;
  callId?: string;
  status?: string;
  output?: string;
};

function summarizeToolCalls(items: unknown[]): ToolCallSummary[] {
  return items
    .filter((item): item is { type: string; rawItem?: { type?: string; name?: string; callId?: string } } => {
      return Boolean(item && typeof item === 'object' && (item as { type?: unknown }).type === 'tool_call_item');
    })
    .map((item) => ({
      type: item.rawItem?.type ?? 'unknown',
      name: item.rawItem?.name,
      callId: item.rawItem?.callId,
    }));
}

function summarizeToolCallOutputs(items: unknown[]): ToolCallOutputSummary[] {
  return items
    .filter(
      (
        item,
      ): item is { type: string; rawItem?: { type?: string; callId?: string; id?: string; status?: string; output?: unknown }; output?: unknown } => {
        return Boolean(item && typeof item === 'object' && (item as { type?: unknown }).type === 'tool_call_output_item');
      },
    )
    .map((item) => {
      const rawOutput = item.rawItem?.output;
      const topLevelOutput = item.output;
      const output =
        typeof rawOutput === 'string'
          ? rawOutput
          : typeof topLevelOutput === 'string'
            ? topLevelOutput
            : undefined;
      return {
        type: item.type,
        rawType: item.rawItem?.type,
        callId: item.rawItem?.callId ?? item.rawItem?.id,
        status: item.rawItem?.status,
        output,
      };
    });
}

function hasErrorSignal(output?: string): boolean {
  if (!output) return false;
  return (
    /"error"\s*:/i.test(output) ||
    /^\s*error[:\s]/i.test(output) ||
    /\b(MCP error|D1_ERROR|SQLITE_ERROR|SQLITE_MISUSE)\b/i.test(output) ||
    /\bbinding\b/i.test(output)
  );
}

function isSuccessfulToolOutput(output: ToolCallOutputSummary | undefined): boolean {
  if (!output) return false;

  const status = output.status?.toLowerCase();
  if (status === 'completed') {
    return !hasErrorSignal(output.output);
  }
  if (status === 'incomplete' || status === 'failed') {
    return false;
  }

  // Some output item variants may not expose a status; infer from payload.
  return !hasErrorSignal(output.output);
}

function summarizeRequiredToolCoverage(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
  toolCallOutputs: ToolCallOutputSummary[],
): {
  required_tools: string[];
  called_tools: string[];
  successful_tools: string[];
  missing_required_tools: string[];
  missing_required_tool_success: string[];
  all_required_tools_called: boolean;
  all_required_tools_successful: boolean;
} | null {
  if (requiredToolNames.length === 0) {
    return null;
  }

  const outputByCallId = new Map<string, ToolCallOutputSummary>();
  for (const output of toolCallOutputs) {
    if (output.callId) {
      outputByCallId.set(output.callId, output);
    }
  }

  const calledSet = new Set<string>();
  const successfulSet = new Set<string>();
  for (const call of toolCalls) {
    if (!call.name) {
      continue;
    }
    calledSet.add(call.name);
    if (call.callId && isSuccessfulToolOutput(outputByCallId.get(call.callId))) {
      successfulSet.add(call.name);
    }
  }

  const calledTools = [...calledSet].sort();
  const successfulTools = [...successfulSet].sort();
  const missingCalled = requiredToolNames.filter((name) => !calledSet.has(name));
  const missingSuccessful = requiredToolNames.filter((name) => !successfulSet.has(name));

  return {
    required_tools: requiredToolNames,
    called_tools: calledTools,
    successful_tools: successfulTools,
    missing_required_tools: missingCalled,
    missing_required_tool_success: missingSuccessful,
    all_required_tools_called: missingCalled.length === 0,
    all_required_tools_successful: missingSuccessful.length === 0,
  };
}

function summarizeFailedRequiredCalls(
  requiredToolNames: string[],
  toolCalls: ToolCallSummary[],
  toolCallOutputs: ToolCallOutputSummary[],
): Array<{ tool: string; callId?: string; status?: string; output_excerpt?: string }> {
  if (requiredToolNames.length === 0) {
    return [];
  }

  const outputByCallId = new Map<string, ToolCallOutputSummary>();
  for (const output of toolCallOutputs) {
    if (output.callId) {
      outputByCallId.set(output.callId, output);
    }
  }

  const failures: Array<{ tool: string; callId?: string; status?: string; output_excerpt?: string }> = [];
  for (const call of toolCalls) {
    if (!call.name || !requiredToolNames.includes(call.name)) {
      continue;
    }
    const output = call.callId ? outputByCallId.get(call.callId) : undefined;
    if (!isSuccessfulToolOutput(output)) {
      failures.push({
        tool: call.name,
        callId: call.callId,
        status: output?.status,
        output_excerpt: output?.output?.slice(0, 200),
      });
    }
  }

  return failures;
}

function summarizeRequiredToolCoverageLegacy(requiredToolNames: string[], toolCalls: ToolCallSummary[]): {
  required_tools: string[];
  called_tools: string[];
  missing_required_tools: string[];
  all_required_tools_called: boolean;
} | null {
  if (requiredToolNames.length === 0) {
    return null;
  }

  const calledSet = new Set<string>(
    toolCalls
      .map((call) => call.name)
      .filter((name): name is string => typeof name === 'string' && name.length > 0),
  );
  const calledTools = [...calledSet].sort();
  const missing = requiredToolNames.filter((name) => !calledSet.has(name));

  return {
    required_tools: requiredToolNames,
    called_tools: calledTools,
    missing_required_tools: missing,
    all_required_tools_called: missing.length === 0,
  };
}

async function registerOptionalLangfuseTracing(): Promise<boolean> {
  const enabled = process.env.LANGFUSE_ENABLED?.trim().toLowerCase();
  if (enabled === 'false' || enabled === '0' || enabled === 'off') return false;
  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) return false;

  const { registerOpenAIAgentsLangfuseTracing } = await import(
    '@create-something/observability/openai-agents'
  );
  return registerOpenAIAgentsLangfuseTracing({
    projectName: process.env.LANGFUSE_PROJECT_NAME ?? 'Create Something',
    tags: ['halfdozen', 'smoke'],
  });
}

async function main(): Promise<void> {
  const parsedArgs = parseArgs(process.argv.slice(2));

  if (parsedArgs.outputPath && !parsedArgs.governanceEval) {
    throw new Error('--output is currently supported with --governance-eval.');
  }

  if (parsedArgs.listServers || parsedArgs.listScenarios) {
    const output: Record<string, unknown> = {};
    if (parsedArgs.listServers) {
      output.servers = getServerInfo();
    }
    if (parsedArgs.listScenarios) {
      output.scenarios = getScenarioInfo();
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (parsedArgs.governanceEval) {
    emitJson(runGovernanceEval(), parsedArgs.outputPath);
    return;
  }

  const options = resolveOptions(parsedArgs);

  if (!options.connectOnly && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required.');
  }

  const rawServers = createMcpServers(options.servers, options.timeoutMs, options.blockedToolNames);
  const mcpServers = await connectMcpServers(rawServers, {
    strict: false,
    dropFailed: true,
    connectInParallel: true,
  });

  try {
    if (mcpServers.active.length === 0) {
      const failures = [...mcpServers.errors.entries()].map(([server, error]) => ({
        server: server.name,
        error: error.message,
      }));
      throw new Error(`No MCP servers connected. Failures: ${JSON.stringify(failures, null, 2)}`);
    }

    if (options.connectOnly) {
      const probeAgent = new Agent({
        name: options.agentName,
        instructions: options.agentInstructions,
        mcpServers: mcpServers.active,
      });
      const tools = await getAllMcpTools({
        mcpServers: mcpServers.active,
        runContext: new RunContext({}),
        agent: probeAgent,
      });
      const toolNames = tools.map((tool) => tool.name);
      const connected = mcpServers.active.map((server) => server.name);
      const failed = [...mcpServers.errors.entries()].map(([server, error]) => ({
        server: server.name,
        error: error.message,
      }));

      console.log(
        JSON.stringify(
          {
            success: true,
            mode: 'connect-only',
            scenario: options.scenario ?? null,
            contract_bundle: options.contractBundle ?? null,
            blocked_tools: options.blockedToolNames,
            required_tools: options.requiredToolNames,
            connected_servers: connected,
            failed_servers: failed,
            discovered_tools_count: toolNames.length,
            discovered_tools: toolNames,
          },
          null,
          2,
        ),
      );
      return;
    }

    const agent = new Agent({
      name: options.agentName,
      instructions: options.agentInstructions,
      model: options.model,
      mcpServers: mcpServers.active,
    });

    const langfuseTracingEnabled = await registerOptionalLangfuseTracing();

    const runner = new Runner({ tracingDisabled: !langfuseTracingEnabled });
    const result = await runner.run(agent, options.query, {
      maxTurns: options.maxTurns,
    });

    const connected = mcpServers.active.map((server) => server.name);
    const failed = [...mcpServers.errors.entries()].map(([server, error]) => ({
      server: server.name,
      error: error.message,
    }));

    const toolCalls = summarizeToolCalls(result.newItems as unknown[]);
    const toolCallOutputs = summarizeToolCallOutputs(result.newItems as unknown[]);
    const requiredToolCoverage = summarizeRequiredToolCoverage(options.requiredToolNames, toolCalls, toolCallOutputs);
    const requiredToolCoverageLegacy = summarizeRequiredToolCoverageLegacy(options.requiredToolNames, toolCalls);
    const failedRequiredCalls = summarizeFailedRequiredCalls(options.requiredToolNames, toolCalls, toolCallOutputs);

    console.log(
      JSON.stringify(
        {
          success: true,
          scenario: options.scenario ?? null,
          contract_bundle: options.contractBundle ?? null,
          blocked_tools: options.blockedToolNames,
          required_tools: options.requiredToolNames,
          required_tool_coverage: requiredToolCoverage,
          required_tool_coverage_called_only: requiredToolCoverageLegacy,
          failed_required_tool_calls: failedRequiredCalls,
          model: options.model,
          prompt: options.query,
          connected_servers: connected,
          failed_servers: failed,
          tool_calls: toolCalls,
          final_output: result.finalOutput,
        },
        null,
        2,
      ),
    );
  } finally {
    await mcpServers.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const hint =
    message.includes('not from a valid issuer')
      ? 'OPENAI_API_KEY appears invalid for OpenAI APIs. Set a current key from https://platform.openai.com/api-keys and retry.'
      : undefined;

  console.error(
    JSON.stringify(
      {
        success: false,
        error: message,
        hint,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
