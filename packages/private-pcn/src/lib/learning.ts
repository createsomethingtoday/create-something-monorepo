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
