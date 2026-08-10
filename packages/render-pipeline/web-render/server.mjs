import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  hashRenderRecipe,
  inspectGlb,
  normalizeRenderRecipe
} from '../dist/index.js';

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(root, '..');
const threeRoot = join(packageRoot, 'node_modules', 'three');
const assetPath = process.env.RENDER_LAB_ASSET;
const recipePath = process.env.RENDER_LAB_RECIPE;
const port = Number(process.env.RENDER_LAB_PORT ?? 4179);

if (!assetPath || !recipePath) {
  throw new Error('RENDER_LAB_ASSET and RENDER_LAB_RECIPE are required');
}

const recipeInput = JSON.parse(await readFile(recipePath, 'utf8'));
const recipe = normalizeRenderRecipe(recipeInput);
const recipeHash = await hashRenderRecipe(recipe);
const inspection = await inspectGlb(assetPath);

if (inspection.sourceSha256 !== recipe.asset.sourceSha256) {
  throw new Error(
    `Recipe source hash ${recipe.asset.sourceSha256} does not match asset ${inspection.sourceSha256}`
  );
}

const recipePayload = JSON.stringify({ recipe, recipeHash, inspection });
const contentTypes = {
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

async function sendFile(response, path) {
  const metadata = await stat(path);
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Length': metadata.size,
    'Content-Type': contentTypes[extname(path)] ?? 'application/octet-stream',
    'Cross-Origin-Resource-Policy': 'same-origin'
  });
  createReadStream(path).pipe(response);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    if (url.pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true, recipeHash }));
      return;
    }
    if (url.pathname === '/recipe.json') {
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8'
      });
      response.end(recipePayload);
      return;
    }
    if (url.pathname === '/asset.glb') {
      await sendFile(response, assetPath);
      return;
    }

    let path;
    if (url.pathname === '/') path = join(root, 'index.html');
    else if (url.pathname === '/scene.js') path = join(root, 'scene.js');
    else if (url.pathname === '/fallback.svg') path = join(root, 'fallback.svg');
    else if (url.pathname.startsWith('/vendor/three/')) {
      const relativePath = url.pathname.slice('/vendor/three/'.length);
      if (relativePath.includes('..')) throw new Error('Invalid vendor path');
      path = join(threeRoot, relativePath);
    } else {
      response.writeHead(404).end('Not found');
      return;
    }
    await sendFile(response, path);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : String(error));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`RENDER_LAB_URL=http://127.0.0.1:${port}`);
  console.log(`RENDER_LAB_RECIPE_HASH=${recipeHash}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
