# Draco Decoder Files

This directory contains the Draco decoder files required for loading Draco-compressed GLB files in the browser.

## Setup

Download the Draco decoder from Three.js examples and place the following files here:

```bash
# From node_modules after installing three
cp node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js ./
cp node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm ./
cp node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js ./
```

Or download from the Three.js repository:
https://github.com/mrdoob/three.js/tree/dev/examples/jsm/libs/draco/gltf

## Usage

In your Three.js code:

```typescript
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```

With Threlte, the decoder is usually handled automatically, but you may need to configure the path.
