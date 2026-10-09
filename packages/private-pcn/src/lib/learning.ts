import type { CatalogVideo } from './client';
export interface LessonProgress {
  position: number;
  watched_at: string | null;
  practice_started_at: string | null;
  updated_at: string;
}
export interface PathView {
  id: string;
  title: string;
  outcome: string;
  prerequisites: string;
  estimated_minutes: number;
  visibility: string;
  revision: number;
  lesson_ids: string[];
  missingLessonCount: number;
  lessons: (CatalogVideo & { progress?: LessonProgress | null })[];
}
export const pathBase = (slug?: string) =>
  slug ? `/n/${encodeURIComponent(slug)}/paths` : '/paths';
export function timestamp(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function playbackResumePosition(position: number, duration: number) {
  return position > 0 && position < duration - 2 ? position : 0;
}

export function playbackProgressLabel(position: number, duration: number | null) {
  if (position > 0 && duration && position >= duration - 2) return 'Replay';
  const resume = playbackResumePosition(position, duration ?? 0);
  return resume ? `Resume at ${timestamp(resume)}` : 'Play';
}
