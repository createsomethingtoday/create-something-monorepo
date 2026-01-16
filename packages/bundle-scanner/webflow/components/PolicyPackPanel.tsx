/**
 * Policy Pack Panel Component
 * Allows viewing and uploading custom rulesets and configs
 */

import React, { useRef } from 'react';
import type { Ruleset, ScanConfig } from '../types';

interface PolicyPackPanelProps {
  ruleset: Ruleset;
  config: ScanConfig;
  onRulesetChange: (ruleset: Ruleset) => void;
  onConfigChange: (config: ScanConfig) => void;
  onReset: () => void;
  accentColor?: string;
}

export function PolicyPackPanel({
  ruleset,
  config,
  onRulesetChange,
  onConfigChange,
  onReset,
  accentColor = '#6366f1'
}: PolicyPackPanelProps) {
  const rulesetInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);
  
  const handleRulesetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Ruleset;
      
      // Basic validation
      if (!parsed.rules || !Array.isArray(parsed.rules)) {
        throw new Error('Invalid ruleset: missing rules array');
      }
      
      onRulesetChange(parsed);
    } catch (err) {
      alert(`Failed to parse ruleset: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    // Reset input
    if (rulesetInputRef.current) {
      rulesetInputRef.current.value = '';
    }
  };
  
  const handleConfigUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ScanConfig;
      
      // Basic validation
      if (!parsed.globalScanConfig) {
        throw new Error('Invalid config: missing globalScanConfig');
      }
      
      onConfigChange(parsed);
    } catch (err) {
      alert(`Failed to parse config: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    // Reset input
    if (configInputRef.current) {
      configInputRef.current.value = '';
    }
  };
  
  // Count rules by category
  const rulesByCategory: Record<string, number> = {};
  for (const rule of ruleset.rules) {
    rulesByCategory[rule.category] = (rulesByCategory[rule.category] || 0) + 1;
  }
  
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span>📋</span> Policy Pack
      </h3>
      
      {/* Current Policy Info */}
      <div className="space-y-2 mb-4">
        <div className="text-xs">
          <span className="text-gray-500">Ruleset:</span>
          <span className="text-gray-300 ml-2">{ruleset.rulesetVersion}</span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">Config:</span>
          <span className="text-gray-300 ml-2">{config.configVersion}</span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">Rules:</span>
          <span className="text-gray-300 ml-2">{ruleset.rules.length} total</span>
        </div>
      </div>
      
      {/* Rules by Category */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">By Category:</div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(rulesByCategory).map(([category, count]) => (
            <span
              key={category}
              className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
            >
              {category}: {count}
            </span>
          ))}
        </div>
      </div>
      
      {/* Upload Buttons */}
      <div className="space-y-2 border-t border-gray-700 pt-3">
        <div>
          <input
            ref={rulesetInputRef}
            type="file"
            accept=".json"
            onChange={handleRulesetUpload}
            className="hidden"
            id="ruleset-upload"
          />
          <label
            htmlFor="ruleset-upload"
            className="block w-full text-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 cursor-pointer transition-colors"
          >
            Upload Custom Ruleset
          </label>
        </div>
        
        <div>
          <input
            ref={configInputRef}
            type="file"
            accept=".json"
            onChange={handleConfigUpload}
            className="hidden"
            id="config-upload"
          />
          <label
            htmlFor="config-upload"
            className="block w-full text-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 cursor-pointer transition-colors"
          >
            Upload Custom Config
          </label>
        </div>
        
        <button
          onClick={onReset}
          className="w-full px-3 py-2 bg-transparent border border-gray-600 hover:border-gray-500 rounded text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

export default PolicyPackPanel;
