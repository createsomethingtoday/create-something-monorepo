import React from 'react';
import type { ScanReport } from '@create-something/bundle-scanner-core';
import { generateRejectionEmail } from '@create-something/bundle-scanner-core';
import { CheckCircle, AlertTriangle, XCircle, Mail, Copy } from 'lucide-react';

interface TriageDashboardProps {
  report: ScanReport;
}

export const TriageDashboard: React.FC<TriageDashboardProps> = ({ report }) => {
  // Calculate counts based on review bucket & severity
  let blockerCount = 0;
  let reviewCount = 0;
  let infoCount = 0;

  Object.values(report.findings).forEach(group => {
    if (group.count === 0) return;
    
    if (group.rule.reviewBucket === 'AUTO_REJECT' || group.rule.severity === 'BLOCKER') {
      blockerCount += group.count;
    } else if (group.rule.reviewBucket === 'ACTION_REQUIRED' || group.rule.severity === 'HIGH') {
      reviewCount += group.count;
    } else {
      infoCount += group.count;
    }
  });

  const handleDraftEmail = async () => {
    const text = generateRejectionEmail(report);
    try {
      await navigator.clipboard.writeText(text);
      // In a real app, use a toast notification
      alert('Rejection email drafted and copied to clipboard!');
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  return (
    <section className="bg-white p-6 rounded-xl border shadow-sm mb-6" aria-label="Triage Dashboard">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Triage Dashboard</h2>
          <p className="text-sm text-gray-500">60-second review summary</p>
        </div>
        <div 
          role="status"
          className={`px-4 py-2 rounded-lg font-bold text-sm border whitespace-nowrap self-start md:self-auto ${
            blockerCount > 0 ? 'bg-red-50 text-red-700 border-red-200' :
            reviewCount > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
            'bg-green-50 text-green-700 border-green-200'
          }`}
        >
          {blockerCount > 0 ? 'RECOMMENDATION: REJECT' : 
           reviewCount > 0 ? 'RECOMMENDATION: MANUAL REVIEW' : 
           'RECOMMENDATION: LIKELY PASS'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
          <div className="p-2 bg-white rounded-full shadow-sm shrink-0">
            <XCircle className="w-6 h-6 text-red-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-red-900">{blockerCount}</div>
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide truncate">
              Auto-Reject
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <div className="p-2 bg-white rounded-full shadow-sm shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-yellow-900">{reviewCount}</div>
            <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide truncate">
              Review Needed
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="p-2 bg-white rounded-full shadow-sm shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-green-900">{infoCount}</div>
            <div className="text-xs font-semibold text-green-700 uppercase tracking-wide truncate">
              Informational
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={handleDraftEmail}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-black focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all text-sm font-medium"
          aria-label="Generate and copy rejection email draft"
        >
          <Mail className="w-4 h-4" aria-hidden="true" />
          Copy Rejection Email Draft
        </button>
      </div>
    </section>
  );
};
