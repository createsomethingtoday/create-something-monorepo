/**
 * Shared types for CREATE SOMETHING template verticals
 */

// Site configuration types
export interface BaseSiteConfig {
  name: string;
  url: string;
  description: string;
  locale?: string;
  email?: string;
  phone?: string;
  social?: SocialLinks;
}

export interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  behance?: string;
  dribbble?: string;
}

export interface Address {
  street?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
}

// Template manifest types (for template.json)
export interface TemplateManifest {
  $schema?: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: TemplateCategory;
  subcategories: string[];
  author: {
    name: string;
    url: string;
  };
  license: string;
  repository: string;
  demo: string;
  tiers: {
    free: TemplateTier;
    pro?: TemplateTier;
    enterprise?: TemplateTier;
  };
  stack: {
    framework: string;
    css: string;
    hosting: string;
  };
  designPhilosophy: {
    principle: string;
    colorScheme: 'dark' | 'light' | 'light-neutral' | 'dark-neutral';
    typography: string;
    aesthetic: string;
  };
  keywords: string[];
  created: string;
  updated: string;
}

export interface TemplateTier {
  price: number;
  currency?: string;
  features: string[];
}

export type TemplateCategory =
  | 'professional-services'
  | 'architecture'
  | 'creative'
  | 'agency'
  | 'portfolio'
  | 'ecommerce'
  | 'saas';

// SEO types
export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  noindex?: boolean;
}

// Structured data types
export interface LocalBusinessSchema {
  '@context': 'https://schema.org';
  '@type': string;
  name: string;
  description?: string;
  url: string;
  telephone?: string;
  email?: string;
  address?: {
    '@type': 'PostalAddress';
    streetAddress?: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry: string;
  };
  geo?: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
  openingHours?: string[];
  priceRange?: string;
  image?: string | string[];
  sameAs?: string[];
}

// Contact form types
export interface ContactFormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
  budget?: string;
  service?: string;
  source?: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
  id?: string;
}

// Project/Work types (shared across portfolio-style templates)
export interface BaseProject {
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  images?: string[];
  year?: string;
  featured?: boolean;
}

// Workflow types (for WORKWAY integration)
export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  trigger: 'form_submit' | 'schedule' | 'webhook' | 'manual';
  enabled: boolean;
}

export interface WorkflowTrigger {
  type: 'form_submit' | 'schedule' | 'webhook' | 'manual';
  config?: Record<string, unknown>;
}
