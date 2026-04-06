export interface AssetImageState {
  thumbnailUrl?: string | null;
  secondaryThumbnailUrl?: string | null;
  secondaryThumbnails?: string[] | null;
  carouselImages?: string[] | null;
}

export interface AssetImageUpdateData {
  thumbnailUrl?: string | null;
  secondaryThumbnailUrl?: string | null;
  secondaryThumbnails?: string[];
  carouselImages?: string[];
}

function arraysEqual(left: readonly string[] = [], right: readonly string[] = []): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function normalizeUrlList(urls?: readonly string[] | null): string[] {
  return (urls ?? []).filter((url): url is string => Boolean(url));
}

function normalizeSecondaryThumbnails(state: AssetImageState): string[] {
  const explicitSecondaryThumbnails = normalizeUrlList(state.secondaryThumbnails);
  if (explicitSecondaryThumbnails.length > 0) {
    return explicitSecondaryThumbnails;
  }

  return state.secondaryThumbnailUrl ? [state.secondaryThumbnailUrl] : [];
}

export function pickChangedAssetImageUpdateData(
  current: AssetImageState,
  update: AssetImageUpdateData
): AssetImageUpdateData {
  const changed: AssetImageUpdateData = {};

  if (update.thumbnailUrl !== undefined) {
    const currentThumbnailUrl = current.thumbnailUrl ?? null;
    const nextThumbnailUrl = update.thumbnailUrl ?? null;
    if (currentThumbnailUrl !== nextThumbnailUrl) {
      changed.thumbnailUrl = nextThumbnailUrl;
    }
  }

  if (update.secondaryThumbnails !== undefined) {
    const currentSecondaryThumbnails = normalizeSecondaryThumbnails(current);
    const nextSecondaryThumbnails = normalizeUrlList(update.secondaryThumbnails);
    if (!arraysEqual(currentSecondaryThumbnails, nextSecondaryThumbnails)) {
      changed.secondaryThumbnails = nextSecondaryThumbnails;
    }
  } else if (update.secondaryThumbnailUrl !== undefined) {
    const currentSecondaryThumbnails = normalizeSecondaryThumbnails(current);
    const nextSecondaryThumbnails = update.secondaryThumbnailUrl
      ? [update.secondaryThumbnailUrl]
      : [];
    if (!arraysEqual(currentSecondaryThumbnails, nextSecondaryThumbnails)) {
      changed.secondaryThumbnailUrl = update.secondaryThumbnailUrl ?? null;
    }
  }

  if (update.carouselImages !== undefined) {
    const currentCarouselImages = normalizeUrlList(current.carouselImages);
    const nextCarouselImages = normalizeUrlList(update.carouselImages);
    if (!arraysEqual(currentCarouselImages, nextCarouselImages)) {
      changed.carouselImages = nextCarouselImages;
    }
  }

  return changed;
}
