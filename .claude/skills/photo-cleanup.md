# Photo Cleanup Skill

Automatically detect and remove background distractions from photos using Claude Code's vision capabilities + Replicate inpainting.

## Invocation

```
/photo-cleanup ~/Desktop/Christmas\ 2025/
/photo-cleanup --dry-run photo1.jpg photo2.png
```

## Workflow

When invoked, Claude Code should:

### Phase 1: Discovery
1. Expand the provided path(s) to find all image files (.jpg, .jpeg, .png, .webp)
2. Report how many images were found

### Phase 2: Analysis (Parallel Agents)
1. Spawn background Task agents (up to 3 in parallel) to analyze images
2. Each agent uses the Read tool to view assigned images
3. Agent identifies distractions and returns JSON coordinates

**Agent Prompt Template:**
```
Analyze these photos and identify background distractions that should be removed.

Images to analyze:
{image_paths}

For each image, look for:
- Electrical outlets on walls
- Pathway lights or ground fixtures
- Metal railings, fences, or barriers
- Exposed cables or wires
- Signage or text (not intentional decor)
- Random distracting objects
- Bright spots that draw attention away

DO NOT flag:
- Intentional decor (Christmas decorations, furniture)
- People or clothing
- Natural elements unless truly distracting

For each distraction found, provide normalized coordinates (0-1 range).

Return JSON format:
{
  "results": [
    {
      "imagePath": "/path/to/image.jpg",
      "distractions": [
        {
          "x": 0.75,
          "y": 0.3,
          "width": 0.05,
          "height": 0.08,
          "label": "outlet",
          "confidence": 0.9
        }
      ]
    }
  ]
}
```

### Phase 3: Review
1. Collect results from all agents
2. Present summary to user:
   - Which images need cleanup
   - What was detected in each
3. If `--dry-run`, stop here

### Phase 4: Processing
1. For each image with distractions:
   - Generate mask using `packages/render-pipeline/src/cleanup/mask.ts`
   - Run inpainting via Replicate using `packages/render-pipeline/src/cleanup/inpaint.ts`
2. Save cleaned images as `*-cleaned.png`

### Phase 5: Summary
Report:
- Total images processed
- Images cleaned vs already clean
- What was removed
- Output file locations

## Options

| Flag | Description |
|------|-------------|
| `--dry-run`, `-n` | Analyze only, don't modify |
| `--save-debug`, `-d` | Save debug visualizations |
| `--save-masks`, `-m` | Save intermediate masks |
| `--model <name>` | `lama` (fast) or `sdxl` (quality) |

## Requirements

- `REPLICATE_API_TOKEN` environment variable for inpainting
- Images must be accessible via filesystem

## Example Session

```
User: /photo-cleanup ~/Desktop/Christmas\ 2025/

Claude: Found 14 images. Spawning analysis agents...

[Agent 1 analyzing 5 images in background]
[Agent 2 analyzing 5 images in background]
[Agent 3 analyzing 4 images in background]

Analysis complete. Results:

| Image | Distractions |
|-------|--------------|
| DSC05563.jpg | outlet (wall), pathway_light |
| DSC05587.png | railing (right edge) |
| DSC05798.png | railing (right side) |
| ... | ... |

7 images need cleanup, 7 are already clean.

Proceeding with inpainting...

[Processing DSC05563.jpg...]
[Processing DSC05587.png...]
...

Complete! Cleaned images saved:
- DSC05563-cleaned.png
- DSC05587-cleaned.png
- ...
```

## Files

Pipeline utilities:
- `packages/render-pipeline/src/cleanup/mask.ts` - Mask generation
- `packages/render-pipeline/src/cleanup/inpaint.ts` - Replicate inpainting
- `packages/render-pipeline/src/cleanup/index.ts` - Pipeline orchestration
