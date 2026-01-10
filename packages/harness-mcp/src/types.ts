export interface BeadsIssue {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  priority?: string;
  labels: string[];
  acceptance?: string[];
  created: string;
  updated?: string;
}

export interface QualityGateResult {
  gate: 'tests' | 'typecheck' | 'lint';
  success: boolean;
  output: string;
  duration: number;
  fixable?: boolean;
  autoFixed?: boolean;
}

export interface FileModification {
  path: string;
  summary: string;
  changeType: 'created' | 'modified' | 'deleted';
  linesAdded?: number;
  linesRemoved?: number;
}

export interface Decision {
  decision: string;
  rationale: string;
  timestamp: string;
}

export interface AgentContext {
  sessionId: string;
  issueId?: string;
  filesModified: FileModification[];
  issuesUpdated: string[];
  decisions: Decision[];
  agentNotes: string;
  blockers: string[];
  testState?: {
    passing: number;
    failing: number;
    lastRun: string;
  };
  currentTask?: {
    description: string;
    progress: number;
  };
  capturedAt: string;
}

export interface Checkpoint {
  id: string;
  sessionId: string;
  context: AgentContext;
  gitCommit?: string;
  timestamp: string;
}
