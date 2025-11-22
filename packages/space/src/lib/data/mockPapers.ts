import type { Paper } from '../types/paper'
import mockPapersData from './mockPapers.json'

// Learning Pathways
export const pathways: Record<string, { title: string; description: string }> = {
  'automation-mastery': {
    title: 'Automation Mastery',
    description: 'A complete guide to automating your infrastructure.'
  }
};

// Pathway assignments
const pathwayAssignments: Record<string, { pathway: string; order: number }> = {
  'cloudflare-kv-quick-start': { pathway: 'automation-mastery', order: 1 },
  'automated-deployments': { pathway: 'automation-mastery', order: 2 },
};

// Type-safe export of JSON data with pathway enrichment
export const mockPapers = mockPapersData.map(p => ({
  ...p,
  ...(pathwayAssignments[p.slug] || {})
})) as unknown as Paper[]

// Helper functions
export function getMockPaperBySlug(slug: string): Paper | null {
  return mockPapers.find(p => p.slug === slug) || null
}

export function getMockPapersByCategory(category: string): Paper[] {
  return mockPapers.filter(p => p.category.toLowerCase() === category.toLowerCase())
}

export const mockCategories = [
  { name: 'Automation', slug: 'automation', count: 4 },
  { name: 'Dashboard', slug: 'dashboard', count: 1 },
  { name: 'Webflow', slug: 'webflow', count: 1 }
]

// ASCII Art Generator
export function getCategoryAsciiArt(category: string): string {
  return `
███████████████████████████████████████
█░░░░░░░░░░░░ ${category.toUpperCase()} ░░░░░░░░░░░█
███████████████████████████████████████
  `.trim()
}
