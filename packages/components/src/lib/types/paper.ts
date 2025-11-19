/**
 * Base Paper interface used across all Create Something properties.
 * Represents research papers, experiments, and articles.
 */
export interface Paper {
  id: string
  title: string
  category: string
  content: string
  html_content?: string
  reading_time: number
  difficulty_level?: string
  technical_focus?: string
  published_on?: string
  excerpt_short?: string
  excerpt_long?: string
  slug: string
  featured: number
  published: number
  is_hidden: number
  archived: number
  date?: string
  excerpt?: string
  description?: string
  thumbnail_image?: string
  featured_card_image?: string
  featured_image?: string
  video_walkthrough_url?: string
  interactive_demo_url?: string
  resource_downloads?: string
  prerequisites?: string
  meta_title?: string
  meta_description?: string
  focus_keywords?: string
  ascii_art?: string
  ascii_thumbnail?: string
  created_at: string
  updated_at: string
  published_at?: string
  pathway?: string
  order?: number
}
