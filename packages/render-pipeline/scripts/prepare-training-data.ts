#!/usr/bin/env tsx
/**
 * Prepare Training Data Script
 *
 * Downloads images from Are.na canon-minimalism channel,
 * processes them to 1024x1024, and packages into a zip for Flux training.
 *
 * Usage:
 *   # With Are.na API (fetches fresh from channel)
 *   pnpm prepare-training --channel canon-minimalism --output ./training-data
 *
 *   # With manifest file (uses cached URLs)
 *   pnpm prepare-training --manifest ./manifest.json --output ./training-data
 *
 *   # With direct URLs
 *   pnpm prepare-training --urls image1.jpg,image2.jpg --output ./training-data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import type { TrainingImage, TrainingManifest } from '../src/fine-tune/types.js';

// Are.na API configuration
const ARENA_API = 'https://api.are.na/v2';
const TARGET_SIZE = 1024;
const R2_BUCKET = 'canon-training-data';

interface ArenaBlock {
  id: number;
  title: string;
  image?: {
    display?: { url: string };
    large?: { url: string };
    original?: { url: string };
  };
  source?: {
    url: string;
  };
}

interface ArenaChannel {
  contents: ArenaBlock[];
  length: number;
}

/**
 * Fetch channel contents from Are.na API
 */
async function fetchArenaChannel(slug: string): Promise<ArenaBlock[]> {
  console.log(`Fetching Are.na channel: ${slug}`);

  const allBlocks: ArenaBlock[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${ARENA_API}/channels/${slug}/contents?page=${page}&per=${perPage}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch Are.na channel: ${response.status}`);
    }

    const data = (await response.json()) as ArenaChannel;
    const blocks = data.contents || [];

    if (blocks.length === 0) break;

    allBlocks.push(...blocks);
    console.log(`  Page ${page}: ${blocks.length} blocks (total: ${allBlocks.length})`);

    if (blocks.length < perPage) break;
    page++;
  }

  return allBlocks;
}

/**
 * Filter blocks to only images
 */
function filterImageBlocks(blocks: ArenaBlock[]): ArenaBlock[] {
  return blocks.filter((block) => block.image && (block.image.display || block.image.large || block.image.original));
}

/**
 * Get best image URL from block
 */
function getImageUrl(block: ArenaBlock): string | null {
  if (!block.image) return null;
  return block.image.display?.url || block.image.large?.url || block.image.original?.url || null;
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Process image to target size (1024x1024)
 * Resizes to fit within bounds while maintaining aspect ratio,
 * then pads to square if needed
 */
async function processImage(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || TARGET_SIZE;
  const height = metadata.height || TARGET_SIZE;

  // Resize to fit within TARGET_SIZE, maintaining aspect ratio
  let processed = sharp(buffer).resize(TARGET_SIZE, TARGET_SIZE, {
    fit: 'inside',
    withoutEnlargement: false
  });

  // Get resized dimensions
  const resizedMeta = await processed.toBuffer().then((b) => sharp(b).metadata());
  const newWidth = resizedMeta.width || TARGET_SIZE;
  const newHeight = resizedMeta.height || TARGET_SIZE;

  // If not square, extend to square with black padding
  if (newWidth !== TARGET_SIZE || newHeight !== TARGET_SIZE) {
    const left = Math.floor((TARGET_SIZE - newWidth) / 2);
    const top = Math.floor((TARGET_SIZE - newHeight) / 2);

    processed = sharp(buffer)
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: 'inside',
        withoutEnlargement: false
      })
      .extend({
        top,
        bottom: TARGET_SIZE - newHeight - top,
        left,
        right: TARGET_SIZE - newWidth - left,
        background: { r: 0, g: 0, b: 0, alpha: 1 } // Pure black (Canon)
      });
  }

  return processed.png().toBuffer();
}

/**
 * Create training manifest from Are.na blocks
 */
function createManifestFromBlocks(blocks: ArenaBlock[], triggerWord: string): TrainingManifest {
  const images: TrainingImage[] = blocks.map((block) => ({
    id: `arena-${block.id}`,
    sourceUrl: getImageUrl(block) || '',
    source: 'canon-minimalism',
    selected: true
  }));

  return {
    id: `training-${triggerWord.toLowerCase()}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    triggerWord,
    images: images.filter((img) => img.sourceUrl),
    totalImages: images.length,
    selectedImages: images.filter((img) => img.selected && img.sourceUrl).length,
    r2Bucket: R2_BUCKET
  };
}

/**
 * Create zip archive from image buffers
 */
