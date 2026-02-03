import { z } from 'zod';

// URL validation regex for Webflow template URLs with sanitized slugs
// Supports One Page templates (?types=One+Page), Free templates (?pricing=free), and Featured templates (?featured=true)
const webflowUrlRegex = /^https:\/\/webflow\.com\/templates\/category\/[a-z0-9-]+(-websites)?\?(?:types=One\+Page|pricing=free|featured=true)$/;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).trim(),
  url: z.string().url().regex(webflowUrlRegex, 'URL must be a valid Webflow template URL with sanitized slug'),
  children: z.array(z.object({
    id: z.string(),
    name: z.string().min(1).trim(),
    url: z.string().url().regex(webflowUrlRegex, 'URL must be a valid Webflow template URL with sanitized slug'),
  })).optional(),
});

export const CategoryResponseSchema = z.object({
  categories: z.array(CategorySchema),
  hierarchical: z.boolean().default(false),
});

export type Category = z.infer<typeof CategorySchema>;
export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
