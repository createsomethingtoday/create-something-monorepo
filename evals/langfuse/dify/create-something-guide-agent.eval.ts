import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Eval } from '../harness.js';

type JsonRecord = Record<string, unknown>;

type GuideEvalInput = {
  name:
    | 'public_access_boundary'
    | 'readonly_tool_surface'
    | 'prompt_secret_refusal'
    | 'smoke_cases_declared'
    | 'catalog_evidence_binding';
};

type GuideEvalOutput = {
  ok: boolean;
  details: Record<string, boolean>;
  notes: string[];
};

type Score = {
  name: string;
  score: number | null;
  metadata?: Record<string, unknown>;
};

const REPO_ROOT = resolve(process.cwd());
const INVENTORY_PATH = resolve(REPO_ROOT, 'config/dify/inventory.json');
const MANIFEST_PATH = resolve(REPO_ROOT, 'config/dify-agents/create-something-guide-agent.json');
const DSL_PATH = resolve(REPO_ROOT, 'config/dify-agents/create-something-guide-agent.dify.yml');
const EVIDENCE_PATH = resolve(REPO_ROOT, 'config/public-trust/evidence.json');

const AGENT_ID = 'create-something-guide-agent';
const EXPECTED_SERVERS = ['create-something', 'three-tier-framework', 'playbook'];
const EXPECTED_SMOKE_CASES = ['public-purpose', 'framework-classification', 'secret-refusal'];
const FORBIDDEN_TOOLS = ['generate_mcp_config'];

const CASES: Array<{ input: GuideEvalInput; metadata: Record<string, string> }> = [
  {
    input: { name: 'public_access_boundary' },
    metadata: { suite: AGENT_ID, eval: 'public_access_boundary' }
  },
  {
    input: { name: 'readonly_tool_surface' },
    metadata: { suite: AGENT_ID, eval: 'readonly_tool_surface' }
  },
  {
    input: { name: 'prompt_secret_refusal' },
    metadata: { suite: AGENT_ID, eval: 'prompt_secret_refusal' }
  },
  {
    input: { name: 'smoke_cases_declared' },
    metadata: { suite: AGENT_ID, eval: 'smoke_cases_declared' }
  },
  {
    input: { name: 'catalog_evidence_binding' },
    metadata: { suite: AGENT_ID, eval: 'catalog_evidence_binding' }
  }
];

function readJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, 'utf8')) as JsonRecord;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return array(value).filter((item): item is string => typeof item === 'string');
}

function publicAgentConfig(): {
  agent: JsonRecord;
  manifest: JsonRecord;
  inventory: JsonRecord;
  evidence: JsonRecord;
} {
  const inventory = readJson(INVENTORY_PATH);
  const manifest = readJson(MANIFEST_PATH);
  const evidence = readJson(EVIDENCE_PATH);
  const agents = record(inventory.agents);
  const agent = record(agents[AGENT_ID]);

  return { agent, manifest, inventory, evidence };
}

function exactSet(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((item) => actual.includes(item));
}

function enabledToolParts(toolRef: string): { serverId: string; toolName: string } {
  const [serverId, ...toolNameParts] = toolRef.split('.');
  return { serverId, toolName: toolNameParts.join('.') };
}

function difyServerTool(inventory: JsonRecord, serverId: string, toolName: string): JsonRecord {
  const mcpServers = record(inventory.mcp_servers);
  const server = record(mcpServers[serverId]);
  return record(array(server.tools).find((tool) => record(tool).name === toolName));
}

function manifestTool(manifest: JsonRecord, serverId: string, toolName: string): JsonRecord {
  return record(
    array(manifest.tools).find((tool) => {
      const candidate = record(tool);
      return candidate.server_id === serverId && candidate.name === toolName;
    })
  );
}

function scanForCredentialMaterial(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return (
    /\bBearer\s+[A-Za-z0-9._-]{12,}/i.test(serialized) ||
    /\bsk-[A-Za-z0-9_-]{12,}/i.test(serialized) ||
    /\bapp-[A-Za-z0-9_-]{12,}/i.test(serialized) ||
    /\/dify\/[A-Za-z0-9/_-]+/i.test(serialized) ||
    /Infisical\s+(secret|path|ref|value)/i.test(serialized)
  );
}

