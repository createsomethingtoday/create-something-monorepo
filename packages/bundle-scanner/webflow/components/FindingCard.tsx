/**
 * Finding Card Component
 * Displays individual scan findings with remediation info
 */

import React, { useState } from 'react';
import type { Finding, ScanRule, RemediationInfo } from '../types';

interface FindingCardProps {
  finding: Finding;
  rule: ScanRule;
  remediation?: RemediationInfo;
  accentColor?: string;
}

const severityColors: Record<string, string> = {
  BLOCKER: 'border-red-500 bg-red-500/10',
  HIGH: 'border-orange-500 bg-orange-500/10',
  MEDIUM: 'border-yellow-500 bg-yellow-500/10',
  LOW: 'border-blue-500 bg-blue-500/10',
  INFO: 'border-gray-500 bg-gray-500/10'
};

const severityBadgeColors: Record<string, string> = {
  BLOCKER: 'bg-red-500/20 text-red-400',
  HIGH: 'bg-orange-500/20 text-orange-400',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400',
  LOW: 'bg-blue-500/20 text-blue-400',
  INFO: 'bg-gray-500/20 text-gray-400'
};

export function FindingCard({ finding, rule, remediation, accentColor = '#6366f1' }: FindingCardProps) {
  const [showRemediation, setShowRemediation] = useState(false);
  const severity = finding.severity || rule.severity;
  
  return (
    <div className={`rounded-lg border-l-4 ${severityColors[severity]} p-4 mb-3`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityBadgeColors[severity]}`}>
              {severity}
            </span>
            <span className="text-xs text-gray-500">{rule.category}</span>
            {finding.confidence && finding.confidence !== 'HIGH' && (
              <span className="text-xs text-gray-600">({finding.confidence} confidence)</span>
            )}
          </div>
          <h4 className="text-white font-medium">{rule.name}</h4>
        </div>
      </div>
      
      {/* Location */}
      <div className="text-sm text-gray-400 mb-2">
        <span className="font-mono text-xs bg-gray-800 px-2 py-1 rounded">
          {finding.filePath}:{finding.line}:{finding.col}
        </span>
        {finding.locationType !== 'CODE' && (
          <span className="ml-2 text-xs text-gray-500">
            (in {finding.locationType.toLowerCase()})
          </span>
        )}
      </div>
      
      {/* Snippet */}
      <div className="bg-gray-900 rounded p-3 mb-3 overflow-x-auto">
        <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-all">
          {finding.snippet}
        </code>
      </div>
      
      {/* Tags */}
      {finding.tags && finding.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {finding.tags.map((tag, i) => (
            <span key={i} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Confidence Reason */}
      {finding.confidenceReason && (
        <p className="text-xs text-gray-500 italic mb-3">
          ℹ {finding.confidenceReason}
        </p>
      )}
      
      {/* Remediation Toggle */}
      {remediation && (
        <div className="border-t border-gray-700 pt-3 mt-3">
          <button
            onClick={() => setShowRemediation(!showRemediation)}
            className="text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ color: accentColor }}
          >
            {showRemediation ? '▼' : '▶'} How to Fix
          </button>
          
          {showRemediation && (
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <h5 className="font-semibold text-gray-300 mb-1">Why it matters</h5>
                <p className="text-gray-400">{remediation.whyItMatters}</p>
              </div>
              
              <div>
                <h5 className="font-semibold text-gray-300 mb-1">How to fix</h5>
                <p className="text-gray-400">{remediation.howToFix}</p>
              </div>
              
              {remediation.badExample && remediation.goodExample && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h5 className="font-semibold text-red-400 mb-1">❌ Don't</h5>
                    <pre className="bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                      <code className="text-gray-400">{remediation.badExample}</code>
                    </pre>
                  </div>
                  <div>
                    <h5 className="font-semibold text-green-400 mb-1">✓ Do</h5>
                    <pre className="bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                      <code className="text-gray-400">{remediation.goodExample}</code>
                    </pre>
                  </div>
                </div>
              )}
              
              {remediation.estimatedFixTime && (
                <p className="text-xs text-gray-500">
                  ⏱ Estimated fix time: {remediation.estimatedFixTime}
                </p>
              )}
              
              {remediation.officialDocs && remediation.officialDocs.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-300 mb-1">Resources</h5>
                  <ul className="space-y-1">
                    {remediation.officialDocs.map((doc, i) => (
                      <li key={i}>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:underline"
                          style={{ color: accentColor }}
                        >
                          {doc.title} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FindingCard;