async function createZip(images: Array<{ name: string; buffer: Buffer }>, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`  Created zip: ${outputPath} (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);

    for (const { name, buffer } of images) {
      archive.append(buffer, { name });
    }

    archive.finalize();
  });
}

/**
 * Main preparation workflow
 */
async function prepareTrainingData(options: {
  channel?: string;
  manifestPath?: string;
  urls?: string[];
  outputDir: string;
  triggerWord?: string;
  maxImages?: number;
}): Promise<void> {
  const { channel = 'canon-minimalism', manifestPath, urls, outputDir, triggerWord = 'CSMTH', maxImages = 30 } = options;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  let manifest: TrainingManifest;
  let imageUrls: string[] = [];

  if (manifestPath) {
    // Load existing manifest
    console.log(`Loading manifest: ${manifestPath}`);
    const content = await fs.readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(content) as TrainingManifest;
    imageUrls = manifest.images.filter((img) => img.selected).map((img) => img.sourceUrl);
  } else if (urls && urls.length > 0) {
    // Use provided URLs
    console.log(`Using ${urls.length} provided URLs`);
    imageUrls = urls;
    manifest = {
      id: `training-${triggerWord.toLowerCase()}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      triggerWord,
      images: urls.map((url, i) => ({
        id: `url-${i}`,
        sourceUrl: url,
        source: 'direct',
        selected: true
      })),
      totalImages: urls.length,
      selectedImages: urls.length,
      r2Bucket: R2_BUCKET
    };
  } else {
    // Fetch from Are.na
    console.log(`\nFetching images from Are.na channel: ${channel}`);
    const blocks = await fetchArenaChannel(channel);
    const imageBlocks = filterImageBlocks(blocks);
    console.log(`  Found ${imageBlocks.length} image blocks`);

    // Create manifest
    manifest = createManifestFromBlocks(imageBlocks, triggerWord);
    imageUrls = manifest.images.slice(0, maxImages).map((img) => img.sourceUrl);
    console.log(`  Selected ${imageUrls.length} images for training`);
  }

  // Limit to maxImages
  if (imageUrls.length > maxImages) {
    console.log(`  Limiting to ${maxImages} images`);
    imageUrls = imageUrls.slice(0, maxImages);
  }

  // Download and process images
  console.log(`\nDownloading and processing ${imageUrls.length} images...`);
  const processedImages: Array<{ name: string; buffer: Buffer }> = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const imageName = `image_${String(i + 1).padStart(3, '0')}.png`;

    try {
      process.stdout.write(`  [${i + 1}/${imageUrls.length}] Downloading... `);

      // Download
      const rawBuffer = await downloadImage(url);

      // Process to 1024x1024
      process.stdout.write('Processing... ');
      const processedBuffer = await processImage(rawBuffer);

      // Save individual file
      const imagePath = path.join(outputDir, 'images', imageName);
      await fs.mkdir(path.dirname(imagePath), { recursive: true });
      await fs.writeFile(imagePath, processedBuffer);

      processedImages.push({ name: imageName, buffer: processedBuffer });
      successCount++;
      console.log('Done');
    } catch (error) {
      failCount++;
      console.log(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`\nProcessed ${successCount} images (${failCount} failed)`);

  if (processedImages.length < 10) {
    console.warn('\nWarning: Fewer than 10 images. Replicate recommends at least 10 for good results.');
  }

  // Create zip file
  const zipPath = path.join(outputDir, 'training-images.zip');
  console.log(`\nCreating training zip...`);
  await createZip(processedImages, zipPath);

  // Update and save manifest
  manifest.selectedImages = processedImages.length;
  manifest.zipPath = zipPath;
  const manifestOutputPath = path.join(outputDir, 'manifest.json');
  await fs.writeFile(manifestOutputPath, JSON.stringify(manifest, null, 2));
  console.log(`  Saved manifest: ${manifestOutputPath}`);

  // Summary
  console.log(`
=== Training Data Ready ===
  Images: ${processedImages.length}
  Zip: ${zipPath}
  Manifest: ${manifestOutputPath}
  Trigger word: ${triggerWord}

Next steps:
  1. Review images in ${path.join(outputDir, 'images')}
  2. Remove any that don't match Canon criteria
  3. Re-run with --manifest to regenerate zip
  4. Train: pnpm finetune-train --input ${zipPath} --trigger ${triggerWord}
`);
}

// Parse CLI arguments
function parseArgs(): {
  channel?: string;
  manifest?: string;
  urls?: string[];
  output: string;
  trigger?: string;
  max?: number;
} {
  const args = process.argv.slice(2);
  const result: ReturnType<typeof parseArgs> = {
    output: './training-data'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--channel' || arg === '-c') {
      result.channel = nextArg;
      i++;
    } else if (arg === '--manifest' || arg === '-m') {
      result.manifest = nextArg;
      i++;
    } else if (arg === '--urls' || arg === '-u') {
      result.urls = nextArg?.split(',').map((u) => u.trim());
      i++;
    } else if (arg === '--output' || arg === '-o') {
      result.output = nextArg;
      i++;
    } else if (arg === '--trigger' || arg === '-t') {
      result.trigger = nextArg;
      i++;
    } else if (arg === '--max') {
      result.max = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: pnpm prepare-training [options]

Options:
  -c, --channel <slug>    Are.na channel slug (default: canon-minimalism)
  -m, --manifest <path>   Use existing manifest file
  -u, --urls <list>       Comma-separated image URLs
  -o, --output <dir>      Output directory (default: ./training-data)
  -t, --trigger <word>    Trigger word (default: CSMTH)
  --max <n>               Maximum images to process (default: 30)
  -h, --help              Show this help

Examples:
  # Fetch from Are.na channel
  pnpm prepare-training -c canon-minimalism -o ./training-data

  # Use existing manifest
  pnpm prepare-training -m ./manifest.json -o ./training-data

  # Direct URLs
  pnpm prepare-training -u "https://example.com/img1.jpg,https://example.com/img2.jpg"
`);
      process.exit(0);
    }
  }

  return result;
}

// Run
const args = parseArgs();
prepareTrainingData({
  channel: args.channel,
  manifestPath: args.manifest,
  urls: args.urls,
  outputDir: args.output,
  triggerWord: args.trigger,
  maxImages: args.max
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
