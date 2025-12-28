#!/usr/bin/env tsx
/**
 * Fine-Tune Generation CLI
 *
 * Generates images using a fine-tuned Flux LoRA model.
 *
 * Usage:
 *   # Single image
 *   pnpm finetune-generate --model flux-canon --prompt "CSMTH style, hermeneutic circle"
 *
 *   # Full test set for evaluation
 *   pnpm finetune-generate --model flux-canon --test-set --output ./evaluation
 *
 *   # Using direct model ID (before registration)
 *   pnpm finetune-generate --model-id "user/model:version" --trigger CSMTH --prompt "..."
 */

import * as path from 'path';
import {
  registerModel,
  generate,
  generateDirect,
  generateTestSet,
  buildCanonPrompt
} from '../src/fine-tune/generate.js';

function parseArgs(): {
  model?: string;
  modelId?: string;
  trigger: string;
  prompt?: string;
  output: string;
  testSet: boolean;
  width: number;
  height: number;
  seed?: number;
} {
  const args = process.argv.slice(2);
  const result = {
    trigger: 'CSMTH',
    output: './output',
    testSet: false,
    width: 1024,
    height: 1024
  } as ReturnType<typeof parseArgs>;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--model' || arg === '-m') {
      result.model = nextArg;
      i++;
    } else if (arg === '--model-id') {
      result.modelId = nextArg;
      i++;
    } else if (arg === '--trigger' || arg === '-t') {
      result.trigger = nextArg;
      i++;
    } else if (arg === '--prompt' || arg === '-p') {
      result.prompt = nextArg;
      i++;
    } else if (arg === '--output' || arg === '-o') {
      result.output = nextArg;
      i++;
    } else if (arg === '--test-set') {
      result.testSet = true;
    } else if (arg === '--width' || arg === '-w') {
      result.width = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--height' || arg === '-h' && nextArg && !nextArg.startsWith('-')) {
      result.height = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--seed') {
      result.seed = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: pnpm finetune-generate [options]

Options:
  -m, --model <name>      Registered model name (e.g., flux-canon)
  --model-id <id>         Direct Replicate model ID (e.g., user/model:version)
  -t, --trigger <word>    Trigger word (default: CSMTH, required with --model-id)
  -p, --prompt <text>     Generation prompt (should include trigger word)
  -o, --output <dir>      Output directory (default: ./output)
  --test-set              Generate full test set (10 images) for evaluation
  -w, --width <n>         Output width (default: 1024)
  --height <n>            Output height (default: 1024)
  --seed <n>              Random seed for reproducibility
  -h, --help              Show this help

Examples:
  # Single image with registered model
  pnpm finetune-generate -m flux-canon -p "CSMTH style, minimalist diagram"

  # Full test set for evaluation
  pnpm finetune-generate -m flux-canon --test-set -o ./evaluation

  # Direct model ID (before registration)
  pnpm finetune-generate --model-id "user/model:v1" -t CSMTH -p "CSMTH style, ..."

  # Auto-generate Canon prompt
  pnpm finetune-generate -m flux-canon -p "hermeneutic circle visualization"
`);
      process.exit(0);
    }
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Validate
  if (!args.model && !args.modelId) {
    console.error('Error: Either --model or --model-id is required');
    process.exit(1);
  }

  if (args.modelId && !args.trigger) {
    console.error('Error: --trigger is required when using --model-id');
    process.exit(1);
  }

  if (!args.testSet && !args.prompt) {
    console.error('Error: Either --prompt or --test-set is required');
    process.exit(1);
  }

  console.log(`
=== Flux LoRA Generation ===
  Model: ${args.model || args.modelId}
  Trigger: ${args.trigger}
  Output: ${args.output}
  ${args.testSet ? 'Mode: Full test set (10 images)' : `Prompt: ${args.prompt?.slice(0, 60)}...`}
`);

  try {
    if (args.testSet) {
      // Generate full test set
      if (args.modelId) {
        // Register temporary model for test set
        registerModel('temp-model', {
          id: args.modelId,
          name: 'Temporary Model',
          triggerWord: args.trigger
        });
        await generateTestSet('temp-model', args.output, args.trigger);
      } else {
        await generateTestSet(args.model!, args.output, args.trigger);
      }

      console.log(`
=== Test Set Complete ===
  Output: ${args.output}
  Abstract concepts: ${path.join(args.output, 'abstract')}
  Diagrams: ${path.join(args.output, 'diagrams')}

Next step:
  pnpm finetune-evaluate --input ${args.output}
`);
    } else {
      // Single image generation
      let finalPrompt = args.prompt!;

      // Auto-enhance prompt if it doesn't include trigger word
      if (!finalPrompt.includes(args.trigger)) {
        console.log(`  Note: Adding Canon prompt template (trigger not found in prompt)`);
        finalPrompt = buildCanonPrompt(finalPrompt, args.trigger);
      }

      const outputPath = path.join(args.output, 'output.png');

      if (args.modelId) {
        // Direct model ID
        const result = await generateDirect(args.modelId, args.trigger, {
          prompt: finalPrompt,
          width: args.width,
          height: args.height,
          seed: args.seed,
          outputPath
        });
        console.log(`\n  Generated: ${result.outputPath}`);
        console.log(`  Duration: ${(result.duration / 1000).toFixed(1)}s`);
      } else {
        // Registered model
        const result = await generate(args.model!, {
          prompt: finalPrompt,
          width: args.width,
          height: args.height,
          seed: args.seed,
          outputPath
        });
        console.log(`\n  Generated: ${result.outputPath}`);
        console.log(`  Duration: ${(result.duration / 1000).toFixed(1)}s`);
      }
    }
  } catch (error) {
    console.error('Generation error:', error);
    process.exit(1);
  }
}

main();
