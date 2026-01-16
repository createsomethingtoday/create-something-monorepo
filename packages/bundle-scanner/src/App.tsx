import React, { useState } from 'react';
import {
  processZipFile,
  buildInventory,
  runScan,
  generateReport,
  defaultRuleset,
  defaultConfig,
  type ScanReport,
  type Ruleset,
  type ScanConfig
} from '@create-something/bundle-scanner-core';

import { VerdictBadge } from './components/VerdictBadge';
import { FindingCard } from './components/FindingCard';
import { PolicyPanel } from './components/PolicyPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { AiSuggestionsPanel } from './components/AiSuggestionsPanel';
import { TriageDashboard } from './components/TriageDashboard';
import { saveScanToHistory } from './lib/db';

import { 
  FileUp, 
  RefreshCw, 
  Download, 
  Play, 
  Loader2, 
  History, 
  ListChecks, 
  Filter 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');

  // Policy State
  const [ruleset, setRuleset] = useState<Ruleset>(defaultRuleset);
  const [config, setConfig] = useState<ScanConfig>(defaultConfig);

  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setReport(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setIsScanning(true);
    setProgress('Initializing...');
    setError(null);

    try {
      // 1. Unzip
      const files = await processZipFile(file, config, setProgress);
      
      // 2. Inventory
      setProgress('Building file inventory...');
      await new Promise(r => setTimeout(r, 50));
      const inventory = buildInventory(files, config);
      
      // 3. Scan
      setProgress('Running deterministic rules engine...');
      await new Promise(r => setTimeout(r, 50));
      const findings = runScan(inventory, ruleset, config, setProgress);

      // 4. Report
      setProgress('Generating report...');
      const textFiles = inventory.filter(f => f.isTextCandidate && !f.isIgnored).length;
      const skippedFiles = inventory.filter(f => f.isIgnored).length;

      const scanReport = generateReport(findings, ruleset, config, {
        fileCount: inventory.length,
        totalBytes: inventory.reduce((acc, curr) => acc + curr.sizeBytes, 0),
        textFilesScanned: textFiles,
        skippedFileCount: skippedFiles
      });

      // 5. Save to DB
      await saveScanToHistory(scanReport);

      setReport(scanReport);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      console.error(err);
    } finally {
      setIsScanning(false);
      setProgress('');
    }
  };

  const handleReset = () => {
    setFile(null);
    setReport(null);
    setError(null);
  };

  const handlePolicyReset = () => {
    if (confirm('Reset rules and configuration to built-in defaults?')) {
      setRuleset(defaultRuleset);
      setConfig(defaultConfig);
    }
  };

  const handleLoadFromHistory = (loadedReport: ScanReport) => {
    setReport(loadedReport);
    setActiveTab('scan');
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scanReport_${report.runId.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group findings for Progressive Disclosure
  const groupedFindings = report ? {
    blockers: Object.values(report.findings).filter(
      g => g.count > 0 && (g.rule.severity === 'BLOCKER' || g.rule.reviewBucket === 'AUTO_REJECT')
    ),
    review: Object.values(report.findings).filter(
      g => g.count > 0 && (g.rule.severity === 'HIGH' || g.rule.reviewBucket === 'ACTION_REQUIRED')
    ),
    info: Object.values(report.findings).filter(
      g => g.count > 0 && g.rule.severity !== 'BLOCKER' && g.rule.severity !== 'HIGH'
    )
  } : { blockers: [], review: [], info: [] };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
              WF
            </div>
            <h1 className="font-semibold text-lg hidden md:block">
              Marketplace Bundle Scanner{' '}
              <span className="text-gray-400 font-normal text-sm">V1.2</span>
            </h1>
            <h1 className="font-semibold text-sm md:hidden">Bundle Scanner</h1>
          </div>
          
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button 
              onClick={() => setActiveTab('scan')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                activeTab === 'scan' 
                  ? 'bg-white shadow text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListChecks className="w-4 h-4" /> Scan
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                activeTab === 'history' 
                  ? 'bg-white shadow text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-4 h-4" /> History
            </button>
          </div>

          <div className="w-24 flex justify-end shrink-0">
            {report && activeTab === 'scan' && (
              <div className="scale-90 origin-right">
                <VerdictBadge verdict={report.verdict} />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-8">
        
        {/* Left Sidebar: Controls (Visible on Scan Tab) */}
        {activeTab === 'scan' ? (
          <div className="space-y-6 order-2 md:order-1">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h2 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                <FileUp className="w-5 h-5 text-blue-600" />
                Upload Bundle
              </h2>
              
              {!report ? (
                <div className="space-y-4">
                  <input 
                    type="file" 
                    accept=".zip"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      cursor-pointer
                    "
                  />
                  <p className="text-xs text-gray-500">
                    Select a .zip file (Max {(config.globalScanConfig.zipSafety.maxTotalUnzippedBytes / 1024 / 1024).toFixed(0)}MB unzipped).
                  </p>

                  <button
                    onClick={handleScan}
                    disabled={!file || isScanning}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                  >
                    {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run Scan
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleReset}
                    className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-gray-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Scan New File
                  </button>
                  <button
                    onClick={downloadReport}
                    className="w-full py-2 px-4 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg font-medium transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-blue-300"
                  >
                    <Download className="w-4 h-4" />
                    Download Report
                  </button>
                </div>
              )}

              {isScanning && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded animate-pulse" role="status">
                  {progress}
                </div>
              )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-800 text-xs rounded border border-red-200" role="alert">
                  <strong>Error:</strong> {error}
                </div>
              )}
            </div>

            <PolicyPanel 
              currentRuleset={ruleset}
              currentConfig={config}
              onRulesetChange={setRuleset}
              onConfigChange={setConfig}
              onReset={handlePolicyReset}
            />
          </div>
        ) : (
          <div className="space-y-6 order-2 md:order-1">
            <div className="bg-white p-6 rounded-xl border shadow-sm text-sm text-gray-600">
              <h3 className="font-bold text-gray-900 mb-2">About Scan History</h3>
              <p>History is stored in your browser's IndexedDB.</p>
              <p className="mt-2">Clearing browser data will remove these reports.</p>
            </div>
          </div>
        )}

        {/* Right Content */}
        <div className="space-y-6 order-1 md:order-2">
          
          {activeTab === 'history' && (
            <HistoryPanel onLoadReport={handleLoadFromHistory} />
          )}

          {activeTab === 'scan' && (
            <>
              {!report && !isScanning && (
                <div className="h-96 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <FileUp className="w-12 h-12 mb-4 opacity-50" aria-hidden="true" />
                  <p>Upload a bundle to start scanning</p>
                </div>
              )}

              {report && (
                <>
                  {/* Triage Dashboard */}
                  <TriageDashboard report={report} />

                  {/* AI Assist */}
                  <AiSuggestionsPanel report={report} />

                  {/* Detailed Findings - Progressive Disclosure */}
                  <div className="space-y-8">
                    {/* BLOCKERS */}
                    {groupedFindings.blockers.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg text-red-700 mb-3 uppercase tracking-wide">
                          <Filter className="w-5 h-5" aria-hidden="true" /> 
                          Auto-Reject Issues ({groupedFindings.blockers.length})
                        </h3>
                        {groupedFindings.blockers.map(group => (
                          <FindingCard 
                            key={group.rule.ruleId}
                            rule={group.rule}
                            count={group.count}
                            items={group.items.slice(0, 5)}
                            truncatedCount={Math.max(0, group.items.length - 5)}
                          />
                        ))}
                      </div>
                    )}

                    {/* REVIEW NEEDED */}
                    {groupedFindings.review.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg text-yellow-700 mb-3 uppercase tracking-wide">
                          <Filter className="w-5 h-5" aria-hidden="true" /> 
                          Needs Review ({groupedFindings.review.length})
                        </h3>
                        {groupedFindings.review.map(group => (
                          <FindingCard 
                            key={group.rule.ruleId}
                            rule={group.rule}
                            count={group.count}
                            items={group.items.slice(0, 5)}
                            truncatedCount={Math.max(0, group.items.length - 5)}
                          />
                        ))}
                      </div>
                    )}

                    {/* INFO */}
                    {groupedFindings.info.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg text-green-700 mb-3 uppercase tracking-wide">
                          <Filter className="w-5 h-5" aria-hidden="true" /> 
                          Informational ({groupedFindings.info.length})
                        </h3>
                        {groupedFindings.info.map(group => (
                          <FindingCard 
                            key={group.rule.ruleId}
                            rule={group.rule}
                            count={group.count}
                            items={group.items.slice(0, 3)}
                            truncatedCount={Math.max(0, group.items.length - 3)}
                          />
                        ))}
                      </div>
                    )}

                    {Object.keys(report.findings).length === 0 && (
                      <div className="p-12 text-center text-gray-500 bg-white rounded-xl border">
                        <p>No issues found matching the current ruleset.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

      </main>
    </div>
  );
}
