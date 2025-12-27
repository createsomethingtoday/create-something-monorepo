#!/usr/bin/env node
/**
 * Token Export Generator
 *
 * Generates multiple output formats from tokens.css:
 * - tokens.dtcg.json (W3C Design Token Community Group format)
 * - tokens.scss (SCSS variables)
 * - canon.json (updated structured format)
 *
 * Single source of truth: tokens.css → all formats
 *
 * Usage:
 *   node scripts/generate-exports.mjs
 *   node scripts/generate-exports.mjs --format=dtcg
 *   node scripts/generate-exports.mjs --format=scss
 *   node scripts/generate-exports.mjs --format=all
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseTokensCSS, getCategorizedTokens } from './parse-tokens.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STYLES_DIR = join(__dirname, '../src/lib/styles');

/**
 * Convert parsed tokens to W3C DTCG format
 * @see https://design-tokens.github.io/community-group/format/
 */
function generateDTCG(parsed) {
  const dtcg = {
    $schema: 'https://design-tokens.github.io/community-group/format/schema.json',
    $description: 'Canon Design System tokens in W3C DTCG format',
    $extensions: {
      'com.createsomething': {
        source: 'tokens.css',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    }
  };

  // Convert root tokens
  for (const [name, token] of Object.entries(parsed.root)) {
    const path = tokenNameToPath(name);
    setNestedValue(dtcg, path, {
      $value: token.value,
      $type: mapTypeToDTCG(token.type),
      ...(token.description && { $description: token.description })
    });
  }

  // Add theme overrides as extensions
  if (Object.keys(parsed.lightTheme).length > 0) {
    dtcg.$extensions['com.createsomething'].themes = {
      light: {}
    };
    for (const [name, token] of Object.entries(parsed.lightTheme)) {
      dtcg.$extensions['com.createsomething'].themes.light[name] = token.value;
    }
  }

  if (Object.keys(parsed.highContrast).length > 0) {
    dtcg.$extensions['com.createsomething'].themes = dtcg.$extensions['com.createsomething'].themes || {};
    dtcg.$extensions['com.createsomething'].themes.highContrast = {};
    for (const [name, token] of Object.entries(parsed.highContrast)) {
      dtcg.$extensions['com.createsomething'].themes.highContrast[name] = token.value;
    }
  }

  return dtcg;
}

/**
 * Convert token name to nested path
 * e.g., "color-bg-pure" → ["color", "bg", "pure"]
 */
function tokenNameToPath(name) {
  return name.split('-');
}

/**
 * Set a value at a nested path in an object
 */
function setNestedValue(obj, path, value) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!current[key] || typeof current[key] !== 'object' || current[key].$value !== undefined) {
      current[key] = {};
    }
    current = current[key];
  }
  current[path[path.length - 1]] = value;
}

/**
 * Map internal type to DTCG type
 */
function mapTypeToDTCG(type) {
  const typeMap = {
    color: 'color',
    dimension: 'dimension',
    duration: 'duration',
    cubicBezier: 'cubicBezier',
    shadow: 'shadow',
    number: 'number',
    string: 'string'
  };
  return typeMap[type] || 'string';
}

/**
 * Generate SCSS variables from parsed tokens
 */
