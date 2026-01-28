# Glass Cube 3D Pipeline

**Objective**: Create a photorealistic 3D Glass Cube that extends the CREATE SOMETHING brand mark into interactive web 3D.

## Visual Language Reference

From `CubeMark.svelte`, the cube has semantic meaning per face:

| Face | Meaning | Opacity | 3D Translation |
|------|---------|---------|----------------|
| **Top** | Creation | 1.0 | Brightest, most reflective |
| **Left** | Understanding | 0.6 | Medium transmission |
| **Right** | Foundation | 0.3 | Deepest, most refractive |

The Glass Design System emphasizes:
- Transparency ("The Automation Layer")
- Subtle edge glow
- Backdrop blur aesthetic
- Clean, minimal lighting

---

## Phase 1: Text-to-Image Generation

### Primary Prompt (Replicate/Meshy/FLUX)

```
Isometric glass cube floating in soft studio lighting, transparent crystalline 
material with internal light refraction, three visible faces with varying opacity 
(top brightest, left medium, right subtle), minimal clean background, 
photorealistic render, 8k quality, subtle caustics, no shadows on background
```

### Variation Prompts

**A. Studio Hero (Product Shot)**
```
Single transparent glass cube centered on seamless white background, 
isometric view at 30 degrees, studio three-point lighting, soft reflections, 
internal prismatic light dispersion, sharp edges, photorealistic 3D render
```

**B. Dark Mode / Dramatic**
```
Isometric glass cube on black void, internal glow emanating from edges, 
blue-tinted refractions, volumetric light rays, minimal, cinematic lighting, 
8k photorealistic render
```

**C. Abstract / Brand**
```
Geometric glass cube with frosted surfaces, varying transparency per face 
(100%, 60%, 30%), floating, subtle gradient background from charcoal to black, 
edge highlights, product photography style
```

### Recommended Models (via Replicate)

| Model | Best For | Speed |
|-------|----------|-------|
| `black-forest-labs/flux-1.1-pro` | Photorealism, lighting | ~10s |
| `stability-ai/sdxl` | Good balance | ~8s |
| `lucataco/flux-dev-lora` | Fine-tuned control | ~12s |

### Integration with Existing Pipeline

```typescript
// packages/render-pipeline/src/glass-cube/generate-reference.ts
import Replicate from 'replicate';

export async function generateCubeReference(variant: 'hero' | 'dark' | 'abstract') {
  const replicate = new Replicate();
  
  const prompts = {
    hero: `Isometric glass cube centered on seamless white background, 
           studio three-point lighting, internal prismatic dispersion, 
           sharp edges, photorealistic 3D render, 8k`,
    dark: `Isometric glass cube on black void, internal glow from edges,
           blue-tinted refractions, volumetric light, cinematic, 8k`,
    abstract: `Geometric glass cube with frosted surfaces, varying transparency
               per face, floating, charcoal gradient background, product photography`
  };

  const output = await replicate.run('black-forest-labs/flux-1.1-pro', {
    input: {
      prompt: prompts[variant],
      aspect_ratio: '1:1',
      output_format: 'png',
      output_quality: 100
    }
  });

  return output; // URL to generated image
}
```

---

## Phase 2: Image-to-3D Conversion

### Option A: SAM 3D (Meta) - Best for Accuracy

```bash
# Clone and setup
git clone https://github.com/facebookresearch/sam-3d-objects
cd sam-3d-objects
pip install -r requirements.txt

# Run inference
python inference.py --image ./cube-reference.png --output ./cube-mesh.glb
```

**Pros**: Open source, accurate geometry reconstruction, handles transparency hints
**Cons**: Requires Python environment, manual setup

### Option B: Meshy AI API - Best for Speed

```typescript
// packages/render-pipeline/src/glass-cube/image-to-3d.ts
export async function convertToMesh(imageUrl: string) {
  const response = await fetch('https://api.meshy.ai/v1/image-to-3d', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image_url: imageUrl,
      ai_model: 'meshy-4',
      topology: 'quad',        // Better for simple geometry
      target_polycount: 5000,  // Low poly for web
      texture_richness: 'high'
    })
  });

  const { result } = await response.json();
  return result.model_url; // GLB download URL
}
```

**Pros**: 30-60s generation, API-first, automatic retopology
**Cons**: Paid service (~$0.10-0.50 per model)

### Option C: Replicate Trellis - Best Integration