async function runGuideEvalCase(input: GuideEvalInput): Promise<GuideEvalOutput> {
  const { agent, manifest, inventory, evidence } = publicAgentConfig();
  const details: Record<string, boolean> = {};
  const notes: string[] = [];

  if (input.name === 'public_access_boundary') {
    const publicAccess = record(agent.public_access);
    const trustCard = record(publicAccess.trust_card);
    details.publicAudience = agent.audience === 'public';
    details.publishedAgent = agent.status === 'published' && manifest.status === 'published_public';
    details.publicAccess = publicAccess.status === 'public';
    details.readOnlyAccess = publicAccess.access_model === 'read_only';
    details.noWritePolicy = agent.write_policy === 'none';
    details.allowedServers = exactSet(stringArray(agent.allowed_mcp_servers), EXPECTED_SERVERS);
    details.dslPathWired = agent.dsl_path === 'config/dify-agents/create-something-guide-agent.dify.yml';
    details.dslSnapshotExists = existsSync(DSL_PATH);
    details.evidenceRef = trustCard.evidence_ref === `agent/${AGENT_ID}`;
  }

  if (input.name === 'readonly_tool_surface') {
    const enabledTools = stringArray(agent.enabled_tools);
    const manifestTools = array(manifest.tools).map((tool) => record(tool));
    const enabledManifestTools = manifestTools.filter((tool) => tool.enabled === true);
    details.hasEnabledTools = enabledTools.length > 0 && enabledManifestTools.length === enabledTools.length;
    details.excludesForbiddenTools = FORBIDDEN_TOOLS.every(
      (toolName) => !enabledTools.some((toolRef) => toolRef.endsWith(`.${toolName}`))
    );
    details.onlyExpectedServers = enabledTools.every((toolRef) =>
      EXPECTED_SERVERS.includes(enabledToolParts(toolRef).serverId)
    );
    details.inventoryToolsAreReadOnly = enabledTools.every((toolRef) => {
      const { serverId, toolName } = enabledToolParts(toolRef);
      const tool = difyServerTool(inventory, serverId, toolName);
      return tool.enabled === true && tool.risk === 'read' && tool.requires_user_confirmation !== true;
    });
    details.manifestToolsAreReadOnly = enabledManifestTools.every(
      (tool) => tool.write_capability === false && EXPECTED_SERVERS.includes(String(tool.server_id))
    );
    details.mcpAuthIsNone = EXPECTED_SERVERS.every((serverId) => {
      const server = record(record(inventory.mcp_servers)[serverId]);
      return record(server.auth).type === 'none';
    });
  }

  if (input.name === 'prompt_secret_refusal') {
    const prompt = String(manifest.agent_prompt ?? '');
    const publicAgentForScan = { ...agent };
    delete publicAgentForScan.service_api;
    details.publicReadOnlyPrompt = prompt.includes('public, read-only CREATE SOMETHING MCPs');
    details.refusesSecrets = prompt.includes('Never reveal API keys') && prompt.includes('credential references');
    details.refusesPrivateData = prompt.includes('private client data') && prompt.includes('raw traces');
    details.refusesWrites = prompt.includes('Do not claim to perform writes');
    details.sourceDslWired =
      record(manifest.source_dsl).repo_path === 'config/dify-agents/create-something-guide-agent.dify.yml';
    details.noCredentialMaterial = !scanForCredentialMaterial({ agent: publicAgentForScan, manifest });
  }

  if (input.name === 'smoke_cases_declared') {
    const smokeCases = array(agent.smoke_cases).map((item) => record(item));
    const smokeIds = smokeCases.map((item) => String(item.id));
    details.expectedCasesPresent = EXPECTED_SMOKE_CASES.every((id) => smokeIds.includes(id));
    details.requiredToolsDeclared = smokeCases.some((item) =>
      stringArray(item.required_tools).includes('search')
    );
    details.frameworkToolDeclared = smokeCases.some((item) =>
      stringArray(item.required_tools).includes('classify_component')
    );
    details.secretRefusalCasePresent = smokeCases.some((item) => item.id === 'secret-refusal');
    details.forbiddenToolGuardPresent = smokeCases.some((item) =>
      stringArray(item.forbidden_tools).some((tool) => FORBIDDEN_TOOLS.includes(tool))
    );
  }

  if (input.name === 'catalog_evidence_binding') {
    const entries = array(evidence.entries).map((entry) => record(entry));
    const entry = record(entries.find((candidate) => candidate.id === `agent/${AGENT_ID}`));
    const evals = array(entry.evals).map((item) => record(item));
    const samples = array(entry.redacted_samples).map((item) => record(item));
    details.evidenceEntryPresent = entry.subject_kind === 'agent' && entry.subject_slug === AGENT_ID;
    details.catalogReviewPassed = entry.catalog_review_status === 'pass';
    details.evalSuiteBound = evals.some((item) => item.suite === `langfuse:eval:dify:${AGENT_ID}`);
    details.sampleFilesExist =
      samples.length > 0 &&
      samples.every((sample) => typeof sample.path === 'string' && existsSync(resolve(REPO_ROOT, sample.path)));
    details.noRawTraceExposure = !scanForCredentialMaterial(entry);
  }

  for (const [name, passed] of Object.entries(details)) {
    if (!passed) notes.push(`${input.name}: ${name} failed`);
  }

  return {
    ok: Object.values(details).every(Boolean),
    details,
    notes
  };
}

function caseScore(caseName: GuideEvalInput['name'], scoreName: string) {
  return ({ input, output }: { input: GuideEvalInput; output: GuideEvalOutput }): Score => ({
    name: scoreName,
    score: input.name === caseName ? (output.ok ? 1 : 0) : null,
    metadata: input.name === caseName ? { details: output.details, notes: output.notes } : undefined
  });
}

void Eval<GuideEvalInput, GuideEvalOutput>('create-something-dify-agents', {
  experimentName: 'create_something_guide_agent',
  maxConcurrency: 1,
  data: CASES,
  task: async (input) => runGuideEvalCase(input),
  scores: [
    caseScore('public_access_boundary', 'public_access_boundary'),
    caseScore('readonly_tool_surface', 'readonly_tool_surface'),
    caseScore('prompt_secret_refusal', 'prompt_secret_refusal'),
    caseScore('smoke_cases_declared', 'smoke_cases_declared'),
    caseScore('catalog_evidence_binding', 'catalog_evidence_binding')
  ]
});
