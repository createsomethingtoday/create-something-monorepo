/**
 * Bundle Scanner App - Main React Component
 * This is the actual React component implementation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import global styles for Shadow DOM
import './globals.css';

// Types
import type { ScanReport, Ruleset, ScanConfig, ScanHistoryEntry, AiAnalysisResult, VerifyFindingsRequest, VerifyFindingsResponse, Finding } from './types';

// Policy (ruleset & config)
import defaultRuleset from './policy/defaultRuleset';
import defaultConfig from './policy/defaultConfig';

// Scanner modules
import { processZipFile } from './scanner/zip';
import { buildInventory } from './scanner/inventory';
import { runScan } from './scanner/scan';
import { generateReport } from './scanner/report';

// Utils
import { saveScanToHistory, getScanHistory, clearScanHistory } from './utils/db';
import { generateRejectionEmail } from './utils/email';
import { analyzeReportWithAi } from './utils/ai';

// Data
import { REMEDIATION_REGISTRY } from './data/remediationRegistry';

// UI Components
import { TriageDashboard } from './components/TriageDashboard';
import { FindingCard } from './components/FindingCard';
import { PolicyPackPanel } from './components/PolicyPackPanel';
import { AiSuggestionsPanel } from './components/AiSuggestionsPanel';
import { HistoryPanel } from './components/HistoryPanel';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

export interface BundleScannerAppProps {
  accentColor?: string;
  geminiApiKey?: string;
  /** Optional Scanner API endpoint (Cloudflare Worker) for P3-memory + P4-judge verification */
  apiEndpoint?: string;
}

// ============================================================================
// API INTEGRATION
// ============================================================================

/**
 * Call the Scanner Worker API to verify findings with P3-memory and P4-judge
 */
