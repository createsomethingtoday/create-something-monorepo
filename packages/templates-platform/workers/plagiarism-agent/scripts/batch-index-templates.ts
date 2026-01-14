#!/usr/bin/env npx tsx
/**
 * Batch Index Templates
 * 
 * Reads template URLs from CSV and indexes them via the MinHash endpoint.
 * 
 * Usage:
 *   npx tsx scripts/batch-index-templates.ts [--start N] [--limit N] [--dry-run]
 * 
 * Options:
 *   --start N    Start from row N (default: 0)
 *   --limit N    Process only N templates (default: all)
 *   --dry-run    Don't actually index, just show what would be done
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const WORKER_URL = 'https://plagiarism-agent.createsomething.workers.dev';
const CSV_PATH = '/Users/micahjohnson/Downloads/👛Assets-All Templates (1).csv';
const BATCH_SIZE = 5;           // Concurrent requests
const DELAY_BETWEEN_BATCHES = 2000; // ms between batches
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000;       // ms between retries

// =============================================================================
// TYPES
// =============================================================================

interface Template {
  name: string;
  url: string;
  id: string;
}

interface IndexResult {
  id: string;
  success: boolean;
  error?: string;
  shingles?: { css: number; html: number };
}

// =============================================================================
// CSV PARSING
// =============================================================================

function parseCSV(csvPath: string): Template[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  const templates: Template[] = [];
  
  for (const line of dataLines) {
    // Parse CSV (handle commas in quoted fields)
    const match = line.match(/^([^,]+),(.+)$/);
    if (!match) continue;
    
    const name = match[1].trim().replace(/^"|"$/g, '');
    let url = match[2].trim().replace(/^"|"$/g, '');
    
    // Skip empty URLs
    if (!url || url === '') continue;
    
    // Normalize URL
    url = normalizeUrl(url);
    if (!url) continue;
    
    // Generate ID from name
    const id = generateId(name);
    
    templates.push({ name, url, id });
  }
  
  return templates;
}

function normalizeUrl(url: string): string | null {
  try {
    // Handle various URL formats
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    // Convert webflow.com to webflow.io
    url = url.replace('.webflow.com', '.webflow.io');
    
    // Ensure trailing slash for consistency
    if (!url.endsWith('/') && !url.includes('?')) {
      url = url + '/';
    }
    
    // Validate URL
    new URL(url);
    
    return url;
  } catch {
    return null;
  }
}

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// =============================================================================
// INDEXING
// =============================================================================

async function indexTemplate(template: Template, dryRun: boolean): Promise<IndexResult> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would index: ${template.id} (${template.url})`);
    return { id: template.id, success: true };
  }
  
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${WORKER_URL}/minhash/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          url: template.url,
          name: template.name
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json() as any;
      
      if (result.success) {
        return {
          id: template.id,
          success: true,
          shingles: result.shingles
        };
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      if (attempt < RETRY_ATTEMPTS) {
        console.log(`  ⚠️ Attempt ${attempt} failed for ${template.id}: ${error.message}. Retrying...`);
        await sleep(RETRY_DELAY);
      } else {
        return {
          id: template.id,
          success: false,
          error: error.message
        };
      }
    }
  }
  
  return { id: template.id, success: false, error: 'Max retries exceeded' };
}

async function indexBatch(
  templates: Template[],
  dryRun: boolean
): Promise<IndexResult[]> {
  const results = await Promise.all(
    templates.map(t => indexTemplate(t, dryRun))
  );
  return results;
}

// =============================================================================
// UTILITIES
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArgs(): { start: number; limit: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let start = 0;
  let limit = Infinity;
  let dryRun = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
      start = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  
  return { start, limit, dryRun };
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const { start, limit, dryRun } = parseArgs();
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  BATCH INDEX TEMPLATES');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`CSV Path: ${CSV_PATH}`);
  console.log(`Worker URL: ${WORKER_URL}`);
  console.log(`Start: ${start}, Limit: ${limit === Infinity ? 'all' : limit}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log('');
  
  // Parse CSV
  console.log('Parsing CSV...');
  const allTemplates = parseCSV(CSV_PATH);
  console.log(`Found ${allTemplates.length} templates`);
  
  // Apply start/limit
  const templates = allTemplates.slice(start, start + limit);
  console.log(`Processing ${templates.length} templates (${start} to ${start + templates.length - 1})`);
  console.log('');
  
  // Process in batches
  let successCount = 0;
  let failCount = 0;
  const failures: IndexResult[] = [];
  
  const startTime = Date.now();
  
  for (let i = 0; i < templates.length; i += BATCH_SIZE) {
    const batch = templates.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(templates.length / BATCH_SIZE);
    
    console.log(`Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, templates.length)} of ${templates.length})`);
    
    const results = await indexBatch(batch, dryRun);
    
    for (const result of results) {
      if (result.success) {
        successCount++;
        const shingleInfo = result.shingles 
          ? ` (${result.shingles.css} CSS, ${result.shingles.html} HTML shingles)`
          : '';
        console.log(`  ✅ ${result.id}${shingleInfo}`);
      } else {
        failCount++;
        failures.push(result);
        console.log(`  ❌ ${result.id}: ${result.error}`);
      }
    }
    
    // Progress
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = (i + batch.length) / elapsed;
    const remaining = (templates.length - i - batch.length) / rate;
    console.log(`  Progress: ${successCount + failCount}/${templates.length} (${rate.toFixed(1)}/sec, ~${Math.ceil(remaining / 60)} min remaining)`);
    console.log('');
    
    // Delay between batches
    if (i + BATCH_SIZE < templates.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }
  
  // Summary
  const totalTime = (Date.now() - startTime) / 1000;
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Total: ${templates.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Time: ${(totalTime / 60).toFixed(1)} minutes`);
  console.log(`Rate: ${(templates.length / totalTime).toFixed(1)} templates/sec`);
  console.log('');
  
  if (failures.length > 0) {
    console.log('FAILURES:');
    for (const f of failures) {
      console.log(`  ${f.id}: ${f.error}`);
    }
    console.log('');
    
    // Write failures to file for retry
    const failuresPath = path.join(__dirname, 'failures.json');
    fs.writeFileSync(failuresPath, JSON.stringify(failures, null, 2));
    console.log(`Failures written to: ${failuresPath}`);
  }
}

main().catch(console.error);
