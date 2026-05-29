/**
 * Designer Data Validator
 *
 * Validates Webflow Designer data (variables, components, styles, pages)
 * that can only be accessed through the Designer API.
 *
 * This replaces the Vercel /api/validate endpoint.
 */

import { DesignerData, ValidationIssue } from '../types';

export interface DesignerValidationResult {
  categories: CategoryResult[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    passedCategories: number;
    failedCategories: number;
  };
}

interface CategoryResult {
  category: string;
  passed: boolean;
  issues: ValidationIssue[];
  stats?: Record<string, any>;
}

export async function validateDesignerData(designerData: DesignerData): Promise<DesignerValidationResult> {
  const categories: CategoryResult[] = [];
  const variables = designerData.variables ?? { collections: [] };
  const components = Array.isArray(designerData.components) ? designerData.components : [];
  const styles = Array.isArray(designerData.styles) ? designerData.styles : [];
  const pages = Array.isArray(designerData.pages) ? designerData.pages : [];
  const assets = Array.isArray(designerData.assets) ? designerData.assets : undefined;

  // Always validate the core designer primitives so empty collections surface as failures
  // instead of silently disappearing from the report.
  categories.push(validateVariables(variables));
  if (variables.collections.length > 0) {
    categories.push(validateVariableModes(variables));
  }
  categories.push(validateComponents(components));
  categories.push(validateStyles(styles));
  categories.push(validateRequiredPages(pages));
  categories.push(validatePageStructure(pages));

  if (assets) {
    categories.push(validateDesignerAssets(assets));
  }

  // Calculate summary
  const errors = categories.reduce((acc, c) => acc + c.issues.filter(i => i.severity === 'error').length, 0);
  const warnings = categories.reduce((acc, c) => acc + c.issues.filter(i => i.severity === 'warning').length, 0);
  const infos = categories.reduce((acc, c) => acc + c.issues.filter(i => i.severity === 'info').length, 0);

  return {
    categories,
    summary: {
      errors,
      warnings,
      infos,
      passedCategories: categories.filter(c => c.passed).length,
      failedCategories: categories.filter(c => !c.passed).length
    }
  };
}

