export interface PerformanceMediaVideo {
  mp4: string;
  webm?: string;
  poster?: string;
}

export type PerformanceWaterCondition =
  | 'flow'
  | 'pressure'
  | 'trace'
  | 'provenance'
  | 'exception'
  | 'inspection'
  | 'resolved';

export interface PerformanceMediaStudy {
  src: string;
  mobileSrc: string;
  alt: string;
  condition: PerformanceWaterCondition;
  video?: PerformanceMediaVideo;
}
