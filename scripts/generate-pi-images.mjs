#!/usr/bin/env node
/**
 * Generate Personal Injury template images using Imagen 3
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

const GEMINI_API_KEY = 'AIzaSyDUGN6Z1cnkWzhSGajLhgKyI-ONdI9vMZ8';
const BASE_PATH = '/Users/micahjohnson/Documents/Github/Create Something/create-something-monorepo';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImage(prompt, outputPath) {
  console.log(`\nGenerating: ${outputPath.split('/').pop()}`);
  console.log(`  Prompt: ${prompt.substring(0, 80)}...`);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: outputPath.includes('hero') ? '16:9' : '3:4'
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log(`  ✗ API Error: ${response.status}`);
      console.log(`    ${error.substring(0, 200)}`);
      return false;
    }

    const data = await response.json();
    const imageData = data.predictions?.[0]?.bytesBase64Encoded;

    if (!imageData) {
      console.log('  ✗ No image in response');
      return false;
    }

    const imageBuffer = Buffer.from(imageData, 'base64');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, imageBuffer);

    console.log(`  ✓ Saved (${Math.round(imageBuffer.length / 1024)}KB)`);
    return true;
  } catch (error) {
    console.log(`  ✗ Error: ${error.message}`);
    return false;
  }
}

const images = [
  {
    prompt: 'Professional photograph of San Diego downtown skyline at golden hour dusk, Coronado bridge visible in distance, scales of justice silhouette subtly overlaid in dramatic orange and blue sky, modern law firm aesthetic, photorealistic, cinematic lighting, architectural photography style, 8K resolution',
    path: 'packages/verticals/personal-injury/static/images/hero-justice.png'
  },
  {
    prompt: 'Professional headshot portrait of a confident Latino male attorney in his mid-40s, distinguished salt and pepper hair, wearing dark navy suit with burgundy tie, neutral dark gray studio background, warm professional lighting, photorealistic, corporate executive style, trustworthy and experienced expression, sharp focus, 8K',
    path: 'packages/verticals/personal-injury/static/images/attorney-martinez.png'
  },
  {
    prompt: 'Professional headshot portrait of a confident Latina woman attorney in her late 30s, dark hair pulled back professionally, wearing elegant black blazer with white silk blouse, neutral dark gray studio background, warm professional lighting, photorealistic, corporate executive style, approachable yet authoritative expression, sharp focus, 8K',
    path: 'packages/verticals/personal-injury/static/images/attorney-rivera.png'
  },
  {
    prompt: 'Professional headshot portrait of a confident African American male attorney in his early 30s, short hair with neat fade, wearing charcoal gray suit with light blue tie, neutral dark gray studio background, warm professional lighting, photorealistic, corporate professional style, confident and determined expression, sharp focus, 8K',
    path: 'packages/verticals/personal-injury/static/images/attorney-johnson.png'
  }
];

async function main() {
  console.log('=== Generating Martinez & Rivera Images ===');
  console.log(`Images to generate: ${images.length}`);

  let success = 0;
  for (const img of images) {
    const fullPath = `${BASE_PATH}/${img.path}`;
    if (await generateImage(img.prompt, fullPath)) {
      success++;
    }
    await sleep(5000); // 5s delay between requests
  }

  console.log(`\n=== Complete: ${success}/${images.length} generated ===`);
}

main().catch(console.error);
