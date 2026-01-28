/**
 * Common types shared across Create Something properties.
 */

/**
 * Quote interface for displaying quotes with optional context and source.
 * Used in .ltd for master quotes, but applicable anywhere quotes are displayed.
 */
export interface Quote {
  id: string;
  master_id?: string;
  quote_text: string;
  context?: string;
  source_url?: string;
  created_at?: number;
}
