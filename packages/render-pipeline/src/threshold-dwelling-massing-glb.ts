import { Buffer } from 'node:buffer';

import {
  THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE,
  resolveThresholdDwellingAssemblyBinding,
  resolveThresholdDwellingCodifiedMaterial,
  type ThresholdDwellingCodifiedMaterial
} from '@create-something/canon/experiments/threshold-dwelling/assembly-schedule';

import type { FloorPlanData } from './floor-plan-svg.js';

const METERS_PER_FOOT = 0.3048;
const VERTICAL_MASSING_HEIGHT_IN = 108;
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BINARY_CHUNK_TYPE = 0x004e4942;

export interface ThresholdDwellingMassingGlbReceipt {
  canonicalPlanName: string;
  assemblyScheduleId: string;
  materialBindingStatus: 'role-codified-product-unselected';
  renderedMaterialIds: string[];
  horizontalDimensionsIn: {
    width: number;
    depth: number;
  };
  verticalMassingHeightIn: number;
  verticalStatus: 'illustrative-visualization-parameter';
  constructionReady: false;
}

export interface ThresholdDwellingMassingGlbResult {
  glb: Buffer;
  receipt: ThresholdDwellingMassingGlbReceipt;
}

interface PrimitiveGeometry {
  name: string;
  materialId: string;
  positions: number[];
  indices: number[];
}

interface GltfBufferView {
  buffer: 0;
  byteOffset: number;
  byteLength: number;
  target: 34962 | 34963;
}

interface GltfAccessor {
  bufferView: number;
  componentType: 5123 | 5126;
  count: number;
  type: 'SCALAR' | 'VEC3';
  min: number[];
  max: number[];
}

class BinaryBufferBuilder {
  private readonly chunks: Buffer[] = [];
  private length = 0;

  append(data: Uint8Array): number {
    const padding = (4 - (this.length % 4)) % 4;
    if (padding) {
      this.chunks.push(Buffer.alloc(padding));
      this.length += padding;
    }
    const offset = this.length;
    const view = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    this.chunks.push(view);
    this.length += view.length;
    return offset;
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks, this.length);
  }
}

function feetToMeters(value: number): number {
  return value * METERS_PER_FOOT;
}

function appendQuad(geometry: PrimitiveGeometry, vertices: readonly number[]): void {
  const index = geometry.positions.length / 3;
  geometry.positions.push(...vertices);
  geometry.indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
}

function extent(values: readonly number[]): { min: number[]; max: number[] } {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], values[index + axis]);
      max[axis] = Math.max(max[axis], values[index + axis]);
    }
  }
  return { min, max };
}

function materialForBinding(
  kind: 'plan-zone' | 'wall-class',
  id: string
): ThresholdDwellingCodifiedMaterial {
  const binding = resolveThresholdDwellingAssemblyBinding(kind, id);
  if (!binding || !binding.renderInMassingGuide) {
    throw new Error(`Threshold Dwelling massing has no renderable assembly binding for ${kind}:${id}.`);
  }
  const material = resolveThresholdDwellingCodifiedMaterial(binding.renderMaterialId);
  if (!material) {
    throw new Error(`Threshold Dwelling assembly binding references missing material ${binding.renderMaterialId}.`);
  }
  return material;
}

function floorGeometry(plan: FloorPlanData): PrimitiveGeometry[] {
  const groups = new Map<string, PrimitiveGeometry>();

  for (const zone of plan.zones) {
    if (!zone.id) {
      throw new Error('Threshold Dwelling massing requires stable plan-zone IDs for material binding.');
    }
    const material = materialForBinding('plan-zone', zone.id);
    const group = groups.get(material.id) ?? {
      name: `Floor · ${material.id} · ${material.name}`,
      materialId: material.id,
      positions: [],
      indices: []
    };
    const x1 = feetToMeters(zone.x);
    const x2 = feetToMeters(zone.x + zone.width);
    const z1 = feetToMeters(zone.y);
    const z2 = feetToMeters(zone.y + zone.height);
    appendQuad(group, [x1, 0, z1, x1, 0, z2, x2, 0, z2, x2, 0, z1]);
    groups.set(material.id, group);
  }

  return [...groups.values()];
}

function wallGeometry(plan: FloorPlanData): PrimitiveGeometry[] {
  const groups = new Map<string, PrimitiveGeometry>();
  const height = VERTICAL_MASSING_HEIGHT_IN / 12 * METERS_PER_FOOT;

  for (const wall of plan.walls) {
    const exterior = Boolean(wall.exterior);
    const material = materialForBinding('wall-class', exterior ? 'exterior' : 'interior');
    const group = groups.get(material.id) ?? {
      name: `Wall · ${material.id} · ${material.name}`,
      materialId: material.id,
      positions: [],
      indices: []
    };
    const x1 = feetToMeters(wall.x1);
    const x2 = feetToMeters(wall.x2);
    const z1 = feetToMeters(wall.y1);
    const z2 = feetToMeters(wall.y2);
    appendQuad(group, [x1, 0, z1, x2, 0, z2, x2, height, z2, x1, height, z1]);
    groups.set(material.id, group);
  }

  return [...groups.values()];
}