async function verifyFindingsWithAPI(
  apiEndpoint: string,
  findings: Finding[],
  context: { filesScanned: number; appType?: string }
): Promise<VerifyFindingsResponse> {
  const request: VerifyFindingsRequest = {
    findings,
    context: {
      filesScanned: context.filesScanned,
      appType: context.appType as 'designer_extension' | 'data_client' | 'hybrid_app' | undefined,
    },
    options: {
      enableMemory: true,
      enableAI: true,
      maxFindings: 100,
    },
  };

  const response = await fetch(`${apiEndpoint}/v1/scan/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BundleScannerApp({ 
  accentColor = '#6366f1', 
  geminiApiKey = '',
  apiEndpoint = ''
}: BundleScannerAppProps) {
  // State
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [report, setReport] = useState<ScanReport | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [ruleset, setRuleset] = useState<Ruleset>(defaultRuleset);
  const [config, setConfig] = useState<ScanConfig>(defaultConfig);
  const [apiVerificationResult, setApiVerificationResult] = useState<VerifyFindingsResponse | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);
  
  const loadHistory = useCallback(async () => {
    try {
      const entries = await getScanHistory();
      setHistory(entries);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);
    setReport(null);
    setAiAnalysis(null);
    setAiError(null);
    setApiVerificationResult(null);
    
    try {
      // Step 1: Process ZIP (P1-filter)
      setScanProgress('P1: Extracting bundle...');
      const { entries } = await processZipFile(file, config);
      
      // Step 2: Build inventory
      setScanProgress(`P1: Building inventory (${entries.length} files)...`);
      const inventory = buildInventory(entries, config);
      
      // Step 3: Run scan (P2-hunter)
      setScanProgress('P2: Scanning for issues...');
      const findings = runScan(inventory, ruleset, config);
      
      // Step 4: Generate initial report
      setScanProgress('Generating report...');
      let scanReport = generateReport(findings, inventory, ruleset, config);
      
      // Step 5: Optional API verification (P3-memory + P4-judge)
      if (apiEndpoint && findings.length > 0) {
        try {
          setScanProgress('P3+P4: AI verification...');
          const verifyResult = await verifyFindingsWithAPI(
            apiEndpoint,
            findings,
            { filesScanned: inventory.filter(f => !f.isIgnored).length }
          );
          setApiVerificationResult(verifyResult);
          
          // Merge verified findings back into report
          if (verifyResult.findings.length > 0) {
            const verifiedMap = new Map(
              verifyResult.findings.map(f => [f.fingerprint || `${f.ruleId}:${f.filePath}:${f.line}`, f])
            );
            
            // Update findings with AI verdicts
            const updatedFindings: Record<string, typeof scanReport.findings[string]> = {};
            for (const [ruleId, data] of Object.entries(scanReport.findings)) {
              const updatedItems = data.items.map(item => {
                const key = item.fingerprint || `${item.ruleId}:${item.filePath}:${item.line}`;
                const verified = verifiedMap.get(key);
                if (verified) {
                  return {
                    ...item,
                    verdict: verified.verdict,
                    reasoning: verified.reasoning,
                    phase: verified.phase,
                    confidenceScore: verified.confidenceScore,
                  };
                }
                return item;
              });
              
              // Filter out PASS verdicts from blockers
              const filteredItems = updatedItems.filter(item => 
                item.verdict !== 'PASS' || data.rule.severity !== 'BLOCKER'
              );
              
              if (filteredItems.length > 0) {
                updatedFindings[ruleId] = {
                  ...data,
                  items: filteredItems,
                  count: filteredItems.length,
                };
              }
            }
            
            // Recalculate verdict based on verified findings
            const hasBlockers = Object.values(updatedFindings).some(
              f => f.rule.severity === 'BLOCKER' && f.items.some(i => i.verdict !== 'PASS')
            );
            const hasActionRequired = Object.values(updatedFindings).some(
              f => f.rule.reviewBucket === 'ACTION_REQUIRED' && f.items.some(i => i.verdict !== 'PASS')
            );
            
            scanReport = {
              ...scanReport,
              findings: updatedFindings,
              verdict: hasBlockers ? 'REJECTED' : hasActionRequired ? 'ACTION_REQUIRED' : 'PASS',
              verdictReasons: [
                ...(hasBlockers ? ['Blocker findings detected'] : []),
                ...(verifyResult.summary.resolvedByMemory > 0 
                  ? [`${verifyResult.summary.resolvedByMemory} findings resolved by memory`] 
                  : []),
                ...(verifyResult.summary.verifiedByAI > 0 
                  ? [`${verifyResult.summary.verifiedByAI} findings verified by AI`] 
                  : []),
              ],
            };
          }
        } catch (apiErr) {
          console.warn('API verification failed, using P2 results:', apiErr);
          // Continue with P2 results only
        }
      }
      
      // Step 6: Save to history
      await saveScanToHistory(scanReport);
      
      setReport(scanReport);
      setScanProgress('');
      
      // Refresh history
      loadHistory();
    } catch (err) {
      console.error('Scan failed:', err);
      setScanProgress(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsScanning(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleRunAiAnalysis = async () => {
    if (!report || !geminiApiKey) {
      setAiError('Please provide a Gemini API key and run a scan first.');
      return;
    }
    
    setIsAnalyzing(true);
    setAiError(null);
    
    try {
      const analysis = await analyzeReportWithAi(report, ruleset, geminiApiKey);
      setAiAnalysis(analysis);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setAiError(err instanceof Error ? err.message : 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleCopyEmail = () => {
    if (!report) return;
    const email = generateRejectionEmail(report, REMEDIATION_REGISTRY);
    navigator.clipboard.writeText(email);
  };
  
  const handleClearHistory = async () => {
    if (confirm('Clear all scan history?')) {
      await clearScanHistory();
      setHistory([]);
    }
  };
  
  const handleSelectFromHistory = (selectedReport: ScanReport) => {
    setReport(selectedReport);
    setActiveTab('scan');
    setAiAnalysis(null);
    setAiError(null);
  };
  
  const handlePolicyReset = () => {
    setRuleset(defaultRuleset);
    setConfig(defaultConfig);
  };
  
  return (
    <div 
      className="min-h-screen bg-gray-900 text-white"
      style={{ '--accent-color': accentColor } as React.CSSProperties}
    >
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: accentColor }}
            >
              🔍
            </div>
            <div>
              <h1 className="text-xl font-bold">Bundle Scanner</h1>
              <p className="text-xs text-gray-400">Webflow Marketplace Security Review • V1.2</p>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('scan')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'scan'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Scan
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              History ({history.length})
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'scan' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar */}
            <div className="space-y-4">
              {/* Upload Area */}
              <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Upload Bundle</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  disabled={isScanning}
                  className="hidden"
                  id="bundle-upload"
                />
                <label
                  htmlFor="bundle-upload"
                  className={`block w-full p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                    isScanning
                      ? 'border-gray-600 bg-gray-800 cursor-not-allowed'
                      : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
                  }`}
                >
                  {isScanning ? (
                    <div className="text-gray-400">
                      <div className="animate-spin text-2xl mb-2">⏳</div>
                      <p className="text-sm">{scanProgress}</p>
                    </div>
                  ) : (
                    <div className="text-gray-400">
                      <div className="text-2xl mb-2">📦</div>
                      <p className="text-sm">Drop ZIP file or click to upload</p>
                    </div>
                  )}
                </label>
              </div>
              
              {/* Policy Pack Panel */}
              <PolicyPackPanel
                ruleset={ruleset}
                config={config}
                onRulesetChange={setRuleset}
                onConfigChange={setConfig}
                onReset={handlePolicyReset}
                accentColor={accentColor}
              />
              
              {/* AI Analysis Button */}
              {report && geminiApiKey && (
                <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">AI Analysis</h3>
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing}
                    className="w-full px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                  >
                    {isAnalyzing ? 'Analyzing...' : '🤖 Run Gemini Analysis'}
                  </button>
                  {aiError && (
                    <p className="text-xs text-red-400 mt-2">{aiError}</p>
                  )}
                </div>
              )}
              
              {/* Actions */}
              {report && report.verdict !== 'PASS' && (
                <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Actions</h3>
                  <button
                    onClick={handleCopyEmail}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    📧 Copy Rejection Email
                  </button>
                </div>
              )}
            </div>
            
            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
              {report ? (
                <>
                  {/* Dashboard */}
                  <TriageDashboard report={report} accentColor={accentColor} />
                  
                  {/* API Verification Stats */}
                  {apiVerificationResult && (
                    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
                      <h3 className="text-sm font-semibold text-white mb-3">AI Verification (P3+P4)</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-400">
                            {apiVerificationResult.summary.resolvedByMemory}
                          </div>
                          <div className="text-xs text-gray-400">Resolved by Memory</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-400">
                            {apiVerificationResult.summary.verifiedByAI}
                          </div>
                          <div className="text-xs text-gray-400">Verified by AI</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-400">
                            {(apiVerificationResult.phases?.p3Memory?.timeMs || 0) + 
                             (apiVerificationResult.phases?.p4Judge?.timeMs || 0)}ms
                          </div>
                          <div className="text-xs text-gray-400">Total Time</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* AI Analysis Results */}
                  {aiAnalysis && (
                    <AiSuggestionsPanel analysis={aiAnalysis} accentColor={accentColor} />
                  )}
                  
                  {/* Findings */}
                  {Object.keys(report.findings).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Findings ({Object.values(report.findings).reduce((acc, f) => acc + f.count, 0)})
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(report.findings)
                          .sort(([, a], [, b]) => {
                            const severityOrder: Record<string, number> = { CRITICAL: 0, BLOCKER: 1, HIGH: 2, MEDIUM: 3, LOW: 4, INFO: 5 };
                            return (severityOrder[a.rule.severity] ?? 5) - (severityOrder[b.rule.severity] ?? 5);
                          })
                          .map(([ruleId, data]) =>
                            data.items.slice(0, 10).map((finding, i) => (
                              <FindingCard
                                key={`${ruleId}-${i}`}
                                finding={finding}
                                rule={data.rule}
                                remediation={REMEDIATION_REGISTRY[ruleId]}
                                accentColor={accentColor}
                              />
                            ))
                          )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-12 text-center">
                  <div className="text-4xl mb-4">📦</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Scan Results</h3>
                  <p className="text-gray-400">
                    Upload a bundle ZIP file to start scanning for security issues.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="max-w-2xl mx-auto">
            <HistoryPanel
              history={history}
              onSelectReport={handleSelectFromHistory}
              onClearHistory={handleClearHistory}
              accentColor={accentColor}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default BundleScannerApp;
