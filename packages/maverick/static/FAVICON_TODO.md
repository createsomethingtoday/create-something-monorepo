# Favicon Generation

## Current Status
✅ `favicon.svg` - Simple MX icon created (32x32)  
📝 Need to generate PNG and ICO versions from this SVG

## Required Files to Generate:
- [ ] `favicon.ico` (16x16, 32x32, 48x48 multi-resolution)
- [ ] `apple-touch-icon.png` (180x180)
- [ ] `favicon-192x192.png` (192x192 for web manifest)
- [ ] `favicon-512x512.png` (512x512 for web manifest)

## Generation Methods:

### Option 1: Using ImageMagick (Command Line)
```bash
cd packages/maverick/static

# Generate PNGs from SVG
convert favicon.svg -resize 180x180 apple-touch-icon.png
convert favicon.svg -resize 192x192 favicon-192x192.png
convert favicon.svg -resize 512x512 favicon-512x512.png

# Generate ICO with multiple sizes
convert favicon.svg -resize 16x16 favicon-16.png
convert favicon.svg -resize 32x32 favicon-32.png
convert favicon.svg -resize 48x48 favicon-48.png
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico

# Cleanup temp files
rm favicon-16.png favicon-32.png favicon-48.png
```

### Option 2: Online Tool (Easiest)
1. Go to https://realfavicongenerator.net/
2. Upload `favicon.svg`
3. Customize if needed
4. Download generated favicon package
5. Extract files to `packages/maverick/static/`

### Option 3: Using Inkscape (GUI)
1. Open `favicon.svg` in Inkscape
2. Export as PNG at different sizes:
   - 16x16, 32x32, 48x48 (for .ico)
   - 180x180 (apple-touch-icon.png)
   - 192x192 and 512x512 (for manifest)
3. Use online ICO converter to combine 16/32/48 into favicon.ico

## Notes:
- The SVG uses a simple white "MX" design on black background
- Maintains brand consistency with dark theme
- Simple enough to work at small sizes (16x16)
- All HTML references are already in place in `app.html`
- Web manifest (`site.webmanifest`) is ready
