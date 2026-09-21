import { error, type ServerLoad } from '@sveltejs/kit';
import type { PathView } from '$lib/learning';
import type { CatalogVideo } from '$lib/client';
export const load = (async ({ fetch, params, locals, setHeaders }) => {
  setHeaders({ 'Cache-Control': 'private, no-store' });
  const prefix = params.slug ? `/api/networks/${encodeURIComponent(params.slug)}` : '/api';
  const canEdit =
    locals.identity?.role === 'admin' &&
    !locals.impersonation &&
    locals.network?.kind !== 'support';
  const response = await fetch(
    `${prefix}/learning/paths${params.id ? `/${encodeURIComponent(params.id)}` : ''}`
  );
  if (response.status === 404) return { path: null, paths: [], videos: [], canEdit: false };
  if (!response.ok) error(503, 'Learning paths are temporarily unavailable. Please try again.');
  const payload = await response.json();
  let videos: CatalogVideo[] = [];
  if (canEdit) {
    const r = await fetch(`${prefix}/videos`);
    if (!r.ok) error(503, 'Lesson choices are temporarily unavailable.');
    videos = (await r.json()).videos;
  }
  return {
    path: params.id ? (payload as PathView) : null,
    paths: params.id ? [] : (payload.paths as PathView[]),
    videos,
    canEdit
  };
}) satisfies ServerLoad;
