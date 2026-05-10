import React, { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { tokens } from '../../styles/tokens';

export type TriadTier = 'Database' | 'Automation' | 'Judgment';
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type CheckStatus = 'ok' | 'warning' | 'blocked' | 'idle';
export type ApprovalState = 'review' | 'approved' | 'blocked';
export type ApprovalRequestCredentials = Extract<RequestCredentials, 'omit' | 'same-origin' | 'include'>;
export type ActionStatus = 'draft' | 'requires_approval' | 'allowed' | 'blocked';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface EvidenceItem {
  id?: string;
  label: string;
  detail?: string;
  source?: string;
  href?: string;
  tone?: StatusTone;
  timestamp?: string;
  visibility?: 'public' | 'private' | 'internal';
  status?: 'draft' | 'approved' | 'review' | 'blocked';
  owner?: string;
}

export interface OperatingLayer {
  tier: TriadTier;
  title: string;
  status: string;
  description: string;
  evidence?: string[];
  tone?: StatusTone;
}

export interface ArtifactItem {
  title: string;
  type?: string;
  description?: string;
  href?: string;
  visibility?: 'public' | 'private' | 'internal';
  tone?: StatusTone;
}

export interface DecisionItem {
  id?: string;
  title: string;
  description?: string;
  owner?: string;
  due?: string;
  state?: ApprovalState | 'open' | 'ready';
  tier?: TriadTier;
}

export interface ActionPreviewItem {
  id: string;
  label: string;
  description: string;
  status?: ActionStatus;
  risk?: RiskLevel;
  policyChecks?: string[];
  evidence?: string[];
}

export interface AgentMessage {
  role: 'agent' | 'operator';
  body: string;
  grounding?: string[];
}

export interface SuggestedPrompt {
  label: string;
  prompt: string;
}

export interface RuntimeCheck {
  label: string;
  status?: CheckStatus;
  detail?: string;
}

type JsonList<T> = string | T[];

type ActionPreviewResponse = {
  status?: string;
  summary?: string;
  policyChecks?: string[];
  evidence?: string[];
  allowedNextActions?: string[];
};

type AgentResponse = {
  answer?: string;
  grounding?: string[];
  followUps?: string[];
  followUpQuestions?: string[];
  restricted?: boolean;
  actions?: string[];
};

type ApprovalUpdateResponse = {
  approval?: ApprovalQueueItem;
  event?: ActivityEventItem;
  error?: string;
};

type ConsoleStatusItem = {
  label: string;
  value: string;
  detail?: string;
  tone?: StatusTone;
  status?: string;
};

type WorkflowApproval = {
  title?: string;
  description?: string;
  approvalState?: ApprovalState;
  requiredApprover?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
};

type WorkflowAgent = {
  title?: string;
  placeholder?: string;
  suggestedPrompts?: SuggestedPrompt[];
  initialMessages?: AgentMessage[];
};

type WorkflowRuntime = {
  label?: string;
  status?: CheckStatus;
  environment?: string;
  lastChecked?: string;
  checks?: RuntimeCheck[];
};

export interface BusinessContextItem {
  id: string;
  client: string;
  project: string;
  workflow: string;
  environment: string;
  status?: CheckStatus | 'active' | 'review' | 'blocked';
  owner?: string;
  detail?: string;
}

export interface WorkflowMetricItem {
  label: string;
  value: string;
  detail?: string;
  tone?: StatusTone;
  trend?: string;
}

export interface SourceStatusItem {
  system: string;
  status?: CheckStatus;
  detail: string;
  lastSynced?: string;
  owner?: string;
  tier?: TriadTier;
}

export interface ApprovalQueueItem {
  id: string;
  actionId?: string;
  title: string;
  requester?: string;
  requiredApprover: string;
  status?: ApprovalState;
  risk?: RiskLevel;
  due?: string;
  evidence?: string[];
  policyChecks?: string[];
  updatedBy?: string;
  updatedAt?: string;
}

export interface ActionExecutionItem {
  id: string;
  actionId?: string;
  title: string;
  status?: 'preview' | 'queued' | 'approved' | 'blocked' | 'executed';
  owner?: string;
  system?: string;
  risk?: RiskLevel;
  rollback?: string;
  lastUpdated?: string;
}

export interface ActivityEventItem {
  id: string;
  eventType?: 'context' | 'approval' | 'preview' | 'agent' | 'deploy' | 'evidence' | 'decision';
  label: string;
  detail?: string;
  actor?: string;
  timestamp?: string;
  tone?: StatusTone;
}

type WorkflowContextPayload = {
  contextId?: string;
  title?: string;
  summary?: string;
  source?: string;
  runtime?: WorkflowRuntime;
  layers?: OperatingLayer[];
  actions?: ActionPreviewItem[];
  approval?: WorkflowApproval;
  evidence?: EvidenceItem[];
  decisions?: DecisionItem[];
  artifacts?: ArtifactItem[];
  agent?: WorkflowAgent;
  businessContexts?: BusinessContextItem[];
  activeBusinessContextId?: string;
  metrics?: WorkflowMetricItem[];
  sourceStatuses?: SourceStatusItem[];
  approvalQueue?: ApprovalQueueItem[];
  executionQueue?: ActionExecutionItem[];
  activityEvents?: ActivityEventItem[];
  guardrails?: string[];
};

const defaultLayers: OperatingLayer[] = [
  {
    tier: 'Database',
    title: 'Operational Memory',
    status: 'Structured',
    description: 'The surface separates authoritative records, review state, and evidence so every action can be traced.',
    evidence: ['Source records', 'Review state', 'Evidence IDs'],
    tone: 'info',
  },
  {
    tier: 'Automation',
    title: 'Callable Runtime',
    status: 'Cloudflare-ready',
    description: 'Actions are prepared as previews before they reach workflow tools, MCP servers, or external systems.',
    evidence: ['API route', 'Action contract', 'Runtime checks'],
    tone: 'success',
  },
  {
    tier: 'Judgment',
    title: 'Approval Boundary',
    status: 'Human-gated',
    description: 'Policy checks and operator approval determine whether a recommendation can become an executed action.',
    evidence: ['Policy checks', 'Approval owner', 'Decision log'],
    tone: 'warning',
  },
];

const defaultEvidence: EvidenceItem[] = [
  {
    label: 'Workflow map',
    detail: 'Current workflow, owner, and decision states are captured before automation.',
    source: 'Delivery artifact',
    tone: 'info',
  },
  {
    label: 'Action contract',
    detail: 'Every action has a preview, policy checks, and a human approval state.',
    source: 'Cloudflare route',
    tone: 'success',
  },
  {
    label: 'Private boundary',
    detail: 'Source data, credentials, and raw client records stay outside the public surface.',
    source: 'Governance rule',
    tone: 'warning',
  },
  {
    label: 'MCP fleet registry',
    detail: 'The console tracks which MCPs are active, brokered, direct, or awaiting promotion.',
    source: 'Repo registry',
    tone: 'info',
  },
  {
    label: 'Connector boundary',
    detail: 'Dify and Composio remain managed connector surfaces, not browser-exposed credentials or direct public writes.',
    source: 'Integration policy',
    tone: 'warning',
  },
];

const defaultArtifacts: ArtifactItem[] = [
  {
    title: 'Operator Brief',
    type: 'Review Packet',
    description: 'A concise handoff that explains the workflow, risks, and next decision.',
    visibility: 'public',
    tone: 'info',
  },
  {
    title: 'Policy Rules',
    type: 'Governance',
    description: 'Rules that decide when an action can be drafted, previewed, approved, or blocked.',
    visibility: 'internal',
    tone: 'warning',
  },
  {
    title: 'Runtime Contract',
    type: 'Cloudflare API',
    description: 'Endpoint shape for bounded agent answers and action previews.',
    visibility: 'public',
    tone: 'success',
  },
  {
    title: 'MCP Fleet Registry',
    type: 'Operations',
    description: 'Inventory and posture for CREATE SOMETHING MCP endpoints, bundles, and brokered tool access.',
    visibility: 'internal',
    tone: 'info',
  },
  {
    title: 'Dify Intake Manifest',
    type: 'Connector Intake',
    description: 'Dify app and MCP intake state used to decide what is direct, brokered, or not yet production-ready.',
    visibility: 'internal',
    tone: 'warning',
  },
  {
    title: 'Composio Connector Boundary',
    type: 'Connector Policy',
    description: 'Rules for when Composio-backed SaaS actions stay brokered, require approval, or can move toward execution.',
    visibility: 'internal',
    tone: 'warning',
  },
];

const defaultDecisions: DecisionItem[] = [
  {
    title: 'Confirm authoritative data',
    description: 'Name the source of truth before automation reads or writes records.',
    owner: 'Operator',
    state: 'open',
    tier: 'Database',
  },
  {
    title: 'Approve action boundary',
    description: 'Decide which actions can be drafted and which require manual approval.',
    owner: 'Delivery lead',
    state: 'review',
    tier: 'Judgment',
  },
  {
    title: 'Enable runtime smoke',
    description: 'Verify the Cloudflare endpoint and fallback behavior before publishing.',
    owner: 'Engineer',
    state: 'ready',
    tier: 'Automation',
  },
  {
    title: 'Review MCP fleet posture',
    description: 'Confirm which MCP servers are active, brokered, Dify-direct candidates, or parked.',
    owner: 'Operator',
    state: 'review',
    tier: 'Automation',
  },
  {
    title: 'Promote connector execution',
    description: 'Decide whether any Dify or Composio connector may move beyond preview-only behavior.',
    owner: 'Senior operator',
    state: 'blocked',
    tier: 'Judgment',
  },
  {
    title: 'Confirm agent workflow ownership',
    description: 'Name the operator responsible for agent answers, workflow handoff, and approval records.',
    owner: 'Delivery lead',
    state: 'open',
    tier: 'Judgment',
  },
];

const defaultActions: ActionPreviewItem[] = [
  {
    id: 'draft-operator-brief',
    label: 'Draft operator brief',
    description: 'Prepare a client-safe workflow brief from approved evidence and decisions.',
    status: 'allowed',
    risk: 'low',
    policyChecks: ['Uses public evidence only', 'No credentials or private source data', 'Operator can edit before sharing'],
    evidence: ['Workflow map', 'Decision queue', 'Runtime contract'],
  },
  {
    id: 'request-approval',
    label: 'Request approval',
    description: 'Prepare an approval request that lists the action, owner, and policy checks.',
    status: 'requires_approval',
    risk: 'medium',
    policyChecks: ['Requires named approval owner', 'Records decision state', 'Does not execute external writes'],
    evidence: ['Approval boundary', 'Policy rules'],
  },
  {
    id: 'execute-external-action',
    label: 'Execute external action',
    description: 'Blocked in this demo because v1 only previews governed actions.',
    status: 'blocked',
    risk: 'high',
    policyChecks: ['External mutation disabled', 'Production connector not configured', 'Human approval required'],
    evidence: ['Governance rule'],
  },
  {
    id: 'review-mcp-fleet',
    label: 'Review MCP fleet',
    description: 'Prepare an operator review of MCP endpoints, brokered access, Dify candidates, and ownership gaps.',
    status: 'requires_approval',
    risk: 'medium',
    policyChecks: ['Classifies direct vs brokered access', 'Records owner before promotion', 'Keeps credentials out of Webflow'],
    evidence: ['MCP fleet registry', 'Hub control plane', 'Dify coverage'],
  },
  {
    id: 'prepare-agent-workflow-handoff',
    label: 'Prepare agent workflow handoff',
    description: 'Draft the operator handoff for agents, workflows, allowed questions, and approval boundaries.',
    status: 'allowed',
    risk: 'medium',
    policyChecks: ['Uses sanitized workflow context', 'Names approval owner', 'No raw source records in agent answers'],
    evidence: ['Agent prompts', 'Workflow route', 'Decision queue'],
  },
  {
    id: 'promote-connector-action',
    label: 'Promote connector action',
    description: 'Blocked until a Dify or Composio connector has a production contract, approval owner, and rollback note.',
    status: 'blocked',
    risk: 'high',
    policyChecks: ['Connector contract required', 'Rollback note required', 'No token-bearing endpoints in browser props'],
    evidence: ['Dify intake manifest', 'Composio connector boundary', 'Approval policy'],
  },
];

const defaultPrompts: SuggestedPrompt[] = [
  { label: 'Explain the workflow', prompt: 'Explain how the database, automation, and judgment layers work together.' },
  { label: 'What needs approval?', prompt: 'What decision needs approval before this action can run?' },
  { label: 'What is private?', prompt: 'What should stay out of the public surface?' },
  { label: 'Which MCPs matter?', prompt: 'Summarize the MCP fleet posture and what needs operator review.' },
  { label: 'Connector readiness', prompt: 'Explain the Dify and Composio boundary before any connector execution.' },
  { label: 'Cloudflare state', prompt: 'What does Cloudflare own in this console?' },
];

const defaultMessages: AgentMessage[] = [
  {
    role: 'agent',
    body: 'I can answer from the approved Canon control context and keep private source material out of the response.',
    grounding: ['Governance rule', 'Evidence trail'],
  },
];

const defaultChecks: RuntimeCheck[] = [
  { label: 'Cloudflare routes', status: 'ok', detail: 'Workflow context, agent, approval, and action preview routes are available.' },
  { label: 'D1 workflow state', status: 'ok', detail: 'Sanitized business-management context is loaded by context ID.' },
  { label: 'MCP fleet', status: 'warning', detail: 'Fleet posture is visible; endpoint health remains governed by the registry and runbooks.' },
  { label: 'Agents and workflows', status: 'ok', detail: 'Agent answers are bounded by approved context and guardrails.' },
  { label: 'Dify intake', status: 'warning', detail: 'Dify candidates are tracked as intake and promotion state, not direct browser actions.' },
  { label: 'Composio connectors', status: 'warning', detail: 'SaaS connector execution remains brokered and approval-gated.' },
  { label: 'Action execution', status: 'idle', detail: 'Preview-only in v1; no external mutation is executed.' },
  { label: 'Policy boundary', status: 'ok', detail: 'Human approval remains required for mutations.' },
];

const defaultBusinessContexts: BusinessContextItem[] = [
  {
    id: 'cs-ops-core',
    client: 'CREATE SOMETHING',
    project: 'Governed Workflow Console',
    workflow: 'Webflow + Cloudflare delivery',
    environment: 'Production preview',
    status: 'active',
    owner: 'Operator',
    detail: 'Console state is scoped to the CREATE SOMETHING operating layer.',
  },
  {
    id: 'mcp-agent-operations',
    client: 'CREATE SOMETHING',
    project: 'MCP and agent operations',
    workflow: 'MCP fleet + agent workflow review',
    environment: 'Internal',
    status: 'review',
    owner: 'Engineering',
    detail: 'Tracks active MCP surfaces, agent routes, workflow handoffs, and which actions stay approval-gated.',
  },
  {
    id: 'connector-governance',
    client: 'CREATE SOMETHING',
    project: 'Dify and Composio connector governance',
    workflow: 'Connector intake, brokerage, and approval',
    environment: 'Internal',
    status: 'review',
    owner: 'Senior operator',
    detail: 'Keeps Dify and Composio useful without letting connector credentials or write actions leak into Webflow.',
  },
];

const defaultMetrics: WorkflowMetricItem[] = [
  { label: 'Business surfaces', value: '9', detail: 'MCPs, agents, workflows, Dify, Composio, Cloudflare, Linear, Infisical, Webflow', tone: 'info' },
  { label: 'Pending approvals', value: '5', detail: 'Named approver required for promotion and execution', tone: 'warning' },
  { label: 'Runtime posture', value: 'Preview', detail: 'No external mutation in v1', tone: 'success' },
  { label: 'Connector posture', value: 'Brokered', detail: 'Dify and Composio stay behind policy boundaries', tone: 'warning' },
  { label: 'Private boundary', value: 'Enforced', detail: 'Secrets and raw records stay out of Webflow', tone: 'success' },
  { label: 'Evidence model', value: 'Artifact-backed', detail: 'Linear, docs, registry, and D1 context provide review evidence', tone: 'success' },
];

const defaultSourceStatuses: SourceStatusItem[] = [
  {
    system: 'Cloudflare Workers, Pages, and D1',
    status: 'ok',
    detail: 'The runtime owns workflow state, preview routes, approval persistence, and production deployment.',
    lastSynced: 'Runtime read',
    owner: 'Engineering',
    tier: 'Database',
  },
  {
    system: 'MCP Hub and fleet registry',
    status: 'warning',
    detail: 'MCP inventory and brokered access are visible for operator review; execution remains policy-bound.',
    lastSynced: 'Repo registry',
    owner: 'Engineering',
    tier: 'Automation',
  },
  {
    system: 'Agents and workflows',
    status: 'ok',
    detail: 'Agent answers and workflow previews are bounded by sanitized context and approval rules.',
    lastSynced: 'Cloudflare route',
    owner: 'Engineering',
    tier: 'Automation',
  },
  {
    system: 'Dify',
    status: 'warning',
    detail: 'Dify MCP coverage is tracked as intake and promotion state before production use.',
    lastSynced: 'Inventory artifact',
    owner: 'Operator',
    tier: 'Automation',
  },
  {
    system: 'Composio',
    status: 'warning',
    detail: 'Composio remains a brokered connector layer; no browser-exposed credentials or direct public writes.',
    lastSynced: 'Connector policy',
    owner: 'Engineering',
    tier: 'Automation',
  },
  {
    system: 'Webflow Components',
    status: 'ok',
    detail: 'Reusable components hydrate from the workflow context.',
    lastSynced: 'Library share',
    owner: 'Design systems',
    tier: 'Automation',
  },
  {
    system: 'Linear',
    status: 'ok',
    detail: 'Tracked work, ownership, deployment evidence, and follow-up decisions live outside the public page.',
    lastSynced: 'Issue evidence',
    owner: 'Operator',
    tier: 'Database',
  },
  {
    system: 'Infisical',
    status: 'idle',
    detail: 'Secrets remain out of component props, D1 public context, and Webflow browser code.',
    lastSynced: 'Secret boundary',
    owner: 'Engineering',
    tier: 'Judgment',
  },
  {
    system: 'Approval Policy',
    status: 'warning',
    detail: 'External mutations require a named human approval path.',
    lastSynced: 'Policy artifact',
    owner: 'Operator',
    tier: 'Judgment',
  },
];

const defaultApprovalQueue: ApprovalQueueItem[] = [
  {
    id: 'approval-action-boundary',
    actionId: 'request-approval',
    title: 'Approve action boundary',
    requester: 'Delivery system',
    requiredApprover: 'Named operator',
    status: 'review',
    risk: 'medium',
    due: 'Before connector execution',
    evidence: ['Approval boundary', 'Policy rules'],
    policyChecks: ['Named approver required', 'No external mutation before approval'],
  },
  {
    id: 'approval-external-execution',
    actionId: 'execute-external-action',
    title: 'External execution contract',
    requester: 'Runtime system',
    requiredApprover: 'Senior operator',
    status: 'blocked',
    risk: 'high',
    due: 'After production connector contract',
    evidence: ['Runtime contract', 'Governance rule'],
    policyChecks: ['Production connector contract required', 'Rollback note required'],
  },
  {
    id: 'approval-mcp-fleet-posture',
    actionId: 'review-mcp-fleet',
    title: 'MCP fleet posture review',
    requester: 'Operations system',
    requiredApprover: 'Operator',
    status: 'review',
    risk: 'medium',
    due: 'Before promoting new tool access',
    evidence: ['MCP fleet registry', 'Dify coverage', 'Hub control plane'],
    policyChecks: ['Classify direct vs brokered access', 'Confirm tenant boundary', 'Record owner before promotion'],
  },
  {
    id: 'approval-agent-workflow-handoff',
    actionId: 'prepare-agent-workflow-handoff',
    title: 'Agent workflow handoff',
    requester: 'Agent runtime',
    requiredApprover: 'Delivery lead',
    status: 'review',
    risk: 'medium',
    due: 'Before client-facing use',
    evidence: ['Agent prompts', 'Workflow route', 'Decision queue'],
    policyChecks: ['Use sanitized context only', 'Name operator owner', 'Keep private source material out of replies'],
  },
  {
    id: 'approval-dify-composio-promotion',
    actionId: 'promote-connector-action',
    title: 'Dify and Composio promotion',
    requester: 'Connector system',
    requiredApprover: 'Senior operator',
    status: 'blocked',
    risk: 'high',
    due: 'After connector contract and rollback plan',
    evidence: ['Dify intake manifest', 'Composio connector boundary', 'Approval policy'],
    policyChecks: ['No token-bearing endpoints in Webflow', 'Require rollback note', 'Require production connector contract'],
  },
];

const defaultExecutionQueue: ActionExecutionItem[] = [
  {
    id: 'execution-draft-brief',
    actionId: 'draft-operator-brief',
    title: 'Draft operator brief',
    status: 'preview',
    owner: 'Operator',
    system: 'Cloudflare route',
    risk: 'low',
    rollback: 'Discard generated draft before publication.',
    lastUpdated: 'Preview ready',
  },
  {
    id: 'execution-external-action',
    actionId: 'execute-external-action',
    title: 'Execute external action',
    status: 'blocked',
    owner: 'Senior operator',
    system: 'External connector',
    risk: 'high',
    rollback: 'Define rollback before enabling connector execution.',
    lastUpdated: 'Blocked in v1',
  },
  {
    id: 'execution-mcp-fleet-review',
    actionId: 'review-mcp-fleet',
    title: 'Review MCP fleet posture',
    status: 'queued',
    owner: 'Engineering',
    system: 'MCP Hub',
    risk: 'medium',
    rollback: 'Keep new tool access disabled until review evidence is recorded.',
    lastUpdated: 'Awaiting operator review',
  },
  {
    id: 'execution-agent-workflow-handoff',
    actionId: 'prepare-agent-workflow-handoff',
    title: 'Prepare agent workflow handoff',
    status: 'preview',
    owner: 'Delivery lead',
    system: 'Agent route',
    risk: 'medium',
    rollback: 'Revert to static guidance and keep agent route bounded to read-only answers.',
    lastUpdated: 'Preview ready',
  },
  {
    id: 'execution-connector-promotion',
    actionId: 'promote-connector-action',
    title: 'Promote Dify or Composio connector action',
    status: 'blocked',
    owner: 'Senior operator',
    system: 'Dify / Composio',
    risk: 'high',
    rollback: 'Disable connector execution and leave only preview/intake state visible.',
    lastUpdated: 'Blocked pending contract',
  },
];

const defaultActivityEvents: ActivityEventItem[] = [
  {
    id: 'event-context-ready',
    eventType: 'context',
    label: 'Workflow context ready',
    detail: 'The console can render from sanitized workflow state.',
    actor: 'Cloudflare',
    timestamp: 'Runtime read',
    tone: 'success',
  },
  {
    id: 'event-policy-boundary',
    eventType: 'approval',
    label: 'Approval boundary active',
    detail: 'External mutations require named approval and an execution contract.',
    actor: 'Policy',
    timestamp: 'Policy artifact',
    tone: 'warning',
  },
  {
    id: 'event-business-scope-expanded',
    eventType: 'context',
    label: 'Business-management scope expanded',
    detail: 'The console now tracks MCPs, agents, workflows, Dify, Composio, Cloudflare, Linear, Infisical, and Webflow.',
    actor: 'Operator',
    timestamp: 'Production readiness pass',
    tone: 'info',
  },
  {
    id: 'event-mcp-fleet-visible',
    eventType: 'evidence',
    label: 'MCP fleet visible',
    detail: 'MCP posture is represented as source status, decisions, approvals, and execution queue state.',
    actor: 'Repository',
    timestamp: 'Registry review',
    tone: 'success',
  },
  {
    id: 'event-connectors-held',
    eventType: 'approval',
    label: 'Connector writes held',
    detail: 'Dify and Composio connector promotion remains blocked until approval, contract, and rollback evidence exist.',
    actor: 'Policy',
    timestamp: 'Guardrail',
    tone: 'warning',
  },
];

function parseJsonList<T>(value: JsonList<T> | undefined, fallback: T[]): T[] {
  if (Array.isArray(value)) return value;
  if (!value || !value.trim()) return fallback;

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function useWorkflowContext(contextEndpointUrl = '', contextId = 'create-something-governed-workflow-console') {
  const [context, setContext] = useState<WorkflowContextPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!contextEndpointUrl.trim()) {
      setContext(null);
      setError('');
      return;
    }

    const controller = new AbortController();

    async function loadContext() {
      try {
        const url = new URL(contextEndpointUrl, window.location.href);
        url.searchParams.set('contextId', contextId);
        const response = await fetch(url.toString(), { signal: controller.signal });
        const payload = (await response.json()) as WorkflowContextPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Unable to load workflow context.');
        setContext(payload);
        setError('');
      } catch (contextError) {
        if (controller.signal.aborted) return;
        setContext(null);
        setError(contextError instanceof Error ? contextError.message : 'Unable to load workflow context.');
      }
    }

    void loadContext();

    return () => controller.abort();
  }, [contextEndpointUrl, contextId]);

  return { context, error };
}

