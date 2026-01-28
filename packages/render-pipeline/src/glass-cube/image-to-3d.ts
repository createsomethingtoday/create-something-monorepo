/**
 * Image to 3D Mesh Conversion - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * Disabled: 2026-01-25
 */

export type MeshProvider = 'replicate-trellis' | 'meshy' | 'replicate-hunyuan';

const DISABLED_ERROR = new Error(
  'REPLICATE 3D CONVERSION DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+). ' +
    'Contact engineering before re-enabling.'
);

/**
 * Convert an image to a 3D mesh - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function imageToMesh(_options: {
  image: Buffer | string;
  provider?: MeshProvider;
  outputPath?: string;
}): Promise<{ url: string; buffer: Buffer }> {
  throw DISABLED_ERROR;
}
