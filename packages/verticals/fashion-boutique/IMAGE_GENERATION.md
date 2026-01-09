# Image Generation with Cloudflare AI

This package uses Cloudflare Workers AI (flux-1-schnell model) to generate fashion photography images.

## Quick Start

```bash
cd packages/silhouettes

# Generate all 14 images (uses wrangler's stored OAuth token automatically)
npx tsx scripts/generate-images.ts
```

**Authentication**: The script automatically reads your wrangler OAuth token from:
- `~/Library/Preferences/.wrangler/config/default.toml` (macOS)
- `~/.local/share/wrangler/config/default.toml` (Linux)
- `~/.wrangler/config/default.toml` (fallback)

If you're not authenticated with wrangler, run:
```bash
wrangler login
```

Or set the token manually:
```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
npx tsx scripts/generate-images.ts
```

## Images Needed

The site requires 14 images total:

### New Products (4 images)
- `product-wool-coat.png` - Relaxed wool coat
- `product-trousers.png` - High-waist trousers
- `product-wrap-dress.png` - Silk wrap dress
- `product-shirt-dress.png` - Oversized shirt dress

### Iconic Pieces (4 images)
- `iconic-blazer.png` - Tailored blazer
- `iconic-sweater.png` - Cashmere sweater
- `iconic-leather-jacket.png` - Leather jacket
- `iconic-midi-skirt.png` - Midi skirt

### Gallery (3 images)
- `gallery-1.png` - Artistic portrait
- `gallery-2.png` - Architectural detail
- `gallery-3.png` - Fabric texture close-up

### Design Statement (2 images)
- `statement-back.png` - Full length portrait
- `statement-front.png` - Portrait close-up

### Icons Feature (1 image)
- `icons-feature.png` - Timeless dress portrait

## How It Works

The script:
1. Reads your Cloudflare API token from wrangler config (or `CLOUDFLARE_API_TOKEN` env var)
2. Generates 14 images using the flux-1-schnell model
3. Saves base64-encoded PNG images to `static/images/`
4. Waits 3 seconds between requests (rate limiting)

**Account ID**: Uses CREATE SOMETHING's Cloudflare account (`9645bd52e640b8a4f40a3a55ff1dd75a`)

**Model**: `@cf/black-forest-labs/flux-1-schnell` (1024x1024, high quality)

## Aesthetic Guidelines

All prompts follow the TOTEME-inspired minimalist aesthetic:

- **Style**: Scandinavian minimalism
- **Colors**: Neutrals (beige, cream, black, white)
- **Lighting**: Soft, natural lighting
- **Background**: Clean white studio or neutral
- **Composition**: Professional fashion editorial
- **Aspect Ratio**: 3:4 (portrait orientation)

## Alternative: Using R2 Bucket

For production deployments, consider storing images in Cloudflare R2:

```bash
# Generate locally first
node scripts/generate-images.js

# Upload to R2
cd static/images
for file in *.png; do
  wrangler r2 object put "silhouettes-assets/$file" --file="$file"
done
```

Then update image URLs in `+page.svelte` to use R2 URLs.

## Cost Estimate

Cloudflare Workers AI pricing for flux-1-schnell:
- **Per image**: ~$0.03
- **Total for 14 images**: ~$0.42
- **Generation time**: ~45 seconds (3-second delays between requests)

## Troubleshooting

### "No Cloudflare API token found"
Run `wrangler login` to authenticate, or set `CLOUDFLARE_API_TOKEN` env var.

### "API error: 401"
Your wrangler token may have expired. Run `wrangler login` again.

### "Rate limit exceeded"
The script includes 3-second delays. If you still hit limits, increase the delay on line 203.

### Images not appearing on site
Make sure the dev server is running (`pnpm dev`) and refresh the page. The site automatically loads images from `/static/images/` once generated.
