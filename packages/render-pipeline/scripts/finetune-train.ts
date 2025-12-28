#!/usr/bin/env tsx
/**
 * Fine-Tune Training CLI
 *
 * Trains a Flux LoRA model on prepared training data.
 *
 * Usage:
 *   pnpm finetune-train --input ./training-data/training-images.zip --trigger CSMTH
 */

import { train } from '../src/fine-tune/train.js';

function parseArgs(): {
  input: string;
  trigger: string;
  steps: number;
  type: 'style' | 'subject';
} {
  const args = process.argv.slice(2);
  const result = {
    input: '',
    trigger: 'CSMTH',
    steps: 1000,
    type: 'style' as const
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--input' || arg === '-i') {
      result.input = nextArg;
      i++;
    } else if (arg === '--trigger' || arg === '-t') {
      result.trigger = nextArg;
      i++;
    } else if (arg === '--steps' || arg === '-s') {
      result.steps = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--type') {
      result.type = nextArg as 'style' | 'subject';
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: pnpm finetune-train [options]

Options:
  -i, --input <path>     Path to training images zip (required)
  -t, --trigger <word>   Trigger word (default: CSMTH)
  -s, --steps <n>        Training steps (default: 1000)
  --type <type>          LoRA type: 'style' or 'subject' (default: style)
  -h, --help             Show this help

Examples:
  pnpm finetune-train -i ./training-data/training-images.zip -t CSMTH
  pnpm finetune-train -i ./images.zip -t MYMODEL --steps 1500
`);
      process.exit(0);
    }
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (!args.input) {
    console.error('Error: --input is required');
    console.error('Run with --help for usage');
    process.exit(1);
  }

  console.log(`
=== Flux LoRA Training ===
  Input: ${args.input}
  Trigger: ${args.trigger}
  Steps: ${args.steps}
  Type: ${args.type}
`);

  try {
    const result = await train({
      inputImages: args.input,
      triggerWord: args.trigger,
      loraType: args.type,
      steps: args.steps
    });

    if (result.status === 'succeeded') {
      console.log(`
=== Training Complete ===
  Status: ${result.status}
  Duration: ${result.durationSeconds?.toFixed(1)}s
  Cost: ~$${result.costEstimate?.toFixed(2)}
  Model URL: ${result.modelUrl}
  Version: ${result.versionId}

Next steps:
  1. Register model in generate.ts:
     registerModel('flux-canon', {
       id: '${result.versionId || result.modelUrl}',
       name: 'CREATE SOMETHING Canon Style',
       triggerWord: '${args.trigger}'
     });

  2. Generate test set:
     pnpm finetune-generate --model flux-canon --output ./evaluation
`);
    } else {
      console.error(`
=== Training Failed ===
  Status: ${result.status}
  Error: ${result.error}
`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Training error:', error);
    process.exit(1);
  }
}

main();
