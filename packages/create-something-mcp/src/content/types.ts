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
  type: 'paper' | 'canon' | 'pattern' | 'master' | 'praxis' | 'product' | 'framework' | 'playbook';
  title: string;
  description: string;
  content: string;
  property: 'io' | 'ltd' | 'space' | 'agency' | 'framework';
  uri: string;
}
