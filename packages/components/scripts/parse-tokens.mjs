#!/usr/bin/env node
/**
 * Token Parser
 *
 * Parses CSS custom properties from tokens.css into structured data.
 * Single source of truth: tokens.css → structured JSON
 *
 * Philosophy: The CSS file is authoritative. All other formats derive from it.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = join(__dirname, '../src/lib/styles/tokens.css');

/**
 * Token categories for organization
 */
const TOKEN_CATEGORIES = {
  'color-bg': 'colors.background',
  'color-fg': 'colors.foreground',
  'color-border': 'colors.border',
  'color-success': 'colors.semantic.success',
  'color-error': 'colors.semantic.error',
  'color-warning': 'colors.semantic.warning',
  'color-info': 'colors.semantic.info',
  'color-hover': 'colors.interactive',
  'color-active': 'colors.interactive',
  'color-focus': 'colors.interactive',
  'color-overlay': 'colors.overlay',
  'color-data': 'colors.data',
  'color-rank': 'colors.rank',
  'font-': 'typography.fonts',
  'leading-': 'typography.lineHeight',
  'tracking-': 'typography.letterSpacing',
  'text-': 'typography.scale',
  'space-': 'spacing',
  'radius-': 'borderRadius',
  'shadow-': 'shadows',
  'ease-': 'animation.easing',
  'duration-': 'animation.duration',
  'opacity-': 'opacity',
  'z-': 'zIndex',
  'breakpoint-': 'breakpoints',
  'container-': 'containers',
  'width-': 'widths',
  'view-transition': 'animation.viewTransition'
};

/**
 * Parse a CSS value to determine its type
 */
function parseValue(value) {
  // Remove CSS var() references for raw value
  const raw = value.trim();

  // Detect type
  if (raw.startsWith('#')) {
    return { value: raw, type: 'color' };
  }
  if (raw.startsWith('rgba(') || raw.startsWith('rgb(')) {
    return { value: raw, type: 'color' };
  }
  if (raw.endsWith('px')) {
    return { value: raw, type: 'dimension' };
  }
  if (raw.endsWith('rem') || raw.endsWith('em')) {
    return { value: raw, type: 'dimension' };
  }
  if (raw.endsWith('ms') || raw.endsWith('s')) {
    return { value: raw, type: 'duration' };
  }
  if (raw.startsWith('cubic-bezier(')) {
    return { value: raw, type: 'cubicBezier' };
  }
  if (raw.startsWith('clamp(')) {
    return { value: raw, type: 'dimension' };
  }
  if (raw.startsWith('0 ') || raw.startsWith('inset ')) {
    return { value: raw, type: 'shadow' };
  }
  if (!isNaN(parseFloat(raw)) && isFinite(raw)) {
    return { value: parseFloat(raw), type: 'number' };
  }

  return { value: raw, type: 'string' };
}

/**
 * Extract comment description if present
 */
function extractDescription(line, prevLines) {
  // Check for inline comment
  const inlineMatch = line.match(/\/\*\s*(.+?)\s*\*\//);
  if (inlineMatch) {
    return inlineMatch[1];
  }

  // Check previous line for comment
  const prevLine = prevLines[prevLines.length - 1] || '';
  const prevMatch = prevLine.match(/\/\*\s*(.+?)\s*\*\//);
  if (prevMatch) {
    return prevMatch[1];
  }

  return undefined;
}

/**
 * Parse tokens.css and return structured data
 */
export function parseTokensCSS() {
  const css = readFileSync(TOKENS_PATH, 'utf-8');
  const lines = css.split('\n');

  const tokens = {
    meta: {
      source: 'tokens.css',
      parsedAt: new Date().toISOString(),
      version: '1.0.0'
    },
    root: {},
    lightTheme: {},
    highContrast: {}
  };

  let currentContext = 'root';
  let prevLines = [];

  for (const line of lines) {
    // Track context (root, light theme, high contrast)
    if (line.includes('[data-theme="light"]') || line.includes('.theme-light')) {
      currentContext = 'lightTheme';
      continue;
    }
    if (line.includes('@media (prefers-contrast: more)')) {
      currentContext = 'highContrast';
      continue;
    }
    if (line.includes(':root {') && currentContext !== 'root') {
      // Stay in current context for nested :root
    }

    // Parse CSS custom property
    const match = line.match(/--([a-zA-Z0-9-]+):\s*(.+?);/);
    if (match) {
      const [, name, rawValue] = match;
      const { value, type } = parseValue(rawValue);
      const description = extractDescription(line, prevLines);

      tokens[currentContext][name] = {
        value,
        type,
        cssVar: `--${name}`,
        ...(description && { description })
      };
    }

    prevLines.push(line);
    if (prevLines.length > 5) prevLines.shift();
  }

  return tokens;
}

/**
 * Get categorized tokens
 */
export function getCategorizedTokens() {
  const parsed = parseTokensCSS();
  const categorized = {
    colors: {
      background: {},
      foreground: {},
      border: {},
      semantic: {
        success: {},
        error: {},
        warning: {},
        info: {}
      },
      interactive: {},
      overlay: {},
      data: {},
      rank: {}
    },
    typography: {
      fonts: {},
      weights: {},
      lineHeight: {},
      letterSpacing: {},
      scale: {}
    },
    spacing: {},
    borderRadius: {},
    shadows: {},
    animation: {
      easing: {},
      duration: {},
      viewTransition: {}
    },
    opacity: {},
    zIndex: {},
    breakpoints: {},
    containers: {},
    widths: {}
  };

  // Categorize root tokens
  for (const [name, token] of Object.entries(parsed.root)) {
    // Find matching category
    for (const [prefix, path] of Object.entries(TOKEN_CATEGORIES)) {
      if (name.startsWith(prefix)) {
        const parts = path.split('.');
        let target = categorized;
        for (const part of parts.slice(0, -1)) {
          target = target[part];
        }
        const key = parts[parts.length - 1];
        if (!target[key]) target[key] = {};

        // Clean up the token name for the key
        const tokenKey = name.replace(prefix, '').replace(/-/g, '');
        target[key][tokenKey || name] = token;
        break;
      }
    }
  }

  return {
    ...categorized,
    themes: {
      light: parsed.lightTheme,
      highContrast: parsed.highContrast
    },
    meta: parsed.meta
  };
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tokens = parseTokensCSS();
  console.log(JSON.stringify(tokens, null, 2));
}
