import { sanitizeUrlSlug } from './utils';

export interface Env {
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
  AIRTABLE_TABLE_ID: string;
  AIRTABLE_VIEW_ID: string;
  AIRTABLE_FREE_TABLE_ID?: string;
  AIRTABLE_FREE_VIEW_ID?: string;
  AIRTABLE_FEATURED_TABLE_ID?: string;
  AIRTABLE_FEATURED_VIEW_ID?: string;
  AIRTABLE_CATEGORY_GROUPS_TABLE_ID?: string;
  AIRTABLE_CATEGORY_GROUPS_VIEW_ID?: string;
}

export interface CategoryWithUrl {
  name: string;
  url: string;
}

export interface HierarchicalCategoryWithUrl {
  name: string;
  url: string;
  children?: CategoryWithUrl[];
}

export interface TemplateConfig {
  tableId: string;
  viewId: string;
  urlSuffix: string;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

/**
 * Fetch all records from an Airtable table/view using the REST API
 */
async function fetchAirtableRecords(
  env: Env,
  tableId: string,
  viewId: string,
  fields: string[]
): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    params.set('view', viewId);
    fields.forEach(field => params.append('fields[]', field));
    if (offset) params.set('offset', offset);

    const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableId)}?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${error}`);
    }

    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

/**
 * Fetch all records from a table (no view filter)
 */
async function fetchAllTableRecords(
  env: Env,
  tableId: string,
  fields: string[]
): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams();
    fields.forEach(field => params.append('fields[]', field));
    if (offset) params.set('offset', offset);

    const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableId)}?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${error}`);
    }

    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

function getTemplateConfig(env: Env, templateType: 'onepage' | 'free' | 'featured'): TemplateConfig {
  if (templateType === 'free') {
    return {
      tableId: env.AIRTABLE_FREE_TABLE_ID || env.AIRTABLE_TABLE_ID,
      viewId: env.AIRTABLE_FREE_VIEW_ID || env.AIRTABLE_VIEW_ID,
      urlSuffix: '?pricing=free'
    };
  }
  
  if (templateType === 'featured') {
    return {
      tableId: env.AIRTABLE_FEATURED_TABLE_ID || env.AIRTABLE_TABLE_ID,
      viewId: env.AIRTABLE_FEATURED_VIEW_ID || env.AIRTABLE_VIEW_ID,
      urlSuffix: '?featured=true'
    };
  }
  
  return {
    tableId: env.AIRTABLE_TABLE_ID,
    viewId: env.AIRTABLE_VIEW_ID,
    urlSuffix: '?types=One+Page'
  };
}

