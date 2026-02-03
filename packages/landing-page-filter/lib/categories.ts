import { CategoryResponseSchema, type Category } from './schemas';
import { getUniqueCategories, getHierarchicalCategories, type Env } from './airtable';
import { z } from 'zod';

// Demo categories for fallback
const DEMO_CATEGORIES: Category[] = [
  { 
    id: 'category-1', 
    name: 'Business', 
    url: 'https://webflow.com/templates/category/business-websites?types=One+Page',
    children: [
      { id: 'business-1', name: 'SaaS', url: 'https://webflow.com/templates/category/saas-websites?types=One+Page' },
      { id: 'business-2', name: 'Consulting', url: 'https://webflow.com/templates/category/consulting-websites?types=One+Page' }
    ]
  },
  { id: 'category-2', name: 'E-commerce', url: 'https://webflow.com/templates/category/e-commerce-websites?types=One+Page' },
  { id: 'category-3', name: 'Portfolio', url: 'https://webflow.com/templates/category/portfolio-websites?types=One+Page' },
  { id: 'category-4', name: 'Landing Page', url: 'https://webflow.com/templates/category/landing-page-websites?types=One+Page' },
  { id: 'category-5', name: 'Blog', url: 'https://webflow.com/templates/category/blog-websites?types=One+Page' },
  { id: 'category-6', name: 'Agency', url: 'https://webflow.com/templates/category/agency-websites?types=One+Page' },
  { id: 'category-7', name: 'Restaurant', url: 'https://webflow.com/templates/category/restaurant-websites?types=One+Page' },
  { id: 'category-8', name: 'Creative', url: 'https://webflow.com/templates/category/creative-websites?types=One+Page' }
];

const DEMO_FREE_CATEGORIES: Category[] = [
  { 
    id: 'category-1', 
    name: 'Business', 
    url: 'https://webflow.com/templates/category/business-websites?pricing=free',
    children: [
      { id: 'business-1', name: 'SaaS', url: 'https://webflow.com/templates/category/saas-websites?pricing=free' },
      { id: 'business-2', name: 'Consulting', url: 'https://webflow.com/templates/category/consulting-websites?pricing=free' }
    ]
  },
  { id: 'category-2', name: 'E-commerce', url: 'https://webflow.com/templates/category/e-commerce-websites?pricing=free' },
  { id: 'category-3', name: 'Portfolio', url: 'https://webflow.com/templates/category/portfolio-websites?pricing=free' },
  { id: 'category-4', name: 'Landing Page', url: 'https://webflow.com/templates/category/landing-page-websites?pricing=free' },
  { id: 'category-5', name: 'Blog', url: 'https://webflow.com/templates/category/blog-websites?pricing=free' },
  { id: 'category-6', name: 'Agency', url: 'https://webflow.com/templates/category/agency-websites?pricing=free' },
  { id: 'category-7', name: 'Restaurant', url: 'https://webflow.com/templates/category/restaurant-websites?pricing=free' },
  { id: 'category-8', name: 'Creative', url: 'https://webflow.com/templates/category/creative-websites?pricing=free' }
];

const DEMO_FEATURED_CATEGORIES: Category[] = [
  { 
    id: 'category-1', 
    name: 'Business', 
    url: 'https://webflow.com/templates/category/business-websites?featured=true',
    children: [
      { id: 'business-1', name: 'SaaS', url: 'https://webflow.com/templates/category/saas-websites?featured=true' },
      { id: 'business-2', name: 'Consulting', url: 'https://webflow.com/templates/category/consulting-websites?featured=true' }
    ]
  },
  { id: 'category-2', name: 'E-commerce', url: 'https://webflow.com/templates/category/e-commerce-websites?featured=true' },
  { id: 'category-3', name: 'Portfolio', url: 'https://webflow.com/templates/category/portfolio-websites?featured=true' },
  { id: 'category-4', name: 'Landing Page', url: 'https://webflow.com/templates/category/landing-page-websites?featured=true' },
  { id: 'category-5', name: 'Blog', url: 'https://webflow.com/templates/category/blog-websites?featured=true' },
  { id: 'category-6', name: 'Agency', url: 'https://webflow.com/templates/category/agency-websites?featured=true' },
  { id: 'category-7', name: 'Restaurant', url: 'https://webflow.com/templates/category/restaurant-websites?featured=true' },
  { id: 'category-8', name: 'Creative', url: 'https://webflow.com/templates/category/creative-websites?featured=true' }
];

function getDemoCategories(templateType: 'onepage' | 'free' | 'featured'): Category[] {
  switch (templateType) {
    case 'free': return DEMO_FREE_CATEGORIES;
    case 'featured': return DEMO_FEATURED_CATEGORIES;
    default: return DEMO_CATEGORIES;
  }
}

/**
 * Core data fetching function
 */
async function fetchCategoriesData(
  env: Env,
  hierarchical = false,
  templateType: 'onepage' | 'free' | 'featured' = 'onepage'
): Promise<Category[]> {
  // Check if Airtable is configured
  const hasAirtableConfig = !!(
    env.AIRTABLE_API_KEY && 
    env.AIRTABLE_BASE_ID && 
    env.AIRTABLE_TABLE_ID
  );

  if (!hasAirtableConfig) {
    console.log(`Using demo ${templateType} categories - Airtable not configured`);
    return getDemoCategories(templateType);
  }

  try {
    if (hierarchical) {
      const hierarchicalData = await getHierarchicalCategories(env, templateType);
      
      const categories: Category[] = hierarchicalData.map((category, index) => ({
        id: `category-${index + 1}`,
        name: category.name,
        url: category.url,
        children: category.children?.map((child, childIndex) => ({
          id: `${category.name.toLowerCase()}-${childIndex + 1}`,
          name: child.name,
          url: child.url,
        }))
      }));

      console.log(`Fetched ${categories.length} hierarchical ${templateType} categories from Airtable`);
      return categories;
    } else {
      const categoryData = await getUniqueCategories(env, templateType);
      
      const categories: Category[] = categoryData.map((category, index) => ({
        id: `category-${index + 1}`,
        name: category.name,
        url: category.url,
      }));

      console.log(`Fetched ${categories.length} ${templateType} categories from Airtable`);
      return categories;
    }
  } catch (error) {
    console.error(`Airtable fetch failed, falling back to demo ${templateType} categories:`, error);
    return getDemoCategories(templateType);
  }
}

/**
 * Main categories fetcher with validation
 */
export async function getCategories(
  env: Env,
  hierarchical = false,
  templateType: 'onepage' | 'free' | 'featured' = 'onepage'
): Promise<z.infer<typeof CategoryResponseSchema>> {
  const categories = await fetchCategoriesData(env, hierarchical, templateType);
  
  const response = { categories, hierarchical };
  const validatedResponse = CategoryResponseSchema.parse(response);
  
  return validatedResponse;
}
