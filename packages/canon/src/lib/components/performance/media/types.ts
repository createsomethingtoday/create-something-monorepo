export interface PerformanceMediaVideo {
  mp4: string;
  webm?: string;
  poster?: string;
}

export type PerformancePaperCondition =
  | 'source'
  | 'trace'
  | 'score'
  | 'pressure'
  | 'sequence'
  | 'stack'
  | 'stamp';

export type PerformanceLegacyWaterCondition =
  | 'flow'
  | 'pressure'
  | 'trace'
  | 'provenance'
  | 'exception'
  | 'inspection'
  | 'resolved';

export type PerformanceMaterialCondition =
  | PerformancePaperCondition
  | PerformanceLegacyWaterCondition;

/** @deprecated Use PerformanceLegacyWaterCondition or PerformanceMaterialCondition. */
export type PerformanceWaterCondition = PerformanceLegacyWaterCondition;

export interface PerformanceMediaStudy {
  src: string;
  mobileSrc: string;
  alt: string;
  condition: PerformanceMaterialCondition;
  material?: 'paper' | 'water';
  width?: number;
  height?: number;
  objectPosition?: string;
  colorMode?: 'monochrome' | 'natural';
  video?: PerformanceMediaVideo;
}
