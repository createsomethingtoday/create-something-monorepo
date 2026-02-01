-- FNJI Products table for AI-Native Filtering Experiment
-- Stores furniture product catalog data

CREATE TABLE IF NOT EXISTS fnji_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('seating', 'tables', 'storage', 'lighting')),
  materials TEXT NOT NULL,  -- JSON array: ["Wood", "Brass"]
  dimensions_width INTEGER NOT NULL,   -- cm
  dimensions_depth INTEGER NOT NULL,   -- cm
  dimensions_height INTEGER NOT NULL,  -- cm
  price INTEGER NOT NULL,              -- cents (e.g., 125000 = $1,250)
  status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'pre_order', 'out_of_stock')),
  image_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_fnji_products_category ON fnji_products(category);
CREATE INDEX IF NOT EXISTS idx_fnji_products_status ON fnji_products(status);
CREATE INDEX IF NOT EXISTS idx_fnji_products_price ON fnji_products(price);