function useHasMounted() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
}

function asTextList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function toneStyles(tone: StatusTone = 'neutral') {
  switch (tone) {
    case 'success':
      return {
        color: tokens.colors.success,
        background: tokens.colors.successMuted,
        border: tokens.colors.successBorder,
      };
    case 'warning':
      return {
        color: tokens.colors.warning,
        background: tokens.colors.warningMuted,
        border: tokens.colors.warningBorder,
      };
    case 'danger':
      return {
        color: tokens.colors.error,
        background: tokens.colors.errorMuted,
        border: tokens.colors.errorBorder,
      };
    case 'info':
      return {
        color: tokens.colors.info,
        background: tokens.colors.infoMuted,
        border: tokens.colors.infoBorder,
      };
    case 'neutral':
    default:
      return {
        color: tokens.colors.fgSecondary,
        background: tokens.colors.bgSubtle,
        border: tokens.colors.borderDefault,
      };
  }
}

function statusToTone(status: CheckStatus | ApprovalState | ActionStatus | string | undefined): StatusTone {
  switch (status) {
    case 'ok':
    case 'approved':
    case 'allowed':
    case 'active':
    case 'executed':
      return 'success';
    case 'warning':
    case 'review':
    case 'requires_approval':
    case 'ready':
    case 'queued':
      return 'warning';
    case 'blocked':
      return 'danger';
    case 'draft':
    case 'idle':
    case 'open':
    case 'preview':
      return 'neutral';
    default:
      return 'info';
  }
}

