import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import {
  FileUp,
  RefreshCw,
  Download,
  Play,
  Loader2,
  History,
  ListChecks,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Bot,
  ShieldAlert,
  Info,
  AlertOctagon,
  Trash2,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type Severity = 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type ReviewBucket = 'AUTO_REJECT' | 'ACTION_REQUIRED' | 'INFO';
type Category = 'SECURITY' | 'NETWORK' | 'PRIVACY' | 'UX' | 'INFO';
type Verdict = 'PASS' | 'ACTION_REQUIRED' | 'REJECTED';

interface Matcher {
  type: 'REGEX';
  pattern: string;
  flags?: string;
}

interface ScanRule {
  ruleId: string;
  name: string;
  category: Category;
  reviewBucket: ReviewBucket;
  severity: Severity;
  disposition: string;
  description: string;
  matchers: Matcher[];
  remediation?: string;
}

interface Finding {
  ruleId: string;
  filePath: string;
  line: number;
  column: number;
  snippet: string;
  matchedText: string;
}

interface FindingGroup {
  rule: ScanRule;
  count: number;
  items: Finding[];
}

interface ScanReport {
  scanReportVersion: string;
  runId: string;
  createdAt: string;
  policyMetadata: { rulesetVersion: string; configVersion: string };
  verdict: Verdict;
  verdictReasons: string[];
  bundleSummary: { fileCount: number; totalBytes: number; scannedFileCount: number; skippedFileCount: number };
  findings: Record<string, FindingGroup>;
}

interface AiRisk {
  title: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  whyItMatters: string;
  evidence: { filePath: string; snippet: string }[];
}

interface AiAnalysisResult {
  reviewStatusRecommendation: 'MANUAL_REVIEW_REQUIRED' | 'LOOKS_GOOD';
  missedRisks: AiRisk[];
  suggestedRuleAdditions: { proposedRuleName: string; rationale: string; suggestedRegexOrAstIdea: string }[];
  suggestedNoiseReductions: { currentIssue: string; proposal: string }[];
  questionsForReviewer: string[];
}

interface ScanHistoryEntry {
  id: string;
  fileName: string;
  scanDate: string;
  verdict: Verdict;
  findingCount: number;
  fileCount: number;
}

// ============================================================================
// DEFAULT RULESET
// ============================================================================

const DEFAULT_RULESET: ScanRule[] = [
  { ruleId: 'SEC-001', name: 'Dynamic Code Execution', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Disallow runtime compilation/execution of JavaScript (eval, new Function)', matchers: [{ type: 'REGEX', pattern: '\\beval\\s*\\(', flags: 'gi' }, { type: 'REGEX', pattern: 'new\\s+Function\\s*\\(', flags: 'gi' }], remediation: 'Remove eval() and new Function() calls. Use static code instead.' },
  { ruleId: 'SEC-002', name: 'Hardcoded API Keys', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Detect hardcoded API keys, secrets, and tokens', matchers: [{ type: 'REGEX', pattern: '["\']sk_live_[a-zA-Z0-9]{24,}["\']', flags: 'g' }, { type: 'REGEX', pattern: 'api[_-]?key\\s*[=:]\\s*["\'][a-zA-Z0-9_\\-]{20,}["\']', flags: 'gi' }], remediation: 'Move API keys to environment variables.' },
  { ruleId: 'SEC-003', name: 'Cryptocurrency Mining', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Detect cryptocurrency mining scripts', matchers: [{ type: 'REGEX', pattern: 'coinhive|cryptonight|coin-hive', flags: 'gi' }], remediation: 'Remove all cryptocurrency mining code.' },
  { ruleId: 'SEC-004', name: 'DOM-based XSS', category: 'SECURITY', reviewBucket: 'ACTION_REQUIRED', severity: 'HIGH', disposition: 'ACTION_REQUIRED', description: 'Detect potentially unsafe DOM manipulation', matchers: [{ type: 'REGEX', pattern: '\\.innerHTML\\s*=', flags: 'g' }, { type: 'REGEX', pattern: 'document\\.write\\s*\\(', flags: 'g' }], remediation: 'Use textContent or createElement instead of innerHTML.' },
  { ruleId: 'NET-001', name: 'External Network Requests', category: 'NETWORK', reviewBucket: 'ACTION_REQUIRED', severity: 'MEDIUM', disposition: 'ACTION_REQUIRED', description: 'Detect fetch/XHR calls to external domains', matchers: [{ type: 'REGEX', pattern: 'fetch\\s*\\(["\']https?://', flags: 'gi' }, { type: 'REGEX', pattern: 'XMLHttpRequest', flags: 'g' }], remediation: 'Document all external API calls.' },
  { ruleId: 'NET-002', name: 'WebSocket Connections', category: 'NETWORK', reviewBucket: 'ACTION_REQUIRED', severity: 'MEDIUM', disposition: 'ACTION_REQUIRED', description: 'Detect WebSocket usage', matchers: [{ type: 'REGEX', pattern: 'new\\s+WebSocket\\s*\\(', flags: 'g' }], remediation: 'Document WebSocket usage and ensure secure connections (wss://).' },
  { ruleId: 'PRIV-001', name: 'Location Tracking', category: 'PRIVACY', reviewBucket: 'ACTION_REQUIRED', severity: 'HIGH', disposition: 'ACTION_REQUIRED', description: 'Detect geolocation API usage', matchers: [{ type: 'REGEX', pattern: 'navigator\\.geolocation|getCurrentPosition|watchPosition', flags: 'g' }], remediation: 'Ensure geolocation access is user-initiated.' },
  { ruleId: 'PRIV-002', name: 'Camera/Microphone Access', category: 'PRIVACY', reviewBucket: 'ACTION_REQUIRED', severity: 'HIGH', disposition: 'ACTION_REQUIRED', description: 'Detect media device access', matchers: [{ type: 'REGEX', pattern: 'getUserMedia|navigator\\.mediaDevices', flags: 'g' }], remediation: 'Ensure media access is user-initiated.' },
  { ruleId: 'PRIV-003', name: 'Third-Party Tracking', category: 'PRIVACY', reviewBucket: 'ACTION_REQUIRED', severity: 'MEDIUM', disposition: 'ACTION_REQUIRED', description: 'Detect common tracking scripts', matchers: [{ type: 'REGEX', pattern: 'google-analytics\\.com|googletagmanager\\.com|facebook\\.net.*fbevents', flags: 'gi' }], remediation: 'Disclose all third-party tracking in privacy policy.' },
  { ruleId: 'UX-001', name: 'Alert/Confirm/Prompt', category: 'UX', reviewBucket: 'INFO', severity: 'LOW', disposition: 'INFO', description: 'Detect native browser dialogs', matchers: [{ type: 'REGEX', pattern: '\\balert\\s*\\(|\\bconfirm\\s*\\(|\\bprompt\\s*\\(', flags: 'g' }], remediation: 'Consider using custom modals for better UX.' },
  { ruleId: 'UX-002', name: 'Console Logging', category: 'UX', reviewBucket: 'INFO', severity: 'INFO', disposition: 'INFO', description: 'Detect console statements', matchers: [{ type: 'REGEX', pattern: 'console\\.(log|warn|error|info|debug)\\s*\\(', flags: 'g' }], remediation: 'Remove console logs in production.' },
  { ruleId: 'SEC-005', name: 'Obfuscated Code', category: 'SECURITY', reviewBucket: 'ACTION_REQUIRED', severity: 'HIGH', disposition: 'ACTION_REQUIRED', description: 'Detect heavily obfuscated code patterns', matchers: [{ type: 'REGEX', pattern: '_0x[a-f0-9]{4,}', flags: 'g' }], remediation: 'Provide unobfuscated source code.' },
  { ruleId: 'SEC-006', name: 'Iframe Injection', category: 'SECURITY', reviewBucket: 'ACTION_REQUIRED', severity: 'HIGH', disposition: 'ACTION_REQUIRED', description: 'Detect dynamic iframe creation', matchers: [{ type: 'REGEX', pattern: 'createElement\\s*\\(["\']iframe["\']\\)', flags: 'gi' }], remediation: 'Document iframe usage.' },
  { ruleId: 'SEC-007', name: 'Local Storage of Sensitive Data', category: 'SECURITY', reviewBucket: 'ACTION_REQUIRED', severity: 'MEDIUM', disposition: 'ACTION_REQUIRED', description: 'Detect potential storage of sensitive data', matchers: [{ type: 'REGEX', pattern: 'localStorage\\.setItem\\s*\\(["\'](?:token|password|secret|key|auth)', flags: 'gi' }], remediation: 'Use secure, httpOnly cookies for sensitive data.' },
  { ruleId: 'INFO-001', name: 'TODO/FIXME Comments', category: 'INFO', reviewBucket: 'INFO', severity: 'INFO', disposition: 'INFO', description: 'Detect incomplete code markers', matchers: [{ type: 'REGEX', pattern: '//\\s*(TODO|FIXME|HACK):', flags: 'gi' }], remediation: 'Review and resolve before release.' },
];

// ============================================================================
// CONFIG & UTILS
// ============================================================================

interface ScanConfig {
  maxFileSizeBytes: number;
  maxTotalSizeBytes: number;
  maxFileCount: number;
  textExtensions: string[];
  ignorePatterns: string[];
}

const DEFAULT_CONFIG: ScanConfig = {
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxTotalSizeBytes: 100 * 1024 * 1024,
  maxFileCount: 1000,
  textExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.html', '.htm', '.css', '.scss', '.less', '.json', '.xml', '.svg', '.md', '.txt', '.vue', '.svelte', '.astro'],
  ignorePatterns: ['node_modules/**', '.git/**', '*.min.js', '*.min.css', '*.map', '*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const matchGlob = (path: string, pattern: string): boolean => {
  const regexPattern = pattern.replace(/\*\*/g, '{{GLOBSTAR}}').replace(/\*/g, '[^/]*').replace(/{{GLOBSTAR}}/g, '.*').replace(/\?/g, '.').replace(/\./g, '\\.');
  return new RegExp(`^${regexPattern}$`).test(path);
};

const isTextFile = (filename: string, config: ScanConfig) => {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return config.textExtensions.includes(ext);
};

const shouldIgnore = (path: string, config: ScanConfig) => config.ignorePatterns.some(p => matchGlob(path, p));

// ============================================================================
// SCANNING ENGINE
// ============================================================================

interface UnzippedFile {
  path: string;
  content: string;
  sizeBytes: number;
  isTextCandidate: boolean;
  isIgnored: boolean;
}

async function processZipFile(file: File, config: ScanConfig, onProgress: (msg: string) => void): Promise<UnzippedFile[]> {
  if (file.size > config.maxTotalSizeBytes) throw new Error(`File too large: ${formatBytes(file.size)} exceeds ${formatBytes(config.maxTotalSizeBytes)}`);
  onProgress('Reading ZIP file...');
  const zip = await JSZip.loadAsync(file);
  const entries = Object.entries(zip.files).filter(([_, f]) => !f.dir);
  if (entries.length > config.maxFileCount) throw new Error(`Too many files: ${entries.length} exceeds limit of ${config.maxFileCount}`);
  const results: UnzippedFile[] = [];
  let processed = 0;
  for (const [path, zipEntry] of entries) {
    processed++;
    if (processed % 50 === 0) onProgress(`Extracting files... ${processed}/${entries.length}`);
    const isTextCandidate = isTextFile(path, config);
    const isIgnored = shouldIgnore(path, config);
    let content = '';
    if (isTextCandidate && !isIgnored) {
      try { content = await zipEntry.async('string'); } catch { content = ''; }
    }
    results.push({ path, content, sizeBytes: content.length, isTextCandidate, isIgnored });
  }
  return results;
}

function scanFiles(files: UnzippedFile[], ruleset: ScanRule[], onProgress: (msg: string) => void): Finding[] {
  const findings: Finding[] = [];
  const filesToScan = files.filter(f => f.isTextCandidate && !f.isIgnored && f.content);
  let scanned = 0;
  for (const file of filesToScan) {
    scanned++;
    if (scanned % 20 === 0) onProgress(`Running deterministic rules engine... ${scanned}/${filesToScan.length}`);
    const lines = file.content.split('\n');
    for (const rule of ruleset) {
      for (const matcher of rule.matchers) {
        const regex = new RegExp(matcher.pattern, matcher.flags || 'g');
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          let match;
          regex.lastIndex = 0;
          while ((match = regex.exec(line)) !== null) {
            findings.push({ ruleId: rule.ruleId, filePath: file.path, line: lineNum + 1, column: match.index + 1, snippet: line.trim().slice(0, 200), matchedText: match[0] });
            if (match[0].length === 0) break;
          }
        }
      }
    }
  }
  return findings;
}

function generateReport(findings: Finding[], ruleset: ScanRule[], files: UnzippedFile[]): ScanReport {
  const ruleMap = new Map(ruleset.map(r => [r.ruleId, r]));
  const groups: Record<string, FindingGroup> = {};
  for (const finding of findings) {
    const rule = ruleMap.get(finding.ruleId);
    if (!rule) continue;
    if (!groups[finding.ruleId]) groups[finding.ruleId] = { rule, count: 0, items: [] };
    const group = groups[finding.ruleId];
    if (group) { group.count++; group.items.push(finding); }
  }
  const hasBlocker = Object.values(groups).some(g => g.rule.reviewBucket === 'AUTO_REJECT');
  const hasActionRequired = Object.values(groups).some(g => g.rule.reviewBucket === 'ACTION_REQUIRED');
  let verdict: Verdict = 'PASS';
  const verdictReasons: string[] = [];
  if (hasBlocker) { verdict = 'REJECTED'; verdictReasons.push('Contains auto-reject issues'); }
  else if (hasActionRequired) { verdict = 'ACTION_REQUIRED'; verdictReasons.push('Contains issues requiring manual review'); }
  const scannedFiles = files.filter(f => f.isTextCandidate && !f.isIgnored);
  const skippedFiles = files.filter(f => f.isIgnored);
  return { scanReportVersion: '1.2.0', runId: generateId(), createdAt: new Date().toISOString(), policyMetadata: { rulesetVersion: '1.0.0', configVersion: '1.0.0' }, verdict, verdictReasons, bundleSummary: { fileCount: files.length, totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0), scannedFileCount: scannedFiles.length, skippedFileCount: skippedFiles.length }, findings: groups };
}

// ============================================================================
// AI ANALYSIS
// ============================================================================

async function analyzeWithAi(report: ScanReport, apiKey: string): Promise<AiAnalysisResult | null> {
  if (!apiKey) return null;
  const prompt = `You are a security expert reviewing a Webflow Marketplace app bundle scan report.

SCAN SUMMARY:
- Files scanned: ${report.bundleSummary.scannedFileCount}
- Total findings: ${Object.values(report.findings).reduce((sum, g) => sum + g.count, 0)}
- Current verdict: ${report.verdict}

FINDINGS BY RULE:
${Object.values(report.findings).map(g => `- ${g.rule.name} (${g.rule.severity}): ${g.count} occurrences`).join('\n')}

Respond with ONLY a JSON object:
{
  "reviewStatusRecommendation": "MANUAL_REVIEW_REQUIRED" | "LOOKS_GOOD",
  "missedRisks": [{"title": "...", "confidence": "HIGH"|"MEDIUM"|"LOW", "whyItMatters": "...", "evidence": [{"filePath": "...", "snippet": "..."}]}],
  "suggestedRuleAdditions": [{"proposedRuleName": "...", "rationale": "...", "suggestedRegexOrAstIdea": "..."}],
  "suggestedNoiseReductions": [{"currentIssue": "...", "proposal": "..."}],
  "questionsForReviewer": ["..."]
}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } }) });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as AiAnalysisResult;
    return null;
  } catch { return null; }
}

// ============================================================================
// INDEXEDDB
// ============================================================================

const DB_NAME = 'bundle-scanner';
const DB_VERSION = 1;
const STORE_NAME = 'scan-history';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
  });
}

async function saveToHistory(entry: ScanHistoryEntry): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).put(entry); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

async function getHistory(): Promise<ScanHistoryEntry[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readonly'); const request = tx.objectStore(STORE_NAME).getAll(); request.onsuccess = () => { const entries = request.result as ScanHistoryEntry[]; entries.sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()); resolve(entries); }; request.onerror = () => reject(request.error); });
}

async function clearHistory(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).clear(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

// ============================================================================
// EMAIL GENERATION
// ============================================================================

function generateRejectionEmail(report: ScanReport): string {
  const blockers = Object.values(report.findings).filter(g => g.rule.reviewBucket === 'AUTO_REJECT');
  const actionItems = Object.values(report.findings).filter(g => g.rule.reviewBucket === 'ACTION_REQUIRED');
  let email = `Subject: Webflow Marketplace App Review - Action Required\n\nHello,\n\nThank you for submitting your app. We've identified issues that need to be addressed:\n\n`;
  if (blockers.length > 0) {
    email += `## Critical Issues (Must Fix)\n\n`;
    for (const group of blockers) email += `### ${group.rule.name}\n${group.rule.description}\nFound ${group.count} occurrence(s).\n**How to fix:** ${group.rule.remediation || 'Remove the flagged code.'}\n\n`;
  }
  if (actionItems.length > 0) {
    email += `## Items Requiring Review\n\n`;
    for (const group of actionItems) email += `### ${group.rule.name}\n${group.rule.description}\nFound ${group.count} occurrence(s). Please provide documentation.\n\n`;
  }
  email += `---\nPlease address these issues and resubmit.\n\nBest regards,\nWebflow Marketplace Review Team`;
  return email;
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

const VerdictBadge: React.FC<{ verdict: Verdict }> = ({ verdict }) => {
  if (verdict === 'PASS') return <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-bold border border-green-200"><CheckCircle className="w-5 h-5" /><span>PASS</span></div>;
  if (verdict === 'ACTION_REQUIRED') return <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-bold border border-yellow-200"><AlertTriangle className="w-5 h-5" /><span>ACTION REQUIRED</span></div>;
  return <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg font-bold border border-red-200"><XCircle className="w-5 h-5" /><span>REJECTED</span></div>;
};

const TriageDashboard: React.FC<{ report: ScanReport; onDraftEmail: () => void }> = ({ report, onDraftEmail }) => {
  let blockerCount = 0, reviewCount = 0, infoCount = 0;
  Object.values(report.findings).forEach(group => {
    if (group.count === 0) return;
    if (group.rule.reviewBucket === 'AUTO_REJECT' || group.rule.severity === 'BLOCKER') blockerCount += group.count;
    else if (group.rule.reviewBucket === 'ACTION_REQUIRED' || group.rule.severity === 'HIGH') reviewCount += group.count;
    else infoCount += group.count;
  });
  return (
    <section className="bg-white p-6 rounded-xl border shadow-sm mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Triage Dashboard</h2>
          <p className="text-sm text-gray-500">60-second review summary</p>
        </div>
        <div className={`px-4 py-2 rounded-lg font-bold text-sm border whitespace-nowrap ${blockerCount > 0 ? 'bg-red-50 text-red-700 border-red-200' : reviewCount > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {blockerCount > 0 ? "RECOMMENDATION: REJECT" : reviewCount > 0 ? "RECOMMENDATION: MANUAL REVIEW" : "RECOMMENDATION: LIKELY PASS"}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
          <div className="p-2 bg-white rounded-full shadow-sm shrink-0"><XCircle className="w-6 h-6 text-red-600" /></div>
          <div><div className="text-2xl font-bold text-red-900">{blockerCount}</div><div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Auto-Reject</div></div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <div className="p-2 bg-white rounded-full shadow-sm shrink-0"><AlertTriangle className="w-6 h-6 text-yellow-600" /></div>
          <div><div className="text-2xl font-bold text-yellow-900">{reviewCount}</div><div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Review Needed</div></div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
          <div className="p-2 bg-white rounded-full shadow-sm shrink-0"><CheckCircle className="w-6 h-6 text-green-600" /></div>
          <div><div className="text-2xl font-bold text-green-900">{infoCount}</div><div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Informational</div></div>
        </div>
      </div>
      <button onClick={onDraftEmail} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-black transition-all text-sm font-medium">
        <Mail className="w-4 h-4" /> Copy Rejection Email Draft
      </button>
    </section>
  );
};

const FindingCard: React.FC<{ group: FindingGroup }> = ({ group }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { rule, count, items } = group;
  const getSeverityColor = (sev: string) => {
    if (sev === 'BLOCKER') return 'bg-red-50 text-red-900 border-red-200';
    if (sev === 'HIGH') return 'bg-orange-50 text-orange-900 border-orange-200';
    return 'bg-blue-50 text-blue-900 border-blue-200';
  };
  const Icon = rule.severity === 'BLOCKER' ? ShieldAlert : rule.severity === 'HIGH' ? AlertOctagon : Info;
  return (
    <article className={`border rounded-xl mb-4 overflow-hidden shadow-sm bg-white`}>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between p-4 hover:bg-opacity-80 transition-colors text-left ${getSeverityColor(rule.severity)}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-white/60 shadow-sm shrink-0"><Icon className="w-5 h-5" /></div>
          <div>
            <h3 className="font-bold text-sm">{rule.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider opacity-80 bg-white/50 px-2 py-0.5 rounded border border-black/5">{rule.ruleId}</span>
              <span className="text-xs font-medium opacity-90">{count} occurrence{count !== 1 ? 's' : ''} • {rule.severity} • {rule.disposition}</span>
            </div>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 opacity-60 shrink-0" /> : <ChevronDown className="w-5 h-5 opacity-60 shrink-0" />}
      </button>
      {isOpen && (
        <div className="border-t border-gray-100">
          <div className="p-4"><p className="text-sm text-gray-700">{rule.description}</p>{rule.remediation && <p className="text-sm text-green-700 mt-2"><strong>Fix:</strong> {rule.remediation}</p>}</div>
          <div className="bg-gray-50 border-t border-gray-100 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Detected Violations ({count})</h4>
            <div className="space-y-3">
              {items.slice(0, 5).map((item, idx) => (
                <div key={idx} className="bg-white rounded border p-3">
                  <div className="font-mono text-xs font-semibold text-gray-700 mb-2">{item.filePath}:{item.line}</div>
                  <pre className="text-xs bg-gray-50 p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap">{item.snippet}</pre>
                </div>
              ))}
              {items.length > 5 && <p className="text-xs text-gray-500 text-center">+ {items.length - 5} more findings hidden</p>}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

const AiSuggestionsPanel: React.FC<{ report: ScanReport; apiKey: string }> = ({ report, apiKey }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAnalyze = async () => {
    setAnalyzing(true); setError(null);
    try {
      const data = await analyzeWithAi(report, apiKey);
      if (data) setResult(data);
      else setError('Failed to get AI analysis');
    } catch (err: any) { setError(err.message); }
    finally { setAnalyzing(false); }
  };

  if (!result && !analyzing && !error) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-white p-4 rounded-xl border border-purple-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-600" /><h3 className="font-bold text-purple-900 text-sm">AI Suggestions</h3></div>
          <button onClick={handleAnalyze} disabled={!apiKey} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2">
            <Bot className="w-3 h-3" /> {apiKey ? 'Analyze with AI' : 'Add API Key'}
          </button>
        </div>
        <p className="mt-2 text-xs text-purple-800 opacity-80">Analyzes findings and suggests improvements.</p>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" /><h3 className="font-bold text-purple-900 text-sm">AI Suggestions</h3>
          <span className="ml-2 text-[10px] uppercase font-bold tracking-wider bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">Advisory Only</span>
        </div>
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-purple-400 hover:text-purple-600">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
      </div>
      {isExpanded && (
        <div className="p-4 space-y-4">
          {analyzing && <div className="flex flex-col items-center justify-center py-8 text-purple-600 gap-2"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs font-medium">Analyzing with Gemini...</span></div>}
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200"><strong>Error:</strong> {error}<button onClick={handleAnalyze} className="block mt-2 text-blue-600 underline">Retry</button></div>}
          {result && (
            <>
              <div className={`p-3 rounded-lg flex items-center gap-3 border ${result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                {result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                <div><div className="text-xs font-bold uppercase">AI Recommendation</div><div className="text-sm font-semibold">{result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' ? 'Manual Review Required' : 'Looks Good'}</div></div>
              </div>
              {result.missedRisks.length > 0 && (
                <div><h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2"><ShieldAlert className="w-4 h-4 text-orange-500" /> Potential Missed Risks</h4>
                  {result.missedRisks.map((risk, idx) => <div key={idx} className="ml-2 pl-4 border-l-2 border-orange-200 py-2"><h5 className="text-sm font-semibold text-gray-800">{risk.title}</h5><p className="text-xs text-gray-600 mt-1">{risk.whyItMatters}</p></div>)}
                </div>
              )}
              {result.questionsForReviewer.length > 0 && (
                <div><h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Reviewer Questions</h4><ul className="ml-6 list-disc text-xs text-gray-600 space-y-1">{result.questionsForReviewer.map((q, idx) => <li key={idx}>{q}</li>)}</ul></div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface BundleScannerProps {
  geminiApiKey: string;
  showHistory: boolean;
  maxFileSizeMB: number;
}

const BundleScannerApp: React.FC<BundleScannerProps> = ({ geminiApiKey, showHistory, maxFileSizeMB }) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config: ScanConfig = { ...DEFAULT_CONFIG, maxTotalSizeBytes: maxFileSizeMB * 1024 * 1024 };

  useEffect(() => { if (showHistory) getHistory().then(setHistory).catch(console.error); }, [showHistory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setError(null); setReport(null); } };

  const handleScan = async () => {
    if (!file) return;
    setIsScanning(true); setProgress('Initializing...'); setError(null);
    try {
      const files = await processZipFile(file, config, setProgress);
      setProgress('Building file inventory...');
      const findings = scanFiles(files, DEFAULT_RULESET, setProgress);
      setProgress('Generating report...');
      const scanReport = generateReport(findings, DEFAULT_RULESET, files);
      setReport(scanReport);
      if (showHistory) {
        await saveToHistory({ id: scanReport.runId, fileName: file.name, scanDate: scanReport.createdAt, verdict: scanReport.verdict, findingCount: Object.values(scanReport.findings).reduce((sum, g) => sum + g.count, 0), fileCount: scanReport.bundleSummary.fileCount });
        setHistory(await getHistory());
      }
    } catch (err: any) { setError(err.message || 'An unknown error occurred.'); }
    finally { setIsScanning(false); setProgress(''); }
  };

  const handleReset = () => { setFile(null); setReport(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleDraftEmail = () => { if (report) { navigator.clipboard.writeText(generateRejectionEmail(report)); alert('Rejection email copied to clipboard!'); } };
  const handleClearHistory = async () => { await clearHistory(); setHistory([]); };
  const handleLoadFromHistory = (loadedReport: ScanReport) => { setReport(loadedReport); setActiveTab('scan'); };

  const groupedFindings = report ? {
    blockers: Object.values(report.findings).filter(g => g.count > 0 && (g.rule.severity === 'BLOCKER' || g.rule.reviewBucket === 'AUTO_REJECT')),
    review: Object.values(report.findings).filter(g => g.count > 0 && (g.rule.severity === 'HIGH' || g.rule.reviewBucket === 'ACTION_REQUIRED')),
    info: Object.values(report.findings).filter(g => g.count > 0 && g.rule.severity !== 'BLOCKER' && g.rule.severity !== 'HIGH' && g.rule.reviewBucket !== 'AUTO_REJECT' && g.rule.reviewBucket !== 'ACTION_REQUIRED')
  } : { blockers: [], review: [], info: [] };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">WF</div>
            <h1 className="font-semibold text-lg hidden md:block">Marketplace Bundle Scanner <span className="text-gray-400 font-normal text-sm">V1.2</span></h1>
            <h1 className="font-semibold text-sm md:hidden">Bundle Scanner</h1>
          </div>
          {showHistory && (
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
              <button onClick={() => setActiveTab('scan')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'scan' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}><ListChecks className="w-4 h-4" /> Scan</button>
              <button onClick={() => setActiveTab('history')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}><History className="w-4 h-4" /> History</button>
            </div>
          )}
          <div className="w-24 flex justify-end shrink-0">{report && activeTab === 'scan' && <div className="scale-90 origin-right"><VerdictBadge verdict={report.verdict} /></div>}</div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] gap-8">
        {/* Left Sidebar */}
        {activeTab === 'scan' ? (
          <div className="space-y-6 order-2 md:order-1">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h2 className="font-bold mb-4 flex items-center gap-2 text-gray-800"><FileUp className="w-5 h-5 text-blue-600" /> Upload Bundle</h2>
              {!report ? (
                <div className="space-y-4">
                  <input ref={fileInputRef} type="file" accept=".zip" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                  <p className="text-xs text-gray-500">Select a .zip file (Max {maxFileSizeMB}MB unzipped).</p>
                  <button onClick={handleScan} disabled={!file || isScanning} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2">
                    {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run Scan
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={handleReset} className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Scan New File</button>
                  <button onClick={() => { const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `scanReport_${report.runId.substring(0, 8)}.json`; a.click(); }} className="w-full py-2 px-4 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg font-medium transition-all flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download Report</button>
                </div>
              )}
              {isScanning && <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded animate-pulse">{progress}</div>}
              {error && <div className="mt-4 p-3 bg-red-50 text-red-800 text-xs rounded border border-red-200"><strong>Error:</strong> {error}</div>}
            </div>
          </div>
        ) : (
          <div className="space-y-6 order-2 md:order-1">
            <div className="bg-white p-6 rounded-xl border shadow-sm text-sm text-gray-600">
              <h3 className="font-bold text-gray-900 mb-2">About Scan History</h3>
              <p>History is stored in your browser's IndexedDB.</p>
              {history.length > 0 && <button onClick={handleClearHistory} className="mt-3 text-red-600 hover:text-red-700 flex items-center gap-1 text-xs"><Trash2 className="w-3 h-3" /> Clear History</button>}
            </div>
          </div>
        )}

        {/* Right Content */}
        <div className="space-y-6 order-1 md:order-2">
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">Scan History</h2>
              {history.length === 0 ? <p className="text-gray-500 text-center py-8">No scans yet</p> : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => {}}>
                      <div><p className="font-medium text-gray-900">{entry.fileName}</p><p className="text-xs text-gray-500">{new Date(entry.scanDate).toLocaleString()} • {entry.fileCount} files • {entry.findingCount} findings</p></div>
                      <VerdictBadge verdict={entry.verdict} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'scan' && (
            <>
              {!report && !isScanning && (
                <div className="h-96 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <FileUp className="w-12 h-12 mb-4 opacity-50" />
                  <p>Upload a bundle to start scanning</p>
                </div>
              )}
              {report && (
                <>
                  <TriageDashboard report={report} onDraftEmail={handleDraftEmail} />
                  {geminiApiKey && <AiSuggestionsPanel report={report} apiKey={geminiApiKey} />}
                  <div className="space-y-8">
                    {groupedFindings.blockers.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg text-red-700 mb-3 uppercase tracking-wide"><Filter className="w-5 h-5" /> Auto-Reject Issues ({groupedFindings.blockers.length})</h3>
                        {groupedFindings.blockers.map(group => <FindingCard key={group.rule.ruleId} group={group} />)}
                      </div>
                    )}
                    {groupedFindings.review.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg text-yellow-700 mb-3 uppercase tracking-wide"><Filter className="w-5 h-5" /> Needs Review ({groupedFindings.review.length})</h3>
                        {groupedFindings.review.map(group => <FindingCard key={group.rule.ruleId} group={group} />)}
                      </div>
                    )}
                    {groupedFindings.info.length > 0 && (
                      <div>
                        <h3 className="flex items-center gap-2 font-bold text-lg text-green-700 mb-3 uppercase tracking-wide"><Filter className="w-5 h-5" /> Informational ({groupedFindings.info.length})</h3>
                        {groupedFindings.info.map(group => <FindingCard key={group.rule.ruleId} group={group} />)}
                      </div>
                    )}
                    {Object.keys(report.findings).length === 0 && <div className="p-12 text-center text-gray-500 bg-white rounded-xl border"><p>No issues found matching the current ruleset.</p></div>}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// ============================================================================
// WEBFLOW COMPONENT DECLARATION
// ============================================================================

export default declareComponent(BundleScannerApp, {
  name: 'Bundle Scanner',
  description: 'Webflow Marketplace bundle security scanner with AI analysis - matches original IC design',
  group: 'Marketplace Tools',
  props: {
    geminiApiKey: props.String({ name: 'Gemini API Key', defaultValue: '', tooltip: 'Google Gemini API key for AI-powered analysis (optional)' }),
    showHistory: props.Boolean({ name: 'Show History', defaultValue: true, tooltip: 'Enable scan history tab' }),
    maxFileSizeMB: props.Number({ name: 'Max File Size (MB)', defaultValue: 100, tooltip: 'Maximum allowed ZIP file size' }),
  },
});
