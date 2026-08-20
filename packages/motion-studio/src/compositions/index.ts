/**
 * Scene Compositions
 * 
 * Pre-built scene templates for common explainer patterns.
 * Each composition is a complete, ready-to-use Remotion component.
 */

export { ExplainerIntro } from './ExplainerIntro';
export { DataVisualization } from './DataVisualization';
export { ConceptBreakdown } from './ConceptBreakdown';
export { ComparisonScene } from './ComparisonScene';
export { TimelineScene } from './TimelineScene';
export {
  AtlasTranscriptOverlay,
  AtlasTranscriptOverlaySchema,
  ATLAS_TRANSCRIPT_OVERLAY_COMPOSITION_ID,
  ATLAS_TRANSCRIPT_OVERLAY_FPS,
  createAtlasTranscriptOverlayProps,
} from '../atlas-transcript-overlay';
export type {
  AcceptedTranscriptOverlayInput,
  AtlasTranscriptOverlayProps,
} from '../atlas-transcript-overlay';

// Full video composition
export { ExplainerVideo, calculateTotalDuration, createScene } from './ExplainerVideo';

// Lesson compositions
export { ToolReceding, IDEvsTerminal } from './lessons';

// Commercial compositions
export { SeeingCommercial, SEEING_COMMERCIAL_DURATION } from './commercials';