function riskToTone(risk: RiskLevel | undefined): StatusTone {
  if (risk === 'high') return 'danger';
  if (risk === 'medium') return 'warning';
  if (risk === 'low') return 'success';
  return 'neutral';
}

function readableStatus(status: string | undefined) {
  return status ? status.replace(/_/g, ' ') : 'ready';
}

function isCrossOriginEndpoint(endpointUrl: string) {
  if (!endpointUrl || typeof window === 'undefined') return false;

  try {
    return new URL(endpointUrl, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function hasConfiguredEndpoint(endpointUrl: string) {
  return Boolean(endpointUrl.trim());
}

function buildConsoleStatusItems({
  context,
  contextError,
  contextEndpointUrl,
  agentEndpointUrl,
  actionEndpointUrl,
  approvalEndpointUrl,
  approvalRequestCredentials,
}: {
  context: WorkflowContextPayload | null;
  contextError: string;
  contextEndpointUrl: string;
  agentEndpointUrl: string;
  actionEndpointUrl: string;
  approvalEndpointUrl: string;
  approvalRequestCredentials: ApprovalRequestCredentials;
}): ConsoleStatusItem[] {
  const hasContextEndpoint = hasConfiguredEndpoint(contextEndpointUrl);
  const hasAgentEndpoint = hasConfiguredEndpoint(agentEndpointUrl);
  const hasActionEndpoint = hasConfiguredEndpoint(actionEndpointUrl);
  const hasApprovalEndpoint = hasConfiguredEndpoint(approvalEndpointUrl);
  const sourceCount = context?.sourceStatuses?.length ?? defaultSourceStatuses.length;
  const warningCount = (context?.sourceStatuses ?? defaultSourceStatuses).filter((source) => source.status === 'warning').length;

  return [
    {
      label: 'Workflow state',
      value: context?.source === 'd1' ? 'D1-backed' : hasContextEndpoint ? 'Fallback' : 'Static props',
      detail: contextError || (context?.source === 'd1' ? 'Cloudflare D1 is serving the console context.' : 'Using bundled Webflow-safe defaults.'),
      tone: contextError ? 'warning' : context?.source === 'd1' ? 'success' : 'neutral',
      status: contextError ? 'review' : context?.source === 'd1' ? 'live' : 'local',
    },
    {
      label: 'Runtime routes',
      value: hasAgentEndpoint && hasActionEndpoint ? 'Agent + preview' : hasAgentEndpoint || hasActionEndpoint ? 'Partial' : 'Static',
      detail: hasAgentEndpoint && hasActionEndpoint ? 'Agent answers and action previews call Cloudflare.' : 'Configure Cloudflare endpoints to move beyond local preview.',
      tone: hasAgentEndpoint && hasActionEndpoint ? 'success' : hasAgentEndpoint || hasActionEndpoint ? 'warning' : 'neutral',
      status: hasAgentEndpoint && hasActionEndpoint ? 'ready' : 'review',
    },
    {
      label: 'Approval writes',
      value: hasApprovalEndpoint ? 'Operator-gated' : 'Local review',
      detail: hasApprovalEndpoint
        ? `Approval updates call the configured proxy with credentials=${approvalRequestCredentials}.`
        : 'Approval queue can be reviewed without persisting browser writes.',
      tone: hasApprovalEndpoint ? 'warning' : 'neutral',
      status: hasApprovalEndpoint ? 'gated' : 'read-only',
    },
    {
      label: 'Business coverage',
      value: `${sourceCount} systems`,
      detail: warningCount > 0 ? `${warningCount} surfaces intentionally require review before promotion.` : 'All tracked sources are currently green.',
      tone: warningCount > 0 ? 'warning' : 'success',
      status: warningCount > 0 ? 'review' : 'ok',
    },
  ];
}

const surfaceStyles: CSSProperties = {
  background: tokens.colors.bgSurface,
  border: `1px solid ${tokens.colors.borderDefault}`,
  borderRadius: tokens.radii.md,
  color: tokens.colors.fgPrimary,
};

const sectionSurfaceStyles: CSSProperties = {
  ...surfaceStyles,
  overflow: 'hidden',
  padding: tokens.spacing.md,
};

const compactLabelStyles: CSSProperties = {
  color: tokens.colors.fgMuted,
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.caption,
  fontWeight: tokens.typography.fontWeight.semibold,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const controlCss = `
  .cs-control-root,
  .cs-control-root * {
    box-sizing: border-box;
  }

  .cs-control-root {
    width: 100%;
    color: ${tokens.colors.fgPrimary};
    font-family: ${tokens.typography.fontFamily.sans};
    min-width: 0;
    overflow-wrap: break-word;
    word-break: normal;
  }

  .cs-control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
    gap: 1rem;
  }

  .cs-control-grid--two {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  }

  .cs-control-grid--four {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  }

  .cs-control-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .cs-console-shell {
    background: transparent;
    color: ${tokens.colors.fgPrimary};
    padding: ${tokens.spacing.lg};
  }

  .cs-control-title {
    font-family: ${tokens.typography.fontFamily.tight};
    font-size: 3.25rem;
    font-weight: ${tokens.typography.fontWeight.bold};
    letter-spacing: 0;
    line-height: ${tokens.typography.lineHeight.tight};
    margin: 0.55rem 0 0;
    max-width: 56rem;
  }

  .cs-console-status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    gap: 0.75rem;
    margin-top: ${tokens.spacing.lg};
  }

  .cs-console-status-card {
    min-width: 0;
    border: 1px solid ${tokens.colors.borderDefault};
    border-radius: ${tokens.radii.md};
    background: ${tokens.colors.bgSurface};
    padding: 1rem;
  }

  .cs-console-status-card[data-tone="success"] {
    border-left: 3px solid ${tokens.colors.success};
  }

  .cs-console-status-card[data-tone="warning"] {
    border-left: 3px solid ${tokens.colors.warning};
  }

  .cs-console-status-card[data-tone="danger"] {
    border-left: 3px solid ${tokens.colors.error};
  }

  .cs-console-status-card[data-tone="info"] {
    border-left: 3px solid ${tokens.colors.info};
  }

  .cs-console-status-value {
    font-family: ${tokens.typography.fontFamily.tight};
    font-size: 1.25rem;
    font-weight: ${tokens.typography.fontWeight.bold};
    line-height: ${tokens.typography.lineHeight.tight};
    margin-top: 0.6rem;
  }

  .cs-console-status-detail {
    color: ${tokens.colors.fgSecondary};
    font-size: ${tokens.typography.fontSize.bodySm};
    line-height: ${tokens.typography.lineHeight.relaxed};
    margin: 0.55rem 0 0;
  }

  .cs-control-button {
    min-height: 2.75rem;
    border: 1px solid ${tokens.colors.borderEmphasis};
    border-radius: ${tokens.radii.md};
    background: ${tokens.colors.fgPrimary};
    color: ${tokens.colors.bgPure};
    cursor: pointer;
    font: inherit;
    font-weight: ${tokens.typography.fontWeight.semibold};
    padding: 0.75rem 1rem;
    transition: border-color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      background ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      transform ${tokens.animation.duration.micro} ${tokens.animation.easing.standard};
  }

  .cs-control-button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .cs-control-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .cs-control-button--ghost {
    background: transparent;
    color: ${tokens.colors.fgPrimary};
  }

  .cs-control-button:focus-visible,
  .cs-control-input:focus-visible,
  .cs-control-select:focus-visible {
    outline: 2px solid ${tokens.colors.focus};
    outline-offset: 2px;
  }

  .cs-control-input,
  .cs-control-select {
    width: 100%;
    border: 1px solid ${tokens.colors.borderDefault};
    border-radius: ${tokens.radii.md};
    background: ${tokens.colors.bgPure};
    color: ${tokens.colors.fgPrimary};
    font: inherit;
    min-height: 2.75rem;
    padding: 0.75rem 0.875rem;
  }

  .cs-control-input::placeholder {
    color: ${tokens.colors.fgMuted};
  }

  .cs-agent-scroll {
    max-height: 22rem;
    overflow: auto;
    padding-right: 0.25rem;
  }

  .cs-control-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.7fr);
    gap: ${tokens.spacing.md};
    align-items: start;
  }

  .cs-runtime-check-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 10.5rem), 1fr));
    gap: 0.75rem;
    margin-top: ${tokens.spacing.md};
  }

  .cs-runtime-check-card {
    min-width: 0;
  }

  .cs-runtime-check-card strong {
    overflow-wrap: break-word;
    word-break: normal;
    hyphens: auto;
  }

  .cs-source-status-card {
    align-items: start;
    display: grid;
    gap: 0.85rem;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .cs-source-status-badge {
    justify-self: end;
  }

  .cs-agent-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    margin-top: ${tokens.spacing.md};
  }

  .cs-action-option {
    width: 100%;
    border: 1px solid ${tokens.colors.borderDefault};
    border-radius: ${tokens.radii.md};
    background: ${tokens.colors.bgPure};
    color: ${tokens.colors.fgPrimary};
    cursor: pointer;
    font: inherit;
    padding: 1rem;
    text-align: left;
    transition: background ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      border-color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      transform ${tokens.animation.duration.micro} ${tokens.animation.easing.standard};
  }

  .cs-action-option:hover {
    border-color: ${tokens.colors.borderEmphasis};
    transform: translateY(-1px);
  }

  .cs-action-option[data-active="true"] {
    background: ${tokens.colors.bgSubtle};
    border-color: ${tokens.colors.borderStrong};
  }

  .cs-action-option:focus-visible {
    outline: 2px solid ${tokens.colors.focus};
    outline-offset: 2px;
  }

  .cs-action-preview-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 26rem), 1fr));
    gap: 1rem;
    align-items: start;
  }

  .cs-action-option-header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .cs-action-option-header strong {
    min-width: 0;
  }

  .cs-action-preview-detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
    gap: 1rem;
    margin-top: ${tokens.spacing.md};
  }

  .cs-action-preview-detail-card {
    min-width: 0;
  }

  .cs-approval-stage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
    gap: 1rem;
    align-items: start;
  }

  .cs-badge-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 0.75rem;
    min-width: 0;
  }

  @media (max-width: ${tokens.breakpoints.lg}) {
    .cs-control-hero-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: ${tokens.breakpoints.md}) {
    .cs-control-hero-grid,
    .cs-agent-form {
      grid-template-columns: 1fr;
    }

    .cs-console-shell {
      padding: ${tokens.spacing.md};
    }

    .cs-control-title {
      font-size: 2.25rem;
    }

    .cs-source-status-card {
      grid-template-columns: 1fr;
    }

    .cs-source-status-badge {
      justify-self: start;
    }
  }
`;

function ComponentShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`cs-control-root ${className}`.trim()}>
      <style>{controlCss}</style>
      {children}
    </div>
  );
}

function SectionHeader({ eyebrow, title, body }: { eyebrow?: string; title?: string; body?: string }) {
  if (!eyebrow && !title && !body) return null;

  return (
    <div style={{ marginBottom: tokens.spacing.md }}>
      {eyebrow ? <div style={compactLabelStyles}>{eyebrow}</div> : null}
      {title ? (
        <h2
          style={{
            fontFamily: tokens.typography.fontFamily.tight,
            fontSize: tokens.typography.fontSize.h3,
            lineHeight: tokens.typography.lineHeight.tight,
            margin: eyebrow ? '0.35rem 0 0' : 0,
          }}
        >
          {title}
        </h2>
      ) : null}
      {body ? (
        <p
          style={{
            color: tokens.colors.fgSecondary,
            fontSize: tokens.typography.fontSize.body,
            lineHeight: tokens.typography.lineHeight.relaxed,
            margin: title ? '0.6rem 0 0' : 0,
            maxWidth: '62rem',
          }}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: StatusTone }) {
  const toneStyle = toneStyles(tone);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${toneStyle.border}`,
        borderRadius: tokens.radii.full,
        background: toneStyle.background,
        color: toneStyle.color,
        alignSelf: 'flex-start',
        flexShrink: 0,
        fontSize: tokens.typography.fontSize.caption,
        fontWeight: tokens.typography.fontWeight.semibold,
        lineHeight: 1,
        maxWidth: '100%',
        minHeight: '1.625rem',
        overflowWrap: 'break-word',
        padding: '0.35rem 0.55rem',
        textAlign: 'left',
        textTransform: 'capitalize',
        width: 'fit-content',
      }}
    >
      {children}
    </span>
  );
}

function ConsoleStatusStrip({ items }: { items: ConsoleStatusItem[] }) {
  return (
    <div className="cs-console-status-grid">
      {items.map((item) => (
        <article className="cs-console-status-card" data-tone={item.tone ?? 'neutral'} key={`${item.label}-${item.value}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={compactLabelStyles}>{item.label}</div>
            <Badge tone={item.tone ?? 'neutral'}>{item.status ?? item.tone ?? 'ready'}</Badge>
          </div>
          <div className="cs-console-status-value">{item.value}</div>
          {item.detail ? <p className="cs-console-status-detail">{item.detail}</p> : null}
        </article>
      ))}
    </div>
  );
}

