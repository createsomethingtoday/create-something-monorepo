import JSZip from 'jszip';
import type { ScanConfig, UnzippedFile, ProgressCallback } from '../types';

/**
 * Normalize a raw ZIP entry name to a POSIX-style relative path:
 * convert backslashes to forward slashes and strip leading slashes.
 */
export function normalizeEntryPath(rawFilename: string): string {
  return rawFilename.replace(/\\/g, '/').replace(/^\/+/, '');
}

/**
 * Determine whether a normalized entry path is unsafe to extract.
 * Guards against zip-slip traversal (`..`), absolute paths, and macOS
 * resource-fork (`__MACOSX`) metadata directories.
 */
export function isUnsafeEntryPath(normalizedPath: string): boolean {
  return (
    normalizedPath.includes('..') ||
    normalizedPath.includes('__MACOSX') ||
    normalizedPath.startsWith('/')
  );
}

/**
 * Process a ZIP file and extract its contents with safety checks
 * 
 * @param file - The ZIP file to process
 * @param config - Scanner configuration with safety limits
 * @param onProgress - Progress callback
 * @returns Array of extracted files
 * @throws Error if ZIP is invalid or exceeds safety limits
 */
export async function processZipFile(
  file: File | Blob | ArrayBuffer | Uint8Array,
  config: ScanConfig,
  onProgress: ProgressCallback
): Promise<UnzippedFile[]> {
  onProgress('Reading ZIP file...');
  const zip = new JSZip();
  
  try {
    const loadedZip = await zip.loadAsync(file);
    const files: UnzippedFile[] = [];
    let totalBytes = 0;

    const entries = Object.keys(loadedZip.files);
    
    // Safety Check: Max Files
    if (entries.length > config.globalScanConfig.zipSafety.maxFiles) {
      throw new Error(
        `ZIP contains too many files (${entries.length}). ` +
        `Limit: ${config.globalScanConfig.zipSafety.maxFiles}`
      );
    }

    onProgress(`Unpacking ${entries.length} files...`);

    for (const rawFilename of entries) {
      const entry = loadedZip.files[rawFilename];
      if (!entry) continue;

      // Skip directories
      if (entry.dir) continue;

      // Normalize to a POSIX-style relative path.
      const normalizedPath = normalizeEntryPath(rawFilename);

      // Zip Slip Protection & Basic Traversal Check
      if (isUnsafeEntryPath(normalizedPath)) {
        // Silent skip for MACOSX, warn for others
        if (!normalizedPath.includes('__MACOSX')) {
          console.warn(`Skipping unsafe or system path: ${normalizedPath}`);
        }
        continue;
      }

      // Decompress
      const content = await entry.async('uint8array');
      totalBytes += content.length;

      // Safety Check: Max Total Bytes
      if (totalBytes > config.globalScanConfig.zipSafety.maxTotalUnzippedBytes) {
        const limitMB = (config.globalScanConfig.zipSafety.maxTotalUnzippedBytes / 1024 / 1024).toFixed(1);
        throw new Error(`Total unzipped size exceeds limit of ${limitMB}MB`);
      }

      files.push({
        path: normalizedPath,
        data: content
      });
    }

    return files;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to process ZIP: ${message}`);
  }
}

/**
 * Process a ZIP file from a buffer (for Node.js / Cloudflare Workers usage).
 *
 * Loads the ArrayBuffer directly rather than wrapping it in a Blob. JSZip reads
 * Blobs via FileReader, which is unavailable in Node and on the Workers runtime;
 * ArrayBuffer input is supported everywhere.
 */
export async function processZipBuffer(
  buffer: ArrayBuffer,
  config: ScanConfig,
  onProgress: ProgressCallback
): Promise<UnzippedFile[]> {
  return processZipFile(buffer, config, onProgress);
}
