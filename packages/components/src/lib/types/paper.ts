/**
 * Analytics Event Request - shared across all properties
 * Used for tracking page views, experiments, etc.
 */
export interface AnalyticsEventRequest {
  event_type?: string;
  property?: string;
  path?: string;
  experiment_id?: string;
  tag_id?: string;
  referrer?: string;
}

/**
 * Base Paper interface used across all Create Something properties.
 * Represents research papers, experiments, and articles.
 *
 * Note: Some fields are optional to support both list views (minimal fields)
 * and detail views (full content).
 */
export interface Paper {
  id: string
  title: string
  category: string
  content?: string | null  // Optional for list views
  html_content?: string | null
  reading_time: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced' | string | null
  technical_focus?: string | null
  published_on?: string | null
  excerpt_short?: string | null
  excerpt_long?: string | null
  slug: string
  featured: number
  published: number
  is_hidden: number
  archived: number
  date?: string | null
  excerpt?: string | null
  description?: string | null
  thumbnail_image?: string | null
  featured_card_image?: string | null
  featured_image?: string | null
  video_walkthrough_url?: string | null
  interactive_demo_url?: string | null
  resource_downloads?: string | null
  prerequisites?: string | null
  meta_title?: string | null
  meta_description?: string | null
  focus_keywords?: string | null
  ascii_art?: string | null
  ascii_thumbnail?: string | null
  created_at: string
  updated_at: string
  published_at?: string | null
  pathway?: string
  order?: number
  summary?: string | null
  code_snippet?: string | null
  // Optional tags for papers with tag relationships
  tags?: Array<{ id: string; name: string; slug: string }> | null
}
