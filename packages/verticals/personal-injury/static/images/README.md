# Personal Injury Template Images

Images for the Morrison & Associates demo law firm template.

## Generation

Use Cloudflare Workers AI (Flux) for image generation. See `packages/verticals/architecture-studio/scripts/generate-images.ts` for the pattern.

### Required Images

#### Hero Image
- **File**: `hero-office.jpg`
- **Prompt**: "Professional law office interior with floor-to-ceiling windows overlooking San Francisco skyline, modern minimalist design, warm lighting, legal books on shelves, high-end corporate aesthetic, photorealistic, 8K, no vignette, no radial gradient, clear unobstructed view"

#### Attorney Headshots
- **File**: `attorney-morrison.jpg`
- **Prompt**: "Professional headshot of a confident woman attorney in her mid-40s, dark professional attire, neutral studio background, warm lighting, photorealistic"

- **File**: `attorney-chen.jpg`
- **Prompt**: "Professional headshot of an Asian American male attorney in his mid-30s, dark suit and tie, neutral studio background, warm lighting, photorealistic"

- **File**: `attorney-gonzalez.jpg`
- **Prompt**: "Professional headshot of a Latina woman attorney in her early 30s, professional attire, neutral studio background, warm lighting, photorealistic"

## Cloudflare Workers AI

```bash
# Generate via Cloudflare API (uses wrangler OAuth token)
cd packages/verticals/architecture-studio
npx tsx scripts/generate-images.ts
```

## Placeholder Alternative

For development, use placeholder images:
- https://placehold.co/1920x1080/111111/ffffff?text=Hero+Image
- https://placehold.co/600x800/111111/ffffff?text=Attorney
