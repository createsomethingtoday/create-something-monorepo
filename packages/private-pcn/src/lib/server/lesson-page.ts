import { error, type ServerLoad } from '@sveltejs/kit';
import { libraryReturnPath } from '$lib/lessons';
import type { PathView, LessonProgress } from '$lib/learning';
import type { CatalogVideo } from '$lib/client';
import type { LessonMaterial } from './lessons';
export const load: ServerLoad = async ({ fetch, params, locals, url, setHeaders }) => {
  setHeaders({ 'Cache-Control': 'private, no-store' });
  const slug = params.slug;
  const response = await fetch(
    `${slug ? `/api/networks/${encodeURIComponent(slug)}` : '/api'}/lessons/${encodeURIComponent(params.id || '')}`
  );
  const libraryPath = libraryReturnPath(slug, url.searchParams);
  if (response.status === 404) return { unavailable: true, libraryPath, lessonData: null };
  if (!response.ok) error(503, 'This lesson is temporarily unavailable. Please try again.');
  const lessonData = (await response.json()) as {
    video: CatalogVideo;
    progress: LessonProgress | null;
    lesson: LessonMaterial | null;
    release: { id: string; asset_id: string; title: string; version: string } | null;
    releaseOptions: { id: string; asset_id: string; title: string; version: string }[];
  };
  let learningPath: PathView | null = null;
  const pathId = url.searchParams.get('path');
  if (pathId && pathId.length <= 100) {
    const pathResponse = await fetch(
      `${slug ? `/api/networks/${encodeURIComponent(slug)}` : '/api'}/learning/paths/${encodeURIComponent(pathId)}`
    );
    if (pathResponse.ok) {
      const candidate = (await pathResponse.json()) as PathView;
      if (candidate.lessons.some((v) => v.id === params.id)) learningPath = candidate;
    }
  }
  return {
    learningPath,
    canSaveProgress:
      !!locals.identity && locals.identity.role !== 'blocked' && !locals.impersonation,
    unavailable: false,
    libraryPath,
    lessonData,
    canEdit: locals.identity?.role === 'admin'
  };
};
