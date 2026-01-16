import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import React, { useState } from 'react';
import type { ScanRule, Finding, Severity } from '@create-something/bundle-scanner-core';
import { ChevronDown, ChevronUp, FileCode, MapPin } from 'lucide-react';

/**
 * Designer-friendly FindingCard with configurable props
 */
interface DesignerFindingCardProps {
  ruleName: string;
  ruleDescription: string;
  category: string;
  severity: Severity;
  count: number;
  showSampleFinding: boolean;
  sampleFilePath: string;
  sampleLine: number;
  sampleSnippet: string;
}

const DesignerFindingCard: React.FC<DesignerFindingCardProps> = ({
  ruleName,
  ruleDescription,
  category,
  severity,
  count,
  showSampleFinding,
  sampleFilePath,
  sampleLine,
  sampleSnippet,
}) => {
  const [isExpanded, setIsExpanded] = useState(showSampleFinding);

  const severityColors: Record<Severity, string> = {
    BLOCKER: 'border-red-300 bg-red-50',
    HIGH: 'border-orange-300 bg-orange-50',
    MEDIUM: 'border-yellow-300 bg-yellow-50',
    LOW: 'border-blue-300 bg-blue-50',
    INFO: 'border-gray-300 bg-gray-50',
  };

  const severityBadgeColors: Record<Severity, string> = {
    BLOCKER: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-blue-100 text-blue-800',
    INFO: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className={`rounded-lg border-l-4 mb-4 ${severityColors[severity]}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left flex items-start justify-between gap-4 hover:bg-white/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${severityBadgeColors[severity]}`}>
              {severity}
            </span>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              {category}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900">{ruleName}</h4>
          <p className="text-sm text-gray-600 mt-1">{ruleDescription}</p>
          <div className="mt-2 text-xs text-gray-500">
            <span className="font-medium">{count}</span> occurrence{count !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="shrink-0 text-gray-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isExpanded && showSampleFinding && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
              <FileCode className="w-3 h-3" aria-hidden="true" />
              <code className="font-mono">{sampleFilePath}</code>
              <span className="text-gray-400">•</span>
              <MapPin className="w-3 h-3" aria-hidden="true" />
              <span>Line {sampleLine}</span>
            </div>
            <pre className="text-xs overflow-x-auto bg-gray-50 p-2 rounded border font-mono whitespace-pre-wrap">
              {sampleSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Webflow Code Component wrapper for FindingCard
 * 
 * Displays a single rule finding with expandable details
 * showing file locations and code snippets.
 */
export default declareComponent(DesignerFindingCard, {
  name: 'Finding Card',
  description: 'Expandable card showing a security/policy finding with code snippets',
  group: 'Bundle Scanner',
  props: {
    ruleName: props.String({
      name: 'Rule Name',
      defaultValue: 'Dynamic Code Execution',
      tooltip: 'Name of the violated rule',
    }),
    ruleDescription: props.String({
      name: 'Description',
      defaultValue: 'Disallow runtime compilation/execution of JavaScript (eval, new Function)',
      tooltip: 'Description of what this rule checks',
    }),
    category: props.String({
      name: 'Category',
      defaultValue: 'SECURITY',
      tooltip: 'Rule category (SECURITY, NETWORK, PRIVACY, UX)',
    }),
    severity: props.Variant({
      name: 'Severity',
      options: ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      defaultValue: 'HIGH',
      tooltip: 'Severity level of the finding',
    }),
    count: props.Number({
      name: 'Occurrence Count',
      defaultValue: 3,
      tooltip: 'Number of times this issue was found',
    }),
    showSampleFinding: props.Boolean({
      name: 'Show Sample',
      defaultValue: true,
      tooltip: 'Display sample code snippet',
    }),
    sampleFilePath: props.String({
      name: 'Sample File Path',
      defaultValue: 'src/utils/dynamic.js',
      tooltip: 'Path to the file with the finding',
    }),
    sampleLine: props.Number({
      name: 'Sample Line Number',
      defaultValue: 42,
      tooltip: 'Line number of the finding',
    }),
    sampleSnippet: props.String({
      name: 'Sample Snippet',
      defaultValue: 'const result = eval(userInput);',
      tooltip: 'Code snippet showing the finding',
    }),
  },
});
