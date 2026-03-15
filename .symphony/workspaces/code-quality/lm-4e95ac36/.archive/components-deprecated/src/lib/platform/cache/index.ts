/**
 * Cache Adapters
 *
 * Re-exports cache implementations for both Cloudflare and local modes.
 */

export { wrapKV, isKVNamespace } from './cloudflare.js';
export { createFileCache } from './file.js';
