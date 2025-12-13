/**
 * Motion Ontology Analyzer - Type Definitions
 *
 * Phenomenological framework for analyzing UI motion through
 * Heidegger's concepts of Zuhandenheit and Vorhandenheit.
 */

// Trigger types for motion extraction
export type TriggerType = 'load' | 'click' | 'hover' | 'scroll' | 'focus';

// Ontological modes from Heidegger
export type OntologicalMode = 'zuhandenheit' | 'vorhandenheit';

// Motion judgment categories
export type MotionJudgment = 'functional' | 'decorative' | 'ambiguous';

// What motion reveals (aletheia - unconcealment)
export type DisclosureType =
  | 'state_transition'
  | 'spatial_relationship'
  | 'user_confirmation'
  | 'hierarchy_reveal'
  | 'temporal_sequence'
  | 'none';

// Request configuration
export interface AnalysisRequest {
  url: string;
  trigger: TriggerConfig;
}

export interface TriggerConfig {
  type: TriggerType;
  selector?: string;
  scrollPosition?: number;
  delay?: number;
}

// Animation data extracted from the page
export interface AnimationData {
  name: string;
  duration: number;
  easing: string;
  delay: number;
  iterations: number;
  fillMode: string;
  playState?: string;
  targetSelector?: string;
  keyframes: KeyframeData[];
}

export interface KeyframeData {
  offset: number;
  properties: Record<string, string>;
}

// CSS transition data
export interface TransitionData {
  property: string;
  duration: number;
  easing: string;
  delay: number;
}

// Timing analysis
export interface TimingProfile {
  totalDuration: number;
  longestAnimation: number;
  shortestAnimation: number;
  averageDuration: number;
  parallelAnimations: number;
}

// Technical extraction result
export interface TechnicalAnalysis {
  animations: AnimationData[];
  transitions: TransitionData[];
  timing: TimingProfile;
  propertiesAnimated: string[];
  triggerType: TriggerType;
  extractedAt: string;
  screenshot?: string; // base64 PNG
  debug?: {
    elementFound?: boolean;
    hoverTriggered?: boolean;
    animationsBefore?: number;
    animationsAfter?: number;
  };
}

// Recommendation from phenomenological analysis
export interface MotionRecommendation {
  action: 'keep' | 'modify' | 'remove';
  reasoning: string;
  modification?: string;
}

// Phenomenological interpretation result
export interface PhenomenologicalAnalysis {
  disclosure: DisclosureType;
  disclosureDescription: string;
  mode: OntologicalMode;
  modeRationale: string;
  judgment: MotionJudgment;
  justification: string;
  recommendation: MotionRecommendation;
  confidence: number;
}

// Complete analysis result
export interface MotionAnalysisResult {
  technical: TechnicalAnalysis;
  phenomenological: PhenomenologicalAnalysis;
  metadata: {
    url: string;
    analyzedAt: string;
    duration: number;
  };
}
