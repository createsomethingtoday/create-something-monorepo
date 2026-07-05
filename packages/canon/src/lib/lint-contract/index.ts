import { colors } from '../tokens/colors.js';
import { radius } from '../tokens/radius.js';
import { shadows } from '../tokens/shadows.js';
import { typography } from '../tokens/typography.js';

export type CanonLintCategory = 'color' | 'radius' | 'shadow' | 'typography' | 'spacing';

export type CanonTailwindUtilityPattern = string | RegExp;

export interface CanonLintMapping {
  tailwind: CanonTailwindUtilityPattern;
  canon: string;
  category: CanonLintCategory;
  description?: string;
}

export const CANON_TAILWIND_DESIGN_MAPPINGS: CanonLintMapping[] = [
  {
    tailwind: 'rounded-sm',
    canon: 'var(--radius-sm)',
    category: 'radius',
    description: radius.sm
  },
  {
    tailwind: 'rounded-md',
    canon: 'var(--radius-md)',
    category: 'radius',
    description: radius.md
  },
  {
    tailwind: 'rounded-lg',
    canon: 'var(--radius-lg)',
    category: 'radius',
    description: radius.lg
  },
  {
    tailwind: 'rounded-xl',
    canon: 'var(--radius-xl)',
    category: 'radius',
    description: radius.xl
  },
  {
    tailwind: 'rounded-full',
    canon: 'var(--radius-full)',
    category: 'radius',
    description: radius.full
  },
  { tailwind: /^rounded-\w+$/, canon: 'var(--radius-*)', category: 'radius' },

  {
    tailwind: 'bg-black',
    canon: 'var(--color-bg-pure)',
    category: 'color',
    description: colors.background.pure
  },
  {
    tailwind: 'bg-white',
    canon: 'var(--color-fg-primary)',
    category: 'color',
    description: colors.foreground.primary
  },
  {
    tailwind: /^bg-white\/5$/,
    canon: 'var(--color-bg-subtle)',
    category: 'color',
    description: colors.background.subtle
  },
  {
    tailwind: /^bg-white\/10$/,
    canon: 'var(--color-bg-surface)',
    category: 'color',
    description: colors.background.surface
  },
  { tailwind: /^bg-gray-/, canon: 'var(--color-bg-*)', category: 'color' },
  { tailwind: /^bg-slate-/, canon: 'var(--color-bg-*)', category: 'color' },

  {
    tailwind: 'text-white',
    canon: 'var(--color-fg-primary)',
    category: 'color',
    description: colors.foreground.primary
  },
  {
    tailwind: 'text-black',
    canon: 'var(--color-fg-primary)',
    category: 'color',
    description: '#000000 (inverted theme)'
  },
  {
    tailwind: /^text-white\/80$/,
    canon: 'var(--color-fg-secondary)',
    category: 'color',
    description: colors.foreground.secondary
  },
  {
    tailwind: /^text-white\/60$/,
    canon: 'var(--color-fg-tertiary)',
    category: 'color',
    description: colors.foreground.tertiary
  },
  {
    tailwind: /^text-white\/46$/,
    canon: 'var(--color-fg-muted)',
    category: 'color',
    description: `${colors.foreground.muted} - WCAG AA compliant`
  },
  {
    tailwind: /^text-white\/20$/,
    canon: 'var(--color-fg-subtle)',
    category: 'color',
    description: colors.foreground.subtle
  },
  { tailwind: /^text-gray-/, canon: 'var(--color-fg-*)', category: 'color' },
  { tailwind: /^text-slate-/, canon: 'var(--color-fg-*)', category: 'color' },

  {
    tailwind: /^border-white\/10$/,
    canon: 'var(--color-border-default)',
    category: 'color',
    description: colors.border.default
  },
  {
    tailwind: /^border-white\/20$/,
    canon: 'var(--color-border-emphasis)',
    category: 'color',
    description: colors.border.emphasis
  },
  {
    tailwind: /^border-white\/30$/,
    canon: 'var(--color-border-strong)',
    category: 'color',
    description: colors.border.strong
  },
  { tailwind: /^border-gray-/, canon: 'var(--color-border-*)', category: 'color' },
  { tailwind: /^border-white$/, canon: 'var(--color-border-*)', category: 'color' },
  { tailwind: /^border-black$/, canon: 'var(--color-border-*)', category: 'color' },

  {
    tailwind: 'shadow-sm',
    canon: 'var(--shadow-sm)',
    category: 'shadow',
    description: shadows.sm
  },
  {
    tailwind: 'shadow-md',
    canon: 'var(--shadow-md)',
    category: 'shadow',
    description: shadows.md
  },
  {
    tailwind: 'shadow-lg',
    canon: 'var(--shadow-lg)',
    category: 'shadow',
    description: shadows.lg
  },
  {
    tailwind: 'shadow-xl',
    canon: 'var(--shadow-xl)',
    category: 'shadow',
    description: shadows.xl
  },
  {
    tailwind: 'shadow-2xl',
    canon: 'var(--shadow-2xl)',
    category: 'shadow',
    description: shadows['2xl']
  },
  { tailwind: /^shadow-\w+$/, canon: 'var(--shadow-*)', category: 'shadow' },

  {
    tailwind: 'text-xs',
    canon: 'var(--text-caption)',
    category: 'typography',
    description: typography.scale.caption
  },
  {
    tailwind: 'text-sm',
    canon: 'var(--text-body-sm)',
    category: 'typography',
    description: typography.scale['body-sm']
  },
  {
    tailwind: 'text-base',
    canon: 'var(--text-body)',
    category: 'typography',
    description: typography.scale.body
  },
  {
    tailwind: 'text-lg',
    canon: 'var(--text-body-lg)',
    category: 'typography',
    description: typography.scale['body-lg']
  },
  {
    tailwind: 'text-xl',
    canon: 'var(--text-h3)',
    category: 'typography',
    description: typography.scale.h3
  },
  {
    tailwind: 'text-2xl',
    canon: 'var(--text-h2)',
    category: 'typography',
    description: typography.scale.h2
  },
  {
    tailwind: 'text-3xl',
    canon: 'var(--text-h1)',
    category: 'typography',
    description: typography.scale.h1
  },
  { tailwind: /^text-\d+xl$/, canon: 'var(--text-*)', category: 'typography' },

  {
    tailwind: /^opacity-\d+$/,
    canon: 'rgba() in Canon token',
    category: 'color',
    description: 'Use color tokens with built-in opacity'
  }
];

