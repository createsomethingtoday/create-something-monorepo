/**
 * Format Comparison Analysis
 *
 * Measures token efficiency and parse reliability for agent harness data formats.
 * Through the Subtractive Triad: which format removes the most noise while preserving signal?
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const dir = import.meta.dirname || __dirname;

// Read all formats
const jsonContent = readFileSync(join(dir, 'features.json'), 'utf-8');
const toonContent = readFileSync(join(dir, 'features.toon'), 'utf-8');
const csvContent = readFileSync(join(dir, 'features.csv'), 'utf-8');

// Token estimation (Claude uses ~4 chars per token on average, but structured data varies)
// More accurate: count actual semantic units
function estimateTokens(content: string): number {
  // Rough estimation based on whitespace-separated tokens + punctuation
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const punctuation = (content.match(/[{}\[\]:,"]/g) || []).length;
  // Each word is roughly 1-2 tokens, each punctuation is 1 token
  return Math.ceil(words.length * 1.3 + punctuation * 0.5);
}

// More precise: character-based estimate (Claude tokenizer averages ~3.5 chars/token for code)
function estimateTokensChars(content: string): number {
  return Math.ceil(content.length / 3.5);
}

// Byte size
function byteSize(content: string): number {
  return Buffer.byteLength(content, 'utf-8');
}

// Line count
function lineCount(content: string): number {
  return content.split('\n').length;
}

// Parse test
function canParseJSON(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

function canParseTOON(content: string): boolean {
  // Basic TOON structure validation
  const lines = content.split('\n').filter(l => l.trim());
  const hasHeader = lines.some(l => l.includes('[') && l.includes('{'));
  const hasData = lines.some(l => l.startsWith('  '));
  return hasHeader && hasData;
}

function canParseCSV(content: string): boolean {
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  if (lines.length < 2) return false;
  const headerCols = lines[0].split(',').length;
  return lines.slice(1).every(l => l.split(',').length === headerCols);
}

// Results
console.log('='.repeat(60));
console.log('FORMAT COMPARISON: Agent Harness Data');
console.log('='.repeat(60));
console.log();

const formats = [
  { name: 'JSON', content: jsonContent, parser: canParseJSON },
  { name: 'TOON', content: toonContent, parser: canParseTOON },
  { name: 'CSV', content: csvContent, parser: canParseCSV },
];

const results = formats.map(f => ({
  name: f.name,
  bytes: byteSize(f.content),
  lines: lineCount(f.content),
  tokensWord: estimateTokens(f.content),
  tokensChar: estimateTokensChars(f.content),
  parseable: f.parser(f.content),
}));

// Table output
console.log('METRICS:');
console.log('-'.repeat(60));
console.log(
  'Format'.padEnd(8),
  'Bytes'.padStart(8),
  'Lines'.padStart(8),
  'Tokens~'.padStart(10),
  'Parseable'.padStart(12)
);
console.log('-'.repeat(60));

const jsonResult = results.find(r => r.name === 'JSON')!;

results.forEach(r => {
  const savings = ((1 - r.tokensChar / jsonResult.tokensChar) * 100).toFixed(0);
  const savingsStr = r.name === 'JSON' ? '-' : `${savings}%`;
  console.log(
    r.name.padEnd(8),
    r.bytes.toString().padStart(8),
    r.lines.toString().padStart(8),
    r.tokensChar.toString().padStart(10),
    r.parseable.toString().padStart(12)
  );
});

console.log('-'.repeat(60));
console.log();

// Token savings
console.log('TOKEN SAVINGS vs JSON:');
results.filter(r => r.name !== 'JSON').forEach(r => {
  const savings = ((1 - r.tokensChar / jsonResult.tokensChar) * 100).toFixed(1);
  console.log(`  ${r.name}: ${savings}% fewer tokens`);
});

console.log();
console.log('='.repeat(60));
console.log('ANALYSIS (Subtractive Triad):');
console.log('='.repeat(60));
console.log();
console.log('DRY (Implementation):');
console.log('  JSON: Universal support, no new dependencies');
console.log('  TOON: Requires toon-js/toon-py library');
console.log('  CSV:  Universal support, built into most languages');
console.log();
console.log('Rams (Artifact - Does it earn its existence?):');
console.log('  JSON: Verbose for tabular data (repeated keys)');
console.log('  TOON: Minimal redundancy, headers declared once');
console.log('  CSV:  Minimal redundancy, but limited nesting');
console.log();
console.log('Heidegger (System - Does it serve the whole?):');
console.log('  JSON: Agents can parse/generate natively');
console.log('  TOON: Requires format awareness, emerging');
console.log('  CSV:  Agents understand, but lose hierarchy');
console.log();
