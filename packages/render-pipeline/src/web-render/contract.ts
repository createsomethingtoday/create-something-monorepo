export type Vector3Tuple = [number, number, number];

export interface RenderAssetProvenance {
  creator: string;
  sourceUrl: string;
  licenseStatus: string;
  aiUse: 'permitted' | 'prohibited' | 'not-applicable';
  externalUploadAllowed: boolean;
}

export interface RenderAssetManifest {
  id: string;
  browserUri: string;
  sourceSha256: string;
  provenance: RenderAssetProvenance;
}

export interface RenderShot {
  focalLengthMm: number;
  /** Camera offset in the court-relative [towardCourt, side, up] basis. */
  position: Vector3Tuple;
  /** Aim offset in the court-relative [towardCourt, side, up] basis. */
  target: Vector3Tuple;
  focusDistance: number;
  aperture: number;
}

export interface RenderStyle {
  background: string;
  court: string;
  line: string;
  structure: string;
  proof: string;
  exposure: number;
}

export interface RenderOutputRequest {
  format: 'png';
  width: number;
  height: number;
  pixelRatioCap: number;
}

export interface RenderBudgets {
  maxSourceBytes: number;
  maxTriangles: number;
  maxDrawCalls: number;
  maxTextures: number;
}

export interface RenderMotion {
  enabled: boolean;
  amplitude: number;
  periodMs: number;
}

export interface RenderRecipeInput {
  version: 1;
  id: string;
  asset: RenderAssetManifest;
  shot: RenderShot;
  style: RenderStyle;
  output: RenderOutputRequest;
  budgets: RenderBudgets;
  motion?: RenderMotion;
}

export interface NormalizedRenderRecipe extends Omit<RenderRecipeInput, 'motion'> {
  motion: RenderMotion;
}

export interface BrowserRenderMetrics {
  drawCalls: number;
  triangles: number;
  textures: number;
  sourceBytes?: number;
}

export interface RenderFallbackState {
  available: boolean;
  active: boolean;
  reason: string | null;
}

export interface RenderBudgetReceipt {
  pass: boolean;
  checks: {
    sourceBytes: boolean | null;
    triangles: boolean;
    drawCalls: boolean;
    textures: boolean;
  };
}

export interface RenderReceipt {
  version: 1;
  recipeId: string;
  recipeHash: string;
  sourceSha256: string;
  capturedAt: string;
  backend: 'webgl2' | 'webgpu' | 'static-fallback';
  durationMs: number;
  output: Pick<RenderOutputRequest, 'format' | 'width' | 'height'>;
  render: BrowserRenderMetrics;
  budgets: RenderBudgetReceipt;
  fallback: RenderFallbackState;
}

function assertNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must be non-empty`);
  return normalized;
}

function assertFiniteRange(value: number, label: string, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }
  return value;
}

function normalizeVector(value: Vector3Tuple, label: string): Vector3Tuple {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`${label} must contain exactly three coordinates`);
  }
  return value.map((coordinate, index) =>
    assertFiniteRange(coordinate, `${label}[${index}]`, -10_000, 10_000)
  ) as Vector3Tuple;
}

function normalizeColor(value: string, label: string): string {
  const color = value.trim().toLowerCase();
  if (!/^#[a-f0-9]{6}$/.test(color)) {
    throw new Error(`${label} must be a six-digit hex color`);
  }
  return color;
}

function normalizeLocalBrowserUri(value: string): string {
  const uri = value.trim();
  if (
    !uri ||
    (!uri.startsWith('/') && !uri.startsWith('./')) ||
    uri.startsWith('//') ||
    uri.includes('..') ||
    uri.includes('\\') ||
    /^[a-z][a-z0-9+.-]*:/i.test(uri)
  ) {
    throw new Error('asset.browserUri must be a local browser URI');
  }
  return uri;
}

function normalizePositiveInteger(value: number, label: string, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > max) {
    throw new Error(`${label} must be a positive integer no greater than ${max}`);
  }
  return value;
}

export function normalizeRenderRecipe(input: RenderRecipeInput): NormalizedRenderRecipe {
  if (input.version !== 1) throw new Error('recipe.version must be 1');

  const sourceSha256 = input.asset.sourceSha256.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sourceSha256)) {
    throw new Error('asset.sourceSha256 must be a SHA-256 hex digest');
  }

  if (input.asset.provenance.externalUploadAllowed) {
    throw new Error('external upload must remain disabled for local render assets');
  }

  const sourceUrl = input.asset.provenance.sourceUrl.trim();
  if (!/^https:\/\//i.test(sourceUrl)) {
    throw new Error('asset.provenance.sourceUrl must be an HTTPS provenance URL');
  }

  if (!['permitted', 'prohibited', 'not-applicable'].includes(input.asset.provenance.aiUse)) {
    throw new Error('asset.provenance.aiUse must be permitted, prohibited, or not-applicable');
  }

  const outputWidth = normalizePositiveInteger(input.output.width, 'output.width', 8192);
  const outputHeight = normalizePositiveInteger(input.output.height, 'output.height', 8192);
  if (outputWidth < 64 || outputHeight < 64) {
    throw new Error('output width and height must be at least 64 pixels');
  }
  if (input.output.format !== 'png') throw new Error('output.format must be png');

  const motion = input.motion ?? { enabled: false, amplitude: 0, periodMs: 8000 };

  return {
    version: 1,
    id: assertNonEmpty(input.id, 'recipe.id'),
    asset: {
      id: assertNonEmpty(input.asset.id, 'asset.id'),
      browserUri: normalizeLocalBrowserUri(input.asset.browserUri),
      sourceSha256,
      provenance: {
        creator: assertNonEmpty(input.asset.provenance.creator, 'provenance.creator'),
        sourceUrl,
        licenseStatus: assertNonEmpty(
          input.asset.provenance.licenseStatus,
          'provenance.licenseStatus'
        ),
        aiUse: input.asset.provenance.aiUse,
        externalUploadAllowed: false
      }
    },
    shot: {
      focalLengthMm: assertFiniteRange(input.shot.focalLengthMm, 'shot.focalLengthMm', 12, 300),
      position: normalizeVector(input.shot.position, 'shot.position'),
      target: normalizeVector(input.shot.target, 'shot.target'),
      focusDistance: assertFiniteRange(input.shot.focusDistance, 'shot.focusDistance', 0.01, 1000),
      aperture: assertFiniteRange(input.shot.aperture, 'shot.aperture', 0, 0.1)
    },
    style: {
      background: normalizeColor(input.style.background, 'style.background'),
      court: normalizeColor(input.style.court, 'style.court'),
      line: normalizeColor(input.style.line, 'style.line'),
      structure: normalizeColor(input.style.structure, 'style.structure'),
      proof: normalizeColor(input.style.proof, 'style.proof'),
      exposure: assertFiniteRange(input.style.exposure, 'style.exposure', 0.1, 4)
    },
    output: {
      format: 'png',
      width: outputWidth,
      height: outputHeight,
      pixelRatioCap: assertFiniteRange(input.output.pixelRatioCap, 'output.pixelRatioCap', 0.5, 3)
    },
    budgets: {
      maxSourceBytes: normalizePositiveInteger(input.budgets.maxSourceBytes, 'budgets.maxSourceBytes'),
      maxTriangles: normalizePositiveInteger(input.budgets.maxTriangles, 'budgets.maxTriangles'),
      maxDrawCalls: normalizePositiveInteger(input.budgets.maxDrawCalls, 'budgets.maxDrawCalls'),
      maxTextures: normalizePositiveInteger(input.budgets.maxTextures, 'budgets.maxTextures')
    },
    motion: {
      enabled: Boolean(motion.enabled),
      amplitude: assertFiniteRange(motion.amplitude, 'motion.amplitude', 0, 1),
      periodMs: assertFiniteRange(motion.periodMs, 'motion.periodMs', 250, 120_000)
    }
  };
}

function sortForStableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForStableJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortForStableJson(nested)])
    );
  }
  return value;
}

export function serializeRenderRecipe(recipe: NormalizedRenderRecipe): string {
  return JSON.stringify(sortForStableJson(recipe));
}

export async function hashRenderRecipe(recipe: NormalizedRenderRecipe): Promise<string> {
  const bytes = new TextEncoder().encode(serializeRenderRecipe(recipe));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createRenderReceipt(input: {
  recipe: NormalizedRenderRecipe;
  recipeHash: string;
  backend: RenderReceipt['backend'];
  durationMs: number;
  render: BrowserRenderMetrics;
  fallback: RenderFallbackState;
  capturedAt?: string;
}): RenderReceipt {
  if (!/^[a-f0-9]{64}$/.test(input.recipeHash)) {
    throw new Error('recipeHash must be a SHA-256 hex digest');
  }

  const checks: RenderBudgetReceipt['checks'] = {
    sourceBytes:
      input.render.sourceBytes === undefined
        ? null
        : input.render.sourceBytes <= input.recipe.budgets.maxSourceBytes,
    triangles: input.render.triangles <= input.recipe.budgets.maxTriangles,
    drawCalls: input.render.drawCalls <= input.recipe.budgets.maxDrawCalls,
    textures: input.render.textures <= input.recipe.budgets.maxTextures
  };

  return {
    version: 1,
    recipeId: input.recipe.id,
    recipeHash: input.recipeHash,
    sourceSha256: input.recipe.asset.sourceSha256,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    backend: input.backend,
    durationMs: input.durationMs,
    output: {
      format: input.recipe.output.format,
      width: input.recipe.output.width,
      height: input.recipe.output.height
    },
    render: { ...input.render },
    budgets: {
      pass: Object.values(checks).every((value) => value !== false),
      checks
    },
    fallback: { ...input.fallback }
  };
}
