/**
 * Doc Generator Types
 * TypeScript interfaces for screenshot-to-documentation pipeline
 */

/**
 * A UI element identified in a screenshot
 */
export interface UIElement {
  /** Normalized x coordinate (0-1) of top-left corner */
  x: number;
  /** Normalized y coordinate (0-1) of top-left corner */
  y: number;
  /** Normalized width (0-1) */
  width: number;
  /** Normalized height (0-1) */
  height: number;
  /** Human-readable label for this element */
  label: string;
  /** Description of what this element does */
  description: string;
  /** Importance level for documentation */
  importance: 'primary' | 'secondary' | 'context';
  /** Action instruction for the user */
  action?: string;
}

/**
 * Analysis result for a single screenshot
 */
export interface ScreenshotAnalysis {
  /** Path to the original screenshot */
  imagePath: string;
  /** Title for this page/section */
  pageTitle: string;
  /** Description of what this screenshot shows */
  description: string;
  /** Position in the user flow (1-indexed) */
  userFlowStep: number;
  /** UI elements identified */
  elements: UIElement[];
  /** What the user should do next */
  nextAction?: string;
  /** Documentation section this belongs to */
  docSection?: string;
}

/**
 * Batch analysis results from Claude
 */
export interface BatchAnalysis {
  /** Title of the documentation */
  title: string;
  /** Individual screenshot analyses */
  screenshots: ScreenshotAnalysis[];
}

/**
 * Options for generating documentation
 */
export interface DocGenOptions {
  /** Title for the documentation */
  title: string;
  /** Output directory (default: './docs') */
  outputDir?: string;
  /** Generate HTML with CSS animations */
  animate?: boolean;
  /** Skip generating cropped images */
  skipCrops?: boolean;
  /** Custom markdown template path */
  template?: string;
  /** Dry run - analyze only */
  dryRun?: boolean;
  /** Additional context for Claude analysis */
  context?: string;
}

/**
 * Generated image from a screenshot
 */
export interface GeneratedImage {
  /** Type of generated image */
  type: 'full' | 'annotated' | 'crop';
  /** Path to the generated image */
  path: string;
  /** Source screenshot path */
  sourcePath: string;
  /** Element label (for crops) */
  elementLabel?: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Result from processing a single screenshot
 */
export interface ProcessedScreenshot {
  /** Original analysis */
  analysis: ScreenshotAnalysis;
  /** Generated images */
  images: GeneratedImage[];
}

/**
 * Complete documentation generation result
 */
export interface DocGenResult {
  /** Title of the documentation */
  title: string;
  /** Path to generated markdown file */
  markdownPath: string;
  /** Path to generated HTML file (if animate=true) */
  htmlPath?: string;
  /** All processed screenshots */
  screenshots: ProcessedScreenshot[];
  /** Total images generated */
  imageCount: number;
  /** Total time in milliseconds */
  duration: number;
}

/**
 * Highlight style for annotated images
 */
export interface HighlightStyle {
  /** Border color (CSS color string) */
  borderColor: string;
  /** Border width in pixels */
  borderWidth: number;
  /** Fill color with alpha (CSS color string) */
  fillColor: string;
  /** Corner radius in pixels */
  borderRadius: number;
}

/**
 * Default highlight styles by importance
 */
export const DEFAULT_HIGHLIGHT_STYLES: Record<UIElement['importance'], HighlightStyle> = {
  primary: {
    borderColor: '#ffffff',
    borderWidth: 3,
    fillColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8
  },
  secondary: {
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 2,
    fillColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6
  },
  context: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    fillColor: 'transparent',
    borderRadius: 4
  }
};

/**
 * Analysis prompt for Claude
 */
export const ANALYSIS_PROMPT = `Analyze this screenshot for documentation purposes.

Identify:
1. Key UI elements (buttons, forms, inputs, status indicators)
2. The user flow step this represents
3. Important areas to highlight or zoom

Return JSON only (no markdown, no explanation):
{
  "pageTitle": "Page or Section Title",
  "description": "Brief description of what this screen shows",
  "userFlowStep": 1,
  "elements": [
    {
      "x": 0.1,
      "y": 0.2,
      "width": 0.3,
      "height": 0.15,
      "label": "Element Name",
      "description": "What this element does",
      "importance": "primary",
      "action": "Click to do X"
    }
  ],
  "nextAction": "What user should do next",
  "docSection": "Section name for grouping"
}

Coordinates are normalized 0-1 (x=0 is left edge, y=0 is top edge).
importance: "primary" for main actions, "secondary" for supporting, "context" for reference.
Return valid JSON only.`;
