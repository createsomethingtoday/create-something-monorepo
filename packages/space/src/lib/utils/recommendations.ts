import type { Paper } from '$lib/types/paper';

/**
 * Finds the next paper in the same category from provided papers array.
 * @param papers Array of all papers (from D1 or mock data)
 * @param currentSlug The slug of the current paper
 * @returns The next paper object or null if none exists
 */
export function getNextPaper(papers: Paper[], currentSlug: string): Paper | null {
    const currentPaper = papers.find(p => p.slug === currentSlug);
    if (!currentPaper) return null;

    // Get all papers in the same category
    const categoryPapers = papers.filter(p => p.category === currentPaper.category);

    // Find index of current paper
    const currentIndex = categoryPapers.findIndex(p => p.slug === currentSlug);

    // If not found or last in category, return null
    if (currentIndex === -1 || currentIndex === categoryPapers.length - 1) {
        return null;
    }

    return categoryPapers[currentIndex + 1];
}
