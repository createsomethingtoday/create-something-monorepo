import type { Paper } from '../types/paper'
import mockPapersData from './mockPapers.json'

// Type-safe export of JSON data
// export const mockPapers = mockPapersData as Paper[] -> Replaced by enriched version below

// Helper functions
export function getMockPaperBySlug(slug: string): Paper | null {
  return mockPapers.find(p => p.slug === slug) || null
}

export function getMockPapersByCategory(category: string): Paper[] {
  return mockPapers.filter(p => p.category === category)
}

export const mockCategories = [
  { name: 'Development', slug: 'development', count: 1 },
  { name: 'Infrastructure', slug: 'infrastructure', count: 0 },
  { name: 'Automation', slug: 'automation', count: 5 },
  { name: 'Analytics', slug: 'analytics', count: 2 },
  { name: 'Webflow', slug: 'webflow', count: 1 },
  { name: 'Authentication', slug: 'authentication', count: 1 },
  { name: 'Dashboard', slug: 'dashboard', count: 1 }
]

// ASCII Art Generator
export function getCategoryAsciiArt(category: string): string {
  return `
███████████████████████████████████████
█░░░░░░░░░░░░ ${category.toUpperCase()} ░░░░░░░░░░░█
███████████████████████████████████████
  `.trim()
}

export const pathways: Record<string, { title: string; description: string }> = {
  'automation-mastery': {
    title: 'Automation Mastery',
    description: 'A complete guide to automating your infrastructure.'
  }
};

// Enrich mock papers with pathway data for demonstration
const pathwayAssignments: Record<string, { pathway: string; order: number }> = {
  'cloudflare-kv-quick-start': { pathway: 'automation-mastery', order: 1 },
  'automated-deployments': { pathway: 'automation-mastery', order: 2 },
  // Add more if needed
};

export const mockPapers = mockPapersData.map(p => ({
  ...p,
  ...(pathwayAssignments[p.slug] || {})
})) as unknown as Paper[];
