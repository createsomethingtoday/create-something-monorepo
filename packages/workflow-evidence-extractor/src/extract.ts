import { createHash } from 'node:crypto';

import { compileWorkflowDefinition } from '@createsomething/workflow-compiler';

import type {
  ExtractWorkflowDefinitionInput,
  WorkflowDefinitionProposal,
  WorkflowEvidenceRecord,
  WorkflowEvidenceSource,
  WorkflowEvidenceSourceRecord,
  WorkflowExtractionPolicy,
  WorkflowProposalConflict,
  WorkflowProposalOperation,
} from './types.js';

export const WORKFLOW_EVIDENCE_EXTRACTOR_VERSION = 'workflow-evidence-extractor-v0.1';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function hash(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;
}

export function calculateWorkflowProposalHash(
  proposal: Omit<WorkflowDefinitionProposal, 'proposalHash'>,
): string {
  return hash(proposal);
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sourceRecord(source: WorkflowEvidenceSource): WorkflowEvidenceSourceRecord {
  return {
    id: source.id,
    kind: source.kind,
    path: source.path,
    hash: hash(source.document),
  };
}

function objectAt(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entry = (value as Record<string, unknown>)[key];
  return entry && typeof entry === 'object' && !Array.isArray(entry)
    ? (entry as Record<string, unknown>)
    : undefined;
}

function arrayAt(value: unknown, key: string): unknown[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const entry = (value as Record<string, unknown>)[key];
  return Array.isArray(entry) ? entry : [];
}

function stringAt(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entry = (value as Record<string, unknown>)[key];
  return typeof entry === 'string' ? entry : undefined;
}

function stringArrayAt(value: unknown, key: string): string[] {
  return arrayAt(value, key).filter((entry): entry is string => typeof entry === 'string');
}

function agentContractEvidence(
  source: WorkflowEvidenceSource,
  record: WorkflowEvidenceSourceRecord,
  policy?: WorkflowExtractionPolicy,
): WorkflowEvidenceRecord[] {
  const ownership = objectAt(source.document, 'ownership');
  const evidence: WorkflowEvidenceRecord[] = [];

  const mappings = [
    ['policy_owner', '/owners/policy'],
    ['technical_owner', '/owners/technical'],
    ['workflow_owner', '/owners/workflow'],
  ] as const;

  if (ownership) {
    evidence.push(
      ...mappings.flatMap(([field, targetPath]) => {
        const rawValue = ownership[field];
        if (typeof rawValue !== 'string' || !rawValue.trim()) return [];
        const sourcePointer = `/ownership/${field}`;
        return [
          {
            id: `evidence:${source.id}:${sourcePointer}`,
            claimType: 'owner' as const,
            targetPath,
            rawValue,
            normalizedValue: slug(rawValue),
            confidence: 1,
            sourceId: source.id,
            sourceHash: record.hash,
            sourcePointer,
          },
        ];
      }),
    );
  }

  const actionPolicy = objectAt(source.document, 'action_policy');
  if (!actionPolicy || !policy) return evidence;
  const categories = [
    ['auto_allow', 'auto_allow'],
    ['approval_required', 'approval_required'],
    ['block', 'blocked'],
  ] as const;
  for (const [category, autonomy] of categories) {
    const entries = arrayAt(actionPolicy, category);
    entries.forEach((entry, index) => {
      const action = stringAt(entry, 'action');
      if (!action) return;
      for (const mapping of policy.agentActionMappings) {
        if (!action.toLowerCase().includes(mapping.contains.toLowerCase())) continue;
        const sourcePointer = `/action_policy/${category}/${index}/action`;
        evidence.push({
          id: `evidence:${source.id}:${sourcePointer}:${mapping.actionId}`,
          claimType: 'autonomy',
          targetPath: `/actions/${mapping.actionId}/autonomy`,
          rawValue: action,
          normalizedValue: autonomy,
          confidence: 0.95,
          sourceId: source.id,
          sourceHash: record.hash,
          sourcePointer,
        });
      }
    });
  }
  return evidence;
}

function normalizeApprovalMode(mode: string): string {
  if (mode.startsWith('approval_required')) return 'approval_required';
  if (mode.startsWith('manual_only')) return 'manual_only';
  if (mode.startsWith('not_available')) return 'blocked';
  if (mode.startsWith('auto_allow')) return 'auto_allow';
  return 'blocked';
}

function mcpContractEvidence(
  source: WorkflowEvidenceSource,
  record: WorkflowEvidenceSourceRecord,
  policy?: WorkflowExtractionPolicy,
): WorkflowEvidenceRecord[] {
  if (!policy) return [];
  const evidence: WorkflowEvidenceRecord[] = [];
  const systems = objectAt(source.document, 'systems');
  if (systems) {
    const groups = ['source_systems', 'connected_systems'] as const;
    for (const group of groups) {
      arrayAt(systems, group).forEach((entry, index) => {
        const name = stringAt(entry, 'name');
        if (!name) return;
        const mapping = policy.systemMappings[name];
        if (!mapping) return;
        const sourcePointer = `/systems/${group}/${index}`;
        evidence.push({
          id: `evidence:${source.id}:${sourcePointer}:${mapping.id}`,
          claimType: 'system',
          targetPath: `/systems/${mapping.id}`,
          rawValue: entry,
          normalizedValue: {
            id: mapping.id,
            title: name,
            tier: mapping.tier,
            owningSurface: name,
            sourceOfTruth: mapping.sourceOfTruth,
          },
          confidence: 1,
          sourceId: source.id,
          sourceHash: record.hash,
          sourcePointer,
        });
      });
    }
  }

  arrayAt(source.document, 'tools').forEach((entry, index) => {
    const name = stringAt(entry, 'name');
    const approvalMode = stringAt(entry, 'approval_mode');
    if (!name || !approvalMode) return;
    const mapping = policy.mcpToolMappings[name];
    if (!mapping) return;
    const sourcePointer = `/tools/${index}/approval_mode`;
    for (const actionId of mapping.actionIds) {
      evidence.push({
        id: `evidence:${source.id}:${sourcePointer}:${actionId}`,
        claimType: 'autonomy',
        targetPath: `/actions/${actionId}/autonomy`,
        rawValue: approvalMode,
        normalizedValue: normalizeApprovalMode(approvalMode),
        confidence: 1,
        sourceId: source.id,
        sourceHash: record.hash,
        sourcePointer,
      });
    }
  });
  return evidence;
}

function ruleCatalogEvidence(
  source: WorkflowEvidenceSource,
  record: WorkflowEvidenceSourceRecord,
  policy?: WorkflowExtractionPolicy,
): WorkflowEvidenceRecord[] {
  if (!policy) return [];
  return arrayAt(source.document, 'rules').flatMap((entry, index) => {
    const ruleId = stringAt(entry, 'rule_id');
    const title = stringAt(entry, 'title');
    if (!ruleId || !title) return [];
    const mapping = policy.ruleMappings[ruleId];
    if (!mapping) return [];
    const sourcePointer = `/rules/${index}`;
    return [
      {
        id: `evidence:${source.id}:${sourcePointer}:${ruleId}`,
        claimType: 'evaluation' as const,
        targetPath: `/evaluations/${ruleId}`,
        rawValue: entry,
        normalizedValue: {
          id: ruleId,
          title,
          actionId: mapping.actionId,
          expectedOutcome: mapping.expectedOutcome,
          requiredEvidence: stringArrayAt(entry, 'evidence_required').sort((left, right) =>
            left.localeCompare(right),
          ),
        },
        confidence: 1,
        sourceId: source.id,
        sourceHash: record.hash,
        sourcePointer,
      },
    ];
  });
}

function proposalOperations(
  input: ExtractWorkflowDefinitionInput,
  evidence: WorkflowEvidenceRecord[],
): WorkflowProposalOperation[] {
  const systemIds = new Set(input.baseline.systems.map((system) => system.id));
  const evaluationIds = new Set(input.baseline.evaluations.map((evaluation) => evaluation.id));
  return evidence
    .flatMap((record): WorkflowProposalOperation[] => {
      if (record.claimType === 'system') {
        const value = record.normalizedValue as { id: string };
        if (systemIds.has(value.id)) return [];
        return [
          {
            id: `operation:add-system:${value.id}`,
            op: 'add',
            path: '/systems/-',
            proposedValue: record.normalizedValue,
            confidence: record.confidence,
            rationale: `Add system ${value.id} observed in bounded operating evidence.`,
            provenanceIds: [record.id],
            approvalRequired: true,
            status: 'proposed',
          },
        ];
      }
      if (record.claimType === 'evaluation') {
        const value = record.normalizedValue as { id: string };
        if (evaluationIds.has(value.id)) return [];
        return [
          {
            id: `operation:add-evaluation:${value.id}`,
            op: 'add',
            path: '/evaluations/-',
            proposedValue: record.normalizedValue,
            confidence: record.confidence,
            rationale: `Add evaluation ${value.id} observed in the bounded rule catalog.`,
            provenanceIds: [record.id],
            approvalRequired: true,
            status: 'proposed',
          },
        ];
      }
      return [];
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function proposalConflicts(
  input: ExtractWorkflowDefinitionInput,
  evidence: WorkflowEvidenceRecord[],
): WorkflowProposalConflict[] {
  const autonomy = evidence.filter((record) => record.claimType === 'autonomy');
  const targetPaths = [...new Set(autonomy.map((record) => record.targetPath))].sort();
  return targetPaths.flatMap((targetPath) => {
    const actionId = targetPath.split('/')[2];
    const baselineValue = input.baseline.actions.find((action) => action.id === actionId)?.autonomy;
    const records = autonomy.filter((record) => record.targetPath === targetPath);
    const values = [...new Set([baselineValue, ...records.map((record) => String(record.normalizedValue))])]
      .filter((value): value is string => Boolean(value))
      .sort();
    if (values.length < 2) return [];
    return [
      {
        id: `conflict:${actionId}:autonomy`,
        targetPath,
        baselineValue,
        claims: values.map((value) => ({
          value,
          provenanceIds: records
            .filter((record) => record.normalizedValue === value)
            .map((record) => record.id)
            .sort(),
        })),
        resolution: 'operator_required' as const,
      },
    ];
  });
}

export function extractWorkflowDefinitionProposal(
  input: ExtractWorkflowDefinitionInput,
): WorkflowDefinitionProposal {
  const baselineHash = compileWorkflowDefinition(input.baseline).definitionHash;
  const sources = input.sources.map(sourceRecord).sort((left, right) => left.id.localeCompare(right.id));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const evidence = input.sources
    .flatMap((source) => {
      const record = sourceById.get(source.id)!;
      if (source.kind === 'agent_contract') return agentContractEvidence(source, record, input.policy);
      if (source.kind === 'mcp_contract') return mcpContractEvidence(source, record, input.policy);
      if (source.kind === 'rule_catalog') return ruleCatalogEvidence(source, record, input.policy);
      return [];
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  const operations = proposalOperations(input, evidence);
  const conflicts = proposalConflicts(input, evidence);
  const proposalBody = {
    schemaVersion: 'workflow_definition_proposal.v0.1' as const,
    extractorVersion: WORKFLOW_EVIDENCE_EXTRACTOR_VERSION,
    workflowId: input.baseline.workflowId,
    baselineHash,
    sources,
    evidence,
    operations,
    conflicts,
  };

  return {
    ...proposalBody,
    proposalHash: calculateWorkflowProposalHash(proposalBody),
  };
}
