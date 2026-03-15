---
name: photo-cleanup
description: AI-powered photo editing via natural language - describe what to remove, Claude locates it, Flux removes it
category: specialized
triggers:
  - "/photo-cleanup"
  - "remove from photo"
  - "clean up image"
  - "*.jpg cleanup"
  - "*.png cleanup"
related: []
composable: false
priority: P2
---

# Photo Cleanup Skill

AI-powered photo editing via natural language. Describe what you want done, Claude locates it, Flux removes it.

## Usage

**Instruction-driven (recommended):**
```
"Remove the metal chair from this photo: ~/Desktop/photo.jpg"
"Clean up the blemishes on her face in DSC05563.png"
"Take out the pathway lights at the bottom of these photos: ~/Christmas/*.png"
```

**Auto-detect mode:**
```
/photo-cleanup ~/Desktop/Christmas\ 2025/
/photo-cleanup --dry-run photo1.jpg photo2.png
```

## How It Works

```
User instruction → Claude (locate) → Isaac (refine) → Flux (inpaint) → ESRGAN (upscale, optional)
```

1. **User describes** what to remove in natural language
2. **Claude locates** the item(s) and returns bounding box coordinates
3. **Isaac refines** coordinates for pixel precision (default on)
4. **Flux Fill Pro** inpaints the region seamlessly
5. **Real-ESRGAN** upscales with face enhancement (optional `--upscale`)

No drawing, no UI. Just describe what you want.

## Instruction Examples

| Instruction | What Happens |
|-------------|--------------|
| "Remove the chair in the background" | Locates chair, removes it |
| "Clean up the blemishes on the face" | Finds skin imperfections, smooths them |
| "Take out the railing on the right" | Locates railing, fills with background |
| "Remove all the pathway lights" | Finds all lights, removes each |
| "Get rid of that utility pole" | Locates pole, inpaints sky/background |

## Agent Prompt Template

When analyzing images with specific instructions:

```
Look at this image and locate: {user_instruction}

Return the bounding box coordinates for what should be removed.

Coordinates should be normalized (0-1 range):
- x, y: top-left corner
- width, height: size of region

Return JSON:
{
  "results": [
    {
      "imagePath": "/path/to/image.jpg",
      "distractions": [
        {
          "x": 0.15,
          "y": 0.20,
          "width": 0.12,
          "height": 0.35,
          "label": "metal_chair",
          "confidence": 0.95
        }
      ]
    }
  ]
}
```

## Auto-Detect Mode

Without specific instructions, Claude identifies common distractions:

- Electrical outlets on walls
- Pathway lights or ground fixtures
- Metal railings, fences, barriers
- Exposed cables or wires
- Signage or text (not intentional decor)
- Random distracting objects
- Bright spots that draw attention

**Does NOT remove:**
- Intentional decor (Christmas decorations, furniture)
- People or their clothing
- Natural elements unless truly distracting

## CLI Options

| Flag | Description |
|------|-------------|
| `--refine`, `-r` | Use Isaac-01 for precise bounding boxes (default: on) |
| `--upscale`, `-u` | Use Real-ESRGAN to restore quality after inpainting |
| `--no-face-enhance` | Disable face enhancement during upscaling |
| `--dry-run`, `-n` | Analyze only, show debug images |
| `--save-debug`, `-d` | Save debug visualizations |
| `--save-masks`, `-m` | Save intermediate masks |
| `--model <name>` | `flux` (best), `sdxl`, or `lama` (fast) |

## Pipeline

```bash
# Standard (detect → refine → inpaint)
pnpm --filter=render-pipeline cleanup --detections=/tmp/detections.json

# With quality restoration (adds ESRGAN upscaling)
pnpm --filter=render-pipeline cleanup --detections=/tmp/detections.json --upscale
```

## Example Sessions

### Instruction-driven
```
User: Remove the metal chair from ~/Desktop/photo.jpg

Claude: [Views photo, locates metal chair at left edge]

Found: metal_chair at (0.05, 0.15, 0.12, 0.40)
Processing with Flux Fill Pro...

Done! Saved: ~/Desktop/photo-cleaned.png
```

### Batch with instructions
```
User: Take out the pathway lights from all these Christmas photos: ~/Desktop/Christmas/*.png

Claude: Found 14 images. Analyzing for pathway lights...

[Spawns parallel agents to scan all images]

Found pathway lights in 3 images:
- DSC05754.png: 2 lights (bottom corners)
- DSC05914.png: 1 light (bottom left)

Processing...

Complete! 3 images cleaned.
```

### Auto-detect mode
```
User: /photo-cleanup ~/Desktop/Christmas\ 2025/

Claude: Found 14 images. Detecting distractions...

8 images need cleanup:
- DSC05563: metal_chair
- DSC05587: metal_railing
- DSC05754: pathway_light (x2)
...

Proceeding with Flux Fill Pro...

Complete! Cleaned images saved as *-cleaned.png
```

## Files

- `packages/render-pipeline/src/cleanup/detect.ts` - Detection types
- `packages/render-pipeline/src/cleanup/refine.ts` - Isaac-01 refinement
- `packages/render-pipeline/src/cleanup/mask.ts` - Mask generation
- `packages/render-pipeline/src/cleanup/inpaint.ts` - Replicate inpainting
- `packages/render-pipeline/src/cleanup/index.ts` - Pipeline orchestration
- `packages/render-pipeline/src/bin/cleanup-photos.ts` - CLI

## Requirements

- `REPLICATE_API_TOKEN` environment variable
- Images accessible via filesystem
