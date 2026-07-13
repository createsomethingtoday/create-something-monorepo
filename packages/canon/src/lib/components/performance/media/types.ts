export interface PerformanceMediaVideo {
  mp4: string;
  webm?: string;
  poster?: string;
}

export interface PerformanceMediaStudy {
  src: string;
  mobileSrc: string;
  alt: string;
  video?: PerformanceMediaVideo;
}
