/**
 * App Categorizer using Cloudflare Workers AI (Llama 3.1)
 * 
 * Demonstrates how Workers AI handles classification tasks at scale.
 * Canon: The infrastructure recedes; decisions emerge.
 */

import type { Env, WebflowApp, AppCategory, CategorizedApp } from './types';

// Category definitions with examples for few-shot prompting
const CATEGORY_DEFINITIONS: Record<AppCategory, { description: string; examples: string[] }> = {
  'integration': {
    description: 'Apps that connect Webflow to external services (Figma, Google, CMS platforms)',
    examples: ['Figma to Webflow', 'Google Ads', 'Crowdin', 'Frontify']
  },
  'analytics': {
    description: 'Tracking, analytics, heatmaps, and user behavior tools',
    examples: ['Hotjar', 'Plausible', 'Google Analytics', 'Amplitude']
  },
  'forms-data': {
    description: 'Form builders, data collection, tables, and database tools',
    examples: ['Typeform', 'Finsweet Table', 'Airtable', 'Notion']
  },
  'ai-automation': {
    description: 'AI-powered tools, automation, and workflow builders',
    examples: ['AirOps', 'Gumloop', 'Zapier', 'Make']
  },
  'developer-tools': {
    description: 'Tools for developers: APIs, debugging, testing, code tools',
    examples: ['Designer API Playground', 'MCP App', 'DevTools']
  },
  'ecommerce': {
    description: 'E-commerce, payments, shopping carts, and product tools',
    examples: ['Stripe', 'Shopify', 'Foxy', 'Snipcart']
  },
  'marketing': {
    description: 'Email marketing, popups, social proof, and conversion tools',
    examples: ['Mailchimp', 'ConvertKit', 'Proof', 'FOMO']
  },
  'localization': {
    description: 'Translation, internationalization, and multi-language tools',
    examples: ['Weglot', 'Crowdin', 'LILT', 'Lokalise']
  },
  'accessibility': {
    description: 'Accessibility tools and compliance helpers',
    examples: ['accessiBe', 'UserWay', 'EqualWeb']
  },
  'other': {
    description: 'Apps that do not fit other categories',
    examples: []
  }
};

/**
 * Build the system prompt for categorization
 */
function buildSystemPrompt(): string {
  const categoryList = Object.entries(CATEGORY_DEFINITIONS)
    .map(([cat, def]) => `- ${cat}: ${def.description}${def.examples.length ? ` (e.g., ${def.examples.join(', ')})` : ''}`)
    .join('\n');

  return `You are a categorization agent for Webflow Marketplace apps.

Your task is to classify apps into exactly ONE of these categories:

${categoryList}

Respond with ONLY a JSON object in this exact format:
{
  "category": "<category_name>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}

Rules:
- Use snake_case for category names exactly as shown above
- Confidence should reflect how certain you are (0.7+ for clear matches)
- Keep reasoning under 50 words
- If uncertain, use "other" with lower confidence`;
}

/**
 * Categorize a single app using Workers AI
 */
export async function categorizeApp(
  env: Env,
  app: WebflowApp
): Promise<CategorizedApp> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = `Categorize this Webflow app:
Name: ${app.name}
Slug: ${app.slug}`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 150,
      temperature: 0.1 // Low temperature for consistent categorization
    });

    const text = response.response || '';
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`Failed to parse JSON for ${app.slug}:`, text);
      return {
        ...app,
        category: 'other',
        confidence: 0.3,
        reasoning: 'Failed to parse AI response'
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate category
    const validCategories = Object.keys(CATEGORY_DEFINITIONS) as AppCategory[];
    const category = validCategories.includes(parsed.category) 
      ? parsed.category as AppCategory 
      : 'other';

    return {
      ...app,
      category,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || 'No reasoning provided'
    };
  } catch (error) {
    console.error(`Error categorizing ${app.slug}:`, error);
    return {
      ...app,
      category: 'other',
      confidence: 0.1,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Categorize apps in batches to avoid rate limits
 */
export async function categorizeApps(
  env: Env,
  apps: WebflowApp[],
  batchSize: number = 5,
  onProgress?: (completed: number, total: number) => void
): Promise<CategorizedApp[]> {
  const results: CategorizedApp[] = [];
  
  for (let i = 0; i < apps.length; i += batchSize) {
    const batch = apps.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(app => categorizeApp(env, app))
    );
    
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress(results.length, apps.length);
    }
    
    // Small delay between batches to be respectful of rate limits
    if (i + batchSize < apps.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Group categorized apps by category
 */
export function groupByCategory(
  apps: CategorizedApp[]
): Record<AppCategory, CategorizedApp[]> {
  const groups: Record<AppCategory, CategorizedApp[]> = {
    'integration': [],
    'analytics': [],
    'forms-data': [],
    'ai-automation': [],
    'developer-tools': [],
    'ecommerce': [],
    'marketing': [],
    'localization': [],
    'accessibility': [],
    'other': []
  };
  
  for (const app of apps) {
    groups[app.category].push(app);
  }
  
  return groups;
}