export const CANON_ALLOWED_TAILWIND_UTILS: CanonTailwindUtilityPattern[] = [
  /^flex(-\w+)?$/,
  /^items-/,
  /^justify-/,
  /^self-/,
  /^flex-row/,
  /^flex-col/,
  /^flex-wrap/,
  /^flex-nowrap/,
  /^flex-grow/,
  /^flex-shrink/,
  /^grid(-\w+)?$/,
  /^col-/,
  /^row-/,
  /^gap-/,
  /^grid-cols-/,
  /^grid-rows-/,
  /^auto-cols-/,
  /^auto-rows-/,
  /^(static|fixed|absolute|relative|sticky)$/,
  /^(top|right|bottom|left)-/,
  /^inset-/,
  /^(block|inline|inline-block|hidden|invisible)$/,
  /^w-/,
  /^h-/,
  /^min-w-/,
  /^min-h-/,
  /^max-w-/,
  /^max-h-/,
  /^p-/,
  /^px-/,
  /^py-/,
  /^pt-/,
  /^pr-/,
  /^pb-/,
  /^pl-/,
  /^m-/,
  /^mx-/,
  /^my-/,
  /^mt-/,
  /^mr-/,
  /^mb-/,
  /^ml-/,
  /^space-/,
  /^overflow-/,
  /^z-/,
  /^order-/,
  /^cursor-/,
  /^pointer-events-/,
  /^(visible|invisible)$/,
  'rounded-none',
  'shadow-none'
];

