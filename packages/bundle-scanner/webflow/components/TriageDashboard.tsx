/**
 * Triage Dashboard Component
 * Displays scan summary with verdict and statistics
 */

import React from 'react';
import type { ScanReport } from '../types';
import { VerdictBadge } from './VerdictBadge';

interface TriageDashboardProps {
  report: ScanReport;
  accentColor?: string;
}

export function TriageDashboard({ report, accentColor = '#6366f1' }: TriageDashboardProps) {
  const totalFindings = Object.values(report.findings).reduce((acc, f) => acc + f.count, 0);
  const blockerCount = Object.values(report.findings).filter(f => f.rule.severity === 'BLOCKER').reduce((acc, f) => acc + f.count, 0);
  const highCount = Object.values(report.findings).filter(f => f.rule.severity === 'HIGH').reduce((acc, f) => acc + f.count, 0);
  const mediumCount = Object.values(report.findings).filter(f => f.rule.severity === 'MEDIUM').reduce((acc, f) => acc + f.count, 0);
  const lowCount = Object.values(report.findings).filter(f => f.rule.severity === 'LOW' || f.rule.severity === 'INFO').reduce((acc, f) => acc + f.count, 0);
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Scan Results</h2>
          <p className="text-gray-400 text-sm">
            Scanned {report.bundleSummary.scannedFileCount} of {report.bundleSummary.fileCount} files
            ({formatBytes(report.bundleSummary.totalBytes)})
          </p>
        </div>
        <VerdictBadge verdict={report.verdict} size="lg" />
      </div>
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Findings" value={totalFindings} color="white" />
        <StatCard label="Blockers" value={blockerCount} color="#ef4444" />
        <StatCard label="High" value={highCount} color="#f97316" />
        <StatCard label="Medium/Low" value={mediumCount + lowCount} color="#eab308" />
      </div>
      
      {/* Verdict Reasons */}
      {report.verdictReasons.length > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Verdict Reasons</h3>
          <ul className="space-y-1">
            {report.verdictReasons.map((reason, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-gray-500">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default TriageDashboard;
