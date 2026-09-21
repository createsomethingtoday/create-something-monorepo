import type { CatalogVideo } from './client';
/** Filter only the already-authorized catalog returned by the server. */
export function filterCatalog(
  videos: CatalogVideo[],
  query: string,
  series: string
): CatalogVideo[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return videos.filter(
    (video) =>
      (!series || video.series === series) &&
      terms.every((term) =>
        `${video.title} ${video.description} ${video.series}`.toLocaleLowerCase().includes(term)
      )
  );
}
