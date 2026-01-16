import React, { useState } from 'react';
import type { ScanRule, Finding } from '@create-something/bundle-scanner-core';
import { ChevronDown, ChevronUp, FileCode, MapPin } from 'lucide-react';

interface FindingCardProps {
  rule: ScanRule;
  count: number;
  items: Finding[];
  truncatedCount: number;
}

export const FindingCard: React.FC<FindingCardProps> = ({ 
  rule, 
  count, 
  items, 
  truncatedCount 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityColors = {
    BLOCKER: 'border-red-300 bg-red-50',
    HIGH: 'border-orange-300 bg-orange-50',
    MEDIUM: 'border-yellow-300 bg-yellow-50',
    LOW: 'border-blue-300 bg-blue-50',
    INFO: 'border-gray-300 bg-gray-50'
  };

  const severityBadgeColors = {
    BLOCKER: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-blue-100 text-blue-800',
    INFO: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className={`rounded-lg border-l-4 mb-4 ${severityColors[rule.severity]}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left flex items-start justify-between gap-4 hover:bg-white/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${severityBadgeColors[rule.severity]}`}>
              {rule.severity}
            </span>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              {rule.category}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900">{rule.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
          <div className="mt-2 text-xs text-gray-500">
            <span className="font-medium">{count}</span> occurrence{count !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="shrink-0 text-gray-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isExpanded && items.length > 0 && (
        <div className="px-4 pb-4 space-y-3">
          {items.map((item, idx) => (
            <div 
              key={`${item.filePath}-${item.line}-${idx}`}
              className="bg-white rounded-lg border p-3"
            >
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                <FileCode className="w-3 h-3" aria-hidden="true" />
                <code className="font-mono">{item.filePath}</code>
                <span className="text-gray-400">•</span>
                <MapPin className="w-3 h-3" aria-hidden="true" />
                <span>Line {item.line}</span>
                {item.confidence && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      item.confidence === 'HIGH' ? 'bg-red-50 text-red-700' :
                      item.confidence === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {item.confidence}
                    </span>
                  </>
                )}
              </div>
              <pre className="code-snippet text-xs overflow-x-auto bg-gray-50 p-2 rounded border">
                {item.snippet}
              </pre>
              {item.confidenceReason && (
                <p className="mt-2 text-xs text-gray-500 italic">
                  Note: {item.confidenceReason}
                </p>
              )}
            </div>
          ))}
          
          {truncatedCount > 0 && (
            <p className="text-xs text-gray-500 text-center py-2">
              ... and {truncatedCount} more occurrence{truncatedCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
