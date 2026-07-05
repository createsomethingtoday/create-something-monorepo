/**
 * Content Types — Shared type definitions for all content domains.
 * The Database tier schema: what exists across CREATE SOMETHING properties.
 */

// ============================================================================
// Papers (.io)
// ============================================================================

export interface Paper {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  category: string;
  date: string;
  readingTime?: number;
  difficulty?: string;
  keywords: string[];
  content: string;
}

// ============================================================================
// Canon Design System (.ltd)
// ============================================================================

export interface CanonPage {
  slug: string;
  section: string;
  title: string;
  description: string;
  content: string;
}

export type CanonRegistryKind = 'component' | 'token' | 'template' | 'adapter' | 'policy';

export type CanonRegistryMaturity = 'stable' | 'candidate' | 'experimental';

export type CanonRegistryModality = 'web' | 'chat' | 'app' | 'voice' | 'glasses';

export type CanonExtensionLifecycleStage =
  | 'project-local'
  | 'candidate'
  | 'canon-stable'
  | 'deprecated';

export interface CanonRegistryItem {
  id: string;
  name: string;
  kind: CanonRegistryKind;
  maturity: CanonRegistryMaturity;
  description: string;
  ownerPackage: '@create-something/canon' | '@createsomething/canon-tokens';
  sourcePath: string;
  importPath?: string;
  docsPath?: string;
  tags: string[];
  modalities: CanonRegistryModality[];
  dependencies?: string[];
  contract: {
    accessibility?: string;
    evidence?: string;
    motion?: string;
    extension?: string;
  };
}

