/**
 * IndexedDB Utility for Scan History
 * Matches original IC implementation
 */

import type { ScanHistoryEntry, ScanReport } from '../types';

const DB_NAME = 'bundle-scanner-webflow';
const STORE_NAME = 'scan-history';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'runId' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveScanToHistory(report: ScanReport): Promise<void> {
  const db = await openDB();
  const entry: ScanHistoryEntry = {
    runId: report.runId,
    createdAt: report.createdAt,
    verdict: report.verdict,
    summary: `${report.bundleSummary.fileCount} files, ${Object.keys(report.findings).length} rules matched`,
    fileCount: report.bundleSummary.fileCount,
    totalBytes: report.bundleSummary.totalBytes,
    findingCount: Object.values(report.findings).reduce((acc, f) => acc + f.count, 0),
    fullReport: report
  };
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(entry);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getScanHistory(): Promise<ScanHistoryEntry[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const entries = request.result as ScanHistoryEntry[];
      // Sort by date descending
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(entries);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearScanHistory(): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