```typescript
import Replicate from 'replicate';

export async function imageToMesh(imageUrl: string) {
  const replicate = new Replicate();
  
  const output = await replicate.run('firtoz/trellis', {
    input: {
      image: imageUrl,
      seed: 42,
      ss_guidance_strength: 7.5,
      slat_guidance_strength: 3
    }
  });

  return output; // GLB file URL
}
```

**Pros**: Already using Replicate, consistent workflow
**Cons**: Quality varies, may need iteration

---

## Phase 3: Mesh Optimization

### gltf-transform Pipeline

```bash
# Install globally
npm install -g @gltf-transform/cli

# Full optimization command
gltf-transform optimize cube-raw.glb cube-optimized.glb \
  --compress draco \
  --texture-compress webp \
  --texture-resize 512 \
  --simplify --simplify-ratio 0.5
```

### Programmatic Optimization

```typescript
// packages/render-pipeline/src/glass-cube/optimize.ts
import { Document, NodeIO } from '@gltf-transform/core';
import { dedup, draco, textureCompress, simplify } from '@gltf-transform/functions';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

export async function optimizeCubeMesh(inputPath: string, outputPath: string) {
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule()
    });

  const document = await io.read(inputPath);

  await document.transform(
    // Remove duplicate data
    dedup(),
    
    // Compress geometry (90% size reduction)
    draco({
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12
    }),
    
    // Compress textures
    textureCompress({
      encoder: 'webp',
      quality: 85
    }),
    
    // Simplify mesh for web
    simplify({ simplifier: meshoptSimplifier, ratio: 0.5 })
  );

  await io.write(outputPath, document);
  
  return outputPath;
}
```

### Target Metrics

| Metric | Raw | Optimized | Target |
|--------|-----|-----------|--------|
| File Size | ~5MB | <200KB | <150KB |
| Triangles | ~50k | <5k | <3k |
| Textures | 2048px | 512px | 512px |
| Load Time | ~3s | <500ms | <300ms |

---

## Phase 4: Material Setup (Glass Shader)

The AI-generated mesh won't have proper glass materials. We need to apply them.

### Three.js Glass Material

```typescript
// packages/render-pipeline/src/glass-cube/materials.ts
import * as THREE from 'three';

export function createGlassMaterial(face: 'top' | 'left' | 'right') {
  const opacityMap = {
    top: 0.15,      // Most transparent (brightest)
    left: 0.25,     // Medium
    right: 0.35     // Most solid (foundation)
  };

  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.05,
    transmission: 1 - opacityMap[face],  // Glass transmission
    thickness: 0.5,                       // Refraction depth
    ior: 1.5,                             // Glass index of refraction
    transparent: true,
    opacity: 1,
    envMapIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.1
  });
}

// Apply materials to loaded mesh
export function applyGlassMaterials(mesh: THREE.Mesh) {
  // Assuming mesh has named face groups or we detect by normal direction
  mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Detect face by normal
      const normal = new THREE.Vector3();
      child.geometry.computeVertexNormals();
      
      // Apply appropriate material based on face orientation
      // This is simplified - actual implementation depends on mesh structure
      child.material = createGlassMaterial('top');
    }
  });
}
```

---

## Phase 5: Web Integration

### Option A: Threlte (Svelte-native)

```bash
# Add to packages/canon or create packages/3d
pnpm add @threlte/core @threlte/extras three
```

```svelte
<!-- packages/canon/src/lib/brand/marks/CubeMark3D.svelte -->
<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { useGltf, Environment, ContactShadows } from '@threlte/extras';
  import { MeshPhysicalMaterial } from 'three';

  interface Props {
    size?: number;
    autoRotate?: boolean;
    class?: string;
  }

  let { size = 200, autoRotate = true, class: className = '' }: Props = $props();

  // Load optimized GLB
  const gltf = useGltf('/models/glass-cube.glb');

  // Rotation state
  let rotation = $state(0);

  // Glass material
  const glassMaterial = new MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 0.5,
    ior: 1.5,
    transparent: true,
    envMapIntensity: 1.5
  });

  // Auto-rotation
  useTask((delta) => {
    if (autoRotate) {
      rotation += delta * 0.3;
    }
  });
</script>

<T.Group rotation.y={rotation}>
  {#await gltf}
    <!-- Loading state - could show 2D CubeMark -->
  {:then model}
    <T.Mesh
      geometry={model.nodes.Cube.geometry}
      material={glassMaterial}
      scale={1}
    />
  {/await}
</T.Group>

<!-- Studio lighting -->
<T.AmbientLight intensity={0.4} />
<T.DirectionalLight position={[5, 5, 5]} intensity={1} />
<T.DirectionalLight position={[-5, 3, -5]} intensity={0.5} />

<!-- Environment for reflections -->
<Environment preset="studio" />

<!-- Subtle shadow -->
<ContactShadows
  opacity={0.4}
  blur={2}
  position={[0, -1, 0]}
/>
```

