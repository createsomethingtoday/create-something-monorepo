import type { PageServerLoad } from './$types';
import { mockPapers, mockCategories } from '$lib/data/mockPapers';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, platform }) => {
  const { slug } = params;
  const env = platform?.env;

  console.log('Loading category:', slug);
  console.log('Available categories:', mockCategories.map(c => c.slug));

  // Find category info
  const category = mockCategories.find(c => c.slug === slug);
  if (!category) {
    console.error('Category not found:', slug);
    // Return empty state instead of throwing
    return {
      papers: [],
      category: { name: slug, slug, count: 0 }
    };
  }

  if (!env?.DB) {
    // Use mock data
    console.log('Using mock data for category:', slug);
    const papers = mockPapers.filter(p => p.category === slug && p.published);
    console.log('Found papers:', papers.length);
    return { papers, category };
  }

  try {
    // Fetch from D1 database
    const result = await env.DB.prepare(`
      SELECT * FROM papers
      WHERE category = ? AND published = 1
      ORDER BY created_at DESC
    `).bind(slug).all();

    return {
      papers: result.results || [],
      category
    };
  } catch (dbError) {
    console.error('Database error:', dbError);
    // Fallback to mock data
    const papers = mockPapers.filter(p => p.category === slug && p.published);
    return { papers, category };
  }
};
