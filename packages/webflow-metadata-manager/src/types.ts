export interface Env {
  ALLOWED_ORIGINS?: string;
  DEFAULT_OVERRIDES_JSON?: string;
}

export interface StoredOverride {
  path: string;
  label?: string;
  seoTitle?: string;
  seoDescription?: string;
  openGraphTitle?: string;
  openGraphDescription?: string;
  notes?: string;
  updatedAt: string;
}