export async function getUniqueCategories(
  env: Env,
  templateType: 'onepage' | 'free' | 'featured' = 'onepage'
): Promise<CategoryWithUrl[]> {
  const config = getTemplateConfig(env, templateType);
  
  console.log(`Fetching ${templateType} categories from Airtable`);
  
  const records = await fetchAirtableRecords(
    env,
    config.tableId,
    config.viewId,
    ['🪣Category Group(s) Display Name', '🪣Category Group(s) CMS Slug']
  );

  const categoriesMap = new Map<string, string>();

  records.forEach((record) => {
    const categoryDisplayNames = record.fields['🪣Category Group(s) Display Name'] as string[] | undefined;
    const categorySlugs = record.fields['🪣Category Group(s) CMS Slug'] as string[] | undefined;
    
    if (Array.isArray(categoryDisplayNames) && Array.isArray(categorySlugs)) {
      categoryDisplayNames.forEach((categoryName, index) => {
        if (categoryName && typeof categoryName === 'string' && categorySlugs[index]) {
          const trimmedName = categoryName.trim();
          const slug = categorySlugs[index];
          if (!categoriesMap.has(trimmedName)) {
            categoriesMap.set(trimmedName, slug);
          }
        }
      });
    }
  });

  const categories = Array.from(categoriesMap.entries())
    .map(([name, slug]) => {
      const sanitizedSlug = sanitizeUrlSlug(slug || name);
      return {
        name,
        url: `https://webflow.com/templates/category/${sanitizedSlug}-websites${config.urlSuffix}`,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Successfully fetched ${categories.length} unique ${templateType} categories from Airtable`);
  return categories;
}

export async function getHierarchicalCategories(
  env: Env,
  templateType: 'onepage' | 'free' | 'featured' = 'onepage'
): Promise<HierarchicalCategoryWithUrl[]> {
  console.log(`Fetching hierarchical ${templateType} categories from Airtable`);

  // Check if Category Groups table is configured
  if (env.AIRTABLE_CATEGORY_GROUPS_TABLE_ID && env.AIRTABLE_CATEGORY_GROUPS_VIEW_ID) {
    return await getHierarchicalFromCategoryGroups(env, templateType);
  }
  
  // Fallback to simple categories without hierarchy
  console.warn('Category Groups table not configured, falling back to flat categories');
  const flatCategories = await getUniqueCategories(env, templateType);
  return flatCategories.map(cat => ({ ...cat, children: undefined }));
}

async function getHierarchicalFromCategoryGroups(
  env: Env,
  templateType: 'onepage' | 'free' | 'featured' = 'onepage'
): Promise<HierarchicalCategoryWithUrl[]> {
  const config = getTemplateConfig(env, templateType);
  
  // Step 1: Get available parent categories from templates table
  console.log(`Step 1: Getting available parent categories from ${templateType} templates table`);
  
  const availableParents = await fetchAirtableRecords(
    env,
    config.tableId,
    config.viewId,
    ['🪣Category Group(s) Display Name', '🪣Category Group(s) CMS Slug']
  );

  const parentCategoriesMap = new Map<string, string>();

  availableParents.forEach((record) => {
    const categoryDisplayNames = record.fields['🪣Category Group(s) Display Name'] as string[] | undefined;
    const categorySlugs = record.fields['🪣Category Group(s) CMS Slug'] as string[] | undefined;
    
    if (Array.isArray(categoryDisplayNames) && Array.isArray(categorySlugs)) {
      categoryDisplayNames.forEach((categoryName, index) => {
        if (categoryName && typeof categoryName === 'string' && categorySlugs[index]) {
          const trimmedName = categoryName.trim();
          const slug = categorySlugs[index];
          if (!parentCategoriesMap.has(trimmedName)) {
            parentCategoriesMap.set(trimmedName, slug);
          }
        }
      });
    }
  });

  console.log(`Found ${parentCategoriesMap.size} available parent categories`);

  // Step 2: Get hierarchical structure from Category Groups table
  console.log('Step 2: Getting hierarchical structure from Category Groups table');
  
  const categoryGroupRecords = await fetchAirtableRecords(
    env,
    env.AIRTABLE_CATEGORY_GROUPS_TABLE_ID!,
    env.AIRTABLE_CATEGORY_GROUPS_VIEW_ID!,
    ['Name', 'Display Name', '🪣Categories', '🥞CMS Slug']
  );

  // Step 3: Get all category names from Categories table
  console.log('Step 3: Getting category names from Categories table');
  
  // Categories table ID (hardcoded as in original)
  const categoriesTableId = 'tblSygBX7adZ4VNjK';
  const allCategories = await fetchAllTableRecords(env, categoriesTableId, ['Name']);

  const categoryIdToNameMap = new Map<string, string>();
  allCategories.forEach((record) => {
    const id = record.id;
    const name = record.fields['Name'] as string;
    if (id && name) {
      categoryIdToNameMap.set(id, name);
    }
  });

  console.log(`Loaded ${categoryIdToNameMap.size} category names`);

  const result: HierarchicalCategoryWithUrl[] = [];

  // Step 4: Build hierarchy
  parentCategoriesMap.forEach((parentSlug, parentName) => {
    const categoryGroupRecord = categoryGroupRecords.find((record) => {
      const name = record.fields['Name'] as string;
      const displayName = record.fields['Display Name'] as string;
      return name === parentName || displayName === parentName;
    });

    const children: CategoryWithUrl[] = [];
    
    if (categoryGroupRecord) {
      const subcategoryIds = categoryGroupRecord.fields['🪣Categories'] as string[] | undefined;
      
      if (Array.isArray(subcategoryIds)) {
        subcategoryIds.forEach(subcategoryId => {
          if (subcategoryId && typeof subcategoryId === 'string') {
            const subcategoryName = categoryIdToNameMap.get(subcategoryId);
            
            if (subcategoryName) {
              const sanitizedSubSlug = sanitizeUrlSlug(subcategoryName);
              children.push({
                name: subcategoryName.trim(),
                url: `https://webflow.com/templates/category/${sanitizedSubSlug}-websites${config.urlSuffix}`
              });
            }
          }
        });
      }
    }

    const sanitizedParentSlug = sanitizeUrlSlug(parentSlug || parentName);
    result.push({
      name: parentName,
      url: `https://webflow.com/templates/category/${sanitizedParentSlug}-websites${config.urlSuffix}`,
      children: children.length > 0 ? children : undefined
    });
  });

  result.sort((a, b) => a.name.localeCompare(b.name));
  
  console.log(`Successfully built ${result.length} hierarchical ${templateType} categories`);
  return result;
}
