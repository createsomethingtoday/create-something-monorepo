export type ApprovalPolicy = 'untrusted' | 'on-failure' | 'on-request' | 'never';

export type SandboxPolicy =
  | { type: 'dangerFullAccess' }
  | { type: 'readOnly' }
  | {
      type: 'workspaceWrite';
      networkAccess?: boolean;
      writableRoots?: string[];
      excludeSlashTmp?: boolean;
      excludeTmpdirEnvVar?: boolean;
    };

export type AutoApproveRules = {
  // If all parsed command actions are in this allow-list, auto-approve.
  commandActionTypes?: Array<'read' | 'listFiles' | 'search' | 'unknown'>;
  // If the raw command string matches any regex, auto-approve.
  commandRegex?: string[];
  // If all file changes are under one of these prefixes, auto-approve.
  filePathPrefixes?: string[];
};

export type JudgmentPolicy = {
  id: string;
  label: string;
  description: string;

  model?: string;
  effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  summary?: 'auto' | 'concise' | 'detailed' | 'none';

  sandboxPolicy: SandboxPolicy;
  approvalPolicy: ApprovalPolicy;

  // When a request can't be auto-approved and interactive prompting is disabled.
  nonInteractiveDecision: 'decline' | 'cancel';

  autoApprove?: AutoApproveRules;

  // Injected into thread developerInstructions (Judgment tier artifact).
  developerInstructions?: string;
};

export type LoadedPolicy = JudgmentPolicy & {
  source: 'builtin' | 'project';
  sourcePath?: string;
};

