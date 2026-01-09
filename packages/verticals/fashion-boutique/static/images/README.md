# Silhouettes Images

This directory contains images generated using Cloudflare Workers AI (flux-1-schnell model).

## Quick Setup

```bash
# From the silhouettes package root
npx tsx scripts/generate-images.ts
```

The script automatically uses your wrangler OAuth token. See `../../IMAGE_GENERATION.md` for details.

## Required Images (14 total)

### Product Images (8)
- `product-wool-coat.png`
- `product-trousers.png`
- `product-wrap-dress.png`
- `product-shirt-dress.png`
- `iconic-blazer.png`
- `iconic-sweater.png`
- `iconic-leather-jacket.png`
- `iconic-midi-skirt.png`

### Gallery Images (3)
- `gallery-1.png`
- `gallery-2.png`
- `gallery-3.png`

### Editorial Images (3)
- `statement-back.png`
- `statement-front.png`
- `icons-feature.png`

## Aesthetic Guidelines

All images follow TOTEME-inspired minimalist aesthetic:
- Scandinavian minimalism
- Neutral colors (beige, cream, black, white)
- Clean backgrounds
- Professional fashion editorial style
- 3:4 aspect ratio (portrait)

## Image Specifications

- **Format**: PNG
- **Aspect Ratio**: 3:4 (portrait orientation)
- **Approximate Size**: 512x683 pixels (or higher resolution)
- **Style**: Minimalist fashion photography
- **Lighting**: Soft, natural

## Cost

Cloudflare Workers AI flux-1-schnell model:
- ~$0.03 per image
- Total for 14 images: ~$0.42