function generateSCSS(parsed) {
  const lines = [
    '// Canon Design System - SCSS Variables',
    '// Auto-generated from tokens.css',
    '// Do not edit directly - modify tokens.css instead',
    `//@generated ${new Date().toISOString()}`,
    '',
    '// ==========================================================================',
    '// Root Tokens',
    '// ==========================================================================',
    ''
  ];

  // Group tokens by category
  const categories = {};
  for (const [name, token] of Object.entries(parsed.root)) {
    const category = name.split('-')[0];
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({ name, token });
  }

  // Generate SCSS for each category
  for (const [category, tokens] of Object.entries(categories)) {
    lines.push(`// ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    lines.push('// ' + '-'.repeat(70));

    for (const { name, token } of tokens) {
      const scssName = `$${name}`;
      const value = formatSCSSValue(token.value, token.type);
      const comment = token.description ? ` // ${token.description}` : '';
      lines.push(`${scssName}: ${value};${comment}`);
    }
    lines.push('');
  }

  // Add CSS variable map for runtime access
  lines.push('// ==========================================================================');
  lines.push('// CSS Variable Map (for dynamic access)');
  lines.push('// ==========================================================================');
  lines.push('');
  lines.push('$canon-tokens: (');

  const tokenEntries = Object.entries(parsed.root);
  tokenEntries.forEach(([name, token], index) => {
    const isLast = index === tokenEntries.length - 1;
    const value = formatSCSSValue(token.value, token.type);
    lines.push(`  '${name}': ${value}${isLast ? '' : ','}`);
  });

  lines.push(');');
  lines.push('');

  // Add utility mixin
  lines.push('// ==========================================================================');
  lines.push('// Utility Mixin');
  lines.push('// ==========================================================================');
  lines.push('');
  lines.push('@mixin canon-var($property, $token) {');
  lines.push('  #{$property}: var(--#{$token}, map-get($canon-tokens, $token));');
  lines.push('}');
  lines.push('');

  // Add theme overrides
  if (Object.keys(parsed.lightTheme).length > 0) {
    lines.push('// ==========================================================================');
    lines.push('// Light Theme Overrides');
    lines.push('// ==========================================================================');
    lines.push('');
    lines.push('$canon-light-theme: (');

    const lightEntries = Object.entries(parsed.lightTheme);
    lightEntries.forEach(([name, token], index) => {
      const isLast = index === lightEntries.length - 1;
      const value = formatSCSSValue(token.value, token.type);
      lines.push(`  '${name}': ${value}${isLast ? '' : ','}`);
    });

    lines.push(');');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format value for SCSS output
 */
function formatSCSSValue(value, type) {
  if (type === 'string' && typeof value === 'string' && !value.startsWith('var(')) {
    // Quote font family strings
    if (value.includes(',') || value.includes(' ')) {
      return `unquote("${value}")`;
    }
  }
  return String(value);
}

/**
 * Generate updated canon.json from parsed tokens
 */
function generateCanonJSON(parsed) {
  const categorized = getCategorizedTokens();
  return {
    $schema: 'https://createsomething.ltd/schemas/canon.json',
    ...categorized
  };
}

/**
 * Write all export formats
 */
function generateAll() {
  console.log('📦 Generating token exports from tokens.css...\n');

  const parsed = parseTokensCSS();
  const tokenCount = Object.keys(parsed.root).length;

  console.log(`  Found ${tokenCount} root tokens`);
  console.log(`  Found ${Object.keys(parsed.lightTheme).length} light theme overrides`);
  console.log(`  Found ${Object.keys(parsed.highContrast).length} high contrast overrides`);
  console.log('');

  // Generate DTCG format
  const dtcg = generateDTCG(parsed);
  const dtcgPath = join(STYLES_DIR, 'tokens.dtcg.json');
  writeFileSync(dtcgPath, JSON.stringify(dtcg, null, 2));
  console.log(`  ✅ Generated tokens.dtcg.json (W3C DTCG format)`);

  // Generate SCSS
  const scss = generateSCSS(parsed);
  const scssPath = join(STYLES_DIR, 'tokens.scss');
  writeFileSync(scssPath, scss);
  console.log(`  ✅ Generated tokens.scss (SCSS variables)`);

  // Generate canon.json
  const canon = generateCanonJSON(parsed);
  const canonPath = join(STYLES_DIR, 'canon.json');
  writeFileSync(canonPath, JSON.stringify(canon, null, 2));
  console.log(`  ✅ Generated canon.json (categorized format)`);

  console.log('\n✨ Token export complete!\n');
  console.log('Files generated:');
  console.log(`  • ${dtcgPath}`);
  console.log(`  • ${scssPath}`);
  console.log(`  • ${canonPath}`);
}

/**
 * CLI entry point
 */
const args = process.argv.slice(2);
const formatArg = args.find(a => a.startsWith('--format='));
const format = formatArg ? formatArg.split('=')[1] : 'all';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const parsed = parseTokensCSS();

  switch (format) {
    case 'dtcg':
      const dtcg = generateDTCG(parsed);
      console.log(JSON.stringify(dtcg, null, 2));
      break;
    case 'scss':
      console.log(generateSCSS(parsed));
      break;
    case 'canon':
      const canon = generateCanonJSON(parsed);
      console.log(JSON.stringify(canon, null, 2));
      break;
    case 'all':
    default:
      generateAll();
  }
}

// Exports for programmatic use
export { generateDTCG, generateSCSS, generateCanonJSON, generateAll };