// --- Variable Validation ---
function validateVariables(variables: DesignerData['variables']): CategoryResult {
  const issues: ValidationIssue[] = [];
  let totalCollections = 0;
  let totalVariables = 0;
  const invalidNames: string[] = [];
  let hasOrganizedCollections = false;
  let hasOrderedRamps = false;

  if (variables?.collections) {
    totalCollections = variables.collections.length;
    const collectionTypes = new Set<string>();

    for (const collection of variables.collections) {
      if (collection.variables) {
        totalVariables += collection.variables.length;

        const collectionName = (collection.name || '').toLowerCase();
        if (collectionName.includes('color') || collectionName.includes('spacing') ||
            collectionName.includes('typography') || collectionName.includes('font')) {
          collectionTypes.add('organized');
        }

        const colorVariables = collection.variables.filter((v: any) =>
          v.type === 'color' || (v.name && /\d{2,3}|light|dark/i.test(v.name))
        );

        if (colorVariables.length >= 3) {
          const hasNumberedSequence = colorVariables.some((v: any) =>
            v.name && /\d{2,3}/.test(v.name)
          );
          if (hasNumberedSequence) hasOrderedRamps = true;
        }

        for (const variable of collection.variables) {
          if (variable.name && !isValidVariableName(variable.name)) {
            invalidNames.push(variable.name);
          }
        }
      }
    }

    hasOrganizedCollections = collectionTypes.size > 0 || totalCollections >= 3;
  }

  // Generate issues
  if (totalCollections === 0) {
    issues.push({
      id: 'variables.none',
      category: 'Variables',
      severity: 'error',
      message: 'No variable collections found. Design systems should use variables for consistency.',
      howToFix: 'Create variable collections for colors, spacing, and typography.'
    });
  } else {
    if (invalidNames.length > 0) {
      issues.push({
        id: 'variables.naming',
        category: 'Variables',
        severity: 'warning',
        message: `${invalidNames.length} variables don't follow Title Case naming conventions.`,
        details: { sample: invalidNames.slice(0, 5) },
        howToFix: 'Use Title Case with spaces and optional grouping slashes (e.g., "Primary 100", "Typography/Body Font", "Heading Size/2XLarge")'
      });
    }

    if (!hasOrganizedCollections) {
      issues.push({
        id: 'variables.organization',
        category: 'Variables',
        severity: 'warning',
        message: 'Variables should be organized into purposeful collections.',
        howToFix: 'Create separate collections for Colors, Spacing, Typography.'
      });
    }

    if (!hasOrderedRamps) {
      issues.push({
        id: 'variables.ramps',
        category: 'Variables',
        severity: 'warning',
        message: 'Color variables should use ordered ramps (e.g., light-to-dark).',
        howToFix: 'Organize colors in sequences: Primary 100, Primary 200... Primary 900'
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      id: 'variables.excellent',
      category: 'Variables',
      severity: 'info',
      message: 'Excellent variable usage! Well-organized design system.'
    });
  }

  return {
    category: 'Variables',
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: { totalCollections, totalVariables, hasOrganizedCollections, hasOrderedRamps }
  };
}

// --- Variable Modes Validation ---
function validateVariableModes(variables: DesignerData['variables']): CategoryResult {
  const issues: ValidationIssue[] = [];
  let totalModes = 0;
  let collectionsWithModes = 0;
  let hasResponsiveModes = false;
  const responsiveModeNames = ['tablet', 'mobile', 'landscape', 'portrait', 'breakpoint', 'responsive'];

  if (variables?.collections) {
    for (const collection of variables.collections) {
      const modes = collection.modes || [];
      if (modes.length > 0) {
        collectionsWithModes++;
        totalModes += modes.length;

        // Check if any mode suggests responsive design
        for (const mode of modes) {
          const modeName = (mode.name || '').toLowerCase();
          if (responsiveModeNames.some(keyword => modeName.includes(keyword))) {
            hasResponsiveModes = true;
          }
        }
      }
    }
  }

  // Generate issues
  if (variables?.collections && variables.collections.length > 0) {
    if (collectionsWithModes === 0) {
      issues.push({
        id: 'modes.none',
        category: 'Variable Modes',
        severity: 'warning',
        message: 'No variable modes found. Modes enable responsive variable values.',
        howToFix: 'Create modes like "Tablet" and "Mobile" to adjust spacing and typography for smaller screens.'
      });
    } else if (!hasResponsiveModes) {
      issues.push({
        id: 'modes.no-responsive',
        category: 'Variable Modes',
        severity: 'warning',
        message: `${totalModes} modes found, but none appear to be for responsive breakpoints.`,
        howToFix: 'Add modes for Tablet, Mobile Landscape, and Mobile Portrait to handle different screen sizes.'
      });
    } else {
      issues.push({
        id: 'modes.good',
        category: 'Variable Modes',
        severity: 'info',
        message: `${totalModes} modes configured across ${collectionsWithModes} collections with responsive support.`
      });
    }
  }

  return {
    category: 'Variable Modes',
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: { totalModes, collectionsWithModes, hasResponsiveModes }
  };
}

// --- Component Validation ---
function validateComponents(components: DesignerData['components']): CategoryResult {
  const issues: ValidationIssue[] = [];
  const totalComponents = components.length;
  let navComponents = 0;
  let footerComponents = 0;
  let ctaComponents = 0;
  const invalidNames: string[] = [];

  for (const component of components) {
    if (component.name) {
      if (!isValidTitleCase(component.name)) {
        invalidNames.push(component.name);
      }

      const nameLower = component.name.toLowerCase();
      if (nameLower.includes('nav') || nameLower.includes('menu') || nameLower.includes('header')) navComponents++;
      if (nameLower.includes('footer')) footerComponents++;
      if (nameLower.includes('cta') || nameLower.includes('button') || nameLower.includes('call')) ctaComponents++;
    }
  }

  if (totalComponents === 0) {
    issues.push({
      id: 'components.none',
      category: 'Components',
      severity: 'error',
      message: 'No components found. Templates should be built component-first.',
      howToFix: 'Create reusable components for shared elements like navigation, footer, CTAs.'
    });
  } else {
    if (invalidNames.length > 0) {
      issues.push({
        id: 'components.naming',
        category: 'Components',
        severity: 'warning',
        message: `${invalidNames.length} components don't follow Title Case naming.`,
        details: { sample: invalidNames.slice(0, 5) },
        howToFix: 'Use Title Case for components (e.g., "Navigation Bar", "Hero Section")'
      });
    }

    const hasRequiredComponents = navComponents > 0 && footerComponents > 0 && ctaComponents > 0;
    if (!hasRequiredComponents) {
      const missing = [];
      if (navComponents === 0) missing.push('Navigation');
      if (footerComponents === 0) missing.push('Footer');
      if (ctaComponents === 0) missing.push('Call To Action');

      issues.push({
        id: 'components.missing-required',
        category: 'Components',
        severity: 'warning',
        message: `Missing essential components: ${missing.join(', ')}.`,
        howToFix: 'Create reusable components for navigation, footer, and CTAs.'
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      id: 'components.excellent',
      category: 'Components',
      severity: 'info',
      message: 'Excellent component usage! Following component-first approach.'
    });
  }

  return {
    category: 'Components',
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: { totalComponents, navComponents, footerComponents, ctaComponents }
  };
}

// --- Styles Validation ---
function validateStyles(styles: DesignerData['styles']): CategoryResult {
  const issues: ValidationIssue[] = [];
  const totalClasses = styles.length;
  const inconsistentNaming: string[] = [];
  let hasTypographyClasses = false;
  let hasHtmlTagStyles = false;

  for (const style of styles) {
    if (style.name) {
      if (!isValidClassName(style.name)) {
        inconsistentNaming.push(style.name);
      }

      const nameLower = style.name.toLowerCase();
      if (nameLower.includes('heading') || nameLower.includes('text') ||
          nameLower.includes('title') || nameLower.includes('body') ||
          nameLower.match(/^h[1-6]$/) || nameLower.includes('paragraph')) {
        hasTypographyClasses = true;
      }

      if (style.isHtmlTag || nameLower.match(/^(h1|h2|h3|h4|h5|h6|p|body|html)$/)) {
        hasHtmlTagStyles = true;
      }
    }
  }

  if (inconsistentNaming.length > 0) {
    issues.push({
      id: 'styles.naming-inconsistent',
      category: 'Styles',
      severity: 'warning',
      message: `${inconsistentNaming.length} classes don't follow consistent naming.`,
      details: { sample: inconsistentNaming.slice(0, 5) },
      howToFix: 'Use one consistent naming format (e.g., "section testimonials dark", "Hero Container Element", "component-element-modifier", or BEM). Avoid encoding literal units in class names (e.g., use "Max Width 30" not "Max Width 30px").'
    });
  }

  if (!hasTypographyClasses) {
    issues.push({
      id: 'styles.missing-typography',
      category: 'Styles',
      severity: 'error',
      message: 'No typography classes detected. Templates need text styles.',
      howToFix: 'Create typography classes for headings, body text, captions.'
    });
  }

  if (!hasHtmlTagStyles) {
    issues.push({
      id: 'styles.missing-html-baseline',
      category: 'Styles',
      severity: 'warning',
      message: 'HTML tags should have baseline styles (All H1 Tags, All Paragraphs).',
      howToFix: 'Style HTML tags directly first, then create semantic classes.'
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: 'styles.excellent',
      category: 'Styles',
      severity: 'info',
      message: 'Excellent typography and styling!'
    });
  }

  return {
    category: 'Styles',
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: { totalClasses, hasTypographyClasses, hasHtmlTagStyles }
  };
}

// --- Required Pages Validation ---
function validateRequiredPages(pages: DesignerData['pages']): CategoryResult {
  const issues: ValidationIssue[] = [];
  const pageNames = pages.map(p => p.name?.toLowerCase() || '');
  const pageSlugs = pages.map(p => p.slug?.toLowerCase() || '');

  const hasStyleGuide = pageNames.some(name =>
    name.includes('style guide') || name.includes('styleguide')
  ) || pageSlugs.some(slug => slug.includes('style-guide'));

  const hasLicense = pageNames.some(name =>
    name.includes('license') || name.includes('licenses')
  ) || pageSlugs.some(slug => slug.includes('license'));

  const hasCustom404 = pageNames.some(name =>
    name.includes('404') || name.includes('not found')
  );

  if (!hasStyleGuide) {
    issues.push({
      id: 'required-pages.missing-style-guide',
      category: 'Required Pages',
      severity: 'error',
      message: 'Style Guide page is required for template submission.',
      howToFix: 'Create a Style Guide page with all HTML tags and typography.'
    });
  }

  if (!hasLicense) {
    issues.push({
      id: 'required-pages.missing-license',
      category: 'Required Pages',
      severity: 'error',
      message: 'License page is required for template submission.',
      howToFix: 'Create a License page with licensing info for all custom assets. It may be nested in a folder if its published URL is accessible.'
    });
  }

  if (!hasCustom404) {
    issues.push({
      id: 'required-pages.missing-404',
      category: 'Required Pages',
      severity: 'warning',
      message: 'Custom 404 page is recommended.',
      howToFix: 'Create a custom branded 404 page with full navigation and CTAs.'
    });
  }

  if (issues.length === 0) {
    issues.push({
      id: 'required-pages.complete',
      category: 'Required Pages',
      severity: 'info',
      message: 'All required pages are present!'
    });
  }

  return {
    category: 'Required Pages',
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: { hasStyleGuide, hasLicense, hasCustom404 }
  };
}

// --- Page Structure Validation ---
function validatePageStructure(pages: DesignerData['pages']): CategoryResult {
  const issues: ValidationIssue[] = [];
  const totalPages = pages.length;
  const hasHomePage = pages.some(p => p.isHomePage);

  if (totalPages === 0) {
    issues.push({
      id: 'pages.no-pages',
      category: 'Page Structure',
      severity: 'error',
      message: 'No pages found in this project.',
      howToFix: 'Create at least one page in your project.'
    });
  } else {
    if (!hasHomePage) {
      issues.push({
        id: 'pages.no-home',
        category: 'Page Structure',
        severity: 'warning',
        message: 'No home page detected.',
        howToFix: 'Set one of your pages as the home page.'
      });
    }

    if (totalPages < 2) {
      issues.push({
        id: 'pages.minimal-structure',
        category: 'Page Structure',
        severity: 'info',
        message: 'Consider adding more pages for a complete website structure.'
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      id: 'pages.structure-good',
      category: 'Page Structure',
      severity: 'info',
      message: 'Page structure looks good.'
    });
  }

  return {
    category: 'Page Structure',
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: { totalPages, hasHomePage }
  };
}

// --- Designer Assets Validation (metadata only) ---
function validateDesignerAssets(assets: DesignerData['assets']): CategoryResult {
  const issues: ValidationIssue[] = [];
  const totalAssets = assets.length;
  const misnamedAssets: string[] = [];

  for (const asset of assets) {
    if (asset.name && /\s/.test(asset.name)) {
      misnamedAssets.push(asset.name);
    }
  }

  if (misnamedAssets.length > 0) {
    issues.push({
      id: 'assets.naming-conventions',
      category: 'Assets',
      severity: 'warning',
      message: `${misnamedAssets.length} assets don't follow naming conventions.`,
      details: { sample: misnamedAssets.slice(0, 5) },
      howToFix: 'Use descriptive, SEO-friendly names: "hero-image.webp" not "Hero Image.JPG"'
    });
  }

  return {
    category: 'Assets',
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: { totalAssets }
  };
}

// --- Helper Functions ---
function isValidTitleCase(name: string): boolean {
  if (!name || /[_-]/.test(name)) return false;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return false;
  return parts.every(p => /^[A-Z][A-Za-z0-9]*$/.test(p));
}

function isValidVariableName(name: string): boolean {
  // Allow grouping with "/" (e.g., "Typography/Body Font"). Enforce Title Case per segment.
  // Allow numeric-only tokens for ramps (e.g., "Primary 100"). Disallow "_" and "-".
  if (!name || /[_-]/.test(name)) return false;
  const segments = name.split('/');
  if (segments.length === 0) return false;

  return segments.every(segment => {
    const seg = segment.trim();
    if (!seg) return false;
    const parts = seg.split(/\s+/);
    if (parts.length === 0) return false;

    return parts.every(p =>
      /^[0-9]+$/.test(p) || // e.g., "100"
      /^[A-Z][A-Za-z0-9]*$/.test(p) || // e.g., "Primary", "XLarge"
      /^[0-9]+[A-Z][A-Za-z0-9]*$/.test(p) // e.g., "2XLarge", "4K"
    );
  });
}

function isValidClassName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed) return false;

  const CSS_UNIT_SUFFIXES = new Set([
    // Common length units
    'px', 'rem', 'em', 'ch', 'ex', 'vw', 'vh', 'vmin', 'vmax', 'vi', 'vb',
    'svw', 'svh', 'lvw', 'lvh', 'dvw', 'dvh', 'lh', 'rlh',
    'cm', 'mm', 'q', 'in', 'pt', 'pc',
    // Common grid/time/angle/resolution units (still "literal values" in names)
    'fr', 'ms', 's', 'deg', 'rad', 'grad', 'turn', 'dpi', 'dpcm', 'dppx'
  ]);

  const hasDisallowedUnitValue = (token: string) => {
    const segments = token.split(/[-_]/).filter(Boolean);
    for (const seg of segments) {
      const m = seg.match(/^(\d+(?:\.\d+)?)([a-z]+)$/i);
      if (!m) continue;
      const unit = m[2].toLowerCase();
      if (CSS_UNIT_SUFFIXES.has(unit)) return true; // e.g., "30px", "2rem"
    }
    return false;
  };

  // Webflow style selectors can include multiple "combo classes" separated by spaces.
  // We accept common naming formats called out in submission guidelines:
  // Default (words), Snake/Kebab/BEM, PascalCase, and camelCase.
  const tokens = trimmed.split(/\s+/);

  return tokens.every(token => {
    if (!token) return false;
    if (hasDisallowedUnitValue(token)) return false;
    // Numbers and numeric-leading modifiers (e.g., "30", "3rd", "2XLarge")
    if (/^[0-9]+$/.test(token)) return true;
    if (/^[0-9]+[A-Za-z][A-Za-z0-9]*$/.test(token)) return true;

    // Snake/Kebab/BEM-style tokens (lowercase with -/_)
    if (/^[a-z][a-z0-9_-]*$/.test(token)) return true;

    // Title/Pascal/Acronym tokens (uppercase-leading, alphanumeric)
    if (/^[A-Z][A-Za-z0-9]*$/.test(token)) return true;

    // camelCase tokens
    if (/^[a-z][A-Za-z0-9]*$/.test(token)) return true;

    return false;
  });
}
