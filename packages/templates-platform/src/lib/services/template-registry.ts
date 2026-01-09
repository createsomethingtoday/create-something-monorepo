/**
 * Template Registry
 *
 * Defines available templates and their configuration schemas.
 * This is the source of truth for what users can configure.
 */

import type { Template, ConfigField } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const baseContactFields: ConfigField[] = [
  { key: 'email', label: 'Email Address', type: 'email', placeholder: 'hello@example.com' },
  { key: 'phone', label: 'Phone Number', type: 'text', placeholder: '+1 (555) 123-4567' },
  { key: 'address.city', label: 'City', type: 'text', placeholder: 'New York' },
  { key: 'address.state', label: 'State/Province', type: 'text', placeholder: 'NY' },
  { key: 'address.country', label: 'Country', type: 'text', default: 'USA' }
];

const baseSocialFields: ConfigField[] = [
  { key: 'social.instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/...' },
  { key: 'social.linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/in/...' },
  { key: 'social.twitter', label: 'Twitter/X', type: 'url', placeholder: 'https://twitter.com/...' }
];

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const templates: Template[] = [
  {
    id: 'tpl_architecture_studio',
    slug: 'architecture-studio',
    name: 'Architecture Studio',
    description: 'Light, editorial template for architecture firms. Full-bleed imagery, refined typography.',
    category: 'architecture',
    subcategories: ['architect', 'interior-design', 'landscape'],
    thumbnail: '/templates/architecture-studio/thumbnail.jpg',
    previewUrl: 'https://architecture-studio-template.pages.dev',
    pricing: { free: true },
    features: [
      'Full-bleed project galleries',
      'Project specs grid',
      'Awards showcase',
      'Studio/team page',
      'Contact form'
    ],
    designPhilosophy: {
      principle: 'Let the architecture speak',
      colorScheme: 'light',
      aesthetic: 'Editorial, image-led'
    },
    configSchema: {
      required: [
        { key: 'name', label: 'Studio Name', type: 'text', placeholder: 'DWELL Architecture' },
        { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Thoughtful spaces for modern living' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of your practice...' }
      ],
      optional: [
        ...baseContactFields,
        ...baseSocialFields,
        { key: 'philosophy', label: 'Design Philosophy', type: 'textarea', placeholder: 'Your approach to architecture...' },
        {
          key: 'projects',
          label: 'Projects',
          type: 'array',
          description: 'Add your portfolio projects',
          schema: [
            { key: 'title', label: 'Project Title', type: 'text' },
            { key: 'location', label: 'Location', type: 'text' },
            { key: 'year', label: 'Year', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'heroImage', label: 'Hero Image', type: 'image' }
          ]
        }
      ]
    },
    createdAt: '2024-12-10',
    updatedAt: '2024-12-10'
  },

  {
    id: 'tpl_creative_agency',
    slug: 'creative-agency',
    name: 'Creative Agency',
    description: 'Bold, dark template for agencies. Metrics-driven case studies, strong typography.',
    category: 'creative-agency',
    subcategories: ['branding', 'digital', 'marketing'],
    thumbnail: '/templates/creative-agency/thumbnail.jpg',
    previewUrl: 'https://creative-agency-template.pages.dev',
    pricing: { free: true },
    features: [
      'Case studies with metrics',
      'Results showcase',
      'Client testimonials',
      'Services grid',
      'Contact with budget selector'
    ],
    designPhilosophy: {
      principle: 'Results speak louder',
      colorScheme: 'dark',
      aesthetic: 'Bold, metrics-driven'
    },
    configSchema: {
      required: [
        { key: 'name', label: 'Agency Name', type: 'text', placeholder: 'FORGE Creative' },
        { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'We build brands that move.' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What your agency does...' }
      ],
      optional: [
        ...baseContactFields,
        ...baseSocialFields,
        {
          key: 'stats',
          label: 'Agency Stats',
          type: 'array',
          description: 'Key metrics to showcase',
          schema: [
            { key: 'value', label: 'Value', type: 'text', placeholder: '150+' },
            { key: 'label', label: 'Label', type: 'text', placeholder: 'Projects Delivered' }
          ]
        },
        {
          key: 'services',
          label: 'Services',
          type: 'array',
          schema: [
            { key: 'name', label: 'Service Name', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' }
          ]
        },
        {
          key: 'work',
          label: 'Case Studies',
          type: 'array',
          schema: [
            { key: 'client', label: 'Client Name', type: 'text' },
            { key: 'title', label: 'Project Title', type: 'text' },
            { key: 'category', label: 'Category', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'heroImage', label: 'Hero Image', type: 'image' }
          ]
        }
      ]
    },
    createdAt: '2024-12-10',
    updatedAt: '2024-12-10'
  },

  {
    id: 'tpl_creative_portfolio',
    slug: 'creative-portfolio',
    name: 'Creative Portfolio',
    description: 'Minimal portfolio for photographers, designers, artists. The work fills the screen.',
    category: 'portfolio',
    subcategories: ['photographer', 'designer', 'artist', 'illustrator'],
    thumbnail: '/templates/creative-portfolio/thumbnail.jpg',
    previewUrl: 'https://creative-portfolio-template.pages.dev',
    pricing: { free: true },
    features: [
      'Grid portfolio layout',
      'Full-bleed galleries',
      'Info overlay toggle',
      'Minimal navigation',
      'Mobile responsive'
    ],
    designPhilosophy: {
      principle: 'Maximum work, minimum chrome',
      colorScheme: 'neutral',
      aesthetic: 'Gallery-first, UI recedes'
    },
    configSchema: {
      required: [
        { key: 'name', label: 'Your Name', type: 'text', placeholder: 'Alex Rivera' },
        { key: 'role', label: 'Role/Title', type: 'text', placeholder: 'Photographer' },
        { key: 'bio', label: 'Short Bio', type: 'textarea', placeholder: 'Brief description of your work...' }
      ],
      optional: [
        { key: 'location', label: 'Location', type: 'text', placeholder: 'Brooklyn, NY' },
        { key: 'email', label: 'Email', type: 'email' },
        ...baseSocialFields,
        {
          key: 'work',
          label: 'Projects',
          type: 'array',
          schema: [
            { key: 'title', label: 'Project Title', type: 'text' },
            { key: 'year', label: 'Year', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'coverImage', label: 'Cover Image', type: 'image' }
          ]
        }
      ]
    },
    createdAt: '2024-12-10',
    updatedAt: '2024-12-10'
  },

  {
    id: 'tpl_professional_services',
    slug: 'professional-services',
    name: 'Professional Services',
    description: 'Sophisticated template for consultancies and professional practices.',
    category: 'professional-services',
    subcategories: ['consulting', 'accounting', 'advisory'],
    thumbnail: '/templates/professional-services/thumbnail.jpg',
    previewUrl: 'https://professional-services-template.pages.dev',
    pricing: { free: true },
    features: [
      'Practice areas showcase',
      'Team/partner profiles',
      'Client testimonials',
      'Consultation booking',
      'Contact form with service selector'
    ],
    designPhilosophy: {
      principle: 'Trust through clarity',
      colorScheme: 'dark',
      aesthetic: 'Professional, authoritative'
    },
    configSchema: {
      required: [
        { key: 'name', label: 'Firm Name', type: 'text', placeholder: 'Sterling & Associates' },
        { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Strategic counsel for complex matters' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of your practice...' }
      ],
      optional: [
        ...baseContactFields,
        ...baseSocialFields,
        {
          key: 'services',
          label: 'Practice Areas',
          type: 'array',
          schema: [
            { key: 'name', label: 'Service Name', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'icon', label: 'Icon', type: 'text', placeholder: 'briefcase' }
          ]
        },
        {
          key: 'team',
          label: 'Team Members',
          type: 'array',
          schema: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'role', label: 'Title', type: 'text' },
            { key: 'bio', label: 'Bio', type: 'textarea' },
            { key: 'image', label: 'Photo', type: 'image' }
          ]
        }
      ]
    },
    createdAt: '2024-12-10',
    updatedAt: '2024-12-10'
  },

  {
    id: 'tpl_law_firm',
    slug: 'law-firm',
    name: 'Law Firm',
    description: 'Purpose-built template for law firms with Clio integration via WORKWAY. Ethics-compliant, trust-building design.',
    category: 'legal',
    subcategories: ['law-firm', 'attorney', 'legal-services'],
    thumbnail: '/templates/law-firm/thumbnail.jpg',
    previewUrl: 'https://law-firm-template.pages.dev',
    pricing: { free: true },
    features: [
      'Practice areas with Lucide icons',
      'Attorney profiles with credentials',
      'Anonymized case results',
      'Client intake form → Clio',
      'Calendly consultation booking',
      'Ethics disclaimer throughout',
      'Bar association badges',
      'WORKWAY workflow integration'
    ],
    designPhilosophy: {
      principle: 'Competence over cleverness',
      colorScheme: 'dark',
      aesthetic: 'Authoritative, trust-building'
    },
    configSchema: {
      required: [
        { key: 'name', label: 'Firm Name', type: 'text', placeholder: 'Morrison & Associates' },
        { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Experienced Legal Counsel' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of your practice...' },
        { key: 'disclaimer', label: 'Legal Disclaimer', type: 'textarea', placeholder: 'The information on this website is for general informational purposes only...' }
      ],
      optional: [
        ...baseContactFields,
        { key: 'social.linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/company/...' },
        { key: 'social.twitter', label: 'Twitter/X', type: 'url', placeholder: 'https://twitter.com/...' },
        {
          key: 'barAssociations',
          label: 'Bar Associations',
          type: 'array',
          description: 'Professional memberships',
          schema: [
            { key: 'name', label: 'Association Name', type: 'text', placeholder: 'California State Bar' }
          ]
        },
        {
          key: 'practiceAreas',
          label: 'Practice Areas',
          type: 'array',
          description: 'Areas of legal expertise',
          schema: [
            { key: 'name', label: 'Practice Area', type: 'text', placeholder: 'Family Law' },
            { key: 'slug', label: 'URL Slug', type: 'text', placeholder: 'family-law' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'icon', label: 'Icon (Lucide)', type: 'text', placeholder: 'users, shield, briefcase, scale' }
          ]
        },
        {
          key: 'attorneys',
          label: 'Attorneys',
          type: 'array',
          description: 'Attorney profiles with credentials',
          schema: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'slug', label: 'URL Slug', type: 'text' },
            { key: 'title', label: 'Title', type: 'text', placeholder: 'Partner' },
            { key: 'barNumber', label: 'Bar Number', type: 'text', placeholder: 'CA Bar #123456' },
            { key: 'bio', label: 'Bio', type: 'textarea' },
            { key: 'image', label: 'Headshot', type: 'image' }
          ]
        },
        {
          key: 'results',
          label: 'Case Results',
          type: 'array',
          description: 'Anonymized case outcomes (no client names)',
          schema: [
            { key: 'title', label: 'Case Title', type: 'text', placeholder: 'Complex Custody Resolution' },
            { key: 'practiceArea', label: 'Practice Area Slug', type: 'text' },
            { key: 'outcome', label: 'Outcome', type: 'text', placeholder: 'Full custody awarded to client' },
            { key: 'year', label: 'Year', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' }
          ]
        },
        {
          key: 'workflows',
          label: 'WORKWAY Integration',
          type: 'object',
          description: 'Connect to Clio via WORKWAY',
          schema: [
            { key: 'clioIntakeWebhook', label: 'Clio Intake Webhook URL', type: 'url', placeholder: 'https://hooks.workway.co/...' },
            { key: 'calendlyUrl', label: 'Calendly Scheduling URL', type: 'url', placeholder: 'https://calendly.com/your-firm/consultation' }
          ]
        }
      ]
    },
    createdAt: '2024-12-11',
    updatedAt: '2024-12-11'
  },

  {
    id: 'tpl_personal_injury',
    slug: 'personal-injury',
    name: 'Personal Injury',
    description: 'Conversion-focused template for personal injury law firms. Trust-building design with case results, attorney profiles, and intake forms.',
    category: 'legal',
    subcategories: ['personal-injury', 'injury-attorney', 'trial-lawyer'],
    thumbnail: '/templates/personal-injury/thumbnail.jpg',
    previewUrl: 'https://createsomething-pi-template.pages.dev',
    pricing: { free: true },
    features: [
      'Case type pages with settlement ranges',
      'Recovery results showcase',
      'Attorney profiles with credentials',
      'Multi-step intake form',
      'Calendly consultation booking',
      'Ethics disclaimer throughout',
      'No-fee guarantee messaging',
      'Mobile-first responsive design'
    ],
    designPhilosophy: {
      principle: 'Trust through results',
      colorScheme: 'dark',
      aesthetic: 'Authoritative, conversion-focused'
    },
    configSchema: {
      required: [
        { key: 'name', label: 'Firm Name', type: 'text', placeholder: 'Martinez & Rivera' },
        { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Fighting for the Injured' },
        { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of your practice...' },
        { key: 'disclaimer', label: 'Legal Disclaimer', type: 'textarea', placeholder: 'Past results do not guarantee future outcomes...' }
      ],
      optional: [
        ...baseContactFields,
        { key: 'social.linkedin', label: 'LinkedIn', type: 'url', placeholder: 'https://linkedin.com/company/...' },
        { key: 'social.twitter', label: 'Twitter/X', type: 'url', placeholder: 'https://twitter.com/...' },
        {
          key: 'accidentTypes',
          label: 'Case Types',
          type: 'array',
          description: 'Types of cases you handle',
          schema: [
            { key: 'name', label: 'Case Type', type: 'text', placeholder: 'Car Accidents' },
            { key: 'slug', label: 'URL Slug', type: 'text', placeholder: 'auto-accident' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'averageSettlement', label: 'Typical Recovery Range', type: 'text', placeholder: '$50,000 - $500,000' }
          ]
        },
        {
          key: 'attorneys',
          label: 'Attorneys',
          type: 'array',
          description: 'Attorney profiles',
          schema: [
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'slug', label: 'URL Slug', type: 'text' },
            { key: 'title', label: 'Title', type: 'text', placeholder: 'Founding Partner' },
            { key: 'barNumber', label: 'Bar Number', type: 'text', placeholder: 'CA Bar #123456' },
            { key: 'bio', label: 'Bio', type: 'textarea' },
            { key: 'image', label: 'Headshot', type: 'image' }
          ]
        },
        {
          key: 'recoveries',
          label: 'Case Results',
          type: 'array',
          description: 'Recovery amounts (anonymized)',
          schema: [
            { key: 'title', label: 'Case Title', type: 'text', placeholder: 'Commercial Truck Collision' },
            { key: 'accidentType', label: 'Case Type Slug', type: 'text' },
            { key: 'amount', label: 'Recovery Amount', type: 'text', placeholder: '4200000' },
            { key: 'recoveryDisplay', label: 'Display Amount', type: 'text', placeholder: '$4.2 Million Settlement' },
            { key: 'resolution', label: 'Resolution Type', type: 'text', placeholder: 'settlement or verdict' },
            { key: 'year', label: 'Year', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' }
          ]
        },
        {
          key: 'calendlyUrl',
          label: 'Calendly URL',
          type: 'url',
          placeholder: 'https://calendly.com/your-firm/consultation'
        }
      ]
    },
    createdAt: '2024-12-11',
    updatedAt: '2024-12-11'
  },

  {
    id: 'tpl_fashion_boutique',
    slug: 'fashion-boutique',
    name: 'Fashion Boutique',
    description: 'TOTEME-inspired minimalist fashion e-commerce with AI-generated imagery. Editorial design for brands that value restraint.',
    category: 'ecommerce',
    subcategories: ['fashion', 'boutique', 'retail'],
    thumbnail: '/templates/fashion-boutique/thumbnail.jpg',
    previewUrl: 'https://fashion-boutique-demo.createsomething.space',
    pricing: {
      free: true
    },
    features: [
      'Mix-blend-mode navigation',
      'Grayscale-to-color hover effects',
      'Interactive gallery slider',
      'Scroll-triggered animations',
      'Canon design system',
      'AI-generated product imagery',
      'WORKWAY integration ready'
    ],
    designPhilosophy: {
      principle: 'Timeless design, curated with care',
      colorScheme: 'dark',
      aesthetic: 'Editorial minimalism'
    },
    configSchema: {
      required: [
        { key: 'name', label: 'Boutique Name', type: 'text', placeholder: 'ATELIER' },
        { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Timeless design, curated with care' },
        { key: 'contact.email', label: 'Contact Email', type: 'email', placeholder: 'hello@atelier.com' }
      ],
      optional: [
        { key: 'contact.phone', label: 'Phone', type: 'text', placeholder: '+1 (555) 123-4567' },
        { key: 'contact.address', label: 'Address', type: 'text', placeholder: '123 Main St, New York, NY' },
        { key: 'social.instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/atelier' },
        { key: 'social.pinterest', label: 'Pinterest', type: 'url', placeholder: 'https://pinterest.com/atelier' },
        { key: 'social.twitter', label: 'Twitter/X', type: 'url', placeholder: 'https://twitter.com/atelier' },
        {
          key: 'categories',
          label: 'Product Categories',
          type: 'array',
          description: 'Browse categories for your boutique',
          schema: [
            { key: 'id', label: 'Category ID', type: 'text', placeholder: '1' },
            { key: 'name', label: 'Category Name', type: 'text', placeholder: 'JEWELRY' },
            { key: 'slug', label: 'URL Slug', type: 'text', placeholder: 'jewelry' }
          ]
        },
        {
          key: 'products.new',
          label: 'New Arrivals',
          type: 'array',
          description: 'Featured new products',
          schema: [
            { key: 'id', label: 'Product ID', type: 'text' },
            { key: 'name', label: 'Product Name', type: 'text', placeholder: 'RELAXED WOOL COAT' },
            { key: 'price', label: 'Price (USD)', type: 'text', placeholder: '895' },
            { key: 'category', label: 'Category', type: 'text', placeholder: 'OUTERWEAR' },
            { key: 'image', label: 'Product Image', type: 'image', placeholder: '/images/product-1.png' },
            { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Product description...' }
          ]
        },
        {
          key: 'products.iconic',
          label: 'Signature Pieces',
          type: 'array',
          description: 'Iconic products that define your brand',
          schema: [
            { key: 'id', label: 'Product ID', type: 'text' },
            { key: 'name', label: 'Product Name', type: 'text', placeholder: 'TAILORED BLAZER' },
            { key: 'price', label: 'Price (USD)', type: 'text', placeholder: '995' },
            { key: 'category', label: 'Category', type: 'text', placeholder: 'SIGNATURE' },
            { key: 'image', label: 'Product Image', type: 'image', placeholder: '/images/iconic-1.png' },
            { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Product description...' }
          ]
        },
        {
          key: 'gallery',
          label: 'Gallery Images',
          type: 'array',
          description: 'Hero gallery slider images',
          schema: [
            { key: 'url', label: 'Image URL', type: 'image', placeholder: '/images/gallery-1.png' }
          ]
        },
        {
          key: 'workflows.orderNotification',
          label: 'Order Notification Webhook',
          type: 'url',
          description: 'WORKWAY webhook URL for order notifications',
          placeholder: 'https://api.workway.co/webhooks/orders'
        },
        {
          key: 'workflows.inventorySync',
          label: 'Inventory Sync Workflow ID',
          type: 'text',
          description: 'WORKWAY workflow ID for inventory synchronization',
          placeholder: 'wf_abc123'
        },
        {
          key: 'workflows.emailCapture',
          label: 'Email Capture Webhook',
          type: 'url',
          description: 'Newsletter signup webhook URL',
          placeholder: 'https://api.workway.co/webhooks/newsletter'
        }
      ]
    },
    createdAt: '2025-01-09',
    updatedAt: '2025-01-09'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getTemplate(slug: string): Template | undefined {
  return templates.find((t) => t.slug === slug);
}

export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): Template[] {
  return templates.filter((t) => t.category === category);
}

export function getAllTemplates(): Template[] {
  return templates;
}

/**
 * Validate config against template schema
 */
export function validateConfig(
  templateId: string,
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const template = getTemplateById(templateId);
  if (!template) {
    return { valid: false, errors: ['Template not found'] };
  }

  const errors: string[] = [];

  // Check required fields
  for (const field of template.configSchema.required) {
    const value = getNestedValue(config, field.key);
    if (value === undefined || value === null || value === '') {
      errors.push(`${field.label} is required`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj as unknown);
}
