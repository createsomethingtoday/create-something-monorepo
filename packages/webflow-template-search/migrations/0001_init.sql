PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS template_documents (
  id TEXT PRIMARY KEY,
  template_slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  listing_url TEXT,
  preview_url TEXT,
  website_url TEXT,
  creator_name TEXT,
  thumbnail_image_url TEXT,
  thumbnail_image_secondary_url TEXT,
  carousel_image_urls_json TEXT NOT NULL DEFAULT '[]',
  description_short TEXT NOT NULL DEFAULT '',
  description_long_html TEXT NOT NULL DEFAULT '',
  description_long_text TEXT NOT NULL DEFAULT '',
  category_groups_json TEXT NOT NULL DEFAULT '[]',
  category_group_slugs_json TEXT NOT NULL DEFAULT '[]',
  child_categories_json TEXT NOT NULL DEFAULT '[]',
  child_category_slugs_json TEXT NOT NULL DEFAULT '[]',
  styles_json TEXT NOT NULL DEFAULT '[]',
  style_slugs_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  tag_slugs_json TEXT NOT NULL DEFAULT '[]',
  template_type TEXT,
  is_free INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_landing_page INTEGER NOT NULL DEFAULT 0,
  popularity_score REAL,
  unique_viewers INTEGER,
  cumulative_purchases INTEGER,
  price REAL,
  published_date TEXT,
  marketplace_status TEXT,
  source_last_modified_time TEXT,
  synced_at TEXT NOT NULL,
  category_groups_text TEXT NOT NULL DEFAULT '',
  child_categories_text TEXT NOT NULL DEFAULT '',
  styles_text TEXT NOT NULL DEFAULT '',
  tags_text TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_template_documents_popularity ON template_documents (popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_template_documents_published_date ON template_documents (published_date DESC);
CREATE INDEX IF NOT EXISTS idx_template_documents_price ON template_documents (price);
CREATE INDEX IF NOT EXISTS idx_template_documents_type ON template_documents (template_type);
CREATE INDEX IF NOT EXISTS idx_template_documents_flags ON template_documents (is_free, is_featured, is_landing_page);
CREATE INDEX IF NOT EXISTS idx_template_documents_lmt ON template_documents (source_last_modified_time DESC);

CREATE TABLE IF NOT EXISTS template_styles (
  template_document_id TEXT NOT NULL,
  style_name TEXT NOT NULL,
  style_slug TEXT NOT NULL,
  PRIMARY KEY (template_document_id, style_slug),
  FOREIGN KEY (template_document_id) REFERENCES template_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_styles_slug ON template_styles (style_slug);

CREATE TABLE IF NOT EXISTS template_child_categories (
  template_document_id TEXT NOT NULL,
  child_category_name TEXT NOT NULL,
  child_category_slug TEXT NOT NULL,
  PRIMARY KEY (template_document_id, child_category_slug),
  FOREIGN KEY (template_document_id) REFERENCES template_documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_child_categories_slug ON template_child_categories (child_category_slug);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slug_aliases (
  slug_type TEXT NOT NULL,
  alias_slug TEXT NOT NULL,
  canonical_slug TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slug_type, alias_slug)
);

CREATE INDEX IF NOT EXISTS idx_slug_aliases_canonical ON slug_aliases (slug_type, canonical_slug);

CREATE VIRTUAL TABLE IF NOT EXISTS template_documents_fts USING fts5(
  template_document_id UNINDEXED,
  name,
  description_short,
  description_long_text,
  category_groups_text,
  child_categories_text,
  styles_text,
  tags_text,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS template_documents_ai AFTER INSERT ON template_documents BEGIN
  INSERT INTO template_documents_fts (
    template_document_id,
    name,
    description_short,
    description_long_text,
    category_groups_text,
    child_categories_text,
    styles_text,
    tags_text
  ) VALUES (
    new.id,
    new.name,
    new.description_short,
    new.description_long_text,
    new.category_groups_text,
    new.child_categories_text,
    new.styles_text,
    new.tags_text
  );
END;

CREATE TRIGGER IF NOT EXISTS template_documents_au AFTER UPDATE ON template_documents BEGIN
  DELETE FROM template_documents_fts WHERE template_document_id = old.id;
  INSERT INTO template_documents_fts (
    template_document_id,
    name,
    description_short,
    description_long_text,
    category_groups_text,
    child_categories_text,
    styles_text,
    tags_text
  ) VALUES (
    new.id,
    new.name,
    new.description_short,
    new.description_long_text,
    new.category_groups_text,
    new.child_categories_text,
    new.styles_text,
    new.tags_text
  );
END;

CREATE TRIGGER IF NOT EXISTS template_documents_ad AFTER DELETE ON template_documents BEGIN
  DELETE FROM template_documents_fts WHERE template_document_id = old.id;
END;
