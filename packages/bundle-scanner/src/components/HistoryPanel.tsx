import React, { useEffect, useState } from 'react';
import type { ScanReport, ScanHistoryEntry } from '@create-something/bundle-scanner-core';
import { getScanHistory, deleteScanFromHistory, clearScanHistory } from '../lib/db';
import { VerdictBadge } from './VerdictBadge';
import { Clock, Trash2, FileText, Loader2, AlertCircle } from 'lucide-react';

interface HistoryPanelProps {
  onLoadReport: (report: ScanReport) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onLoadReport }) => {
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const entries = await getScanHistory();
      setHistory(entries);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this scan from history?')) {
      await deleteScanFromHistory(runId);
      await loadHistory();
    }
  };

  const handleClearAll = async () => {
    if (confirm('Clear all scan history? This cannot be undone.')) {
      await clearScanHistory();
      await loadHistory();
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center text-gray-500">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p>No scan history yet</p>
        <p className="text-sm mt-1">Complete a scan to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Scan History</h2>
        <button
          onClick={handleClearAll}
          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Clear All
        </button>
      </div>

      <div className="space-y-3">
        {history.map((entry) => (
          <button
            key={entry.runId}
            onClick={() => onLoadReport(entry.fullReport)}
            className="w-full bg-white rounded-xl border shadow-sm p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <VerdictBadge verdict={entry.verdict} size="sm" />
                  <span className="text-xs text-gray-400 truncate">
                    {entry.runId.substring(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {entry.fileCount} files
                  </span>
                  <span>{formatSize(entry.totalBytes)}</span>
                  <span>{entry.findingCount} findings</span>
                </div>
                <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(entry.createdAt)}
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(entry.runId, e)}
                className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Delete scan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
