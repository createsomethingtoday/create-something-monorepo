/**
 * Motion Studio Types
 * 
 * Type definitions for Vox-style motion graphics.
 */

/**
 * Vox style configuration
 * Controls the visual aesthetic of motion graphics
 */
export interface VoxStyle {
  /** Frame rate - 30 for smooth, 12 for "choppy emphasis" */
  fps: 30 | 24 | 12;
  
  /** Color palette */
  palette: {
    background: string;
    foreground: string;
    accent: string;
    muted: string;
  };
  
  /** Whether to add film grain/noise texture */
  texture: boolean;
  
  /** Texture intensity (0-1) */
  textureIntensity: number;
  
  /** Easing function for animations */
  easing: 'standard' | 'sharp' | 'smooth';
}

/**
 * Scene configuration for compositions
 */
export interface SceneConfig {
  /** Scene identifier */
  id: string;
  
  /** Duration in frames */
  durationInFrames: number;
  
  /** Start frame (for sequencing) */
  startFrame?: number;
  
  /** Scene title (optional) */
  title?: string;
  
  /** Vox style overrides */
  style?: Partial<VoxStyle>;
}

/**
 * Animation timing presets
 * Based on Canon animation tokens
 */
export interface AnimationTiming {
  /** Micro interactions - 200ms / 6 frames at 30fps */
  micro: number;
  
  /** Standard transitions - 300ms / 9 frames at 30fps */
  standard: number;
  
  /** Complex animations - 500ms / 15 frames at 30fps */
  complex: number;
}

/**
 * Text reveal animation styles
 */
export type TextRevealStyle = 
  | 'word-by-word'      // Each word fades/scales in
  | 'letter-by-letter'  // Typewriter effect
  | 'line-by-line'      // Full lines reveal
  | 'fade'              // Simple opacity fade
  | 'scale'             // Scale up from center
  | 'slide-up'          // Slide from below
  | 'slide-left';       // Slide from right

/**
 * Chart build animation styles
 */
export type ChartBuildStyle =
  | 'bar-by-bar'        // Bars grow sequentially
  | 'all-at-once'       // All elements animate together
  | 'draw'              // Line charts draw themselves
  | 'reveal'            // Mask reveal from left
  | 'grow';             // Bars/segments grow from zero

/**
 * Annotation configuration
 */
export interface AnnotationConfig {
  /** X position (0-1, percentage of width) */
  x: number;
  
  /** Y position (0-1, percentage of height) */
  y: number;
  
  /** Label text */
  label: string;
  
  /** Frame when annotation appears */
  revealFrame: number;
  
  /** Line style */
  lineStyle?: 'straight' | 'curved' | 'elbow';
  
  /** Annotation position relative to point */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Layer configuration for parallax effects
 */
export interface ParallaxLayer {
  /** Layer content (image URL or React node) */
  content: string | React.ReactNode;
  
  /** Depth factor (0 = no movement, 1 = full movement) */
  depth: number;
  
  /** Initial offset */
  offset?: { x: number; y: number };
  
  /** Z-index */
  zIndex?: number;
}

/**
 * Motion graphics output configuration
 */
export interface RenderConfig {
  /** Output format */
  format: 'mp4' | 'webm' | 'gif' | 'png-sequence';
  
  /** Output resolution */
  resolution: {
    width: number;
    height: number;
  };
  
  /** Frame rate */
  fps: number;
  
  /** Quality (0-100, for video) */
  quality?: number;
  
  /** Output path */
  outputPath: string;
}

/**
 * Scene planning result from the agent
 */
export interface ScenePlan {
  /** Ordered list of scenes */
  scenes: Array<{
    type: 'intro' | 'explanation' | 'data' | 'comparison' | 'conclusion';
    content: string;
    duration: number;
    primitives: string[];
  }>;
  
  /** Total duration in seconds */
  totalDuration: number;
  
  /** Suggested narration script */
  narration?: string;
  
  /** Data visualizations needed */
  dataViz?: Array<{
    type: 'bar' | 'line' | 'pie' | 'timeline' | 'flow';
    data: unknown;
  }>;
}
