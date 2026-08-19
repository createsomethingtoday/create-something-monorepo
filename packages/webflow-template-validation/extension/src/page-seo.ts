// Per-page SEO metadata collection for the Designer extension.

export interface PageSeoData {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  openGraphTitle: string | null;
  openGraphDescription: string | null;
  openGraphImage: string | null;
  usesTitleAsOpenGraphTitle: boolean;
  usesDescriptionAsOpenGraphDescription: boolean;
  hasCustomOpenGraphTitle: boolean;
  hasCustomOpenGraphDescription: boolean;
}

// Structural subset of the Designer API Page object this module reads.
// Getters are optional so older Designer runtimes degrade to "not collected"
// rather than throwing.
export interface PageSeoSource {
  getTitle?: () => Promise<string | null>;
  getDescription?: () => Promise<string | null>;
  getOpenGraphTitle?: () => Promise<string | null>;
  getOpenGraphDescription?: () => Promise<string | null>;
  getOpenGraphImage?: () => Promise<string | null>;
  usesTitleAsOpenGraphTitle?: () => Promise<boolean>;
  usesDescriptionAsOpenGraphDescription?: () => Promise<boolean>;
}

/**
 * getTitle/getDescription are the SEO Title Tag and Meta Description from page
 * settings — the fields the template guidelines require. The Designer API's
 * getSearchTitle/getSearchDescription are the site-search overrides, which
 * stay empty while the default "use SEO title/description" toggles are on, so
 * they must never be used to judge SEO metadata.
 *
 * Returns null when neither SEO getter is available (older Designer runtimes)
 * so the worker reports the data as uncollected instead of missing.
 */
export async function collectPageSeoData(page: PageSeoSource): Promise<PageSeoData | null> {
  if (!page.getTitle && !page.getDescription) {
    return null;
  }

  const title = page.getTitle ? await page.getTitle() : null;
  const description = page.getDescription ? await page.getDescription() : null;
  const openGraphTitle = page.getOpenGraphTitle ? await page.getOpenGraphTitle() : null;
  const openGraphDescription = page.getOpenGraphDescription ? await page.getOpenGraphDescription() : null;
  const openGraphImage = page.getOpenGraphImage ? await page.getOpenGraphImage() : null;
  const usesTitleAsOG = page.usesTitleAsOpenGraphTitle ? await page.usesTitleAsOpenGraphTitle() : false;
  const usesDescAsOG = page.usesDescriptionAsOpenGraphDescription
    ? await page.usesDescriptionAsOpenGraphDescription()
    : false;

  return {
    title,
    titleLength: title ? title.length : 0,
    description,
    descriptionLength: description ? description.length : 0,
    openGraphTitle,
    openGraphDescription,
    openGraphImage,
    usesTitleAsOpenGraphTitle: usesTitleAsOG,
    usesDescriptionAsOpenGraphDescription: usesDescAsOG,
    hasCustomOpenGraphTitle: !usesTitleAsOG && !!openGraphTitle,
    hasCustomOpenGraphDescription: !usesDescAsOG && !!openGraphDescription
  };
}