export interface CanonRegistryManifest {
  schemaVersion: 1;
  id: 'canon-registry';
  sourceOfTruth: '@create-something/canon/registry';
  description: string;
  requiredModalities: CanonRegistryModality[];
  items: CanonRegistryItem[];
  extensionLifecycle: Array<{
    stage: CanonExtensionLifecycleStage;
    description: string;
  }>;
  agentContract: {
    purpose: 'canon-design-system-discovery';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonExtensionSurfaceEvidence {
  surfaceId: string;
  name: string;
  modality: CanonRegistryModality;
  sourcePath?: string;
  proof?: string;
}

export interface CanonExtensionIntakePacket {
  id: string;
  title: string;
  summary: string;
  requestedKind: CanonRegistryKind;
  requestedModalities: CanonRegistryModality[];
  owner: string;
  sourcePackage: string;
  sourcePath?: string;
  tags: string[];
  surfaces: CanonExtensionSurfaceEvidence[];
  dependencies?: string[];
  matchesRegistryItemId?: string;
  deprecatesRegistryItemId?: string;
}

export interface CanonExtensionRoutingDecision {
  stage: CanonExtensionLifecycleStage;
  action: 'use-existing' | 'keep-local' | 'promote-candidate' | 'mark-deprecated' | 'needs-review';
  rationale: string;
  requiredEvidence: string[];
  stopBeforeStable: string[];
}

export type CanonProjectOverlayArtifactKind =
  | 'theme'
  | 'tokens'
  | 'templates'
  | 'copy-rules'
  | 'surface-policy'
  | 'registry';

export interface CanonProjectOverlayArtifact {
  kind: CanonProjectOverlayArtifactKind;
  path: string;
  description?: string;
  registryItemIds?: string[];
}

export interface CanonProjectOverlayManifest {
  id: string;
  name: string;
  owner: string;
  sourcePackage: string;
  sourcePath?: string;
  targetModalities: CanonRegistryModality[];
  tags?: string[];
  artifacts: CanonProjectOverlayArtifact[];
  extensionIntakes?: CanonExtensionIntakePacket[];
}

export interface CanonProjectOverlayIntegrityIssue {
  kind: 'missing-artifact-file' | 'missing-source-path' | 'unknown-registry-item';
  context: string;
  path?: string;
  registryItemId?: string;
  message: string;
}

export interface CanonProjectOverlayReview {
  status: 'ready' | 'needs-artifacts' | 'needs-evidence' | 'needs-review';
  requiredArtifacts: CanonProjectOverlayArtifactKind[];
  presentArtifacts: CanonProjectOverlayArtifactKind[];
  missingArtifacts: CanonProjectOverlayArtifactKind[];
  integrityIssues: CanonProjectOverlayIntegrityIssue[];
  extensionDecisions: Array<{
    packet: CanonExtensionIntakePacket;
    decision: CanonExtensionRoutingDecision;
  }>;
  stopConditions: string[];
  summary: string;
}

export interface CanonProjectOverlayInventoryEntry {
  manifestPath: string;
  manifest: CanonProjectOverlayManifest;
  review: CanonProjectOverlayReview;
}

export interface CanonProjectOverlayInventory {
  schemaVersion: 1;
  id: 'canon-overlay-intake-inventory';
  sourceOfTruth: '@create-something/canon/overlays/intake';
  description: string;
  rootDir: string;
  searchRoots: string[];
  entries: CanonProjectOverlayInventoryEntry[];
  summary: {
    total: number;
    ready: number;
    needsArtifacts: number;
    needsEvidence: number;
    needsReview: number;
    candidateIntakes: number;
    projectLocalIntakes: number;
  };
  agentContract: {
    purpose: 'canon-overlay-intake-inventory';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonOverlayCandidateQueueEntry {
  id: string;
  overlayId: string;
  overlayName: string;
  manifestPath: string;
  intakeId: string;
  title: string;
  summary: string;
  owner: string;
  sourcePackage: string;
  sourcePath?: string;
  requestedKind: CanonRegistryKind;
  requestedModalities: CanonRegistryModality[];
  tags: string[];
  surfaces: CanonExtensionSurfaceEvidence[];
  dependencies: string[];
  requiredEvidence: string[];
  stopBeforeStable: string[];
  rationale: string;
  reviewUri: string;
  candidateUri: string;
  handoffUri: string;
}

export interface CanonOverlayCandidateQueue {
  schemaVersion: 1;
  id: 'canon-overlay-candidate-queue';
  sourceOfTruth: '@create-something/canon/overlays/intake';
  description: string;
  entries: CanonOverlayCandidateQueueEntry[];
  summary: {
    total: number;
    overlays: number;
    byRequestedKind: Array<{ kind: CanonRegistryKind; count: number }>;
    byModality: Array<{ modality: CanonRegistryModality; count: number }>;
  };
  agentContract: {
    purpose: 'canon-overlay-candidate-review';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonOverlayCandidateReviewPacket {
  id: string;
  candidateId: string;
  title: string;
  summary: string;
  overlayId: string;
  overlayName: string;
  manifestPath: string;
  intakeId: string;
  owner: string;
  sourcePackage: string;
  sourcePath?: string;
  requestedKind: CanonRegistryKind;
  requestedModalities: CanonRegistryModality[];
  tags: string[];
  surfaces: CanonExtensionSurfaceEvidence[];
  dependencies: string[];
  requiredEvidence: string[];
  stopBeforeStable: string[];
  rationale: string;
  reviewUri: string;
  candidateUri: string;
  handoffUri: string;
  promotionChecklist: string[];
  approvalBoundary: string[];
  agentContract: {
    purpose: 'canon-overlay-candidate-review-packet';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonOverlayCandidateReviewPacketCollection {
  schemaVersion: 1;
  id: 'canon-overlay-candidate-review-packets';
  sourceOfTruth: '@create-something/canon/overlays/intake';
  description: string;
  entries: CanonOverlayCandidateReviewPacket[];
  summary: {
    total: number;
    overlays: number;
    byRequestedKind: Array<{ kind: CanonRegistryKind; count: number }>;
    byModality: Array<{ modality: CanonRegistryModality; count: number }>;
  };
  agentContract: {
    purpose: 'canon-overlay-candidate-review-packets';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonOverlayCandidatePromotionPlan {
  id: string;
  packetId: string;
  candidateId: string;
  intakeId: string;
  title: string;
  summary: string;
  overlayId: string;
  overlayName: string;
  manifestPath: string;
  owner: string;
  sourcePackage: string;
  sourcePath?: string;
  requestedKind: CanonRegistryKind;
  requestedModalities: CanonRegistryModality[];
  planUri: string;
  handoffUri: string;
  candidateUri: string;
  reviewUri: string;
  preconditions: string[];
  implementationScope: string[];
  requiredChanges: string[];
  validationPlan: string[];
  documentationPlan: string[];
  compatibilityPlan: string[];
  stopConditions: string[];
  approvalBoundary: string[];
  agentContract: {
    purpose: 'canon-overlay-candidate-promotion-plan';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonOverlayCandidatePromotionPlanCollection {
  schemaVersion: 1;
  id: 'canon-overlay-candidate-promotion-plans';
  sourceOfTruth: '@create-something/canon/overlays/intake';
  description: string;
  entries: CanonOverlayCandidatePromotionPlan[];
  summary: {
    total: number;
    overlays: number;
    byRequestedKind: Array<{ kind: CanonRegistryKind; count: number }>;
    byModality: Array<{ modality: CanonRegistryModality; count: number }>;
  };
  agentContract: {
    purpose: 'canon-overlay-candidate-promotion-plans';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export type CanonOverlayCandidatePromotionReadinessStatus =
  | 'needs-approval'
  | 'needs-targets'
  | 'ready-for-implementation';

export type CanonOverlayCandidatePromotionReadinessCheckStatus =
  | 'ready'
  | 'review'
  | 'missing'
  | 'needs-input';

export interface CanonOverlayCandidatePromotionReadinessCheck {
  id: string;
  label: string;
  status: CanonOverlayCandidatePromotionReadinessCheckStatus;
  evidence: string[];
  requiredAction: string;
}

export interface CanonOverlayCandidatePromotionReadinessRegistryMatch {
  id: string;
  name: string;
  kind: CanonRegistryKind;
  maturity: CanonRegistryMaturity;
  modalities: CanonRegistryModality[];
  docsPath?: string;
  score: number;
  reason: string;
}

export interface CanonOverlayCandidatePromotionReadinessExportMatch {
  exportPath: string;
  exportName?: string;
  classification: string;
  registryPolicy: string;
  registryItemIds?: string[];
  score: number;
  rationale: string;
}

export interface CanonOverlayCandidatePromotionReadinessReport {
  id: string;
  planId: string;
  candidateId: string;
  intakeId: string;
  title: string;
  summary: string;
  status: CanonOverlayCandidatePromotionReadinessStatus;
  readinessUri: string;
  planUri: string;
  handoffUri: string;
  candidateUri: string;
  reviewUri: string;
  checks: CanonOverlayCandidatePromotionReadinessCheck[];
  relatedRegistryItems: CanonOverlayCandidatePromotionReadinessRegistryMatch[];
  candidateExportPolicies: CanonOverlayCandidatePromotionReadinessExportMatch[];
  stopConditions: string[];
  approvalBoundary: string[];
  agentContract: {
    purpose: 'canon-overlay-candidate-promotion-readiness-report';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonOverlayCandidatePromotionReadinessReportCollection {
  schemaVersion: 1;
  id: 'canon-overlay-candidate-promotion-readiness-reports';
  sourceOfTruth: '@create-something/canon/overlays/intake';
  description: string;
  entries: CanonOverlayCandidatePromotionReadinessReport[];
  summary: {
    total: number;
    needsApproval: number;
    needsTargets: number;
    readyForImplementation: number;
  };
  agentContract: {
    purpose: 'canon-overlay-candidate-promotion-readiness-reports';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export type CanonOverlayCandidatePromotionApprovalState = 'approval-required';

export type CanonOverlayCandidatePromotionRegistryAction =
  | 'reuse-existing'
  | 'update-existing'
  | 'create-new';

export interface CanonOverlayCandidatePromotionApprovalTarget {
  approvalOwner: string | null;
  approvalEvidence: string | null;
  approvedAt: string | null;
  registryAction: CanonOverlayCandidatePromotionRegistryAction | null;
  registryItemId: string | null;
  exportPath: string | null;
  exportName: string | null;
  docsPath: string | null;
  maturityTarget: CanonRegistryMaturity | null;
  implementationOwner: string | null;
}

export interface CanonOverlayCandidatePromotionApprovalField {
  id: keyof CanonOverlayCandidatePromotionApprovalTarget;
  label: string;
  required: boolean;
  value: string | null;
  hints: string[];
  instructions: string;
}

export interface CanonOverlayCandidatePromotionApprovalRecord {
  id: string;
  readinessReportId: string;
  planId: string;
  candidateId: string;
  intakeId: string;
  title: string;
  summary: string;
  state: CanonOverlayCandidatePromotionApprovalState;
  approvalUri: string;
  readinessUri: string;
  planUri: string;
  handoffUri: string;
  candidateUri: string;
  reviewUri: string;
  target: CanonOverlayCandidatePromotionApprovalTarget;
  requiredFields: CanonOverlayCandidatePromotionApprovalField[];
  targetHints: {
    registryItems: CanonOverlayCandidatePromotionReadinessRegistryMatch[];
    exportPolicies: CanonOverlayCandidatePromotionReadinessExportMatch[];
    docsPaths: string[];
  };
  checklist: string[];
  stopConditions: string[];
  approvalBoundary: string[];
  agentContract: {
    purpose: 'canon-overlay-candidate-promotion-approval-record';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonOverlayCandidatePromotionApprovalRecordCollection {
  schemaVersion: 1;
  id: 'canon-overlay-candidate-promotion-approval-records';
  sourceOfTruth: '@create-something/canon/overlays/intake';
  description: string;
  entries: CanonOverlayCandidatePromotionApprovalRecord[];
  summary: {
    total: number;
    approvalRequired: number;
  };
  agentContract: {
    purpose: 'canon-overlay-candidate-promotion-approval-records';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export interface CanonOverlayModalityContract {
  modality: CanonRegistryModality;
  useFor: string;
  overlayOwns: string[];
  canonOwns: string[];
}

export interface CanonProjectOverlayCatalogEntry {
  id: string;
  name: string;
  summary: string;
  docsPath: string;
  registryItemIds: string[];
  outputFiles: string[];
  manifest: CanonProjectOverlayManifest;
  review: CanonProjectOverlayReview;
}

export interface CanonOverlayCatalog {
  schemaVersion: 1;
  id: 'canon-overlay-catalog';
  sourceOfTruth: '@create-something/canon/overlays';
  description: string;
  requiredArtifacts: CanonProjectOverlayArtifactKind[];
  overlayRules: string[];
  modalityContracts: CanonOverlayModalityContract[];
  templates: CanonProjectOverlayCatalogEntry[];
  agentContract: {
    purpose: 'canon-overlay-extension-discovery';
    primaryConsumers: Array<'codex' | 'mcp' | 'ltd-docs' | 'project-overlays'>;
    useFor: string[];
    stopBefore: string[];
  };
}

export type CanonPublicExportClassification =
  | 'analytics-surface'
  | 'auth-surface'
  | 'brand-surface'
  | 'composition-pattern'
  | 'content-utility'
  | 'decorative-effect'
  | 'docs-only'
  | 'domain-specific'
  | 'experiment'
  | 'governance-contract'
  | 'headless-contract'
  | 'platform-surface'
  | 'registry-artifact'
  | 'stable-foundation-candidate'
  | 'style-artifact'
  | 'supporting-api'
  | 'token-artifact';

export type CanonPublicExportRegistryPolicy =
  | 'candidate-review'
  | 'classified-out'
  | 'registry-covered';

export interface CanonPublicExportClassificationRule {
  exportPath: string;
  exportName?: string;
  classification: CanonPublicExportClassification;
  registryPolicy: CanonPublicExportRegistryPolicy;
  registryItemIds?: string[];
  rationale: string;
}

// ============================================================================
// Design Patterns (.ltd)
// ============================================================================

export interface Pattern {
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  content: string;
}

// ============================================================================
// Masters (.ltd)
// ============================================================================

export interface Master {
  slug: string;
  name: string;
  discipline: string;
  era: string;
  philosophy: string;
  principles: string[];
  influence: string;
}

// ============================================================================
// Knowledge Graph (.io)
// ============================================================================

export interface GraphNode {
  id: string;
  title: string;
  package: string | null;
  type: string;
  concepts: string[];
  wordCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  reason?: string;
}

// ============================================================================
// Praxis Exercises (.space)
// ============================================================================

export interface PraxisExercise {
  id: string;
  number: number;
  title: string;
  pattern: string;
  estimatedMinutes: number;
  context: {
    situation: string;
    task: string;
    notice: string;
  };
  starterCode: string;
  solution: string;
  whyItMatters: string;
}

// ============================================================================
// Products & Services (.agency)
// ============================================================================

export interface Product {
  id: string;
  title: string;
  description: string;
  pricing: string;
  timeline: string;
  category: string;
}

// ============================================================================
// Property Documents (All Property Markdown Content)
// ============================================================================

export interface PropertyDocument {
  id: string;
  property: 'io' | 'ltd' | 'space' | 'agency';
  title: string;
  description: string;
  section: string;
  path: string;
  slug: string;
  uri: string;
  content: string;
}

// ============================================================================
// Host Playbooks — re-exported from @create-something/playbook-mcp (canonical)
// ============================================================================

export type {
  HostPlaybook,
  WorkflowPattern,
  FolderTemplate,
  HostComparison,
} from '@create-something/playbook-mcp/playbooks';

// ============================================================================
// Content Index — unified searchable item
// ============================================================================

export interface ContentItem {
  id: string;
  type: 'paper' | 'canon' | 'canon-registry' | 'pattern' | 'master' | 'praxis' | 'product' | 'framework' | 'playbook' | 'document';
  title: string;
  description: string;
  content: string;
  property: 'io' | 'ltd' | 'space' | 'agency' | 'framework';
  uri: string;
}
