#!/usr/bin/env tsx
/**
 * Evaluation Rubric CLI
 *
 * Generates evaluation rubric for manual human assessment of fine-tuned outputs.
 *
 * Usage:
 *   pnpm finetune-evaluate --input ./evaluation --output ./evaluation/rubric.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Zuhandenheit Evaluation Rubric
 *
 * Each image is scored on 6 criteria (Pass/Fail)
 * Pass threshold: 8/10 images must pass 5/6 criteria
 * Critical: No image can fail "AI Tells" criterion
 */
const RUBRIC = {
  criteria: [
    {
      id: 'background',
      name: 'Background',
      pass: 'Pure black (#000000)',
      fail: 'Grey, gradient, or textured background'
    },
    {
      id: 'typography',
      name: 'Typography',
      pass: 'Clean, structural, minimal',
      fail: 'Decorative, stylized, or ornamental'
    },
    {
      id: 'spacing',
      name: 'Spacing',
      pass: 'Golden ratio proportions, negative space that breathes',
      fail: 'Mechanical/arbitrary spacing, cluttered'
    },
    {
      id: 'color',
      name: 'Color',
      pass: 'Monochrome, white/light accents only',
      fail: 'Multiple colors, gradients, saturation'
    },
    {
      id: 'ai_tells',
      name: 'AI Tells',
      pass: 'Not recognizable as AI-generated',
      fail: 'Obvious AI artifacts, uncanny quality, typical AI aesthetic',
      critical: true
    },
    {
      id: 'content_service',
      name: 'Content Service',
      pass: 'Visual supports and clarifies the concept',
      fail: 'Visual distracts from or obscures the concept'
    }
  ],
  thresholds: {
    minPassingImages: 8,
    minCriteriaPerImage: 5,
    totalImages: 10
  }
};

async function generateRubricMarkdown(inputDir: string): Promise<string> {
  // Find all images
  const abstractDir = path.join(inputDir, 'abstract');
  const diagramsDir = path.join(inputDir, 'diagrams');

  let abstractImages: string[] = [];
  let diagramImages: string[] = [];

  try {
    abstractImages = (await fs.readdir(abstractDir)).filter((f) => f.endsWith('.png'));
  } catch {
    // Directory doesn't exist yet
  }

  try {
    diagramImages = (await fs.readdir(diagramsDir)).filter((f) => f.endsWith('.png'));
  } catch {
    // Directory doesn't exist yet
  }

  const allImages = [
    ...abstractImages.map((f) => ({ name: f, type: 'abstract', path: path.join(abstractDir, f) })),
    ...diagramImages.map((f) => ({ name: f, type: 'diagram', path: path.join(diagramsDir, f) }))
  ];

  const markdown = `# Zuhandenheit Evaluation Rubric

**Date**: ${new Date().toISOString().split('T')[0]}
**Input Directory**: ${inputDir}
**Total Images**: ${allImages.length}

## Evaluation Criteria

| Criterion | Pass | Fail | Critical |
|-----------|------|------|----------|
${RUBRIC.criteria
  .map(
    (c) =>
      `| **${c.name}** | ${c.pass} | ${c.fail} | ${c.critical ? '⚠️ Yes' : 'No'} |`
  )
  .join('\n')}

## Pass Thresholds

- **Images passing**: ≥ ${RUBRIC.thresholds.minPassingImages}/${RUBRIC.thresholds.totalImages} images
- **Criteria per image**: ≥ ${RUBRIC.thresholds.minCriteriaPerImage}/6 criteria
- **Critical rule**: NO image can fail "AI Tells" criterion

## Evaluation Sheet

### Abstract Concepts (5)

${abstractImages.length > 0 ? abstractImages.map((img, i) => `
#### ${i + 1}. ${img}

| Criterion | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Background | ☐ | ☐ | |
| Typography | ☐ | ☐ | |
| Spacing | ☐ | ☐ | |
| Color | ☐ | ☐ | |
| AI Tells | ☐ | ☐ | |
| Content Service | ☐ | ☐ | |

**Score**: __/6  **Pass**: ☐ Yes ☐ No
`).join('\n') : '*No abstract images found yet*'}

### Diagrams (5)

${diagramImages.length > 0 ? diagramImages.map((img, i) => `
#### ${i + 1}. ${img}

| Criterion | Pass | Fail | Notes |
|-----------|:----:|:----:|-------|
| Background | ☐ | ☐ | |
| Typography | ☐ | ☐ | |
| Spacing | ☐ | ☐ | |
| Color | ☐ | ☐ | |
| AI Tells | ☐ | ☐ | |
| Content Service | ☐ | ☐ | |

**Score**: __/6  **Pass**: ☐ Yes ☐ No
`).join('\n') : '*No diagram images found yet*'}

## Summary

| Category | Passing | Total | Rate |
|----------|---------|-------|------|
| Abstract | __/5 | 5 | __% |
| Diagrams | __/5 | 5 | __% |
| **Overall** | __/10 | 10 | __% |

### Verdict

☐ **PASS** - Fine-tuned model passes Zuhandenheit test
  - The tool recedes; the content remains

☐ **FAIL** - Fine-tuned model fails Zuhandenheit test
  - The tool demands attention; refinement needed

### Notes

_Add observations about the fine-tuned style here..._

---

## Comparison: Fine-Tuned vs Baseline

Generate the same prompts without fine-tuning for comparison:

\`\`\`bash
# Baseline (no LoRA)
pnpm finetune-generate --model-id "black-forest-labs/flux-dev" \\
  --trigger "" --test-set --output ./baseline
\`\`\`

| Image | Fine-Tuned Score | Baseline Score | Delta |
|-------|------------------|----------------|-------|
| abstract-1 | __/6 | __/6 | __ |
| abstract-2 | __/6 | __/6 | __ |
| abstract-3 | __/6 | __/6 | __ |
| abstract-4 | __/6 | __/6 | __ |
| abstract-5 | __/6 | __/6 | __ |
| diagram-1 | __/6 | __/6 | __ |
| diagram-2 | __/6 | __/6 | __ |
| diagram-3 | __/6 | __/6 | __ |
| diagram-4 | __/6 | __/6 | __ |
| diagram-5 | __/6 | __/6 | __ |
| **Average** | __/6 | __/6 | __ |

### Conclusion

_Does the fine-tuning significantly improve Canon compliance?_

---

*Generated by render-pipeline evaluate-outputs*
`;

  return markdown;
}

function parseArgs(): { input: string; output: string } {
  const args = process.argv.slice(2);
  const result = {
    input: './evaluation',
    output: ''
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--input' || arg === '-i') {
      result.input = nextArg;
      i++;
    } else if (arg === '--output' || arg === '-o') {
      result.output = nextArg;
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: pnpm finetune-evaluate [options]

Options:
  -i, --input <dir>     Input directory with generated images
  -o, --output <file>   Output rubric file (default: <input>/rubric.md)
  -h, --help            Show this help

Example:
  pnpm finetune-evaluate -i ./evaluation
`);
      process.exit(0);
    }
  }

  // Default output to input directory
  if (!result.output) {
    result.output = path.join(result.input, 'rubric.md');
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs();

  console.log(`Generating evaluation rubric...`);
  console.log(`  Input: ${args.input}`);
  console.log(`  Output: ${args.output}`);

  const markdown = await generateRubricMarkdown(args.input);

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, markdown);

  console.log(`
=== Rubric Generated ===
  File: ${args.output}

Instructions:
  1. Open ${args.output} in your editor
  2. View each image and check Pass/Fail for each criterion
  3. Calculate scores and complete the summary
  4. Record your verdict
`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