export const CANON_CSS_VALUE_MAPPINGS: Record<string, string> = {
  '#000000': 'var(--color-bg-pure)',
  '#000': 'var(--color-bg-pure)',
  black: 'var(--color-bg-pure)',
  '#0a0a0a': 'var(--color-bg-elevated)',
  '#111111': 'var(--color-bg-surface)',
  '#111': 'var(--color-bg-surface)',
  '#1a1a1a': 'var(--color-bg-subtle)',
  '#ffffff': 'var(--color-fg-primary)',
  '#fff': 'var(--color-fg-primary)',
  white: 'var(--color-fg-primary)',
  'rgba(255, 255, 255, 0.8)': 'var(--color-fg-secondary)',
  'rgba(255,255,255,0.8)': 'var(--color-fg-secondary)',
  'rgba(255, 255, 255, 0.6)': 'var(--color-fg-tertiary)',
  'rgba(255,255,255,0.6)': 'var(--color-fg-tertiary)',
  'rgba(255, 255, 255, 0.46)': 'var(--color-fg-muted)',
  'rgba(255,255,255,0.46)': 'var(--color-fg-muted)',
  'rgba(255, 255, 255, 0.2)': 'var(--color-fg-subtle)',
  'rgba(255,255,255,0.2)': 'var(--color-fg-subtle)',
  'rgba(255, 255, 255, 0.1)': 'var(--color-border-default)',
  'rgba(255,255,255,0.1)': 'var(--color-border-default)',
  'rgba(255, 255, 255, 0.3)': 'var(--color-border-strong)',
  'rgba(255,255,255,0.3)': 'var(--color-border-strong)',
  '6px': 'var(--radius-sm)',
  '8px': 'var(--radius-md)',
  '12px': 'var(--radius-lg)',
  '16px': 'var(--radius-xl)',
  '9999px': 'var(--radius-full)',
  '0.75rem': 'var(--text-caption)',
  '0.875rem': 'var(--text-body-sm)',
  '1rem': 'var(--text-body)',
  '1.125rem': 'var(--text-body-lg)',
  '0.5rem': 'var(--space-xs)',
  '1.618rem': 'var(--space-md)',
  '2.618rem': 'var(--space-lg)',
  '4.236rem': 'var(--space-xl)',
  '6.854rem': 'var(--space-2xl)'
};

export const CANON_CSS_TOKEN_PROPERTIES = [
  'color',
  'background',
  'background-color',
  'border-color',
  'border-radius',
  'box-shadow',
  'text-shadow',
  'font-size',
  'gap',
  'padding',
  'margin'
];

export function isCanonAllowedTailwindUtil(className: string): boolean {
  return CANON_ALLOWED_TAILWIND_UTILS.some((pattern) => {
    if (typeof pattern === 'string') {
      return className === pattern;
    }
    return pattern.test(className);
  });
}

export function findCanonTailwindReplacement(className: string): CanonLintMapping | null {
  return (
    CANON_TAILWIND_DESIGN_MAPPINGS.find((mapping) => {
      if (typeof mapping.tailwind === 'string') {
        return className === mapping.tailwind;
      }
      return mapping.tailwind.test(className);
    }) ?? null
  );
}

export function findCanonCssValueReplacement(property: string, value: string): string | null {
  if (!CANON_CSS_TOKEN_PROPERTIES.includes(property.toLowerCase())) {
    return null;
  }

  return CANON_CSS_VALUE_MAPPINGS[value.trim()] ?? null;
}

export function getCanonLintSuggestion(className: string, mapping: CanonLintMapping): string {
  let message = `Replace Tailwind '${className}' with Canon token '${mapping.canon}'`;
  if (mapping.description) {
    message += ` (${mapping.description})`;
  }
  message += '. Use in <style> block, not class attribute.';
  return message;
}