### Option B: Canvas Component (Three.js Direct)

```svelte
<!-- packages/canon/src/lib/brand/marks/CubeMark3D.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

  interface Props {
    size?: number;
    autoRotate?: boolean;
  }

  let { size = 200, autoRotate = true }: Props = $props();

  let container: HTMLDivElement;
  let animationId: number;

  onMount(async () => {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Load cube model
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const gltf = await gltfLoader.loadAsync('/models/glass-cube.glb');
    const cube = gltf.scene;

    // Apply glass material
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.5,
      transparent: true
    });

    cube.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = glassMaterial;
      }
    });

    scene.add(cube);

    // Animation loop
    function animate() {
      animationId = requestAnimationFrame(animate);
      
      if (autoRotate) {
        cube.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    }

    animate();
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<div bind:this={container} class="cube-3d" style="width: {size}px; height: {size}px;" />

<style>
  .cube-3d {
    display: inline-block;
  }

  .cube-3d :global(canvas) {
    display: block;
  }
</style>
```

---

## Phase 6: Deployment Assets

### Directory Structure

```
packages/canon/
├── static/
│   ├── models/
│   │   ├── glass-cube.glb          # Optimized production model
│   │   └── glass-cube-preview.glb   # Lower quality for preview
│   └── draco/                       # Draco decoder files
│       ├── draco_decoder.js
│       ├── draco_decoder.wasm
│       └── draco_wasm_wrapper.js
```

### CDN Configuration (Cloudflare)

```typescript
// packages/canon/wrangler.toml
[site]
bucket = "./static"

[[rules]]
type = "Data"
globs = ["**/*.glb"]
fallthrough = true
```

### Caching Headers

```typescript
// Cache 3D models for 1 year (immutable content)
export const onRequest: PagesFunction = async ({ request, next }) => {
  const response = await next();
  
  if (request.url.endsWith('.glb')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  return response;
};
```

---

## Full Pipeline Script

```typescript
// packages/render-pipeline/scripts/generate-glass-cube.ts
import { generateCubeReference } from '../src/glass-cube/generate-reference';
import { convertToMesh } from '../src/glass-cube/image-to-3d';
import { optimizeCubeMesh } from '../src/glass-cube/optimize';
import { writeFile } from 'fs/promises';

async function main() {
  console.log('🎨 Phase 1: Generating reference image...');
  const imageUrl = await generateCubeReference('hero');
  console.log(`   Generated: ${imageUrl}`);

  console.log('🧊 Phase 2: Converting to 3D mesh...');
  const meshUrl = await convertToMesh(imageUrl);
  console.log(`   Mesh: ${meshUrl}`);

  // Download mesh
  const meshResponse = await fetch(meshUrl);
  const meshBuffer = await meshResponse.arrayBuffer();
  await writeFile('./temp/cube-raw.glb', Buffer.from(meshBuffer));

  console.log('⚡ Phase 3: Optimizing mesh...');
  await optimizeCubeMesh('./temp/cube-raw.glb', './output/glass-cube.glb');

  console.log('✅ Pipeline complete!');
  console.log('   Output: ./output/glass-cube.glb');
}

main().catch(console.error);
```

---

## Next Steps

1. **Generate reference images** - Run text-to-image with prompts above
2. **Choose Image-to-3D service** - Recommend starting with Meshy API for speed
3. **Optimize** - Run gltf-transform pipeline
4. **Apply materials** - Set up glass shader in Three.js/Threlte
5. **Integrate** - Add `CubeMark3D.svelte` to Canon
6. **Deploy** - Place GLB in static assets, configure CDN

---

## Cost Estimate (Per Asset)

| Step | Service | Cost |
|------|---------|------|
| Text-to-Image | Replicate FLUX | ~$0.05 |
| Image-to-3D | Meshy AI | ~$0.20 |
| Optimization | Local (gltf-transform) | $0 |
| **Total** | | **~$0.25/model** |

For iteration (10 variations): ~$2.50
