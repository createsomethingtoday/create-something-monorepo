/**
 * Replicate API Client - DISABLED
 *
 * Replicate integration has been disabled due to runaway costs ($700+).
 * All functions throw errors to prevent accidental API usage.
 *
 * Disabled: 2026-01-25
 * Reason: google/nano-banana-pro generated 4,339 images at $0.15/image = $650.85
 */

import type { RenderOptions, RenderResult } from './types.js';
import { isConfigured } from './utils/replicate.js';

// Re-export isConfigured for external consumers
export { isConfigured };

const DISABLED_ERROR = new Error(
  'REPLICATE RENDERING DISABLED: ' +
    'Replicate API has been disabled due to runaway costs ($700+ from google/nano-banana-pro). ' +
    'Contact engineering before re-enabling Replicate integration.'
);

/**
 * Render image using ControlNet model on Replicate - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function render(_options: RenderOptions): Promise<RenderResult> {
  throw DISABLED_ERROR;
}

/**
 * Render with architectural material presets - DISABLED
 * @throws Error always - Replicate integration is disabled
 */
export async function renderArchitectural(
  _image: Buffer | string,
  _basePrompt: string,
  _options?: Partial<RenderOptions>
): Promise<RenderResult> {
  throw DISABLED_ERROR;
}
