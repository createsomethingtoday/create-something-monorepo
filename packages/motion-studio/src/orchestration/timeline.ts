/**
 * Timeline - Scene sequencing utility
 * 
 * Manage timing, gaps, and transitions between scenes.
 */
import { animation } from '../styles/index.js';

export interface TimelineEntry {
  /** Unique identifier */
  id: string;
  
  /** Scene type */
  type: string;
  
  /** Duration in frames */
  duration: number;
  
  /** Gap before this entry (frames) */
  gapBefore?: number;
  
  /** Overlap with previous entry (frames) */
  overlap?: number;
  
  /** Scene props */
  props: Record<string, unknown>;
}

export interface TimelineConfig {
  /** Default gap between scenes */
  defaultGap?: number;
  
  /** Frames per second */
  fps?: number;
}

/**
 * Timeline class for managing scene sequences
 */
export class Timeline {
  private entries: TimelineEntry[] = [];
  private config: Required<TimelineConfig>;
  
  constructor(config: TimelineConfig = {}) {
    this.config = {
      defaultGap: config.defaultGap ?? 0,
      fps: config.fps ?? 30,
    };
  }
  
  /**
   * Add a scene to the timeline
   */
  add(entry: TimelineEntry): this {
    this.entries.push(entry);
    return this;
  }
  
  /**
   * Add multiple scenes
   */
  addMany(entries: TimelineEntry[]): this {
    this.entries.push(...entries);
    return this;
  }
  
  /**
   * Get computed start frame for each entry
   */
  getComputedTimeline(): Array<TimelineEntry & { startFrame: number; endFrame: number }> {
    let currentFrame = 0;
    
    return this.entries.map((entry, index) => {
      // Apply gap or overlap
      if (index > 0) {
        const gap = entry.gapBefore ?? this.config.defaultGap;
        const overlap = entry.overlap ?? 0;
        currentFrame += gap - overlap;
      }
      
      const startFrame = currentFrame;
      const endFrame = startFrame + entry.duration;
      currentFrame = endFrame;
      
      return {
        ...entry,
        startFrame,
        endFrame,
      };
    });
  }
  
  /**
   * Get total duration in frames
   */
  getTotalDuration(): number {
    const computed = this.getComputedTimeline();
    if (computed.length === 0) return 0;
    return computed[computed.length - 1].endFrame;
  }
  
  /**
   * Get total duration in seconds
   */
  getTotalSeconds(): number {
    return this.getTotalDuration() / this.config.fps;
  }
  
  /**
   * Convert seconds to frames
   */
  secondsToFrames(seconds: number): number {
    return Math.round(seconds * this.config.fps);
  }
  
  /**
   * Convert frames to seconds
   */
  framesToSeconds(frames: number): number {
    return frames / this.config.fps;
  }
  
  /**
   * Get the entry active at a given frame
   */
  getEntryAtFrame(frame: number): TimelineEntry | null {
    const computed = this.getComputedTimeline();
    return computed.find(e => frame >= e.startFrame && frame < e.endFrame) ?? null;
  }
  
  /**
   * Export as Remotion-compatible scene array
   */
  toSceneArray(): Array<{
    id: string;
    type: string;
    props: Record<string, unknown>;
    from: number;
    durationInFrames: number;
  }> {
    return this.getComputedTimeline().map(entry => ({
      id: entry.id,
      type: entry.type,
      props: entry.props,
      from: entry.startFrame,
      durationInFrames: entry.duration,
    }));
  }
}

/**
 * Create a new timeline
 */
export function createTimeline(config?: TimelineConfig): Timeline {
  return new Timeline(config);
}

/**
 * Helper to create timeline entries from a simple spec
 */
export function quickTimeline(
  specs: Array<{
    type: string;
    duration: number | 'short' | 'medium' | 'long';
    props?: Record<string, unknown>;
  }>,
  fps = 30
): Timeline {
  const durationMap = {
    short: 3 * fps,   // 3 seconds
    medium: 5 * fps,  // 5 seconds
    long: 8 * fps,    // 8 seconds
  };
  
  const timeline = new Timeline({ fps });
  
  specs.forEach((spec, index) => {
    const duration = typeof spec.duration === 'string' 
      ? durationMap[spec.duration] 
      : spec.duration;
    
    timeline.add({
      id: `scene-${index}`,
      type: spec.type,
      duration,
      props: spec.props ?? {},
    });
  });
  
  return timeline;
}
