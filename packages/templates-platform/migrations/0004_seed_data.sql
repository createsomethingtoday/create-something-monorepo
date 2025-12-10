-- Seed data for templates-platform
-- Initial template and demo tenant

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFESSIONAL SERVICES TEMPLATE
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
  'tpl_professional_services',
  'professional-services',
  'Professional Services',
  'Elegant template for architects, designers, consultants, and other professional service providers. Canon-compliant design with portfolio showcase.',
  'professional-services',
  '["architecture", "design", "consulting", "legal", "accounting"]',
  '/templates/professional-services-thumb.jpg',
  'https://professional-services-template.pages.dev',
  '{"free": true, "pro": 29, "enterprise": 99}',
  '["Portfolio gallery", "Team profiles", "Service showcase", "Contact forms", "SEO optimized", "Mobile responsive"]',
  '{"principle": "Clarity over cleverness", "voice": "Declarative, specific, minimal", "structure": "Images command, text supports, space breathes"}',
  '{
    "required": [
      {"key": "name", "label": "Business Name", "type": "text", "placeholder": "Studio Name"},
      {"key": "tagline", "label": "Tagline", "type": "text", "placeholder": "Architecture & Design"},
      {"key": "description", "label": "Description", "type": "textarea", "placeholder": "Brief description of your practice..."},
      {"key": "email", "label": "Email", "type": "email", "placeholder": "studio@example.com"},
      {"key": "phone", "label": "Phone", "type": "tel", "placeholder": "+1 (555) 123-4567"}
    ],
    "optional": [
      {"key": "address.street", "label": "Street Address", "type": "text"},
      {"key": "address.city", "label": "City", "type": "text"},
      {"key": "address.state", "label": "State", "type": "text"},
      {"key": "address.zip", "label": "ZIP Code", "type": "text"},
      {"key": "social.instagram", "label": "Instagram URL", "type": "url"},
      {"key": "social.pinterest", "label": "Pinterest URL", "type": "url"},
      {"key": "hero.image", "label": "Hero Image", "type": "image"},
      {"key": "hero.alt", "label": "Hero Alt Text", "type": "text"},
      {"key": "hero.caption", "label": "Hero Caption", "type": "text"},
      {"key": "projects", "label": "Portfolio Projects", "type": "array"},
      {"key": "services", "label": "Services Offered", "type": "array"},
      {"key": "studio.headline", "label": "About Headline", "type": "text"},
      {"key": "studio.philosophy", "label": "Studio Philosophy", "type": "textarea"},
      {"key": "studio.founders", "label": "Team Members", "type": "array"}
    ]
  }',
  1
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DEMO USER
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO users (
  id,
  email,
  name,
  plan,
  site_limit
) VALUES (
  'usr_demo',
  'demo@createsomething.io',
  'Demo User',
  'pro',
  5
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DEMO TENANT (for testing tenant resolution)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO tenants (
  id,
  user_id,
  template_id,
  subdomain,
  status,
  config,
  tier
) VALUES (
  'ten_demo',
  'usr_demo',
  'tpl_professional_services',
  'demo',
  'active',
  '{
    "name": "Timber & Light Studio",
    "tagline": "Architecture & Design",
    "description": "Timber-frame architecture in dialogue with landscape. Residential projects in the Pacific Northwest since 2018.",
    "email": "hello@timberlight.studio",
    "phone": "+1 (206) 555-0123",
    "address": {
      "street": "412 Pioneer Square",
      "city": "Seattle",
      "state": "WA",
      "zip": "98104",
      "country": "US"
    },
    "social": {
      "instagram": "https://instagram.com/timberlightstudio",
      "pinterest": "https://pinterest.com/timberlightstudio"
    },
    "url": "https://demo.createsomething.space",
    "locale": "en_US",
    "hero": {
      "image": "/projects/hero-forest-cabin.jpg",
      "alt": "Modern cedar cabin with floor-to-ceiling windows in pine forest",
      "caption": "Forest Cabin, 2024"
    },
    "projects": [
      {
        "slug": "forest-cabin",
        "title": "Forest Cabin",
        "location": "Whidbey Island, WA",
        "year": "2024",
        "category": "Residential",
        "heroImage": "/projects/hero-forest-cabin.jpg",
        "description": "1,200 sf. Western red cedar, steel frame, triple-glazed.",
        "images": ["/projects/interior-chair.jpg", "/projects/interior-desk.jpg"]
      },
      {
        "slug": "hillside-residence",
        "title": "Hillside Residence",
        "location": "Portland, OR",
        "year": "2024",
        "category": "Residential",
        "heroImage": "/projects/exterior-hillside.jpg",
        "description": "2,800 sf. Cedar cladding, cantilevered volumes, forest integration.",
        "images": ["/projects/interior-kitchen.jpg"]
      }
    ],
    "studio": {
      "headline": "Studio",
      "philosophy": "Architecture that recedes into landscape. Each project begins with forest, watershed, and light—not style.",
      "approach": ["Forest dictates footprint", "Cedar weathers with place", "Windows frame the land"],
      "founders": [
        {
          "name": "Sarah Chen",
          "role": "Founding Principal, AIA",
          "bio": "M.Arch University of Washington 2010. Previously at Olson Kundig.",
          "image": "/headshot-architect.jpg"
        }
      ]
    },
    "services": ["Architecture", "Interiors", "Furniture"],
    "recognition": [
      {"publication": "Dwell", "year": "2024"},
      {"publication": "Dezeen", "year": "2023"}
    ]
  }',
  'pro'
);
