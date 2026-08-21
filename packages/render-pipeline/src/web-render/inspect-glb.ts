import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export interface GlbInspection {
  sourceSha256: string;
  byteLength: number;
  generator: string | null;
  counts: {
    scenes: number;
    nodes: number;
    meshes: number;
    primitives: number;
    vertices: number;
    triangles: number;
    materials: number;
    textures: number;
    images: number;
    animations: number;
  };
  embeddedImageBytes: number;
  recommendations: string[];
}

interface GlbJson {
  asset?: { generator?: string };
  scenes?: unknown[];
  nodes?: unknown[];
  meshes?: Array<{
    primitives?: Array<{
      attributes?: Record<string, number>;
      indices?: number;
      mode?: number;
    }>;
  }>;
  accessors?: Array<{ count?: number }>;
  bufferViews?: Array<{ byteLength?: number }>;
  materials?: unknown[];
  textures?: unknown[];
  images?: Array<{ bufferView?: number }>;
  animations?: unknown[];
}

function parseGlbJson(buffer: Buffer): GlbJson {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== 0x46546c67) {
    throw new Error('Input is not a valid binary glTF file');
  }
  if (buffer.readUInt32LE(4) !== 2) throw new Error('Only glTF 2.0 is supported');
  if (buffer.readUInt32LE(8) !== buffer.length) {
    throw new Error('GLB header length does not match file length');
  }

  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a || 20 + jsonLength > buffer.length) {
    throw new Error('GLB JSON chunk is missing or malformed');
  }

  const json = buffer.subarray(20, 20 + jsonLength).toString('utf8').trimEnd();
  return JSON.parse(json) as GlbJson;
}

function accessorCount(document: GlbJson, index: number | undefined): number {
  if (index === undefined) return 0;
  return document.accessors?.[index]?.count ?? 0;
}

export async function inspectGlb(path: string): Promise<GlbInspection> {
  const buffer = await readFile(path);
  const document = parseGlbJson(buffer);
  let primitives = 0;
  let vertices = 0;
  let triangles = 0;

  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      vertices += accessorCount(document, primitive.attributes?.POSITION);
      const elementCount = primitive.indices === undefined
        ? accessorCount(document, primitive.attributes?.POSITION)
        : accessorCount(document, primitive.indices);
      const mode = primitive.mode ?? 4;
      if (mode === 4) triangles += Math.floor(elementCount / 3);
      else if (mode === 5 || mode === 6) triangles += Math.max(0, elementCount - 2);
    }
  }

  const embeddedImageBytes = (document.images ?? []).reduce((total, image) => {
    if (image.bufferView === undefined) return total;
    return total + (document.bufferViews?.[image.bufferView]?.byteLength ?? 0);
  }, 0);

  const recommendations: string[] = [];
  if (buffer.length > 24_000_000) {
    recommendations.push('Create a compressed runtime derivative before public delivery.');
  }
  if ((document.textures?.length ?? 0) > 12) {
    recommendations.push('Transcode color and material textures to KTX2 or WebP with mipmaps.');
  }
  if (triangles > 100_000) {
    recommendations.push('Measure meshopt compression and add a compact-device LOD.');
  }
  if (!recommendations.length) recommendations.push('Source is within the initial local runtime envelope.');

  return {
    sourceSha256: createHash('sha256').update(buffer).digest('hex'),
    byteLength: buffer.length,
    generator: document.asset?.generator?.trim() || null,
    counts: {
      scenes: document.scenes?.length ?? 0,
      nodes: document.nodes?.length ?? 0,
      meshes: document.meshes?.length ?? 0,
      primitives,
      vertices,
      triangles,
      materials: document.materials?.length ?? 0,
      textures: document.textures?.length ?? 0,
      images: document.images?.length ?? 0,
      animations: document.animations?.length ?? 0
    },
    embeddedImageBytes,
    recommendations
  };
}
