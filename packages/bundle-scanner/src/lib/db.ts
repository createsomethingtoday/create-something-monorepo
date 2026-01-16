import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ScanReport, ScanHistoryEntry } from '@create-something/bundle-scanner-core';

interface BundleScannerDB extends DBSchema {
  history: {
    key: string;
    value: ScanHistoryEntry;
    indexes: {
      'by-date': string;
    };
  };
}

const DB_NAME = 'bundle-scanner';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BundleScannerDB>> | null = null;

function getDB(): Promise<IDBPDatabase<BundleScannerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BundleScannerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('history', { keyPath: 'runId' });
        store.createIndex('by-date', 'createdAt');
      }
    });
  }
  return dbPromise;
}

/**
 * Save a scan report to history
 */
export async function saveScanToHistory(report: ScanReport): Promise<void> {
  const db = await getDB();
  
  const findingCount = Object.values(report.findings).reduce(
    (acc, group) => acc + group.count, 
    0
  );
  
  const entry: ScanHistoryEntry = {
    runId: report.runId,
    createdAt: report.createdAt,
    verdict: report.verdict,
    summary: `${report.bundleSummary.fileCount} files, ${findingCount} findings`,
    fileCount: report.bundleSummary.fileCount,
    totalBytes: report.bundleSummary.totalBytes,
    findingCount,
    fullReport: report
  };
  
  await db.put('history', entry);
}

/**
 * Get all scan history entries
 */
export async function getScanHistory(): Promise<ScanHistoryEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('history', 'by-date');
  // Return in reverse chronological order
  return entries.reverse();
}

/**
 * Get a specific scan report by ID
 */
export async function getScanById(runId: string): Promise<ScanHistoryEntry | undefined> {
  const db = await getDB();
  return db.get('history', runId);
}

/**
 * Delete a scan from history
 */
export async function deleteScanFromHistory(runId: string): Promise<void> {
  const db = await getDB();
  await db.delete('history', runId);
}

/**
 * Clear all scan history
 */
export async function clearScanHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('history');
}
