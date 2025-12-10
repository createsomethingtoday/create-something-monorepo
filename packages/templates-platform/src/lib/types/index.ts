/**
 * Templates Platform Types
 *
 * Core types for the multi-tenant template hosting system.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Template {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: TemplateCategory;
  subcategories: string[];
  thumbnail: string;
  previewUrl: string;
  pricing: TemplatePricing;
  features: string[];
  designPhilosophy: {
    principle: string;
    colorScheme: 'dark' | 'light' | 'neutral';
    aesthetic: string;
  };
  configSchema: TemplateConfigSchema;
  createdAt: string;
  updatedAt: string;
}

export type TemplateCategory =
  | 'professional-services'
  | 'architecture'
  | 'creative-agency'
  | 'portfolio'
  | 'ecommerce'
  | 'saas';

export interface TemplatePricing {
  free: boolean;
  proPrice?: number;
  enterprisePrice?: number;
  currency: string;
}

export interface TemplateConfigSchema {
  /** Fields required to deploy */
  required: ConfigField[];
  /** Optional customization fields */
  optional: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'url' | 'image' | 'color' | 'array' | 'object';
  placeholder?: string;
  description?: string;
  default?: unknown;
  /** For array/object types */
  schema?: ConfigField[];
}

// ═══════════════════════════════════════════════════════════════════════════
// TENANT/SITE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Tenant {
  id: string;
  userId: string;
  templateId: string;
  subdomain: string;
  customDomain?: string;
  status: TenantStatus;
  config: Record<string, unknown>;
  tier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
}

export type TenantStatus =
  | 'configuring'    // User is filling out config
  | 'queued'         // Waiting to be built
  | 'building'       // Build in progress
  | 'deploying'      // Deploying to edge
  | 'active'         // Live and serving traffic
  | 'suspended'      // Temporarily disabled
  | 'error';         // Build/deploy failed

export interface TenantDeployment {
  id: string;
  tenantId: string;
  version: number;
  status: 'pending' | 'building' | 'deployed' | 'failed';
  buildLog?: string;
  deployedAt?: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// USER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  plan: 'free' | 'pro' | 'agency';
  siteLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateSiteRequest {
  templateId: string;
  subdomain: string;
  config: Record<string, unknown>;
}

export interface CreateSiteResponse {
  success: boolean;
  site?: Tenant;
  error?: string;
}

export interface DeploySiteRequest {
  tenantId: string;
}

export interface DeploySiteResponse {
  success: boolean;
  deploymentId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface PlatformConfig {
  /** Base domain for tenant subdomains */
  baseDomain: string;
  /** Cloudflare account ID */
  accountId: string;
  /** Workers for Platforms namespace */
  dispatchNamespace: string;
  /** Max free sites per user */
  freeSiteLimit: number;
  /** Max pro sites per user */
  proSiteLimit: number;
}

export const defaultPlatformConfig: PlatformConfig = {
  baseDomain: 'createsomething.space',
  accountId: '',
  dispatchNamespace: 'templates',
  freeSiteLimit: 1,
  proSiteLimit: 10
};