export interface OperatingLayerCardsProps {
  layers?: JsonList<OperatingLayer>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  layout?: 'three' | 'two' | 'compact';
  className?: string;
}

export function OperatingLayerCards({
  layers,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Operating Layers',
  body,
  layout = 'three',
  className = '',
}: OperatingLayerCardsProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedLayers = useMemo(() => context?.layers ?? parseJsonList(layers, defaultLayers), [context?.layers, layers]);
  const gridClassName = layout === 'two' ? 'cs-control-grid cs-control-grid--two' : 'cs-control-grid';

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Database / Automation / Judgment" title={title} body={body} />
        <div className={layout === 'compact' ? 'cs-control-list' : gridClassName}>
          {parsedLayers.map((layer) => {
            const tone = layer.tone ?? statusToTone(layer.status);
            return (
              <article key={`${layer.tier}-${layer.title}`} style={{ ...surfaceStyles, background: tokens.colors.bgPure, padding: tokens.spacing.md }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={compactLabelStyles}>{layer.tier}</div>
                  <Badge tone={tone}>{layer.status}</Badge>
                </div>
                <h3
                  style={{
                    fontFamily: tokens.typography.fontFamily.tight,
                    fontSize: tokens.typography.fontSize.h4,
                    lineHeight: tokens.typography.lineHeight.tight,
                    margin: '1rem 0 0',
                  }}
                >
                  {layer.title}
                </h3>
                <p
                  style={{
                    color: tokens.colors.fgSecondary,
                    fontSize: tokens.typography.fontSize.bodySm,
                    lineHeight: tokens.typography.lineHeight.relaxed,
                    margin: '0.75rem 0 0',
                  }}
                >
                  {layer.description}
                </p>
                {layer.evidence?.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '1rem' }}>
                    {layer.evidence.map((item) => (
                      <Badge key={item} tone="neutral">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface EvidenceTrailProps {
  evidence?: JsonList<EvidenceItem>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  compact?: boolean;
  className?: string;
}

export function EvidenceTrail({
  evidence,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Evidence Trail',
  body,
  compact = false,
  className = '',
}: EvidenceTrailProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedEvidence = useMemo(() => context?.evidence ?? parseJsonList(evidence, defaultEvidence), [context?.evidence, evidence]);

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Grounded review" title={title} body={body} />
        <div className="cs-control-list">
          {parsedEvidence.map((item, index) => {
            const tone = item.tone ?? 'info';
            const toneStyle = toneStyles(tone);
            const content = (
              <article
                style={{
                  ...surfaceStyles,
                  background: tokens.colors.bgPure,
                  display: 'grid',
                  gridTemplateColumns: compact ? 'auto 1fr' : 'auto minmax(0, 1fr) auto',
                  gap: '0.85rem',
                  padding: compact ? '0.875rem' : tokens.spacing.md,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    borderRadius: tokens.radii.full,
                    border: `1px solid ${toneStyle.border}`,
                    background: toneStyle.background,
                    color: toneStyle.color,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: tokens.typography.fontSize.caption,
                    fontWeight: tokens.typography.fontWeight.semibold,
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3
                      style={{
                        fontSize: tokens.typography.fontSize.body,
                        fontWeight: tokens.typography.fontWeight.semibold,
                        margin: 0,
                      }}
                    >
                      {item.label}
                    </h3>
                    {item.source ? <Badge tone="neutral">{item.source}</Badge> : null}
                  </div>
                  {item.detail ? (
                    <p
                      style={{
                        color: tokens.colors.fgSecondary,
                        fontSize: tokens.typography.fontSize.bodySm,
                        lineHeight: tokens.typography.lineHeight.relaxed,
                        margin: '0.4rem 0 0',
                      }}
                    >
                      {item.detail}
                    </p>
                  ) : null}
                </div>
                {!compact && item.timestamp ? (
                  <time style={{ ...compactLabelStyles, alignSelf: 'start' }}>{item.timestamp}</time>
                ) : null}
              </article>
            );

            return item.href ? (
              <a key={item.id ?? item.label} href={item.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                {content}
              </a>
            ) : (
              <div key={item.id ?? item.label}>{content}</div>
            );
          })}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface ArtifactGridProps {
  artifacts?: JsonList<ArtifactItem>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  columns?: 'two' | 'three' | 'four';
  className?: string;
}

export function ArtifactGrid({
  artifacts,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Review Artifacts',
  body,
  columns = 'three',
  className = '',
}: ArtifactGridProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedArtifacts = useMemo(() => context?.artifacts ?? parseJsonList(artifacts, defaultArtifacts), [context?.artifacts, artifacts]);
  const gridClassName =
    columns === 'two'
      ? 'cs-control-grid cs-control-grid--two'
      : columns === 'four'
        ? 'cs-control-grid cs-control-grid--four'
        : 'cs-control-grid';

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Client-safe packet" title={title} body={body} />
        <div className={gridClassName}>
          {parsedArtifacts.map((artifact) => {
            const tone = artifact.tone ?? (artifact.visibility === 'private' ? 'danger' : artifact.visibility === 'internal' ? 'warning' : 'info');
            const card = (
              <article
                style={{
                  ...surfaceStyles,
                  background: tokens.colors.bgPure,
                  minHeight: '12rem',
                  padding: tokens.spacing.md,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    {artifact.type ? <div style={compactLabelStyles}>{artifact.type}</div> : <span />}
                    {artifact.visibility ? <Badge tone={tone}>{artifact.visibility}</Badge> : null}
                  </div>
                  <h3
                    style={{
                      fontFamily: tokens.typography.fontFamily.tight,
                      fontSize: tokens.typography.fontSize.h4,
                      lineHeight: tokens.typography.lineHeight.tight,
                      margin: '1rem 0 0',
                    }}
                  >
                    {artifact.title}
                  </h3>
                  {artifact.description ? (
                    <p
                      style={{
                        color: tokens.colors.fgSecondary,
                        fontSize: tokens.typography.fontSize.bodySm,
                        lineHeight: tokens.typography.lineHeight.relaxed,
                        margin: '0.65rem 0 0',
                      }}
                    >
                      {artifact.description}
                    </p>
                  ) : null}
                </div>
                {artifact.href ? <div style={compactLabelStyles}>Open artifact</div> : null}
              </article>
            );

            return artifact.href ? (
              <a key={artifact.title} href={artifact.href} style={{ color: 'inherit', textDecoration: 'none' }}>
                {card}
              </a>
            ) : (
              <div key={artifact.title}>{card}</div>
            );
          })}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface DecisionQueueProps {
  decisions?: JsonList<DecisionItem>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function DecisionQueue({
  decisions,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Decisions Needed',
  body,
  className = '',
}: DecisionQueueProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedDecisions = useMemo(() => context?.decisions ?? parseJsonList(decisions, defaultDecisions), [context?.decisions, decisions]);

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Operator queue" title={title} body={body} />
        <div className="cs-control-list">
          {parsedDecisions.map((decision, index) => {
            const state = decision.state ?? 'open';
            return (
              <article
                key={decision.id ?? decision.title}
                style={{
                  ...surfaceStyles,
                  background: tokens.colors.bgPure,
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                  gap: '1rem',
                  padding: tokens.spacing.md,
                  alignItems: 'start',
                }}
              >
                <div
                  style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: tokens.radii.md,
                    border: `1px solid ${tokens.colors.borderDefault}`,
                    display: 'grid',
                    placeItems: 'center',
                    color: tokens.colors.fgSecondary,
                    fontWeight: tokens.typography.fontWeight.semibold,
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <h3 style={{ fontSize: tokens.typography.fontSize.body, margin: 0 }}>{decision.title}</h3>
                  {decision.description ? (
                    <p
                      style={{
                        color: tokens.colors.fgSecondary,
                        fontSize: tokens.typography.fontSize.bodySm,
                        lineHeight: tokens.typography.lineHeight.relaxed,
                        margin: '0.4rem 0 0',
                      }}
                    >
                      {decision.description}
                    </p>
                  ) : null}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.75rem' }}>
                    {decision.tier ? <Badge tone="info">{decision.tier}</Badge> : null}
                    {decision.owner ? <Badge tone="neutral">{decision.owner}</Badge> : null}
                    {decision.due ? <Badge tone="neutral">{decision.due}</Badge> : null}
                  </div>
                </div>
                <Badge tone={statusToTone(state)}>{state}</Badge>
              </article>
            );
          })}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface RuntimeStatusProps {
  label?: string;
  status?: CheckStatus;
  environment?: string;
  lastChecked?: string;
  checks?: JsonList<RuntimeCheck>;
  contextEndpointUrl?: string;
  contextId?: string;
  className?: string;
}

export function RuntimeStatus({
  label = 'Canon Runtime',
  status = 'ok',
  environment = 'Cloudflare Pages',
  lastChecked = 'Preview ready',
  checks,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  className = '',
}: RuntimeStatusProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const runtime = context?.runtime;
  const parsedChecks = useMemo(() => runtime?.checks ?? parseJsonList(checks, defaultChecks), [runtime?.checks, checks]);
  const effectiveLabel = runtime?.label ?? label;
  const effectiveStatus = runtime?.status ?? status;
  const effectiveEnvironment = runtime?.environment ?? environment;
  const effectiveLastChecked = runtime?.lastChecked ?? lastChecked;

  return (
    <ComponentShell className={className}>
      <article style={{ ...surfaceStyles, padding: tokens.spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <div style={compactLabelStyles}>{effectiveEnvironment}</div>
            <h2
              style={{
                fontFamily: tokens.typography.fontFamily.tight,
                fontSize: tokens.typography.fontSize.h3,
                lineHeight: tokens.typography.lineHeight.tight,
                margin: '0.4rem 0 0',
              }}
            >
              {effectiveLabel}
            </h2>
            <p style={{ color: tokens.colors.fgSecondary, margin: '0.55rem 0 0' }}>{effectiveLastChecked}</p>
          </div>
          <Badge tone={statusToTone(effectiveStatus)}>{effectiveStatus}</Badge>
        </div>
        <div className="cs-runtime-check-grid">
          {parsedChecks.map((check) => (
            <div
              className="cs-runtime-check-card"
              key={check.label}
              style={{
                border: `1px solid ${tokens.colors.borderDefault}`,
                borderRadius: tokens.radii.md,
                background: tokens.colors.bgPure,
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <strong>{check.label}</strong>
                <Badge tone={statusToTone(check.status)}>{check.status ?? 'idle'}</Badge>
              </div>
              {check.detail ? (
                <p
                  style={{
                    color: tokens.colors.fgSecondary,
                    fontSize: tokens.typography.fontSize.bodySm,
                    lineHeight: tokens.typography.lineHeight.relaxed,
                    margin: '0.5rem 0 0',
                  }}
                >
                  {check.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </article>
    </ComponentShell>
  );
}

export interface BusinessContextSwitcherProps {
  contexts?: JsonList<BusinessContextItem>;
  activeContextId?: string;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function BusinessContextSwitcher({
  contexts,
  activeContextId,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Business Context',
  body = 'Scope the console before reviewing actions, approvals, and source status.',
  className = '',
}: BusinessContextSwitcherProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedContexts = useMemo(
    () => context?.businessContexts ?? parseJsonList(contexts, defaultBusinessContexts),
    [context?.businessContexts, contexts]
  );
  const defaultActiveId = context?.activeBusinessContextId ?? activeContextId ?? parsedContexts[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState(defaultActiveId);

  useEffect(() => {
    setSelectedId(defaultActiveId);
  }, [defaultActiveId]);

  const selectedContext = parsedContexts.find((item) => item.id === selectedId) ?? parsedContexts[0];

  if (!selectedContext) return null;

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <div className="cs-control-grid cs-control-grid--two" style={{ alignItems: 'start' }}>
          <SectionHeader eyebrow="Business scope" title={title} body={body} />
          <select className="cs-control-select" value={selectedContext.id} onChange={(event) => setSelectedId(event.target.value)}>
            {parsedContexts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.client} / {item.project}
              </option>
            ))}
          </select>
        </div>
        <article style={{ ...surfaceStyles, background: tokens.colors.bgPure, marginTop: tokens.spacing.md, padding: tokens.spacing.md }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div>
              <div style={compactLabelStyles}>{selectedContext.client}</div>
              <h3 style={{ fontFamily: tokens.typography.fontFamily.tight, fontSize: tokens.typography.fontSize.h4, margin: '0.35rem 0 0' }}>
                {selectedContext.workflow}
              </h3>
            </div>
            <Badge tone={statusToTone(selectedContext.status)}>{selectedContext.status ?? 'active'}</Badge>
          </div>
          <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.8rem 0 0' }}>
            {selectedContext.detail ?? selectedContext.project}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '1rem' }}>
            <Badge tone="neutral">{selectedContext.environment}</Badge>
            {selectedContext.owner ? <Badge tone="neutral">Owner: {selectedContext.owner}</Badge> : null}
          </div>
        </article>
      </section>
    </ComponentShell>
  );
}

export interface WorkflowMetricsStripProps {
  metrics?: JsonList<WorkflowMetricItem>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function WorkflowMetricsStrip({
  metrics,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title,
  body,
  className = '',
}: WorkflowMetricsStripProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedMetrics = useMemo(() => context?.metrics ?? parseJsonList(metrics, defaultMetrics), [context?.metrics, metrics]);

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Operating metrics" title={title} body={body} />
        <div className="cs-control-grid cs-control-grid--four">
          {parsedMetrics.map((metric) => (
            <article key={`${metric.label}-${metric.value}`} style={{ ...surfaceStyles, background: tokens.colors.bgPure, padding: tokens.spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={compactLabelStyles}>{metric.label}</div>
                {metric.trend ? <Badge tone={metric.tone ?? 'neutral'}>{metric.trend}</Badge> : null}
              </div>
              <div
                style={{
                  fontFamily: tokens.typography.fontFamily.tight,
                  fontSize: tokens.typography.fontSize.h3,
                  fontWeight: tokens.typography.fontWeight.bold,
                  lineHeight: tokens.typography.lineHeight.tight,
                  marginTop: '0.8rem',
                }}
              >
                {metric.value}
              </div>
              {metric.detail ? (
                <p style={{ color: tokens.colors.fgSecondary, fontSize: tokens.typography.fontSize.bodySm, margin: '0.55rem 0 0' }}>
                  {metric.detail}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface SourceTruthStatusProps {
  sources?: JsonList<SourceStatusItem>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function SourceTruthStatus({
  sources,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Source-of-Truth Status',
  body = 'Confirm the systems that own data, automation, secrets, and policy before action.',
  className = '',
}: SourceTruthStatusProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedSources = useMemo(
    () => context?.sourceStatuses ?? parseJsonList(sources, defaultSourceStatuses),
    [context?.sourceStatuses, sources]
  );

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Database / automation / judgment" title={title} body={body} />
        <div className="cs-control-list">
          {parsedSources.map((source) => (
            <article
              className="cs-source-status-card"
              key={`${source.system}-${source.tier ?? 'source'}`}
              style={{
                ...surfaceStyles,
                background: tokens.colors.bgPure,
                padding: tokens.spacing.md,
              }}
            >
              <div>
                <div style={compactLabelStyles}>{source.tier ?? 'System'}</div>
                <h3 style={{ fontFamily: tokens.typography.fontFamily.tight, fontSize: tokens.typography.fontSize.h5, margin: '0.35rem 0 0' }}>
                  {source.system}
                </h3>
                <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.55rem 0 0' }}>
                  {source.detail}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.85rem' }}>
                  {source.lastSynced ? <Badge tone="neutral">{source.lastSynced}</Badge> : null}
                  {source.owner ? <Badge tone="neutral">Owner: {source.owner}</Badge> : null}
                </div>
              </div>
              <div className="cs-source-status-badge">
                <Badge tone={statusToTone(source.status)}>{source.status ?? 'ok'}</Badge>
              </div>
            </article>
          ))}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface ApprovalQueueProps {
  approvals?: JsonList<ApprovalQueueItem>;
  endpointUrl?: string;
  requestCredentials?: ApprovalRequestCredentials;
  contextEndpointUrl?: string;
  contextId?: string;
  actor?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function ApprovalQueue({
  approvals,
  endpointUrl = '',
  requestCredentials = 'same-origin',
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  actor = 'Operator',
  title = 'Approval Queue',
  body = 'Persist decisions before any recommendation can become an external action.',
  className = '',
}: ApprovalQueueProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedApprovals = useMemo(
    () => context?.approvalQueue ?? parseJsonList(approvals, defaultApprovalQueue),
    [context?.approvalQueue, approvals]
  );
  const [localApprovals, setLocalApprovals] = useState<ApprovalQueueItem[]>(parsedApprovals);
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalApprovals(parsedApprovals);
  }, [parsedApprovals]);

  async function updateApproval(approval: ApprovalQueueItem, status: ApprovalState) {
    setError('');

    if (!endpointUrl) {
      setLocalApprovals((items) => items.map((item) => (item.id === approval.id ? { ...item, status, updatedBy: actor } : item)));
      return;
    }

    setPendingId(approval.id);

    try {
      if (requestCredentials === 'same-origin' && isCrossOriginEndpoint(endpointUrl)) {
        throw new Error('Cross-origin approval endpoints require Approval Request Credentials = include.');
      }

      const response = await fetch(endpointUrl, {
        method: 'POST',
        credentials: requestCredentials,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          approvalId: approval.id,
          contextId,
          status,
          actor,
          note: `${approval.title} moved to ${readableStatus(status)} from the Webflow console.`,
        }),
      });
      const payload = (await response.json()) as ApprovalUpdateResponse;
      if (!response.ok || !payload.approval) throw new Error(payload.error ?? 'Unable to update approval.');
      setLocalApprovals((items) => items.map((item) => (item.id === approval.id ? payload.approval! : item)));
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : 'Unable to update approval.');
    } finally {
      setPendingId('');
    }
  }

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Human approval" title={title} body={body} />
        <div className="cs-control-list">
          {localApprovals.map((approval) => (
            <article key={approval.id} style={{ ...surfaceStyles, background: tokens.colors.bgPure, padding: tokens.spacing.md }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={compactLabelStyles}>{approval.requester ?? 'Requester'}</div>
                  <h3 style={{ fontFamily: tokens.typography.fontFamily.tight, fontSize: tokens.typography.fontSize.h5, margin: '0.35rem 0 0' }}>
                    {approval.title}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', justifyContent: 'flex-end' }}>
                  <Badge tone={riskToTone(approval.risk)}>{approval.risk ?? 'standard'} risk</Badge>
                  <Badge tone={statusToTone(approval.status)}>{approval.status ?? 'review'}</Badge>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.85rem' }}>
                <Badge tone="neutral">Approver: {approval.requiredApprover}</Badge>
                {approval.due ? <Badge tone="neutral">{approval.due}</Badge> : null}
                {approval.updatedBy ? <Badge tone="neutral">Updated by {approval.updatedBy}</Badge> : null}
              </div>
              {approval.policyChecks?.length ? (
                <ul style={{ color: tokens.colors.fgSecondary, margin: '0.85rem 0 0', paddingLeft: '1.1rem' }}>
                  {approval.policyChecks.map((check) => (
                    <li key={check} style={{ marginBottom: '0.35rem' }}>
                      {check}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.6rem', marginTop: tokens.spacing.md }}>
                <button className="cs-control-button cs-control-button--ghost" type="button" onClick={() => void updateApproval(approval, 'review')} disabled={pendingId === approval.id}>
                  Keep in review
                </button>
                <button className="cs-control-button cs-control-button--ghost" type="button" onClick={() => void updateApproval(approval, 'blocked')} disabled={pendingId === approval.id}>
                  Block
                </button>
                <button className="cs-control-button" type="button" onClick={() => void updateApproval(approval, 'approved')} disabled={pendingId === approval.id}>
                  {pendingId === approval.id ? 'Saving...' : 'Approve'}
                </button>
              </div>
            </article>
          ))}
        </div>
        {error ? <p style={{ color: tokens.colors.error, margin: '1rem 0 0' }}>{error}</p> : null}
      </section>
    </ComponentShell>
  );
}

export interface ActionExecutionQueueProps {
  items?: JsonList<ActionExecutionItem>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function ActionExecutionQueue({
  items,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Action Execution Queue',
  body = 'Track which actions are previews, approved, queued, blocked, or executed.',
  className = '',
}: ActionExecutionQueueProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedItems = useMemo(
    () => context?.executionQueue ?? parseJsonList(items, defaultExecutionQueue),
    [context?.executionQueue, items]
  );

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Governed execution" title={title} body={body} />
        <div className="cs-control-list">
          {parsedItems.map((item) => (
            <article key={item.id} style={{ ...surfaceStyles, background: tokens.colors.bgPure, padding: tokens.spacing.md }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <div style={compactLabelStyles}>{item.system ?? 'Action'}</div>
                  <h3 style={{ fontFamily: tokens.typography.fontFamily.tight, fontSize: tokens.typography.fontSize.h5, margin: '0.35rem 0 0' }}>
                    {item.title}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', justifyContent: 'flex-end' }}>
                  <Badge tone={riskToTone(item.risk)}>{item.risk ?? 'standard'} risk</Badge>
                  <Badge tone={statusToTone(item.status)}>{item.status ?? 'preview'}</Badge>
                </div>
              </div>
              {item.rollback ? (
                <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.8rem 0 0' }}>
                  Rollback: {item.rollback}
                </p>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.85rem' }}>
                {item.owner ? <Badge tone="neutral">Owner: {item.owner}</Badge> : null}
                {item.lastUpdated ? <Badge tone="neutral">{item.lastUpdated}</Badge> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface EvidenceManagerProps {
  evidence?: JsonList<EvidenceItem>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function EvidenceManager({
  evidence,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Evidence Manager',
  body = 'Review which evidence is public-safe, internal, or private before it grounds an action.',
  className = '',
}: EvidenceManagerProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedEvidence = useMemo(() => context?.evidence ?? parseJsonList(evidence, defaultEvidence), [context?.evidence, evidence]);

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Grounding boundary" title={title} body={body} />
        <div className="cs-control-grid cs-control-grid--two">
          {parsedEvidence.map((item, index) => (
            <article key={item.id ?? `${item.label}-${index}`} style={{ ...surfaceStyles, background: tokens.colors.bgPure, padding: tokens.spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={compactLabelStyles}>{item.source ?? 'Evidence'}</div>
                <Badge tone={item.visibility === 'private' ? 'danger' : item.visibility === 'internal' ? 'warning' : 'success'}>
                  {item.visibility ?? 'public-safe'}
                </Badge>
              </div>
              <h3 style={{ fontFamily: tokens.typography.fontFamily.tight, fontSize: tokens.typography.fontSize.h5, margin: '0.7rem 0 0' }}>
                {item.label}
              </h3>
              {item.detail ? (
                <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.55rem 0 0' }}>
                  {item.detail}
                </p>
              ) : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.85rem' }}>
                <Badge tone={statusToTone(item.status)}>{item.status ?? 'review'}</Badge>
                {item.owner ? <Badge tone="neutral">Owner: {item.owner}</Badge> : null}
                {item.timestamp ? <Badge tone="neutral">{item.timestamp}</Badge> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface OperatorActivityLogProps {
  events?: JsonList<ActivityEventItem>;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function OperatorActivityLog({
  events,
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Operator Activity Log',
  body = 'Show the public-safe audit trail for previews, approvals, evidence, and deployments.',
  className = '',
}: OperatorActivityLogProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedEvents = useMemo(
    () => context?.activityEvents ?? parseJsonList(events, defaultActivityEvents),
    [context?.activityEvents, events]
  );

  return (
    <ComponentShell className={className}>
      <section style={sectionSurfaceStyles}>
        <SectionHeader eyebrow="Audit trail" title={title} body={body} />
        <div className="cs-control-list">
          {parsedEvents.map((event) => (
            <article
              key={event.id}
              style={{
                ...surfaceStyles,
                background: tokens.colors.bgPure,
                display: 'grid',
                gap: '0.85rem',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                padding: tokens.spacing.md,
              }}
            >
              <Badge tone={event.tone ?? statusToTone(event.eventType)}>{event.eventType ?? 'event'}</Badge>
              <div>
                <h3 style={{ fontFamily: tokens.typography.fontFamily.tight, fontSize: tokens.typography.fontSize.h5, margin: 0 }}>
                  {event.label}
                </h3>
                {event.detail ? (
                  <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.45rem 0 0' }}>
                    {event.detail}
                  </p>
                ) : null}
                {event.actor ? <p style={{ color: tokens.colors.fgMuted, fontSize: tokens.typography.fontSize.caption, margin: '0.55rem 0 0' }}>By {event.actor}</p> : null}
              </div>
              {event.timestamp ? <Badge tone="neutral">{event.timestamp}</Badge> : null}
            </article>
          ))}
        </div>
      </section>
    </ComponentShell>
  );
}

export interface ActionPreviewProps {
  actions?: JsonList<ActionPreviewItem>;
  endpointUrl?: string;
  contextEndpointUrl?: string;
  contextId?: string;
  defaultActionId?: string;
  title?: string;
  body?: string;
  className?: string;
}

export function ActionPreview({
  actions,
  endpointUrl = '',
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  defaultActionId,
  title = 'Action Preview',
  body = 'Preview governed actions before anything mutates an external system.',
  className = '',
}: ActionPreviewProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const parsedActions = useMemo(() => context?.actions ?? parseJsonList(actions, defaultActions), [context?.actions, actions]);
  const initialAction = parsedActions.find((action) => action.id === defaultActionId) ?? parsedActions[0];
  const [selectedActionId, setSelectedActionId] = useState(initialAction?.id ?? '');
  const [remotePreview, setRemotePreview] = useState<ActionPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedAction = parsedActions.find((action) => action.id === selectedActionId) ?? parsedActions[0];
  const policyChecks = remotePreview?.policyChecks ?? selectedAction?.policyChecks ?? [];
  const evidence = remotePreview?.evidence ?? selectedAction?.evidence ?? [];

  useEffect(() => {
    if (!parsedActions.some((action) => action.id === selectedActionId)) {
      setSelectedActionId(initialAction?.id ?? '');
      setRemotePreview(null);
    }
  }, [initialAction?.id, parsedActions, selectedActionId]);

  async function previewAction() {
    if (!endpointUrl || !selectedAction) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.id,
          contextId,
          approvalState: selectedAction.status === 'allowed' ? 'approved' : 'review',
        }),
      });

      const data = (await response.json()) as ActionPreviewResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to preview action.');
      }
      setRemotePreview(data);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Unable to preview action.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!selectedAction) return null;

  return (
    <ComponentShell className={className}>
      <article style={sectionSurfaceStyles}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem' }}>
          <SectionHeader eyebrow="Governed action" title={title} body={body} />
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.15rem' }}>
            <Badge tone={riskToTone(selectedAction.risk)}>{selectedAction.risk ?? 'standard'} risk</Badge>
            <Badge tone={statusToTone(selectedAction.status)}>{readableStatus(selectedAction.status)}</Badge>
          </div>
        </div>

        <div className="cs-action-preview-layout">
          <div className="cs-control-list">
            {parsedActions.map((action) => {
              const isActive = selectedAction.id === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  className="cs-action-option"
                  data-active={isActive}
                  onClick={() => {
                    setSelectedActionId(action.id);
                    setRemotePreview(null);
                    setError('');
                  }}
                >
                  <div className="cs-action-option-header">
                    <strong style={{ lineHeight: tokens.typography.lineHeight.tight }}>{action.label}</strong>
                    <Badge tone={statusToTone(action.status)}>{readableStatus(action.status)}</Badge>
                  </div>
                  <p
                    style={{
                      color: tokens.colors.fgSecondary,
                      fontSize: tokens.typography.fontSize.bodySm,
                      lineHeight: tokens.typography.lineHeight.relaxed,
                      margin: '0.55rem 0 0',
                    }}
                  >
                    {action.description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="cs-action-preview-detail-card" style={{ ...surfaceStyles, background: tokens.colors.bgPure, padding: tokens.spacing.md }}>
            <h3 style={{ fontFamily: tokens.typography.fontFamily.tight, fontSize: tokens.typography.fontSize.h4, margin: 0 }}>
              {selectedAction.label}
            </h3>
            <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.65rem 0 0' }}>
              {remotePreview?.summary ?? selectedAction.description}
            </p>

            <div className="cs-action-preview-detail-grid">
              <div>
                <div style={compactLabelStyles}>Policy checks</div>
                <ul style={{ color: tokens.colors.fgSecondary, margin: '0.75rem 0 0', paddingLeft: '1.1rem' }}>
                  {policyChecks.map((check) => (
                    <li key={check} style={{ marginBottom: '0.45rem' }}>
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div style={compactLabelStyles}>Grounding</div>
                <div className="cs-badge-list">
                  {evidence.map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
                {remotePreview?.allowedNextActions?.length ? (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={compactLabelStyles}>Allowed next actions</div>
                    <div className="cs-badge-list">
                      {remotePreview.allowedNextActions.map((item) => (
                        <Badge key={item} tone="success">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {error ? <p style={{ color: tokens.colors.error, margin: '1rem 0 0' }}>{error}</p> : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: tokens.spacing.md }}>
          <button className="cs-control-button" type="button" onClick={previewAction} disabled={!endpointUrl || isLoading}>
            {endpointUrl ? (isLoading ? 'Previewing...' : 'Preview with Cloudflare') : 'Static preview'}
          </button>
        </div>
      </article>
    </ComponentShell>
  );
}

export interface ApprovalGateProps {
  title?: string;
  description?: string;
  approvalState?: ApprovalState;
  requiredApprover?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  contextEndpointUrl?: string;
  contextId?: string;
  className?: string;
}

export function ApprovalGate({
  title = 'Human Approval Gate',
  description = 'The system can prepare the action, but a named operator approves it before execution.',
  approvalState = 'review',
  requiredApprover = 'Named operator',
  primaryActionLabel = 'Mark approved',
  secondaryActionLabel = 'Keep in review',
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  className = '',
}: ApprovalGateProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const approval = context?.approval;
  const effectiveTitle = approval?.title ?? title;
  const effectiveDescription = approval?.description ?? description;
  const effectiveApprover = approval?.requiredApprover ?? requiredApprover;
  const effectivePrimaryActionLabel = approval?.primaryActionLabel ?? primaryActionLabel;
  const effectiveSecondaryActionLabel = approval?.secondaryActionLabel ?? secondaryActionLabel;
  const effectiveApprovalState = approval?.approvalState ?? approvalState;
  const [state, setState] = useState<ApprovalState>(effectiveApprovalState);

  useEffect(() => {
    setState(effectiveApprovalState);
  }, [effectiveApprovalState]);

  return (
    <ComponentShell className={className}>
      <article style={{ ...surfaceStyles, padding: tokens.spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={compactLabelStyles}>Approval boundary</div>
            <h2
              style={{
                fontFamily: tokens.typography.fontFamily.tight,
                fontSize: tokens.typography.fontSize.h3,
                lineHeight: tokens.typography.lineHeight.tight,
                margin: '0.4rem 0 0',
              }}
            >
              {effectiveTitle}
            </h2>
          </div>
          <Badge tone={statusToTone(state)}>{state}</Badge>
        </div>
        <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.8rem 0 0' }}>
          {effectiveDescription}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
          <Badge tone="neutral">Approver: {effectiveApprover}</Badge>
          <Badge tone="warning">No external mutation in v1</Badge>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '0.75rem', marginTop: tokens.spacing.md }}>
          <button className="cs-control-button cs-control-button--ghost" type="button" onClick={() => setState('review')}>
            {effectiveSecondaryActionLabel}
          </button>
          <button className="cs-control-button" type="button" onClick={() => setState('approved')}>
            {effectivePrimaryActionLabel}
          </button>
        </div>
      </article>
    </ComponentShell>
  );
}

export interface AgentDockProps {
  endpointUrl?: string;
  contextEndpointUrl?: string;
  contextId?: string;
  title?: string;
  placeholder?: string;
  suggestedPrompts?: JsonList<SuggestedPrompt>;
  initialMessages?: JsonList<AgentMessage>;
  className?: string;
}

export function AgentDock({
  endpointUrl = '',
  contextEndpointUrl = '',
  contextId = 'create-something-governed-workflow-console',
  title = 'Ask the Control Layer',
  placeholder = 'Ask what is approved, private, or ready to preview...',
  suggestedPrompts,
  initialMessages,
  className = '',
}: AgentDockProps) {
  const { context } = useWorkflowContext(contextEndpointUrl, contextId);
  const prompts = useMemo(
    () => context?.agent?.suggestedPrompts ?? parseJsonList(suggestedPrompts, defaultPrompts),
    [context?.agent?.suggestedPrompts, suggestedPrompts]
  );
  const parsedInitialMessages = useMemo(
    () => context?.agent?.initialMessages ?? parseJsonList(initialMessages, defaultMessages),
    [context?.agent?.initialMessages, initialMessages]
  );
  const effectiveTitle = context?.agent?.title ?? title;
  const effectivePlaceholder = context?.agent?.placeholder ?? placeholder;
  const [messages, setMessages] = useState<AgentMessage[]>(parsedInitialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMessages(parsedInitialMessages);
  }, [parsedInitialMessages]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;

    const operatorMessage: AgentMessage = { role: 'operator', body: trimmed };
    const nextMessages = [...messages, operatorMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    if (!endpointUrl) {
      setMessages([
        ...nextMessages,
        {
          role: 'agent',
          body: 'Static preview mode: configure a Cloudflare endpoint URL to answer from the live governance route. The local rule is to keep private data out of public responses and require approval before external actions.',
          grounding: ['Static props', 'Governance rule'],
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          contextId,
          history: nextMessages.slice(-8).map((entry) => ({
            role: entry.role === 'operator' ? 'client' : 'agent',
            body: entry.body,
          })),
        }),
      });

      const data = (await response.json()) as AgentResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to ask the control layer.');
      }

      setMessages([
        ...nextMessages,
        {
          role: 'agent',
          body: data.answer ?? 'The control layer returned no answer.',
          grounding: data.grounding ?? data.followUps ?? data.followUpQuestions ?? [],
        },
      ]);
    } catch (askError) {
      setError(askError instanceof Error ? askError.message : 'Unable to ask the control layer.');
      setMessages(nextMessages);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <ComponentShell className={className}>
      <article style={{ ...surfaceStyles, padding: tokens.spacing.md }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
          <div>
            <div style={compactLabelStyles}>Bounded agent</div>
            <h2
              style={{
                fontFamily: tokens.typography.fontFamily.tight,
                fontSize: tokens.typography.fontSize.h3,
                lineHeight: tokens.typography.lineHeight.tight,
                margin: '0.4rem 0 0',
              }}
            >
              {effectiveTitle}
            </h2>
          </div>
          <Badge tone={endpointUrl ? 'success' : 'neutral'}>{endpointUrl ? 'Cloudflare' : 'Static'}</Badge>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: tokens.spacing.md }}>
          {prompts.map((prompt) => (
            <button
              key={prompt.label}
              className="cs-control-button cs-control-button--ghost"
              type="button"
              onClick={() => void sendMessage(prompt.prompt)}
              disabled={isLoading}
              style={{ minHeight: '2.25rem', padding: '0.5rem 0.7rem' }}
            >
              {prompt.label}
            </button>
          ))}
        </div>

        <div className="cs-agent-scroll cs-control-list" style={{ marginTop: tokens.spacing.md }}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}-${message.body.slice(0, 12)}`}
              style={{
                alignSelf: message.role === 'operator' ? 'flex-end' : 'stretch',
                maxWidth: message.role === 'operator' ? '82%' : '100%',
                border: `1px solid ${tokens.colors.borderDefault}`,
                borderRadius: tokens.radii.md,
                background: message.role === 'operator' ? tokens.colors.bgSubtle : tokens.colors.bgPure,
                padding: '0.9rem',
              }}
            >
              <div style={compactLabelStyles}>{message.role === 'operator' ? 'Operator' : 'Agent'}</div>
              <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.45rem 0 0' }}>
                {message.body}
              </p>
              {message.grounding?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                  {message.grounding.map((item) => (
                    <Badge key={item} tone="neutral">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {error ? <p style={{ color: tokens.colors.error, margin: '1rem 0 0' }}>{error}</p> : null}

        <form onSubmit={handleSubmit} className="cs-agent-form">
          <input
            className="cs-control-input"
            value={input}
            placeholder={effectivePlaceholder}
            onChange={(event) => setInput(event.target.value)}
            disabled={isLoading}
          />
          <button className="cs-control-button" type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? 'Asking...' : 'Ask'}
          </button>
        </form>
      </article>
    </ComponentShell>
  );
}

export interface CanonControlPanelProps {
  heading?: string;
  subheading?: string;
  contextId?: string;
  contextEndpointUrl?: string;
  agentEndpointUrl?: string;
  actionEndpointUrl?: string;
  approvalEndpointUrl?: string;
  approvalRequestCredentials?: ApprovalRequestCredentials;
  operatorName?: string;
  businessContexts?: JsonList<BusinessContextItem>;
  metrics?: JsonList<WorkflowMetricItem>;
  sourceStatuses?: JsonList<SourceStatusItem>;
  approvalQueue?: JsonList<ApprovalQueueItem>;
  executionQueue?: JsonList<ActionExecutionItem>;
  activityEvents?: JsonList<ActivityEventItem>;
  layers?: JsonList<OperatingLayer>;
  evidence?: JsonList<EvidenceItem>;
  artifacts?: JsonList<ArtifactItem>;
  decisions?: JsonList<DecisionItem>;
  actions?: JsonList<ActionPreviewItem>;
  suggestedPrompts?: JsonList<SuggestedPrompt>;
  runtimeChecks?: JsonList<RuntimeCheck>;
  className?: string;
}

export function CanonControlPanel({
  heading = 'Canon Control Panel',
  subheading = 'A Webflow interface backed by Cloudflare workflow state, preview-only actions, evidence, decisions, approvals, and client-safe artifacts.',
  contextId = 'create-something-governed-workflow-console',
  contextEndpointUrl = '',
  agentEndpointUrl = '',
  actionEndpointUrl = '',
  approvalEndpointUrl = '',
  approvalRequestCredentials = 'same-origin',
  operatorName = 'Operator',
  businessContexts,
  metrics,
  sourceStatuses,
  approvalQueue,
  executionQueue,
  activityEvents,
  layers,
  evidence,
  artifacts,
  decisions,
  actions,
  suggestedPrompts,
  runtimeChecks,
  className = '',
}: CanonControlPanelProps) {
  const hasMounted = useHasMounted();
  const { context, error: contextError } = useWorkflowContext(contextEndpointUrl, contextId);
  const effectiveHeading = context?.title ?? heading;
  const effectiveSubheading = context?.summary ?? subheading;
  const effectiveLayers = context?.layers ?? layers;
  const effectiveEvidence = context?.evidence ?? evidence;
  const effectiveArtifacts = context?.artifacts ?? artifacts;
  const effectiveDecisions = context?.decisions ?? decisions;
  const effectiveActions = context?.actions ?? actions;
  const effectiveSuggestedPrompts = context?.agent?.suggestedPrompts ?? suggestedPrompts;
  const effectiveRuntime = context?.runtime;
  const effectiveApproval = context?.approval;
  const effectiveBusinessContexts = context?.businessContexts ?? businessContexts;
  const effectiveMetrics = context?.metrics ?? metrics;
  const effectiveSourceStatuses = context?.sourceStatuses ?? sourceStatuses;
  const effectiveApprovalQueue = context?.approvalQueue ?? approvalQueue;
  const effectiveExecutionQueue = context?.executionQueue ?? executionQueue;
  const effectiveActivityEvents = context?.activityEvents ?? activityEvents;
  const consoleStatusItems = useMemo(
    () =>
      buildConsoleStatusItems({
        context,
        contextError,
        contextEndpointUrl,
        agentEndpointUrl,
        actionEndpointUrl,
        approvalEndpointUrl,
        approvalRequestCredentials,
      }),
    [context, contextError, contextEndpointUrl, agentEndpointUrl, actionEndpointUrl, approvalEndpointUrl, approvalRequestCredentials]
  );

  if (!hasMounted) {
    return (
      <ComponentShell className={className}>
        <section
          className="cs-console-shell"
          style={{
            background: tokens.colors.bgPure,
            border: `1px solid ${tokens.colors.borderDefault}`,
            borderRadius: tokens.radii.md,
            minHeight: '28rem',
            padding: tokens.spacing.lg,
          }}
        >
          <div style={compactLabelStyles}>Create Something / Webflow Code Components</div>
          <h1
            className="cs-control-title"
            style={{
              fontFamily: tokens.typography.fontFamily.tight,
              lineHeight: tokens.typography.lineHeight.tight,
              margin: '0.55rem 0 0',
              maxWidth: '56rem',
            }}
          >
            {heading}
          </h1>
          <p
            style={{
              color: tokens.colors.fgSecondary,
              fontSize: tokens.typography.fontSize.bodyLg,
              lineHeight: tokens.typography.lineHeight.relaxed,
              margin: '0.85rem 0 0',
              maxWidth: '58rem',
            }}
          >
            {subheading}
          </p>
          <div className="cs-console-status-grid">
            <article className="cs-console-status-card" data-tone="neutral">
              <div style={compactLabelStyles}>Workflow state</div>
              <div className="cs-console-status-value">Loading</div>
              <p className="cs-console-status-detail">Preparing the governed workflow console.</p>
            </article>
            <article className="cs-console-status-card" data-tone="neutral">
              <div style={compactLabelStyles}>Runtime routes</div>
              <div className="cs-console-status-value">{agentEndpointUrl || actionEndpointUrl ? 'Configured' : 'Static'}</div>
              <p className="cs-console-status-detail">Cloudflare endpoint settings are ready for hydration.</p>
            </article>
          </div>
        </section>
      </ComponentShell>
    );
  }

  return (
    <ComponentShell className={className}>
      <section
        className="cs-console-shell"
        style={{
          background: tokens.colors.bgPure,
          border: `1px solid ${tokens.colors.borderDefault}`,
          borderRadius: tokens.radii.md,
          padding: tokens.spacing.lg,
        }}
      >
        <div className="cs-control-hero-grid">
          <div>
            <div style={compactLabelStyles}>Create Something / Webflow Code Components</div>
            <h1
              className="cs-control-title"
              style={{
                fontFamily: tokens.typography.fontFamily.tight,
                lineHeight: tokens.typography.lineHeight.tight,
                margin: '0.55rem 0 0',
                maxWidth: '56rem',
              }}
            >
              {effectiveHeading}
            </h1>
            <p
              style={{
                color: tokens.colors.fgSecondary,
                fontSize: tokens.typography.fontSize.bodyLg,
                lineHeight: tokens.typography.lineHeight.relaxed,
                margin: '0.85rem 0 0',
                maxWidth: '58rem',
              }}
            >
              {effectiveSubheading}
            </p>
          </div>
          <RuntimeStatus
            label={effectiveRuntime?.label ?? 'Hybrid runtime'}
            status={effectiveRuntime?.status ?? (agentEndpointUrl || actionEndpointUrl ? 'ok' : 'idle')}
            environment={effectiveRuntime?.environment ?? 'Webflow + Cloudflare'}
            lastChecked={effectiveRuntime?.lastChecked ?? (agentEndpointUrl || actionEndpointUrl ? 'Endpoint configured' : 'Using static Webflow props')}
            checks={effectiveRuntime?.checks ?? runtimeChecks}
          />
        </div>

        <ConsoleStatusStrip items={consoleStatusItems} />

        {contextError ? (
          <div
            aria-live="polite"
            style={{
              ...surfaceStyles,
              background: tokens.colors.warningMuted,
              borderColor: tokens.colors.warningBorder,
              color: tokens.colors.warning,
              marginTop: tokens.spacing.md,
              padding: tokens.spacing.md,
            }}
          >
            <strong>Workflow context endpoint needs review.</strong>
            <p style={{ color: tokens.colors.fgSecondary, lineHeight: tokens.typography.lineHeight.relaxed, margin: '0.45rem 0 0' }}>
              {contextError}
            </p>
          </div>
        ) : null}

        <div style={{ marginTop: tokens.spacing.lg }}>
          <BusinessContextSwitcher
            contexts={effectiveBusinessContexts}
            activeContextId={context?.activeBusinessContextId}
            title="Business Context"
            body="Select the operating scope before reviewing approvals, actions, and source status."
          />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <WorkflowMetricsStrip metrics={effectiveMetrics} />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <OperatingLayerCards layers={effectiveLayers} body="Each feature is designed as a public surface, a callable runtime, and a policy-backed approval state." />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <SourceTruthStatus sources={effectiveSourceStatuses} />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <ActionPreview endpointUrl={actionEndpointUrl} contextId={contextId} actions={effectiveActions} />
        </div>

        <div className="cs-approval-stage-grid" style={{ marginTop: tokens.spacing.lg }}>
          <ApprovalQueue approvals={effectiveApprovalQueue} endpointUrl={approvalEndpointUrl} requestCredentials={approvalRequestCredentials} contextId={contextId} actor={operatorName} />
          <ApprovalGate
            title={effectiveApproval?.title}
            description={effectiveApproval?.description}
            approvalState={effectiveApproval?.approvalState}
            requiredApprover={effectiveApproval?.requiredApprover}
            primaryActionLabel={effectiveApproval?.primaryActionLabel}
            secondaryActionLabel={effectiveApproval?.secondaryActionLabel}
          />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <ActionExecutionQueue items={effectiveExecutionQueue} />
        </div>

        <div className="cs-control-grid cs-control-grid--two" style={{ marginTop: tokens.spacing.lg, alignItems: 'start' }}>
          <AgentDock
            endpointUrl={agentEndpointUrl}
            contextId={contextId}
            title={context?.agent?.title}
            placeholder={context?.agent?.placeholder}
            suggestedPrompts={effectiveSuggestedPrompts}
            initialMessages={context?.agent?.initialMessages}
          />
          <DecisionQueue decisions={effectiveDecisions} />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <EvidenceManager evidence={effectiveEvidence} />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <EvidenceTrail evidence={effectiveEvidence} title="Evidence Trail" />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <ArtifactGrid artifacts={effectiveArtifacts} />
        </div>

        <div style={{ marginTop: tokens.spacing.lg }}>
          <OperatorActivityLog events={effectiveActivityEvents} />
        </div>
      </section>
    </ComponentShell>
  );
}

export const canonControlDefaults = {
  layers: defaultLayers,
  evidence: defaultEvidence,
  artifacts: defaultArtifacts,
  decisions: defaultDecisions,
  actions: defaultActions,
  suggestedPrompts: defaultPrompts,
  initialMessages: defaultMessages,
  runtimeChecks: defaultChecks,
  businessContexts: defaultBusinessContexts,
  metrics: defaultMetrics,
  sourceStatuses: defaultSourceStatuses,
  approvalQueue: defaultApprovalQueue,
  executionQueue: defaultExecutionQueue,
  activityEvents: defaultActivityEvents,
};
