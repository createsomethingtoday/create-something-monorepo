/**
 * Glass Cube 3D Pipeline - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * All generation functions will throw errors.
 * Only the mesh optimization function remains available.
 *
 * Disabled: 2026-01-25
 */

export { generateReferenceImage, type ReferenceVariant } from './generate-reference.js';
export { imageToMesh, type MeshProvider } from './image-to-3d.js';
export { optimizeMesh, type OptimizeOptions } from './optimize.js';
