/**
 * Fine-Tune Generation Module
 * Generates images using fine-tuned Flux LoRA models
 */

import Replicate from 'replicate';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  FineTunedModel,
  FineTuneGenerateOptions,
  FineTuneGenerateResult
} from './types.js';

// Registered fine-tuned models
// Add new models here after training
const FINE_TUNED_MODELS: Record<string, FineTunedModel> = {
  'flux-canon': {
    id: 'createsomethingtoday/flux-canon:e58a7870194904cc2e715f42802bb67b07057aed9069da0fc03accc315939705',
    name: 'CREATE SOMETHING Canon Style',
    triggerWord: 'CSMTH',
    loraScale: 0.8
  }
};

// Default generation parameters for Canon-style outputs
const CANON_DEFAULTS: Partial<FineTuneGenerateOptions> = {
  steps: 28,
  guidance: 3.5,
  loraScale: 0.8,
  width: 1024,
  height: 1024
};

let replicateClient: Replicate | null = null;

/**
 * Get or create Replicate client
 */
function getClient(): Replicate {
  if (!replicateClient) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error(
        'REPLICATE_API_TOKEN environment variable not set. ' +
          'Get your token at https://replicate.com/account/api-tokens'
      );
    }
    replicateClient = new Replicate({ auth: token });
  }
  return replicateClient;
}

/**
 * Register a new fine-tuned model
 */
export function registerModel(key: string, model: FineTunedModel): void {
  FINE_TUNED_MODELS[key] = model;
  console.log(`Registered fine-tuned model: ${key} -> ${model.id}`);
}

/**
 * Get a registered fine-tuned model
 */
export function getModel(key: string): FineTunedModel | undefined {
  return FINE_TUNED_MODELS[key];
}

/**
 * List all registered fine-tuned models
 */
export function listModels(): FineTunedModel[] {
  return Object.values(FINE_TUNED_MODELS);
}

/**
 * Generate image using a fine-tuned model
 *
 * @param modelKey - Key of registered model (e.g., 'flux-canon')
 * @param options - Generation options
 * @returns Generated image result
 */
export async function generate(
  modelKey: string,
  options: FineTuneGenerateOptions
): Promise<FineTuneGenerateResult> {
  const model = FINE_TUNED_MODELS[modelKey];
  if (!model) {
    throw new Error(
      `Model "${modelKey}" not found. Available models: ${Object.keys(FINE_TUNED_MODELS).join(', ')}`
    );
  }

  return generateWithModel(model, options);
}

/**
 * Generate image using a model reference directly
 */
