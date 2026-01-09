-- Add Fashion Boutique template
-- TOTEME-inspired minimalist fashion e-commerce

-- ═══════════════════════════════════════════════════════════════════════════
-- FASHION BOUTIQUE TEMPLATE
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO templates (
  id,
  slug,
  name,
  description,
  category,
  subcategories,
  thumbnail,
  preview_url,
  pricing,
  features,
  design_philosophy,
  config_schema,
  is_active
) VALUES (
  'tpl_fashion_boutique',
  'fashion-boutique',
  'Fashion Boutique',
  'TOTEME-inspired minimalist fashion e-commerce with AI-generated imagery. Editorial design for brands that value restraint.',
  'ecommerce',
  '["fashion", "boutique", "retail", "clothing"]',
  '/templates/fashion-boutique-thumb.jpg',
  'https://fashion-boutique-demo.createsomething.space',
  '{"free": true, "pro": 29}',
  '["Mix-blend-mode navigation", "Grayscale-to-color hover effects", "Interactive gallery slider", "Scroll-triggered animations", "Canon design system", "AI-generated product imagery", "WORKWAY integration ready"]',
  '{"principle": "Timeless design, curated with care", "colorScheme": "dark", "aesthetic": "Editorial minimalism"}',
  '{
    "required": [
      {"key": "name", "label": "Boutique Name", "type": "text", "placeholder": "ATELIER"},
      {"key": "tagline", "label": "Tagline", "type": "text", "placeholder": "Timeless design, curated with care"},
      {"key": "contact.email", "label": "Contact Email", "type": "email", "placeholder": "hello@atelier.com"}
    ],
    "optional": [
      {"key": "contact.phone", "label": "Phone", "type": "text", "placeholder": "+1 (555) 123-4567"},
      {"key": "contact.address", "label": "Address", "type": "text", "placeholder": "123 Main St, New York, NY"},
      {"key": "social.instagram", "label": "Instagram", "type": "url", "placeholder": "https://instagram.com/atelier"},
      {"key": "social.pinterest", "label": "Pinterest", "type": "url", "placeholder": "https://pinterest.com/atelier"},
      {"key": "social.twitter", "label": "Twitter/X", "type": "url", "placeholder": "https://twitter.com/atelier"},
      {
        "key": "categories",
        "label": "Product Categories",
        "type": "array",
        "description": "Browse categories for your boutique",
        "schema": [
          {"key": "id", "label": "Category ID", "type": "text"},
          {"key": "name", "label": "Category Name", "type": "text", "placeholder": "JEWELRY"},
          {"key": "slug", "label": "URL Slug", "type": "text", "placeholder": "jewelry"}
        ]
      },
      {
        "key": "products.new",
        "label": "New Arrivals",
        "type": "array",
        "description": "Featured new products",
        "schema": [
          {"key": "id", "label": "Product ID", "type": "text"},
          {"key": "name", "label": "Product Name", "type": "text", "placeholder": "RELAXED WOOL COAT"},
          {"key": "price", "label": "Price (USD)", "type": "number", "placeholder": "895"},
          {"key": "category", "label": "Category", "type": "text", "placeholder": "OUTERWEAR"},
          {"key": "image", "label": "Product Image", "type": "image", "placeholder": "/images/product-1.png"},
          {"key": "description", "label": "Description", "type": "textarea"}
        ]
      },
      {
        "key": "products.iconic",
        "label": "Signature Pieces",
        "type": "array",
        "description": "Iconic products that define your brand",
        "schema": [
          {"key": "id", "label": "Product ID", "type": "text"},
          {"key": "name", "label": "Product Name", "type": "text", "placeholder": "TAILORED BLAZER"},
          {"key": "price", "label": "Price (USD)", "type": "number", "placeholder": "995"},
          {"key": "category", "label": "Category", "type": "text", "placeholder": "SIGNATURE"},
          {"key": "image", "label": "Product Image", "type": "image", "placeholder": "/images/iconic-1.png"},
          {"key": "description", "label": "Description", "type": "textarea"}
        ]
      },
      {
        "key": "gallery",
        "label": "Gallery Images",
        "type": "array",
        "description": "Hero gallery slider images",
        "schema": [
          {"key": "url", "label": "Image URL", "type": "image", "placeholder": "/images/gallery-1.png"}
        ]
      },
      {"key": "workflows.orderNotification", "label": "Order Notification Webhook", "type": "url", "description": "WORKWAY webhook URL for order notifications", "placeholder": "https://api.workway.co/webhooks/orders"},
      {"key": "workflows.inventorySync", "label": "Inventory Sync Workflow ID", "type": "text", "description": "WORKWAY workflow ID for inventory synchronization", "placeholder": "wf_abc123"},
      {"key": "workflows.emailCapture", "label": "Email Capture Webhook", "type": "url", "description": "Newsletter signup webhook URL", "placeholder": "https://api.workway.co/webhooks/newsletter"}
    ]
  }',
  1
);
