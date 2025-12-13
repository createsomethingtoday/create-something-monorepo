-- Maverick X Content Schema for D1
-- Designed for admin app content management

-- ============================================
-- SOLUTIONS (PetroX, LithX, DME product lines)
-- ============================================
CREATE TABLE solutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,  -- Chemical symbol (Cu, Au, REE, etc.)
    brand TEXT NOT NULL CHECK (brand IN ('petrox', 'lithx', 'dme')),
    headline TEXT NOT NULL,
    description TEXT NOT NULL,
    details TEXT,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Solution features (many-to-one)
CREATE TABLE solution_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solution_id TEXT NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Solution stats (many-to-one)
CREATE TABLE solution_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solution_id TEXT NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- ============================================
-- PRODUCTS (Features displayed on brand pages)
-- ============================================
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL CHECK (brand IN ('petrox', 'lithx', 'dme')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Product features
CREATE TABLE product_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Product applications
CREATE TABLE product_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    application TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Product benefits
CREATE TABLE product_benefits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    benefit TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- ============================================
-- FEATURES (Icon cards on landing pages)
-- ============================================
CREATE TABLE features (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL CHECK (brand IN ('petrox', 'lithx', 'dme', 'global')),
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- APPLICATIONS
-- ============================================
CREATE TABLE applications (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL CHECK (brand IN ('petrox', 'lithx', 'dme')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- METALS (LithX specific)
-- ============================================
CREATE TABLE metals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    color TEXT,  -- Tailwind class or hex
    image TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- RECOVERY METHODS (LithX specific)
-- ============================================
CREATE TABLE recovery_methods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    details TEXT,
    image TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- STATS (Global and per-brand)
-- ============================================
CREATE TABLE stats (
    id TEXT PRIMARY KEY,
    brand TEXT CHECK (brand IN ('petrox', 'lithx', 'dme', 'global')),
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- NEWS ARTICLES
-- ============================================
CREATE TABLE news_articles (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT,  -- Full article content (markdown)
    image TEXT,
    category TEXT,
    author TEXT,
    read_time TEXT,
    is_featured INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    published_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- TESTIMONIALS
-- ============================================
CREATE TABLE testimonials (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL,
    title TEXT,  -- Author's title/company
    content TEXT NOT NULL,
    brand TEXT CHECK (brand IN ('petrox', 'lithx', 'dme', 'global')),
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SITE SETTINGS
-- ============================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- MEDIA LIBRARY
-- ============================================
CREATE TABLE media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,  -- R2 URL
    alt_text TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    width INTEGER,
    height INTEGER,
    uploaded_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- CONTACT SUBMISSIONS
-- ============================================
CREATE TABLE contact_submissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    category TEXT,  -- petrox, lithx, dme, general
    products TEXT,  -- JSON array of selected products
    metals TEXT,    -- JSON array of selected metals (LithX)
    applications TEXT,  -- JSON array of selected applications
    message TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
    notes TEXT,     -- Internal notes
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_solutions_brand ON solutions(brand);
CREATE INDEX idx_solutions_active ON solutions(is_active);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_features_brand ON features(brand);
CREATE INDEX idx_news_published ON news_articles(is_published);
CREATE INDEX idx_news_featured ON news_articles(is_featured);
CREATE INDEX idx_news_slug ON news_articles(slug);
CREATE INDEX idx_testimonials_brand ON testimonials(brand);
CREATE INDEX idx_contact_status ON contact_submissions(status);
CREATE INDEX idx_contact_created ON contact_submissions(created_at);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE TRIGGER update_solutions_timestamp
    AFTER UPDATE ON solutions
BEGIN
    UPDATE solutions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_products_timestamp
    AFTER UPDATE ON products
BEGIN
    UPDATE products SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_features_timestamp
    AFTER UPDATE ON features
BEGIN
    UPDATE features SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_news_timestamp
    AFTER UPDATE ON news_articles
BEGIN
    UPDATE news_articles SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_testimonials_timestamp
    AFTER UPDATE ON testimonials
BEGIN
    UPDATE testimonials SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER update_contact_timestamp
    AFTER UPDATE ON contact_submissions
BEGIN
    UPDATE contact_submissions SET updated_at = datetime('now') WHERE id = NEW.id;
END;
