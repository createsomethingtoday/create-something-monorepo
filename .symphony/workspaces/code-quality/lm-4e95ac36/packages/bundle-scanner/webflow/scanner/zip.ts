/**
 * ZIP Processing Module
 * Matches original IC implementation
 */

import JSZip from 'jszip';
import type { ScanConfig } from '../types';

export interface ZipEntry {
  path: string;
  data: Uint8Array;
}

export interface ZipResult {
  entries: ZipEntry[];
  totalBytes: number;
}

/**
 * Process a ZIP file and extract all entries
 * Includes safety checks for zip slip, max size, and max files
 */
export async function processZipFile(
  file: File,
  config: ScanConfig
): Promise<ZipResult> {
  const { zipSafety } = config.globalScanConfig;
  
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  const entries: ZipEntry[] = [];
  let totalBytes = 0;
  let fileCount = 0;
  
  const zipEntries = Object.entries(zip.files);
  
  for (const [path, zipEntry] of zipEntries) {
    // Skip directories
    if (zipEntry.dir) continue;
    
    // Zip slip protection
    if (zipSafety.preventZipSlip) {
      const normalizedPath = path.replace(/\\/g, '/');
      if (normalizedPath.includes('../') || normalizedPath.startsWith('/')) {
        console.warn(`Zip slip attempt detected: ${path}`);
        continue;
      }
    }
    
    fileCount++;
    
    // Check file count limit
    if (fileCount > zipSafety.maxFiles) {
      throw new Error(
        `ZIP contains too many files (>${zipSafety.maxFiles}). ` +
        `This may indicate a zip bomb or an excessively large bundle.`
      );
    }
    
    const data = await zipEntry.async('uint8array');
    totalBytes += data.length;
    
    // Check total size limit
    if (totalBytes > zipSafety.maxTotalUnzippedBytes) {
      throw new Error(
        `ZIP uncompressed size exceeds ${Math.round(zipSafety.maxTotalUnzippedBytes / 1000000)}MB limit. ` +
        `This may indicate a zip bomb.`
      );
    }
    
    entries.push({ path, data });
  }
  
  return { entries, totalBytes };
}
