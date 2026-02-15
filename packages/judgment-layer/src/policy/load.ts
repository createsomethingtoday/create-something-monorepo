import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import TOML from '@iarna/toml';
import type { JudgmentPolicy, LoadedPolicy } from './types.js';

type PolicyToml = {
  id: string;
  label?: string;
  description?: string;
  model?: string;
  effort?: JudgmentPolicy['effort'];
  summary?: JudgmentPolicy['summary'];
  approval_policy?: JudgmentPolicy['approvalPolicy'];
  non_interactive_decision?: JudgmentPolicy['nonInteractiveDecision'];
  developer_instructions?: string;
  sandbox_policy?: {
    type: JudgmentPolicy['sandboxPolicy']['type'];
    network_access?: boolean;
    writable_roots?: string[];
  };
  auto_approve?: {
    command_action_types?: Array<'read' | 'listFiles' | 'search' | 'unknown'>;
    command_regex?: string[];
    file_path_prefixes?: string[];
  };
};

function normalizePolicyFromToml(toml: PolicyToml, sourcePath: string): LoadedPolicy {
  const sandboxPolicy =
    toml.sandbox_policy?.type === 'dangerFullAccess'
      ? { type: 'dangerFullAccess' as const }
      : toml.sandbox_policy?.type === 'readOnly'
        ? { type: 'readOnly' as const }
        : {
            type: 'workspaceWrite' as const,
            networkAccess: toml.sandbox_policy?.network_access ?? false,
            writableRoots: toml.sandbox_policy?.writable_roots ?? ['$CWD']
          };

  return {
    id: toml.id,
    label: toml.label ?? toml.id,
    description: toml.description ?? '',
    model: toml.model,
    effort: toml.effort,
    summary: toml.summary,
    approvalPolicy: toml.approval_policy ?? 'untrusted',
    nonInteractiveDecision: toml.non_interactive_decision ?? 'decline',
    sandboxPolicy,
    autoApprove: {
      commandActionTypes: toml.auto_approve?.command_action_types,
      commandRegex: toml.auto_approve?.command_regex,
      filePathPrefixes: toml.auto_approve?.file_path_prefixes
    },
    developerInstructions: toml.developer_instructions,
    source: 'project',
    sourcePath
  };
}

export function loadProjectPolicies(cwd: string): LoadedPolicy[] {
  const dir = join(cwd, '.judgment', 'policies');
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.toml'))
    .map((f) => join(dir, f));

  const loaded: LoadedPolicy[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(file, 'utf-8');
      const data = TOML.parse(raw) as unknown as PolicyToml;
      if (!data.id) continue;
      loaded.push(normalizePolicyFromToml(data, file));
    } catch {
      // Ignore invalid policy files; CLI will show builtin policies regardless.
    }
  }
  return loaded;
}

