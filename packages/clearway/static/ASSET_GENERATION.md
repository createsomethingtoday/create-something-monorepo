# CLEARWAY Asset Generation Guide

## Overview
This directory contains SEO and branding assets for CLEARWAY. Some assets require conversion from SVG to raster formats.

## Required Assets

### Generated ✅
- `favicon.svg` - SVG favicon (pure black bg, white C letterform)
- `og-image.svg` - SVG Open Graph image (1200x630)
- `manifest.json` - Web app manifest
- `robots.txt` - SEO crawler directives
- `sitemap.xml` - Site structure for search engines

### Need Generation ⚠️
These files need to be created from the SVG sources:

1. **favicon.ico** (multi-size ICO)
   - Source: `favicon.svg`
   - Sizes: 16x16, 32x32, 48x48
   - Format: ICO

2. **logo192.png** (PWA icon)
   - Source: `favicon.svg`
   - Size: 192x192
   - Format: PNG
   - Background: #000000 (pure black)

3. **logo512.png** (PWA icon)
   - Source: `favicon.svg`
   - Size: 512x512
   - Format: PNG
   - Background: #000000 (pure black)

4. **og-image.png** (Open Graph image)
   - Source: `og-image.svg`
   - Size: 1200x630
   - Format: PNG
   - Background: #000000 (pure black)

## Generation Commands

### Using ImageMagick (if available)

```bash
# Navigate to static directory
cd /Users/micahjohnson/Documents/Github/Create\ Something/create-something-monorepo/packages/clearway/static

# Generate favicon.ico (multi-size)
convert favicon.svg -resize 16x16 favicon-16.png
convert favicon.svg -resize 32x32 favicon-32.png
convert favicon.svg -resize 48x48 favicon-48.png
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
rm favicon-16.png favicon-32.png favicon-48.png

# Generate logo192.png
convert -background "#000000" favicon.svg -resize 192x192 logo192.png

# Generate logo512.png
convert -background "#000000" favicon.svg -resize 512x512 logo512.png

# Generate og-image.png
convert -background "#000000" og-image.svg -resize 1200x630 og-image.png
```

### Using Online Tools

If ImageMagick is not available, use these online converters:

1. **SVG to ICO**: https://cloudconvert.com/svg-to-ico
   - Upload `favicon.svg`
   - Set sizes: 16x16, 32x32, 48x48
   - Download as `favicon.ico`

2. **SVG to PNG**: https://cloudconvert.com/svg-to-png
   - Upload `favicon.svg`
   - Set size: 192x192 (for logo192.png)
   - Set size: 512x512 (for logo512.png)
   - Upload `og-image.svg`
   - Set size: 1200x630 (for og-image.png)

### Using Figma/Sketch/Illustrator

1. Open `favicon.svg` or `og-image.svg`
2. Export as PNG with appropriate dimensions
3. Ensure background is pure black (#000000)
4. Save to static directory

## Canon Principles

### Zuhandenheit
SEO assets recede into transparent use. Users find CLEARWAY without seeing the mechanism.

### Weniger, aber besser
Minimal meta tags that matter. No bloat. Pure black canvas with white letterform.

### Pure Black Canvas
- Background: #000000 (pure black)
- Foreground: #ffffff (pure white)
- No gradients, no embellishments
- The tool becomes invisible

## Verification

After generating assets, verify:

1. All files exist in `/static/`:
   - favicon.ico ✅
   - favicon.svg ✅
   - logo192.png ✅
   - logo512.png ✅
   - og-image.png ✅
   - manifest.json ✅
   - robots.txt ✅
   - sitemap.xml ✅

2. Test favicon appears in browser tab
3. Test PWA installation shows correct icons
4. Test Open Graph image displays correctly when sharing links
5. Test robots.txt accessible at `/robots.txt`
6. Test sitemap.xml accessible at `/sitemap.xml`

## Next Steps

1. Generate missing PNG/ICO files
2. Update `og-image.png` reference in `app.html` (currently points to SVG)
3. Deploy to Cloudflare Pages
4. Verify all assets load correctly
5. Test social media sharing (Twitter, LinkedIn, Slack)

## Related Files

- `/src/app.html` - Meta tags and asset references
- `/static/manifest.json` - PWA manifest
- `/static/robots.txt` - SEO directives
- `/static/sitemap.xml` - Site structure
