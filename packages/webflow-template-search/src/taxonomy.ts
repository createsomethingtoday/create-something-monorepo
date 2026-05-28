import { getTaxonomyMetadata, resolveAlias } from './db.js';
import type { Env, TaxonomyMetadataItem } from './types.js';

export interface TaxonomyMetadataPayload {
  category_group: TaxonomyMetadataItem | null;
  child_category: TaxonomyMetadataItem | null;
  title: string | null;
  description: string;
}

export async function getTemplateTaxonomyMetadata(env: Env, url: URL): Promise<TaxonomyMetadataPayload> {
  const categoryGroupSlug = url.searchParams.get('category_group_slug')?.trim() || null;
  const rawChildCategorySlug = url.searchParams.get('child_category_slug')?.trim() || null;
  const childCategorySlug = await resolveAlias(env.DB, 'child_category', rawChildCategorySlug);

  const childCategory = await getTaxonomyMetadata(env.DB, 'child_category', childCategorySlug);
  const resolvedCategoryGroupSlug = categoryGroupSlug ?? childCategory?.parent_category_group_slug ?? null;
  const categoryGroup = await getTaxonomyMetadata(env.DB, 'category_group', resolvedCategoryGroupSlug);
  const active = childCategory ?? categoryGroup;
  const activeDescription = active?.description_landing_page.trim() || active?.description_short.trim() || '';
  const parentDescription =
    categoryGroup?.description_landing_page.trim() || categoryGroup?.description_short.trim() || '';

  return {
    category_group: categoryGroup,
    child_category: childCategory,
    title: active?.name ?? null,
    description: activeDescription || (childCategory ? parentDescription : ''),
  };
}
