/**
 * History Panel Component
 * Displays scan history from IndexedDB
 */

import React from 'react';
import type { ScanHistoryEntry, ScanReport } from '../types';
import { VerdictBadge } from './VerdictBadge';

interface HistoryPanelProps {
  history: ScanHistoryEntry[];
  onSelectReport: (report: ScanReport) => void;
  onClearHistory: () => void;
  accentColor?: string;
}

export function HistoryPanel({
  history,
  onSelectReport,
  onClearHistory,
  accentColor = '#6366f1'
}: HistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 text-center">
        <div className="text-gray-500 mb-2">📜</div>
        <p className="text-gray-400 text-sm">No scan history yet.</p>
        <p className="text-gray-500 text-xs mt-1">
          Upload a bundle to start scanning.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white">Scan History</h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Clear All
        </button>
      </div>
      
      <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
        {history.map((entry) => (
          <button
            key={entry.runId}
            onClick={() => onSelectReport(entry.fullReport)}
            className="w-full px-4 py-3 hover:bg-gray-800/50 transition-colors text-left"
          >
            <div className="flex items-center justify-between mb-1">
              <VerdictBadge verdict={entry.verdict} size="sm" />
              <span className="text-xs text-gray-500">
                {formatDate(entry.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-300 truncate">
              {entry.summary}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{entry.fileCount} files</span>
              <span>{formatBytes(entry.totalBytes)}</span>
              <span>{entry.findingCount} findings</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default HistoryPanel;
