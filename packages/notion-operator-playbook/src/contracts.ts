export type ApprovalStatus = 'draft' | 'review' | 'approved' | 'rejected';

export type RunbookReadinessInput = {
  runbookId: string;
  title: string;
  owner: string;
  approvalStatus: ApprovalStatus;
  rollbackPlan: string;
  evidenceCount: number;
  stepCount: number;
};

export type RunbookReadinessResult = {
  runbookId: string;
  ready: boolean;
  status: 'ready' | 'blocked';
  missingRequirements: string[];
  recommendedAction: string;
  receiptId: string;
};

export type InstantiateRunbookInput = {
  playbookId: string;
  playbookVersion: string;
  runbookTitle: string;
  owner: string;
  approved: boolean;
  dryRun: boolean;
  targetDataSourceId: string | null;
  steps: string[];
};

export type InstantiateRunbookResult = {
  status: 'blocked' | 'preview' | 'created' | 'existing';
  created: boolean;
  reason: string | null;
  receiptId: string;
  pageId: string | null;
  runbookTitle: string;
  stepCount: number;
  dryRun: boolean;
};

export type NotionRunbookClient = {
  dataSources: {
    query(input: {
      data_source_id: string;
      filter: { property: string; rich_text: { equals: string } };
      page_size: number;
    }): Promise<{ results: Array<{ id: string }> }>;
  };
  pages: {
    create(input: Record<string, unknown>): Promise<{ id: string }>;
  };
};

export type EvidenceWebhookReceipt = {
  receiptId: string;
  deliveryId: string;
  runbookId: string;
  evidenceType: string;
  source: string;
  status: 'accepted';
};
