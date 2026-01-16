/**
 * ScenePlanner - AI-assisted scene planning
 * 
 * Analyzes content and suggests appropriate scene types,
 * durations, and compositions for Vox-style explainers.
 */
import { Timeline, createTimeline, type TimelineEntry } from './timeline.js';
import { animation } from '../styles/index.js';

export interface PlannerConfig {
  /** Target video duration in seconds */
  targetDuration?: number;
  
  /** Frames per second */
  fps?: number;
  
  /** Preferred pacing */
  pacing?: 'fast' | 'moderate' | 'slow';
  
  /** Theme preference */
  theme?: string;
}

export interface ContentBlock {
  /** Block type */
  type: 'hook' | 'concept' | 'data' | 'comparison' | 'timeline' | 'conclusion';
  
  /** Main content/text */
  content: string;
  
  /** Supporting data if applicable */
  data?: unknown;
  
  /** Related concepts */
  relatedConcepts?: string[];
}

interface SceneRecommendation {
  sceneType: string;
  duration: number;
  props: Record<string, unknown>;
  rationale: string;
}

/**
 * ScenePlanner - Maps content to visual scenes
 */
export class ScenePlanner {
  private config: Required<PlannerConfig>;
  
  constructor(config: PlannerConfig = {}) {
    this.config = {
      targetDuration: config.targetDuration ?? 60,
      fps: config.fps ?? 30,
      pacing: config.pacing ?? 'moderate',
      theme: config.theme ?? 'dark',
    };
  }
  
  /**
   * Plan scenes from content blocks
   */
  planFromContent(blocks: ContentBlock[]): Timeline {
    const timeline = createTimeline({ fps: this.config.fps });
    const recommendations = blocks.map(block => this.recommendScene(block));
    
    // Adjust durations to fit target
    const totalRecommended = recommendations.reduce((sum, r) => sum + r.duration, 0);
    const targetFrames = this.config.targetDuration * this.config.fps;
    const scaleFactor = targetFrames / totalRecommended;
    
    recommendations.forEach((rec, index) => {
      const adjustedDuration = Math.round(rec.duration * scaleFactor);
      
      timeline.add({
        id: `scene-${index}`,
        type: rec.sceneType,
        duration: adjustedDuration,
        props: {
          ...rec.props,
          theme: this.config.theme,
        },
      });
    });
    
    return timeline;
  }
  
  /**
   * Recommend a scene type for a content block
   */
  private recommendScene(block: ContentBlock): SceneRecommendation {
    const pacingMultiplier = {
      fast: 0.7,
      moderate: 1.0,
      slow: 1.3,
    }[this.config.pacing];
    
    switch (block.type) {
      case 'hook':
        return {
          sceneType: 'intro',
          duration: Math.round(4 * this.config.fps * pacingMultiplier),
          props: {
            hook: block.content,
            highlightWords: this.extractKeywords(block.content),
          },
          rationale: 'Opening hook to capture attention',
        };
      
      case 'concept':
        // Check if content describes multiple concepts
        const concepts = this.parseConceptList(block.content);
        if (concepts.length > 1) {
          return {
            sceneType: 'breakdown',
            duration: Math.round((3 + concepts.length * 2) * this.config.fps * pacingMultiplier),
            props: {
              title: block.content.split('\n')[0] || 'Key Concepts',
              concepts,
              layout: concepts.length <= 3 ? 'horizontal' : 'grid',
            },
            rationale: `Multi-concept breakdown (${concepts.length} items)`,
          };
        }
        return {
          sceneType: 'intro',
          duration: Math.round(4 * this.config.fps * pacingMultiplier),
          props: {
            hook: block.content,
            subtitle: block.relatedConcepts?.[0],
          },
          rationale: 'Single concept introduction',
        };
      
      case 'data':
        return {
          sceneType: 'data',
          duration: Math.round(6 * this.config.fps * pacingMultiplier),
          props: {
            title: block.content,
            chartType: this.inferChartType(block.data),
            data: block.data || [],
            buildStyle: 'bar-by-bar',
          },
          rationale: 'Data visualization scene',
        };
      
      case 'comparison':
        const [left, right] = this.parseComparison(block.content);
        return {
          sceneType: 'comparison',
          duration: Math.round(5 * this.config.fps * pacingMultiplier),
          props: {
            title: block.content.split('\n')[0] || 'Comparison',
            left: { label: 'Before', content: left, points: [] },
            right: { label: 'After', content: right, points: [] },
          },
          rationale: 'Side-by-side comparison',
        };
      
      case 'timeline':
        const events = this.parseTimeline(block.content);
        return {
          sceneType: 'timeline',
          duration: Math.round((4 + events.length * 1.5) * this.config.fps * pacingMultiplier),
          props: {
            title: block.content.split('\n')[0] || 'Timeline',
            events,
            orientation: events.length > 4 ? 'vertical' : 'horizontal',
          },
          rationale: 'Chronological timeline',
        };
      
      case 'conclusion':
        return {
          sceneType: 'intro',
          duration: Math.round(4 * this.config.fps * pacingMultiplier),
          props: {
            hook: block.content,
            subtitle: 'Key Takeaway',
            highlightWords: this.extractKeywords(block.content),
          },
          rationale: 'Concluding statement',
        };
      
      default:
        return {
          sceneType: 'intro',
          duration: Math.round(4 * this.config.fps * pacingMultiplier),
          props: { hook: block.content },
          rationale: 'Default fallback',
        };
    }
  }
  
  /**
   * Extract keywords for highlighting
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction: quoted words and capitalized terms
    const quoted = text.match(/"([^"]+)"/g)?.map(q => q.replace(/"/g, '')) || [];
    const capitalized = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) || [];
    return [...new Set([...quoted, ...capitalized])].slice(0, 3);
  }
  
  /**
   * Parse a list of concepts from text
   */
  private parseConceptList(text: string): Array<{ name: string; description: string; icon?: string }> {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length <= 1) return [];
    
    return lines.slice(1).map(line => {
      // Try to parse "Name: Description" or "- Name - Description"
      const match = line.match(/^[-•]?\s*(\w+(?:\s\w+)?)\s*[-:]\s*(.+)$/);
      if (match) {
        return { name: match[1], description: match[2] };
      }
      return { name: line.trim(), description: '' };
    }).filter(c => c.name);
  }
  
  /**
   * Infer chart type from data structure
   */
  private inferChartType(data: unknown): 'bar' | 'horizontal-bar' | 'pie' | 'line' {
    if (!Array.isArray(data)) return 'bar';
    if (data.length > 6) return 'horizontal-bar';
    if (data.length <= 4) return 'pie';
    return 'bar';
  }
  
  /**
   * Parse comparison content
   */
  private parseComparison(text: string): [string, string] {
    const parts = text.split(/\bvs\.?\b|\bversus\b/i);
    if (parts.length >= 2) {
      return [parts[0].trim(), parts[1].trim()];
    }
    return [text, ''];
  }
  
  /**
   * Parse timeline events from text
   */
  private parseTimeline(text: string): Array<{ year: string; title: string; description?: string }> {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.slice(1).map(line => {
      const match = line.match(/^[-•]?\s*(\d{4}|\w+)\s*[-:]\s*(.+?)(?:\s*[-:]\s*(.+))?$/);
      if (match) {
        return {
          year: match[1],
          title: match[2],
          description: match[3],
        };
      }
      return { year: '•', title: line.trim() };
    }).filter(e => e.title);
  }
}