function appendPrimitive(
  geometry: PrimitiveGeometry,
  material: number,
  binary: BinaryBufferBuilder,
  bufferViews: GltfBufferView[],
  accessors: GltfAccessor[]
): { attributes: { POSITION: number }; indices: number; material: number; mode: 4 } {
  const positions = new Float32Array(geometry.positions);
  const indices = new Uint16Array(geometry.indices);
  const positionBufferView = bufferViews.length;
  bufferViews.push({
    buffer: 0,
    byteOffset: binary.append(new Uint8Array(positions.buffer)),
    byteLength: positions.byteLength,
    target: 34962
  });
  const positionAccessor = accessors.length;
  const positionExtent = extent(geometry.positions);
  accessors.push({
    bufferView: positionBufferView,
    componentType: 5126,
    count: positions.length / 3,
    type: 'VEC3',
    min: positionExtent.min,
    max: positionExtent.max
  });

  const indexBufferView = bufferViews.length;
  bufferViews.push({
    buffer: 0,
    byteOffset: binary.append(new Uint8Array(indices.buffer)),
    byteLength: indices.byteLength,
    target: 34963
  });
  const indexAccessor = accessors.length;
  accessors.push({
    bufferView: indexBufferView,
    componentType: 5123,
    count: indices.length,
    type: 'SCALAR',
    min: [0],
    max: [Math.max(...indices)]
  });

  return {
    attributes: { POSITION: positionAccessor },
    indices: indexAccessor,
    material,
    mode: 4
  };
}

function fourBytePad(buffer: Buffer, fill: number): Buffer {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
}

function hexToColorFactor(color: string): [number, number, number, number] {
  const value = color.startsWith('#') ? color.slice(1) : color;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`Threshold Dwelling material has an invalid visual color: ${color}`);
  }
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255,
    1
  ];
}

function gltfMaterial(material: ThresholdDwellingCodifiedMaterial) {
  return {
    name: `${material.id} · ${material.name} · role codified / product unselected`,
    pbrMetallicRoughness: {
      baseColorFactor: hexToColorFactor(material.visualColor),
      metallicFactor: 0,
      roughnessFactor: 0.85
    },
    extensions: { KHR_materials_unlit: {} },
    doubleSided: true,
    extras: {
      workway: {
        materialId: material.id,
        paletteSourceName: material.paletteSourceName,
        selectionStatus: material.selectionStatus,
        productSelection: 'unissued'
      }
    }
  };
}

/**
 * Creates a compact, local glTF 2.0 binary. Plan coordinates are converted to
 * meters as glTF requires. Only horizontal plan geometry is authoritative;
 * the vertical mass is explicitly tagged as an illustrative view parameter.
 */
export function createThresholdDwellingMassingGlb(
  plan: FloorPlanData
): ThresholdDwellingMassingGlbResult {
  if (plan.width <= 0 || plan.depth <= 0) {
    throw new Error('Threshold Dwelling massing requires positive plan dimensions.');
  }
  const geometries = [...floorGeometry(plan), ...wallGeometry(plan)];
  const renderedMaterialIds = [...new Set(geometries.map((geometry) => geometry.materialId))];
  const renderedMaterials = renderedMaterialIds.map((id) => {
    const material = resolveThresholdDwellingCodifiedMaterial(id);
    if (!material) throw new Error(`Threshold Dwelling massing references missing material ${id}.`);
    return material;
  });
  const materialIndexById = new Map(
    renderedMaterials.map((material, index) => [material.id, index])
  );
  const binary = new BinaryBufferBuilder();
  const bufferViews: GltfBufferView[] = [];
  const accessors: GltfAccessor[] = [];
  const meshes = geometries.map((geometry) => {
    const materialIndex = materialIndexById.get(geometry.materialId);
    if (materialIndex === undefined) {
      throw new Error(`Threshold Dwelling massing failed to index ${geometry.materialId}.`);
    }
    return {
      name: geometry.name,
      primitives: [appendPrimitive(geometry, materialIndex, binary, bufferViews, accessors)]
    };
  });
  const binaryBuffer = binary.toBuffer();
  const receipt: ThresholdDwellingMassingGlbReceipt = {
    canonicalPlanName: plan.name,
    assemblyScheduleId: THRESHOLD_DWELLING_ASSEMBLY_SCHEDULE.id,
    materialBindingStatus: 'role-codified-product-unselected',
    renderedMaterialIds,
    horizontalDimensionsIn: {
      width: plan.width * 12,
      depth: plan.depth * 12
    },
    verticalMassingHeightIn: VERTICAL_MASSING_HEIGHT_IN,
    verticalStatus: 'illustrative-visualization-parameter',
    constructionReady: false
  };
  const document = {
    asset: {
      version: '2.0',
      generator: 'CREATE SOMETHING WorkWay deterministic massing exporter'
    },
    extensionsUsed: ['KHR_materials_unlit'],
    extras: {
      workway: receipt
    },
    scene: 0,
    scenes: [{ name: 'Threshold Dwelling Rev 0.8 massing guide', nodes: meshes.map((_, index) => index) }],
    nodes: meshes.map((mesh, index) => ({ name: mesh.name, mesh: index })),
    meshes,
    materials: renderedMaterials.map(gltfMaterial),
    buffers: [{ byteLength: binaryBuffer.length }],
    bufferViews,
    accessors
  };
  const jsonChunk = fourBytePad(Buffer.from(JSON.stringify(document)), 0x20);
  const binaryChunk = fourBytePad(binaryBuffer, 0);
  const glb = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binaryChunk.length);
  glb.writeUInt32LE(GLB_MAGIC, 0);
  glb.writeUInt32LE(GLB_VERSION, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonChunk.length, 12);
  glb.writeUInt32LE(JSON_CHUNK_TYPE, 16);
  jsonChunk.copy(glb, 20);
  const binaryHeaderOffset = 20 + jsonChunk.length;
  glb.writeUInt32LE(binaryChunk.length, binaryHeaderOffset);
  glb.writeUInt32LE(BINARY_CHUNK_TYPE, binaryHeaderOffset + 4);
  binaryChunk.copy(glb, binaryHeaderOffset + 8);

  return { glb, receipt };
}
