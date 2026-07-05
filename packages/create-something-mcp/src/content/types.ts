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

export interface CanonProjectOverlayReview {
  status: 'ready' | 'needs-artifacts' | 'needs-evidence' | 'needs-review';
  requiredArtifacts: CanonProjectOverlayArtifactKind[];
  presentArtifacts: CanonProjectOverlayArtifactKind[];
  missingArtifacts: CanonProjectOverlayArtifactKind[];
  extensionDecisions: Array<{
    packet: CanonExtensionIntakePacket;
    decision: CanonExtensionRoutingDecision;
  }>;
  stopConditions: string[];
  summary: string;
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
