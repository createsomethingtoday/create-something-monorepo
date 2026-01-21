# @create-something/ascii-renderer

Shape-aware ASCII renderer with 6D character matching and contrast enhancement for high-quality ASCII art.

Based on [Alex Harri's ASCII rendering technique](https://alexharri.com/blog/ascii-rendering).

## The Problem

Traditional ASCII renderers treat characters like pixels—they map image brightness to character density and ignore **shape**. This causes blurry, jagged edges because ASCII characters have structure that's being discarded.

## The Solution

This renderer uses **6D shape vectors** to capture how each ASCII character fills its cell:

```
  [0]   [1]    ← upper row (staggered)
  [2]   [3]    ← middle row  
  [4]   [5]    ← lower row (staggered)
```

Six sampling circles measure density at different positions. Characters like `L`, `T`, `^`, `_` get distinct vectors that capture their actual shape.

## Installation

```bash
pnpm add @create-something/ascii-renderer
```

## Usage

### Browser (Canvas)

```typescript
import { AsciiRenderer } from '@create-something/ascii-renderer';

const renderer = new AsciiRenderer({
  globalContrast: 2.5,
  directionalContrast: 3.0
});

// Render from canvas
const result = renderer.renderCanvas(myCanvas);
console.log(result.toString());
```

### Built-in 3D Scenes

```typescript
// Render a rotating donut
const donut = renderer.renderScene3D(120, 60, 'donut', { 
  x: 0.3, 
  y: time * 0.02, 
  z: 0 
});
console.log(donut.toString());
```

### Node.js (Buffer)

```typescript
import { AsciiRenderer } from '@create-something/ascii-renderer';

const renderer = new AsciiRenderer();

// Render from raw pixel buffer (4 channels RGBA)
const result = renderer.renderBuffer(pixelBuffer, width, height, 4);
```

### Procedural Content

```typescript
// Render from a lightness function
const result = renderer.renderFunction(120, 60, (x, y) => {
  // Return lightness 0-1 for each pixel
  const dx = x - 60;
  const dy = y - 30;
  return Math.sqrt(dx * dx + dy * dy) < 25 ? 1 : 0;
});
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `cellWidth` | 8 | Width of each cell in pixels |
| `cellHeight` | 16 | Height of each cell in pixels |
| `samplesPerCircle` | 12 | Sampling quality (more = slower but better) |
| `globalContrast` | 2.0 | Global contrast enhancement (1 = off) |
| `directionalContrast` | 3.0 | Edge sharpening strength (1 = off) |
| `charset` | 'ascii95' | Character set to use |

## Contrast Enhancement

### Global Contrast

Normalizes the sampling vector, applies an exponent to crunch darker values, then denormalizes. This exaggerates shape differences for better character picks.

```typescript
// Stronger contrast = sharper shapes
renderer.configure({ globalContrast: 3.0 });
```

### Directional Contrast

External sampling circles reach into neighboring cells to detect edges. When a neighbor is lighter, it pushes the internal value down, sharpening boundaries.

```typescript
// Stronger directional = sharper edges
renderer.configure({ directionalContrast: 4.0 });
```

## Performance

- **K-d tree**: ~30× faster than brute-force for character lookup
- **Caching**: Quantized vector keys enable O(1) repeated lookups
- **Spiral sampling**: Efficient golden-angle distribution

## API Reference

### Classes

- `AsciiRenderer` - Main renderer class
- `CachedLookup` - Fast character lookup with caching

### Functions

- `createRenderer(config?)` - Create renderer with defaults
- `renderToAscii(imageData, config?)` - Quick one-off render
- `buildKdTree(characters)` - Build k-d tree from character shapes
- `applyGlobalContrast(vector, exponent)` - Apply global contrast
- `applyDirectionalContrast(internal, external, exponent)` - Apply edge sharpening

### Types

- `AsciiRendererConfig` - Renderer configuration
- `AsciiRenderResult` - Render output with `toString()` method
- `ShapeVector` - 6D character shape representation
- `ImageSource` - Abstract image data source

## Demo

See the interactive demo at `/experiments/ascii-renderer` in the io package.

## Credits

Based on [ASCII characters are not pixels: a deep dive into ASCII rendering](https://alexharri.com/blog/ascii-rendering) by Alex Harri.
