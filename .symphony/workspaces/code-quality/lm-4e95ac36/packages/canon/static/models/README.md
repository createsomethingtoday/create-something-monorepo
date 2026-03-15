# 3D Model Assets

This directory contains optimized 3D models for the CREATE SOMETHING brand.

## Glass Cube

Generate the glass cube model using the render-pipeline:

```bash
# From monorepo root
pnpm --filter=render-pipeline glass-cube --output=./packages/canon/static/models --name=glass-cube
```

This will create:
- `glass-cube.glb` - Optimized production model (~150KB)
- `glass-cube-reference.png` - Reference image used for generation

## Usage in Components

```svelte
<script>
  import { CubeMark3D } from '@create-something/canon/brand/3d';
</script>

<!-- Uses static/models/glass-cube.glb -->
<CubeMark3D size="lg" autoRotate />
```

## Manual Generation Steps

If you want to customize the generation:

1. **Generate reference image only:**
   ```bash
   pnpm --filter=render-pipeline glass-cube --variant=dark
   ```

2. **Different providers:**
   ```bash
   # Faster but lower quality
   pnpm --filter=render-pipeline glass-cube --provider=replicate-hunyuan
   
   # Higher quality (requires MESHY_API_KEY)
   pnpm --filter=render-pipeline glass-cube --provider=meshy
   ```

3. **Keep intermediate files for debugging:**
   ```bash
   pnpm --filter=render-pipeline glass-cube --keep
   ```

## Variants

| Variant | Description |
|---------|-------------|
| `hero` | Clean white background, product photography style |
| `dark` | Black void with internal glow, dramatic |
| `abstract` | Frosted glass, gradient background |
| `minimal` | Ultra-minimal, pure white |

## File Size Targets

| File | Target | Purpose |
|------|--------|---------|
| `glass-cube.glb` | <200KB | Production model |
| `glass-cube-preview.glb` | <50KB | Lower quality for previews |
