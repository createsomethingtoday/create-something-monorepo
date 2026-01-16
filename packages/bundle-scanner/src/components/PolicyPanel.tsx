import React, { useState } from 'react';
import type { Ruleset, ScanConfig } from '@create-something/bundle-scanner-core';
import { Settings, ChevronDown, ChevronUp, RefreshCw, Code } from 'lucide-react';

interface PolicyPanelProps {
  currentRuleset: Ruleset;
  currentConfig: ScanConfig;
  onRulesetChange: (ruleset: Ruleset) => void;
  onConfigChange: (config: ScanConfig) => void;
  onReset: () => void;
}

export const PolicyPanel: React.FC<PolicyPanelProps> = ({
  currentRuleset,
  currentConfig,
  onRulesetChange,
  onConfigChange,
  onReset
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRulesetEditor, setShowRulesetEditor] = useState(false);
  const [rulesetJson, setRulesetJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const handleEditRuleset = () => {
    setRulesetJson(JSON.stringify(currentRuleset, null, 2));
    setShowRulesetEditor(true);
    setParseError(null);
  };

  const handleSaveRuleset = () => {
    try {
      const parsed = JSON.parse(rulesetJson) as Ruleset;
      if (!parsed.rules || !Array.isArray(parsed.rules)) {
        throw new Error('Invalid ruleset: missing rules array');
      }
      onRulesetChange(parsed);
      setShowRulesetEditor(false);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" aria-hidden="true" />
          <span className="font-semibold text-gray-800">Policy Configuration</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 border-t space-y-4">
          {/* Ruleset Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ruleset
              </span>
              <span className="text-xs text-gray-500">
                v{currentRuleset.rulesetVersion}
              </span>
            </div>
            <div className="text-sm text-gray-700">
              {currentRuleset.rules.length} rules loaded
            </div>
          </div>

          {/* Config Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Config
              </span>
              <span className="text-xs text-gray-500">
                v{currentConfig.configVersion}
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Max ZIP size: {(currentConfig.globalScanConfig.zipSafety.maxTotalUnzippedBytes / 1024 / 1024).toFixed(0)}MB</p>
              <p>Max files: {currentConfig.globalScanConfig.zipSafety.maxFiles}</p>
              <p>Max matches/file: {currentConfig.limits.maxMatchesPerFile}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleEditRuleset}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Code className="w-3 h-3" />
              Edit Rules
            </button>
            <button
              onClick={onReset}
              className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Ruleset Editor Modal */}
          {showRulesetEditor && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold">Edit Ruleset JSON</h3>
                  <button
                    onClick={() => setShowRulesetEditor(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-hidden p-4">
                  <textarea
                    value={rulesetJson}
                    onChange={(e) => setRulesetJson(e.target.value)}
                    className="w-full h-full min-h-[400px] font-mono text-xs p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    spellCheck={false}
                  />
                </div>
                {parseError && (
                  <div className="px-4 pb-2">
                    <p className="text-xs text-red-600">Error: {parseError}</p>
                  </div>
                )}
                <div className="p-4 border-t flex justify-end gap-3">
                  <button
                    onClick={() => setShowRulesetEditor(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRuleset}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
