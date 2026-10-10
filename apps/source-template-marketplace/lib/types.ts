export interface Item {
  id: string;
  template_slug: string;
  name: string;
  price: number | null;
  is_free: boolean;
  is_featured: boolean;
  creator_name: string;
  creator_slug: string;
  creator_avatar_url: string;
  preview_url: string;
  reviewer_pick_reason: string;
  published_date: string;
  included_pages: string[];
  features: string[];
  child_categories: { name: string; slug: string }[];
  tags: { name: string; slug: string }[];
  creator_profile_url: string;
  thumbnail_image_url: string;
  thumbnail_image_secondary_url: string;
  description_short: string;
  description: string;
  website_url: string;
  url: string;
  template_type: string;
  category_groups: { name: string; slug: string }[];
  styles: { name: string; slug: string }[];
}
export interface Catalog {
  items: Item[];
  pagination: { total_items: number; page: number; total_pages: number; has_next_page: boolean };
  category_pills?: { name: string; slug: string; count: number }[];
  subcategory_pills?: { name: string; slug: string; count: number }[];
  available_facets?: {
    styles: { name: string; slug: string; count: number }[];
    types: { value: string; count: number }[];
  };
  provenance: { fetchedAt: string; source: string; mode: string };
}
