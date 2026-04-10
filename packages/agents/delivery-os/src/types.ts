export type DeliveryComponentKind = 'site' | 'platform' | 'product';

export type DeliveryVisibility = 'internal' | 'client' | 'operator';

export type EngagementStatus =
  | 'lead'
  | 'sold'
  | 'onboarding'
  | 'building'
  | 'qa'
  | 'live'
  | 'managed'
  | 'paused'
  | 'complete';

export type ComponentStatus = 'planned' | 'building' | 'blocked' | 'qa' | 'live' | 'deprecated';

export type ArtifactStatus = 'draft' | 'review' | 'approved' | 'sent' | 'signed' | 'paid';

export type ArtifactType =
  | 'engagement_hub'
  | 'prd'
  | 'timeline'
  | 'contract'
  | 'invoice'
  | 'onboarding'
  | 'runbook'
  | 'walkthrough'
  | 'operator_guide'
  | 'support_guide'
  | 'access_matrix'
  | 'capability_catalog'
  | 'launch_checklist'
  | 'notes';

export type IntegrationDirection = 'read' | 'write' | 'bidirectional';

export type IntegrationStatus = 'needed' | 'requested' | 'connected' | 'failing' | 'disabled';

export type MilestoneStatus = 'planned' | 'active' | 'blocked' | 'done' | 'cancelled';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type CommercialStatus = 'draft' | 'sent' | 'approved' | 'signed' | 'paid' | 'overdue' | 'cancelled';

export type DeliveryClient = {
  id: string;
  name: string;
  slug: string;
  industry?: string | null;
  ownerContactId?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryEngagement = {
  id: string;
  clientId: string;
  name: string;
  status: EngagementStatus;
  startDate?: string | null;
  targetLaunchDate?: string | null;
  commercialOwner?: string | null;
  deliveryOwner?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryComponent = {
  id: string;
  engagementId: string;
  name: string;
  kind: DeliveryComponentKind;
  status: ComponentStatus;
  brand?: string | null;
  liveUrl?: string | null;
  repoUrl?: string | null;
  dependsOnComponentId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryArtifact = {
  id: string;
  engagementId: string;
  componentId?: string | null;
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  sourceSystem: 'notion' | 'native' | 'external';
  sourceUrl?: string | null;
  visibility: DeliveryVisibility;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryMilestone = {
  id: string;
  engagementId: string;
  componentId?: string | null;
  title: string;
  status: MilestoneStatus;
  targetDate?: string | null;
  completedAt?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryIntegration = {
  id: string;
  componentId: string;
  provider: string;
  purpose: string;
  direction: IntegrationDirection;
  status: IntegrationStatus;
  owner?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryRisk = {
  id: string;
  engagementId: string;
  componentId?: string | null;
  severity: RiskSeverity;
  status: 'open' | 'mitigating' | 'closed';
  summary: string;
  owner?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryAccessItem = {
  id: string;
  componentId: string;
  system: string;
  accessType: string;
  owner?: string | null;
  status: 'needed' | 'requested' | 'granted' | 'rotating' | 'revoked';
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryCommercialSnapshot = {
  engagementId: string;
  contractStatus?: CommercialStatus | null;
  invoiceStatus?: CommercialStatus | null;
  buildFee?: number | null;
  monthlyFee?: number | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryListFilter = {
  clientId?: string;
  clientSlug?: string;
  engagementId?: string;
  componentId?: string;
  kind?: DeliveryComponentKind;
  status?: string;
};

export type DeliveryOsStore = {
  listEngagements(filter?: DeliveryListFilter): Promise<DeliveryEngagement[]>;
  getEngagement(input: { engagementId?: string; clientSlug?: string }): Promise<DeliveryEngagement | null>;
  listComponents(filter: DeliveryListFilter): Promise<DeliveryComponent[]>;
  listArtifacts(filter: DeliveryListFilter & { visibility?: DeliveryVisibility }): Promise<DeliveryArtifact[]>;
  listMilestones(filter: DeliveryListFilter): Promise<DeliveryMilestone[]>;
  listIntegrations(filter: DeliveryListFilter): Promise<DeliveryIntegration[]>;
  listRisks(filter: DeliveryListFilter): Promise<DeliveryRisk[]>;
  listAccessItems(filter: DeliveryListFilter): Promise<DeliveryAccessItem[]>;
  getCommercialSnapshot(input: { engagementId: string }): Promise<DeliveryCommercialSnapshot | null>;
};

export type DeliveryOsHostedMcpConfig = {
  serverLabel: string;
  serverUrl: string;
  allowedTools?: string[];
  headers?: Record<string, string>;
  requireApproval?: 'never' | 'always' | Record<string, 'never' | 'always'>;
};

export type DeliveryOsAgentOptions = {
  store: DeliveryOsStore;
  model?: string;
  name?: string;
  vectorStoreIds?: string[];
  hostedMcpServers?: DeliveryOsHostedMcpConfig[];
  instructions?: string;
};

export type DeliveryArtifactSyncDocument = {
  artifactId: string;
  clientId: string;
  engagementId: string;
  componentId?: string | null;
  artifactType: ArtifactType | string;
  title: string;
  body: string;
  sourceUrl?: string | null;
  lastUpdatedAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryArtifactSyncResult = {
  artifactId: string;
  fileId: string;
  vectorStoreId: string;
};

export type NotionPropertyBlueprint = {
  name: string;
  type:
    | 'title'
    | 'text'
    | 'status'
    | 'select'
    | 'multi_select'
    | 'date'
    | 'url'
    | 'number'
    | 'checkbox'
    | 'people'
    | 'relation';
  description: string;
};

export type NotionDatabaseBlueprint = {
  name: string;
  purpose: string;
  backedByTable: string;
  properties: NotionPropertyBlueprint[];
};

export type NotionPageBlueprint = {
  title: string;
  audience: 'client' | 'operator' | 'internal';
  sections: string[];
};
