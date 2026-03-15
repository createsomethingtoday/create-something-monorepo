/**
 * Text Utilities
 *
 * Chunking for Notion API limits and date parsing ported from the
 * Python modal_sync.py implementation.
 */

// ---------------------------------------------------------------------------
// Notion text limits
// ---------------------------------------------------------------------------

/** Maximum characters per rich text object (Notion limit: 2000, with buffer) */
const CHUNK_SIZE = 1900;

/** Maximum blocks per array in a single request (Notion limit: 100) */
export const MAX_BLOCKS_PER_REQUEST = 100;

/**
 * Chunk text at sentence boundaries, respecting Notion's 2000-char rich_text limit.
 */
export function chunkText(text: string, maxLength = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find sentence boundary
    const sentenceEnd = remaining.lastIndexOf('. ', maxLength);
    const splitAt =
      sentenceEnd > maxLength * 0.5 ? sentenceEnd + 2 : maxLength;

    chunks.push(remaining.substring(0, splitAt).trim());
    remaining = remaining.substring(splitAt).trim();
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Date parsing (ported from Python)
// ---------------------------------------------------------------------------

/**
 * Parse relative date strings like "5 hours ago" or "Jan 27, 2026" to ISO date.
 * Returns YYYY-MM-DD format or null.
 */
export function parseRelativeDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split('T')[0];
  }

  // Relative format: "5 hours ago", "3 days ago"
  const relativeMatch = dateStr.match(
    /(\d+)\s+(minute|hour|day|week|month)s?\s+ago/i,
  );
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const now = new Date();

    let ms = 0;
    switch (unit) {
      case 'minute':
        ms = amount * 60_000;
        break;
      case 'hour':
        ms = amount * 3_600_000;
        break;
      case 'day':
        ms = amount * 86_400_000;
        break;
      case 'week':
        ms = amount * 7 * 86_400_000;
        break;
      case 'month':
        ms = amount * 30 * 86_400_000;
        break;
    }

    const date = new Date(now.getTime() - ms);
    return date.toISOString().split('T')[0];
  }

  // Format like "Jan 27, 2026"
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const namedMatch = dateStr.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (namedMatch) {
    const month = months[namedMatch[1].toLowerCase()];
    if (month !== undefined) {
      const day = parseInt(namedMatch[2], 10);
      const year = parseInt(namedMatch[3], 10);
      const date = new Date(year, month, day);
      return date.toISOString().split('T')[0];
    }
  }

  return null;
}