export async function generateWithModel(
  model: FineTunedModel,
  options: FineTuneGenerateOptions
): Promise<FineTuneGenerateResult> {
  const startTime = Date.now();
  const client = getClient();

  const {
    prompt,
    steps = CANON_DEFAULTS.steps,
    guidance = CANON_DEFAULTS.guidance,
    loraScale = model.loraScale ?? CANON_DEFAULTS.loraScale,
    width = CANON_DEFAULTS.width,
    height = CANON_DEFAULTS.height,
    outputPath,
    seed
  } = options;

  // Validate trigger word is in prompt
  if (!prompt.includes(model.triggerWord)) {
    console.warn(
      `Warning: Prompt does not contain trigger word "${model.triggerWord}". ` +
        `Results may not reflect the fine-tuned style.`
    );
  }

  console.log(`Generating with ${model.name}...`);
  console.log(`  Model: ${model.id}`);
  console.log(`  Prompt: ${prompt.slice(0, 80)}...`);
  console.log(`  LoRA scale: ${loraScale}`);

  // Build input for Flux LoRA inference
  const input: Record<string, unknown> = {
    prompt,
    num_inference_steps: steps,
    guidance_scale: guidance,
    lora_scale: loraScale,
    width,
    height,
    output_format: 'png',
    output_quality: 100
  };

  if (seed !== undefined) {
    input.seed = seed;
  }

  // Parse model ID - can be "owner/name" or "owner/name:version"
  const [modelName, versionHash] = model.id.includes(':')
    ? model.id.split(':')
    : [model.id, undefined];

  // Run prediction - use version if specified, otherwise model name
  const prediction = versionHash
    ? await client.predictions.create({
        version: versionHash,
        input
      })
    : await client.predictions.create({
        model: modelName,
        input
      });

  console.log(`  Prediction ID: ${prediction.id}`);

  // Wait for completion
  const completed = await client.wait(prediction);

  if (completed.status === 'failed') {
    throw new Error(`Generation failed: ${completed.error}`);
  }

  // Extract output URL
  const output = completed.output;
  let outputUrl: string;

  if (Array.isArray(output)) {
    outputUrl = output[0] as string;
  } else if (typeof output === 'string') {
    outputUrl = output;
  } else if (typeof output === 'object' && output !== null) {
    const obj = output as Record<string, unknown>;
    outputUrl = (obj.url || obj.output || obj[0]) as string;
  } else {
    throw new Error(`Unexpected output format: ${typeof output}`);
  }

  // Fetch image
  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated image: ${response.status}`);
  }
  const imageBuffer = Buffer.from(await response.arrayBuffer());

  // Save if path provided
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, imageBuffer);
    console.log(`  Saved: ${outputPath}`);
  }

  const duration = Date.now() - startTime;
  console.log(`  Done in ${(duration / 1000).toFixed(1)}s`);

  return {
    image: imageBuffer,
    outputPath,
    predictionId: prediction.id,
    duration,
    seed: seed
  };
}

/**
 * Generate using direct model ID (for testing new models)
 */
export async function generateDirect(
  modelId: string,
  triggerWord: string,
  options: FineTuneGenerateOptions
): Promise<FineTuneGenerateResult> {
  const model: FineTunedModel = {
    id: modelId,
    name: 'Direct Model',
    triggerWord,
    loraScale: options.loraScale ?? 0.8
  };

  return generateWithModel(model, options);
}

/**
 * Generate Canon-style prompt with trigger word
 *
 * Builds a prompt optimized for CREATE SOMETHING Canon aesthetic
 */
export function buildCanonPrompt(subject: string, triggerWord = 'CSMTH'): string {
  return `${triggerWord} style, ${subject}, minimalist design, pure black background, high contrast, architectural negative space, Dieter Rams aesthetic, Swiss design influence, golden ratio composition, clean typography, editorial quality`;
}

/**
 * Generate multiple images in batch
 */
export async function generateBatch(
  modelKey: string,
  prompts: string[],
  baseOptions: Partial<FineTuneGenerateOptions> = {},
  outputDir?: string
): Promise<FineTuneGenerateResult[]> {
  const results: FineTuneGenerateResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const outputPath = outputDir
      ? path.join(outputDir, `output-${i + 1}.png`)
      : undefined;

    console.log(`\nGenerating ${i + 1}/${prompts.length}...`);

    try {
      const result = await generate(modelKey, {
        ...baseOptions,
        prompt,
        outputPath
      });
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate image ${i + 1}:`, error);
      // Continue with remaining images
    }
  }

  return results;
}

/**
 * Test subjects for Zuhandenheit evaluation
 *
 * 5 abstract concepts + 5 diagrams as specified in the plan
 */
export const TEST_SUBJECTS = {
  abstract: [
    'the hermeneutic circle - understanding flowing between part and whole',
    'Zuhandenheit - a tool so natural it disappears in use',
    'subtractive design - the essence revealed through removal',
    'Gelassenheit - serene letting-be of technology',
    'the fourfold - earth, sky, mortals, divinities in dwelling'
  ],
  diagrams: [
    'system architecture diagram showing data flow between services',
    'comparison matrix of design approaches with clear hierarchy',
    'process flow from input through transformation to output',
    'organizational chart with minimal nodes and connections',
    'timeline visualization with milestone markers'
  ]
};

/**
 * Generate all test subjects for evaluation
 */
export async function generateTestSet(
  modelKey: string,
  outputDir: string,
  triggerWord = 'CSMTH'
): Promise<{ abstract: FineTuneGenerateResult[]; diagrams: FineTuneGenerateResult[] }> {
  console.log('Generating test set for Zuhandenheit evaluation...\n');

  const abstractPrompts = TEST_SUBJECTS.abstract.map((subject) =>
    buildCanonPrompt(subject, triggerWord)
  );
  const diagramPrompts = TEST_SUBJECTS.diagrams.map((subject) =>
    buildCanonPrompt(subject, triggerWord)
  );

  console.log('=== Abstract Concepts (5) ===');
  const abstractResults = await generateBatch(
    modelKey,
    abstractPrompts,
    {},
    path.join(outputDir, 'abstract')
  );

  console.log('\n=== Diagrams (5) ===');
  const diagramResults = await generateBatch(
    modelKey,
    diagramPrompts,
    {},
    path.join(outputDir, 'diagrams')
  );

  console.log(`\nTest set complete: ${abstractResults.length + diagramResults.length} images`);
  console.log(`Output directory: ${outputDir}`);

  return {
    abstract: abstractResults,
    diagrams: diagramResults
  };
}
