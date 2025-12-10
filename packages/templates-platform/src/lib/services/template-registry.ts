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
    previewUrl: 'https://architecture-studio.createsomething.space',
    pricing: { free: true, proPrice: 149, currency: 'USD' },
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
    previewUrl: 'https://creative-agency.createsomething.space',
    pricing: { free: true, proPrice: 199, currency: 'USD' },
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
    previewUrl: 'https://creative-portfolio.createsomething.space',
    pricing: { free: true, proPrice: 79, currency: 'USD' },
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
    description: 'Sophisticated template for law firms, consultancies, and professional practices.',
    category: 'professional-services',
    subcategories: ['law-firm', 'consulting', 'accounting'],
    thumbnail: '/templates/professional-services/thumbnail.jpg',
    previewUrl: 'https://professional-services.createsomething.space',
    pricing: { free: true, proPrice: 99, currency: 'USD' },
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
