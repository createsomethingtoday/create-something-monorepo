import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import {
  Upload,
  FileArchive,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileCode,
  MapPin,
  Loader2,
  Sparkles,
  History,
  Settings,
  Mail,
  Trash2,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// TYPES - All inline, no external dependencies
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
  policyMetadata: {
    rulesetVersion: string;
    configVersion: string;
  };
  verdict: Verdict;
  verdictReasons: string[];
  bundleSummary: {
    fileCount: number;
    totalBytes: number;
    scannedFileCount: number;
    skippedFileCount: number;
  };
  findings: Record<string, FindingGroup>;
}

interface AiRisk {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: { filePath: string; snippet: string }[];
  recommendation: string;
}

interface AiAnalysis {
  summary: string;
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  risks: AiRisk[];
  positives: string[];
  recommendation: 'approve' | 'review' | 'reject';
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
// DEFAULT RULESET - 18 security & policy rules
// ============================================================================

const DEFAULT_RULESET: ScanRule[] = [
  {
    ruleId: 'SEC-001',
    name: 'Dynamic Code Execution',
    category: 'SECURITY',
    reviewBucket: 'AUTO_REJECT',
    severity: 'BLOCKER',
    disposition: 'REJECTED',
    description: 'Disallow runtime compilation/execution of JavaScript (eval, new Function)',
    matchers: [
      { type: 'REGEX', pattern: '\\beval\\s*\\(', flags: 'gi' },
      { type: 'REGEX', pattern: 'new\\s+Function\\s*\\(', flags: 'gi' },
    ],
    remediation: 'Remove eval() and new Function() calls. Use static code instead.',
  },
  {
    ruleId: 'SEC-002',
    name: 'Hardcoded API Keys',
    category: 'SECURITY',
    reviewBucket: 'AUTO_REJECT',
    severity: 'BLOCKER',
    disposition: 'REJECTED',
    description: 'Detect hardcoded API keys, secrets, and tokens',
    matchers: [
      { type: 'REGEX', pattern: '["\']sk_live_[a-zA-Z0-9]{24,}["\']', flags: 'g' },
      { type: 'REGEX', pattern: '["\']pk_live_[a-zA-Z0-9]{24,}["\']', flags: 'g' },
      { type: 'REGEX', pattern: 'api[_-]?key\\s*[=:]\\s*["\'][a-zA-Z0-9_\\-]{20,}["\']', flags: 'gi' },
      { type: 'REGEX', pattern: 'secret[_-]?key\\s*[=:]\\s*["\'][a-zA-Z0-9_\\-]{20,}["\']', flags: 'gi' },
    ],
    remediation: 'Move API keys to environment variables or secure vaults.',
  },
  {
    ruleId: 'SEC-003',
    name: 'Cryptocurrency Mining',
    category: 'SECURITY',
    reviewBucket: 'AUTO_REJECT',
    severity: 'BLOCKER',
    disposition: 'REJECTED',
    description: 'Detect cryptocurrency mining scripts',
    matchers: [
      { type: 'REGEX', pattern: 'coinhive', flags: 'gi' },
      { type: 'REGEX', pattern: 'cryptonight', flags: 'gi' },
      { type: 'REGEX', pattern: 'coin-hive', flags: 'gi' },
      { type: 'REGEX', pattern: 'minero\\.cc', flags: 'gi' },
    ],
    remediation: 'Remove all cryptocurrency mining code.',
  },
  {
    ruleId: 'SEC-004',
    name: 'DOM-based XSS',
    category: 'SECURITY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'HIGH',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect potentially unsafe DOM manipulation',
    matchers: [
      { type: 'REGEX', pattern: '\\.innerHTML\\s*=', flags: 'g' },
      { type: 'REGEX', pattern: '\\.outerHTML\\s*=', flags: 'g' },
      { type: 'REGEX', pattern: 'document\\.write\\s*\\(', flags: 'g' },
    ],
    remediation: 'Use textContent or createElement/appendChild instead of innerHTML.',
  },
  {
    ruleId: 'NET-001',
    name: 'External Network Requests',
    category: 'NETWORK',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'MEDIUM',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect fetch/XHR calls to external domains',
    matchers: [
      { type: 'REGEX', pattern: 'fetch\\s*\\(["\']https?://', flags: 'gi' },
      { type: 'REGEX', pattern: 'XMLHttpRequest', flags: 'g' },
      { type: 'REGEX', pattern: '\\.open\\s*\\(["\'](?:GET|POST|PUT|DELETE)', flags: 'gi' },
    ],
    remediation: 'Document all external API calls and ensure they are necessary.',
  },
  {
    ruleId: 'NET-002',
    name: 'WebSocket Connections',
    category: 'NETWORK',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'MEDIUM',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect WebSocket usage',
    matchers: [
      { type: 'REGEX', pattern: 'new\\s+WebSocket\\s*\\(', flags: 'g' },
      { type: 'REGEX', pattern: 'wss?://', flags: 'g' },
    ],
    remediation: 'Document WebSocket usage and ensure secure connections (wss://).',
  },
  {
    ruleId: 'PRIV-001',
    name: 'Location Tracking',
    category: 'PRIVACY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'HIGH',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect geolocation API usage',
    matchers: [
      { type: 'REGEX', pattern: 'navigator\\.geolocation', flags: 'g' },
      { type: 'REGEX', pattern: 'getCurrentPosition', flags: 'g' },
      { type: 'REGEX', pattern: 'watchPosition', flags: 'g' },
    ],
    remediation: 'Ensure geolocation access is user-initiated and clearly disclosed.',
  },
  {
    ruleId: 'PRIV-002',
    name: 'Camera/Microphone Access',
    category: 'PRIVACY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'HIGH',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect media device access',
    matchers: [
      { type: 'REGEX', pattern: 'getUserMedia', flags: 'g' },
      { type: 'REGEX', pattern: 'navigator\\.mediaDevices', flags: 'g' },
    ],
    remediation: 'Ensure media access is user-initiated and clearly disclosed.',
  },
  {
    ruleId: 'PRIV-003',
    name: 'Clipboard Access',
    category: 'PRIVACY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'MEDIUM',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect clipboard API usage',
    matchers: [
      { type: 'REGEX', pattern: 'navigator\\.clipboard', flags: 'g' },
      { type: 'REGEX', pattern: 'execCommand\\s*\\(["\']copy', flags: 'gi' },
      { type: 'REGEX', pattern: 'execCommand\\s*\\(["\']paste', flags: 'gi' },
    ],
    remediation: 'Ensure clipboard access is user-initiated.',
  },
  {
    ruleId: 'PRIV-004',
    name: 'Third-Party Tracking',
    category: 'PRIVACY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'MEDIUM',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect common tracking/analytics scripts',
    matchers: [
      { type: 'REGEX', pattern: 'google-analytics\\.com', flags: 'gi' },
      { type: 'REGEX', pattern: 'googletagmanager\\.com', flags: 'gi' },
      { type: 'REGEX', pattern: 'facebook\\.net.*fbevents', flags: 'gi' },
      { type: 'REGEX', pattern: 'segment\\.com', flags: 'gi' },
      { type: 'REGEX', pattern: 'mixpanel\\.com', flags: 'gi' },
    ],
    remediation: 'Disclose all third-party tracking in privacy policy.',
  },
  {
    ruleId: 'UX-001',
    name: 'Alert/Confirm/Prompt',
    category: 'UX',
    reviewBucket: 'INFO',
    severity: 'LOW',
    disposition: 'INFO',
    description: 'Detect native browser dialogs',
    matchers: [
      { type: 'REGEX', pattern: '\\balert\\s*\\(', flags: 'g' },
      { type: 'REGEX', pattern: '\\bconfirm\\s*\\(', flags: 'g' },
      { type: 'REGEX', pattern: '\\bprompt\\s*\\(', flags: 'g' },
    ],
    remediation: 'Consider using custom modals for better UX.',
  },
  {
    ruleId: 'UX-002',
    name: 'Console Logging',
    category: 'UX',
    reviewBucket: 'INFO',
    severity: 'INFO',
    disposition: 'INFO',
    description: 'Detect console statements',
    matchers: [
      { type: 'REGEX', pattern: 'console\\.(log|warn|error|info|debug)\\s*\\(', flags: 'g' },
    ],
    remediation: 'Remove or conditionally disable console logs in production.',
  },
  {
    ruleId: 'SEC-005',
    name: 'Obfuscated Code',
    category: 'SECURITY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'HIGH',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect heavily obfuscated code patterns',
    matchers: [
      { type: 'REGEX', pattern: '\\\\x[0-9a-f]{2}\\\\x[0-9a-f]{2}\\\\x[0-9a-f]{2}', flags: 'gi' },
      { type: 'REGEX', pattern: '_0x[a-f0-9]{4,}', flags: 'g' },
      { type: 'REGEX', pattern: 'String\\.fromCharCode\\s*\\(\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+', flags: 'g' },
    ],
    remediation: 'Provide unobfuscated source code for review.',
  },
  {
    ruleId: 'SEC-006',
    name: 'Iframe Injection',
    category: 'SECURITY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'HIGH',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect dynamic iframe creation',
    matchers: [
      { type: 'REGEX', pattern: 'createElement\\s*\\(["\']iframe["\']\\)', flags: 'gi' },
      { type: 'REGEX', pattern: '<iframe[^>]*src\\s*=', flags: 'gi' },
    ],
    remediation: 'Document iframe usage and ensure sources are trusted.',
  },
  {
    ruleId: 'NET-003',
    name: 'Postmessage Usage',
    category: 'NETWORK',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'MEDIUM',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect cross-origin messaging',
    matchers: [
      { type: 'REGEX', pattern: '\\.postMessage\\s*\\(', flags: 'g' },
      { type: 'REGEX', pattern: 'addEventListener\\s*\\(["\']message["\']', flags: 'g' },
    ],
    remediation: 'Validate message origins and sanitize message data.',
  },
  {
    ruleId: 'SEC-007',
    name: 'Local Storage of Sensitive Data',
    category: 'SECURITY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'MEDIUM',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect potential storage of sensitive data',
    matchers: [
      { type: 'REGEX', pattern: 'localStorage\\.setItem\\s*\\(["\'](?:token|password|secret|key|auth)', flags: 'gi' },
      { type: 'REGEX', pattern: 'sessionStorage\\.setItem\\s*\\(["\'](?:token|password|secret|key|auth)', flags: 'gi' },
    ],
    remediation: 'Use secure, httpOnly cookies for sensitive data.',
  },
  {
    ruleId: 'SEC-008',
    name: 'Unsafe URL Handling',
    category: 'SECURITY',
    reviewBucket: 'ACTION_REQUIRED',
    severity: 'MEDIUM',
    disposition: 'ACTION_REQUIRED',
    description: 'Detect potentially unsafe URL manipulation',
    matchers: [
      { type: 'REGEX', pattern: 'location\\.href\\s*=', flags: 'g' },
      { type: 'REGEX', pattern: 'location\\.replace\\s*\\(', flags: 'g' },
      { type: 'REGEX', pattern: 'window\\.open\\s*\\(', flags: 'g' },
    ],
    remediation: 'Validate and sanitize URLs before navigation.',
  },
  {
    ruleId: 'INFO-001',
    name: 'TODO/FIXME Comments',
    category: 'INFO',
    reviewBucket: 'INFO',
    severity: 'INFO',
    disposition: 'INFO',
    description: 'Detect incomplete code markers',
    matchers: [
      { type: 'REGEX', pattern: '//\\s*TODO:', flags: 'gi' },
      { type: 'REGEX', pattern: '//\\s*FIXME:', flags: 'gi' },
      { type: 'REGEX', pattern: '//\\s*HACK:', flags: 'gi' },
    ],
    remediation: 'Review and resolve TODO/FIXME items before release.',
  },
];

// ============================================================================
// SCAN CONFIG
// ============================================================================

interface ScanConfig {
  maxFileSizeBytes: number;
  maxTotalSizeBytes: number;
  maxFileCount: number;
  textExtensions: string[];
  ignorePatterns: string[];
}

const DEFAULT_CONFIG: ScanConfig = {
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB per file
  maxTotalSizeBytes: 100 * 1024 * 1024, // 100MB total
  maxFileCount: 1000,
  textExtensions: [
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.html', '.htm', '.css', '.scss', '.less',
    '.json', '.xml', '.svg', '.md', '.txt',
    '.vue', '.svelte', '.astro',
  ],
  ignorePatterns: [
    'node_modules/**',
    '.git/**',
    '*.min.js',
    '*.min.css',
    '*.map',
    '*.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ],
};

// ============================================================================
// UTILITIES
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function matchGlob(path: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/{{GLOBSTAR}}/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\./g, '\\.');
  return new RegExp(`^${regexPattern}$`).test(path);
}

function isTextFile(filename: string, config: ScanConfig): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase();
  return config.textExtensions.includes(ext);
}

function shouldIgnore(path: string, config: ScanConfig): boolean {
  return config.ignorePatterns.some(pattern => matchGlob(path, pattern));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

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

async function processZipFile(
  file: File,
  config: ScanConfig,
  onProgress: (msg: string) => void
): Promise<UnzippedFile[]> {
  if (file.size > config.maxTotalSizeBytes) {
    throw new Error(`File too large: ${formatBytes(file.size)} exceeds ${formatBytes(config.maxTotalSizeBytes)}`);
  }

  onProgress('Reading ZIP file...');
  const zip = await JSZip.loadAsync(file);
  const entries = Object.entries(zip.files).filter(([_, f]) => !f.dir);

  if (entries.length > config.maxFileCount) {
    throw new Error(`Too many files: ${entries.length} exceeds limit of ${config.maxFileCount}`);
  }

  const results: UnzippedFile[] = [];
  let processed = 0;

  for (const [path, zipEntry] of entries) {
    processed++;
    if (processed % 50 === 0) {
      onProgress(`Extracting files... ${processed}/${entries.length}`);
    }

    const isTextCandidate = isTextFile(path, config);
    const isIgnored = shouldIgnore(path, config);

    let content = '';
    if (isTextCandidate && !isIgnored) {
      try {
        content = await zipEntry.async('string');
      } catch {
        content = '';
      }
    }

    results.push({
      path,
      content,
      sizeBytes: content.length,
      isTextCandidate,
      isIgnored,
    });
  }

  return results;
}

function scanFiles(
  files: UnzippedFile[],
  ruleset: ScanRule[],
  onProgress: (msg: string) => void
): Finding[] {
  const findings: Finding[] = [];
  const filesToScan = files.filter(f => f.isTextCandidate && !f.isIgnored && f.content);
  let scanned = 0;

  for (const file of filesToScan) {
    scanned++;
    if (scanned % 20 === 0) {
      onProgress(`Scanning files... ${scanned}/${filesToScan.length}`);
    }

    const lines = file.content.split('\n');

    for (const rule of ruleset) {
      for (const matcher of rule.matchers) {
        const regex = new RegExp(matcher.pattern, matcher.flags || 'g');

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          let match;
          regex.lastIndex = 0;

          while ((match = regex.exec(line)) !== null) {
            findings.push({
              ruleId: rule.ruleId,
              filePath: file.path,
              line: lineNum + 1,
              column: match.index + 1,
              snippet: line.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20),
              matchedText: match[0],
            });

            // Prevent infinite loops for zero-width matches
            if (match[0].length === 0) break;
          }
        }
      }
    }
  }

  return findings;
}

function generateReport(
  findings: Finding[],
  ruleset: ScanRule[],
  files: UnzippedFile[]
): ScanReport {
  const ruleMap = new Map(ruleset.map(r => [r.ruleId, r]));
  const groups: Record<string, FindingGroup> = {};

  for (const finding of findings) {
    const rule = ruleMap.get(finding.ruleId);
    if (!rule) continue;

    if (!groups[finding.ruleId]) {
      groups[finding.ruleId] = { rule, count: 0, items: [] };
    }
    const group = groups[finding.ruleId];
    if (group) {
      group.count++;
      group.items.push(finding);
    }
  }

  // Determine verdict
  const hasBlocker = Object.values(groups).some(g => g.rule.reviewBucket === 'AUTO_REJECT');
  const hasActionRequired = Object.values(groups).some(g => g.rule.reviewBucket === 'ACTION_REQUIRED');

  let verdict: Verdict = 'PASS';
  const verdictReasons: string[] = [];

  if (hasBlocker) {
    verdict = 'REJECTED';
    verdictReasons.push('Contains auto-reject issues');
  } else if (hasActionRequired) {
    verdict = 'ACTION_REQUIRED';
    verdictReasons.push('Contains issues requiring manual review');
  }

  const scannedFiles = files.filter(f => f.isTextCandidate && !f.isIgnored);
  const skippedFiles = files.filter(f => f.isIgnored);

  return {
    scanReportVersion: '1.1.0',
    runId: generateId(),
    createdAt: new Date().toISOString(),
    policyMetadata: {
      rulesetVersion: '1.0.0',
      configVersion: '1.0.0',
    },
    verdict,
    verdictReasons,
    bundleSummary: {
      fileCount: files.length,
      totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
      scannedFileCount: scannedFiles.length,
      skippedFileCount: skippedFiles.length,
    },
    findings: groups,
  };
}

// ============================================================================
// AI ANALYSIS (via REST API)
// ============================================================================

async function analyzeWithAi(
  report: ScanReport,
  apiKey: string
): Promise<AiAnalysis | null> {
  if (!apiKey) return null;

  const prompt = `You are a security expert reviewing a Webflow Marketplace app bundle scan report.

SCAN SUMMARY:
- Files scanned: ${report.bundleSummary.scannedFileCount}
- Total findings: ${Object.values(report.findings).reduce((sum, g) => sum + g.count, 0)}
- Current verdict: ${report.verdict}

FINDINGS BY RULE:
${Object.values(report.findings).map(g => 
  `- ${g.rule.name} (${g.rule.severity}): ${g.count} occurrences
   ${g.items.slice(0, 3).map(i => `  • ${i.filePath}:${i.line} - "${i.snippet}"`).join('\n')}`
).join('\n\n')}

Analyze this report and respond with ONLY a JSON object (no markdown):
{
  "summary": "2-3 sentence overall assessment",
  "overallRisk": "critical|high|medium|low",
  "risks": [
    {
      "title": "Risk title",
      "severity": "critical|high|medium|low",
      "description": "Why this is concerning",
      "evidence": [{"filePath": "path", "snippet": "code"}],
      "recommendation": "What to do"
    }
  ],
  "positives": ["Good practices observed"],
  "recommendation": "approve|review|reject"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('AI API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AiAnalysis;
    }
    return null;
  } catch (error) {
    console.error('AI analysis error:', error);
    return null;
  }
}

// ============================================================================
// INDEXEDDB HISTORY
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveToHistory(entry: ScanHistoryEntry): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getHistory(): Promise<ScanHistoryEntry[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const entries = request.result as ScanHistoryEntry[];
      entries.sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime());
      resolve(entries);
    };
    request.onerror = () => reject(request.error);
  });
}

async function clearHistory(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================================================
// EMAIL GENERATION
// ============================================================================

function generateRejectionEmail(report: ScanReport): string {
  const blockers = Object.values(report.findings).filter(g => g.rule.reviewBucket === 'AUTO_REJECT');
  const actionItems = Object.values(report.findings).filter(g => g.rule.reviewBucket === 'ACTION_REQUIRED');

  let email = `Subject: Webflow Marketplace App Review - Action Required

Hello,

Thank you for submitting your app to the Webflow Marketplace. After reviewing your submission, we've identified some issues that need to be addressed before approval.

`;

  if (blockers.length > 0) {
    email += `## Critical Issues (Must Fix)

`;
    for (const group of blockers) {
      email += `### ${group.rule.name}
${group.rule.description}

Found ${group.count} occurrence(s):
${group.items.slice(0, 3).map(i => `- ${i.filePath}:${i.line}`).join('\n')}

**How to fix:** ${group.rule.remediation || 'Remove or refactor the flagged code.'}

`;
    }
  }

  if (actionItems.length > 0) {
    email += `## Items Requiring Review

`;
    for (const group of actionItems) {
      email += `### ${group.rule.name}
${group.rule.description}

Found ${group.count} occurrence(s). Please provide documentation explaining the usage.

`;
    }
  }

  email += `---

Please address these issues and resubmit your app. If you have questions, reply to this email.

Best regards,
Webflow Marketplace Review Team`;

  return email;
}

// ============================================================================
// UI COMPONENTS
// ============================================================================

const VerdictBadge: React.FC<{ verdict: Verdict; size?: 'sm' | 'md' | 'lg' }> = ({ verdict, size = 'md' }) => {
  const sizeClasses = { sm: 'text-xs px-2 py-1', md: 'text-sm px-3 py-1.5', lg: 'text-base px-4 py-2' };
  const iconSizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };
  
  const config: Record<Verdict, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    PASS: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className={iconSizes[size]} />, label: 'Approved' },
    ACTION_REQUIRED: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <AlertTriangle className={iconSizes[size]} />, label: 'Review Needed' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className={iconSizes[size]} />, label: 'Rejected' },
  };

  const { bg, text, icon, label } = config[verdict];
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${bg} ${text} ${sizeClasses[size]}`}>
      {icon} {label}
    </span>
  );
};

const FindingCard: React.FC<{ group: FindingGroup; defaultExpanded?: boolean }> = ({ group, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { rule, count, items } = group;

  const severityColors: Record<Severity, string> = {
    BLOCKER: 'border-red-300 bg-red-50',
    HIGH: 'border-orange-300 bg-orange-50',
    MEDIUM: 'border-yellow-300 bg-yellow-50',
    LOW: 'border-blue-300 bg-blue-50',
    INFO: 'border-gray-300 bg-gray-50',
  };

  const badgeColors: Record<Severity, string> = {
    BLOCKER: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-blue-100 text-blue-800',
    INFO: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className={`rounded-lg border-l-4 mb-3 ${severityColors[rule.severity]}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left flex items-start justify-between gap-4 hover:bg-white/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${badgeColors[rule.severity]}`}>
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

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {rule.remediation && (
            <div className="text-sm text-gray-700 bg-white/50 rounded p-2 border">
              <strong>Fix:</strong> {rule.remediation}
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.slice(0, 10).map((item, idx) => (
              <div key={idx} className="bg-white rounded border p-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                  <FileCode className="w-3 h-3" />
                  <code className="font-mono">{item.filePath}</code>
                  <span className="text-gray-400">•</span>
                  <MapPin className="w-3 h-3" />
                  <span>Line {item.line}</span>
                </div>
                <pre className="text-xs bg-gray-50 p-1 rounded font-mono overflow-x-auto whitespace-pre-wrap">
                  {item.snippet}
                </pre>
              </div>
            ))}
            {items.length > 10 && (
              <p className="text-xs text-gray-500 text-center">
                + {items.length - 10} more occurrences
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface BundleScannerProps {
  geminiApiKey: string;
  showHistory: boolean;
  maxFileSizeMB: number;
  accentColor: string;
}

const BundleScannerApp: React.FC<BundleScannerProps> = ({
  geminiApiKey,
  showHistory,
  maxFileSizeMB,
  accentColor,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState<ScanReport | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config: ScanConfig = {
    ...DEFAULT_CONFIG,
    maxTotalSizeBytes: maxFileSizeMB * 1024 * 1024,
  };

  useEffect(() => {
    if (showHistory) {
      getHistory().then(setHistory).catch(console.error);
    }
  }, [showHistory]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setReport(null);
      setAiAnalysis(null);
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.zip')) {
      setFile(dropped);
      setReport(null);
      setAiAnalysis(null);
      setError(null);
    }
  }, []);

  const runScan = useCallback(async () => {
    if (!file) return;

    setIsScanning(true);
    setError(null);
    setProgress('Starting scan...');

    try {
      const files = await processZipFile(file, config, setProgress);
      setProgress('Running security checks...');
      const findings = scanFiles(files, DEFAULT_RULESET, setProgress);
      setProgress('Generating report...');
      const scanReport = generateReport(findings, DEFAULT_RULESET, files);
      setReport(scanReport);

      // Save to history
      if (showHistory) {
        const historyEntry: ScanHistoryEntry = {
          id: scanReport.runId,
          fileName: file.name,
          scanDate: scanReport.createdAt,
          verdict: scanReport.verdict,
          findingCount: Object.values(scanReport.findings).reduce((sum, g) => sum + g.count, 0),
          fileCount: scanReport.bundleSummary.fileCount,
        };
        await saveToHistory(historyEntry);
        setHistory(await getHistory());
      }

      // Run AI analysis if API key provided
      if (geminiApiKey) {
        setIsAnalyzingAi(true);
        setProgress('Running AI analysis...');
        const analysis = await analyzeWithAi(scanReport, geminiApiKey);
        setAiAnalysis(analysis);
        setIsAnalyzingAi(false);
      }

      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setProgress('');
    } finally {
      setIsScanning(false);
    }
  }, [file, config, geminiApiKey, showHistory]);

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    setHistory([]);
  }, []);

  const handleCopyEmail = useCallback(() => {
    if (report) {
      const email = generateRejectionEmail(report);
      navigator.clipboard.writeText(email);
    }
  }, [report]);

  const handleReset = useCallback(() => {
    setFile(null);
    setReport(null);
    setAiAnalysis(null);
    setError(null);
    setProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Group findings by bucket
  const blockers = report ? Object.values(report.findings).filter(g => g.rule.reviewBucket === 'AUTO_REJECT') : [];
  const actionRequired = report ? Object.values(report.findings).filter(g => g.rule.reviewBucket === 'ACTION_REQUIRED') : [];
  const info = report ? Object.values(report.findings).filter(g => g.rule.reviewBucket === 'INFO') : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor }}>
              <FileArchive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bundle Scanner</h1>
              <p className="text-sm text-gray-500">Webflow Marketplace Security Review</p>
            </div>
          </div>
          {showHistory && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('scan')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'scan' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Scan
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'history' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <History className="w-4 h-4 inline mr-2" />
                History
              </button>
            </div>
          )}
        </div>

        {/* History Tab */}
        {activeTab === 'history' && showHistory && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Scan History</h2>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No scans yet</p>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{entry.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(entry.scanDate).toLocaleString()} • {entry.fileCount} files • {entry.findingCount} findings
                      </p>
                    </div>
                    <VerdictBadge verdict={entry.verdict} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <>
            {/* Upload Area */}
            {!report && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`bg-white rounded-xl shadow-sm border-2 border-dashed p-8 text-center transition-colors ${
                  file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                
                {!file ? (
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-1">
                      Drop your app bundle here
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse • ZIP files up to {maxFileSizeMB}MB
                    </p>
                  </label>
                ) : (
                  <div>
                    <FileArchive className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-1">{file.name}</p>
                    <p className="text-sm text-gray-500 mb-4">{formatBytes(file.size)}</p>
                    
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                        {error}
                      </div>
                    )}
                    
                    {isScanning ? (
                      <div className="flex items-center justify-center gap-2 text-gray-600">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{progress}</span>
                      </div>
                    ) : (
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={runScan}
                          className="px-6 py-2 rounded-lg font-medium text-white transition-colors"
                          style={{ backgroundColor: accentColor }}
                        >
                          Start Scan
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-6 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {report && (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <VerdictBadge verdict={report.verdict} size="lg" />
                      <p className="text-sm text-gray-500 mt-2">
                        Scanned {report.bundleSummary.scannedFileCount} of {report.bundleSummary.fileCount} files
                        ({formatBytes(report.bundleSummary.totalBytes)})
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-gray-500 hover:text-gray-700"
                      title="New Scan"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-700">
                        {blockers.reduce((sum, g) => sum + g.count, 0)}
                      </div>
                      <div className="text-xs text-red-600 uppercase font-medium">Auto-Reject</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-700">
                        {actionRequired.reduce((sum, g) => sum + g.count, 0)}
                      </div>
                      <div className="text-xs text-yellow-600 uppercase font-medium">Review Needed</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-700">
                        {info.reduce((sum, g) => sum + g.count, 0)}
                      </div>
                      <div className="text-xs text-gray-600 uppercase font-medium">Informational</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {report.verdict !== 'PASS' && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={handleCopyEmail}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        <Mail className="w-4 h-4" />
                        Copy Rejection Email Draft
                      </button>
                    </div>
                  )}
                </div>

                {/* AI Analysis */}
                {(isAnalyzingAi || aiAnalysis) && (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <h2 className="text-lg font-semibold">AI Analysis</h2>
                    </div>
                    
                    {isAnalyzingAi ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Analyzing with Gemini...</span>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="space-y-4">
                        <p className="text-gray-700">{aiAnalysis.summary}</p>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Overall Risk:</span>
                          <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                            aiAnalysis.overallRisk === 'critical' ? 'bg-red-100 text-red-700' :
                            aiAnalysis.overallRisk === 'high' ? 'bg-orange-100 text-orange-700' :
                            aiAnalysis.overallRisk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {aiAnalysis.overallRisk.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">Recommendation:</span>
                          <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                            aiAnalysis.recommendation === 'reject' ? 'bg-red-100 text-red-700' :
                            aiAnalysis.recommendation === 'review' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {aiAnalysis.recommendation.toUpperCase()}
                          </span>
                        </div>

                        {aiAnalysis.risks.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-700">Identified Risks</h3>
                            {aiAnalysis.risks.map((risk, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                    risk.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                    risk.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                    risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {risk.severity.toUpperCase()}
                                  </span>
                                  <span className="font-medium text-gray-900">{risk.title}</span>
                                </div>
                                <p className="text-sm text-gray-600">{risk.description}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  <strong>Fix:</strong> {risk.recommendation}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {aiAnalysis.positives.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Positive Observations</h3>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {aiAnalysis.positives.map((p, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500">AI analysis unavailable</p>
                    )}
                  </div>
                )}

                {/* Findings */}
                {blockers.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Auto-Reject Issues ({blockers.length})
                    </h2>
                    {blockers.map((group) => (
                      <FindingCard key={group.rule.ruleId} group={group} defaultExpanded />
                    ))}
                  </div>
                )}

                {actionRequired.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-yellow-700 mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Review Required ({actionRequired.length})
                    </h2>
                    {actionRequired.map((group) => (
                      <FindingCard key={group.rule.ruleId} group={group} />
                    ))}
                  </div>
                )}

                {info.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Informational ({info.length})
                    </h2>
                    {info.map((group) => (
                      <FindingCard key={group.rule.ruleId} group={group} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// WEBFLOW COMPONENT DECLARATION
// ============================================================================

export default declareComponent(BundleScannerApp, {
  name: 'Bundle Scanner',
  description: 'Complete Webflow Marketplace bundle security scanner with AI analysis',
  group: 'Marketplace Tools',
  props: {
    geminiApiKey: props.String({
      name: 'Gemini API Key',
      defaultValue: '',
      tooltip: 'Google Gemini API key for AI-powered analysis (optional)',
    }),
    showHistory: props.Boolean({
      name: 'Show History',
      defaultValue: true,
      tooltip: 'Enable scan history saved to IndexedDB',
    }),
    maxFileSizeMB: props.Number({
      name: 'Max File Size (MB)',
      defaultValue: 100,
      tooltip: 'Maximum allowed ZIP file size in megabytes',
    }),
    accentColor: props.String({
      name: 'Accent Color',
      defaultValue: '#4F46E5',
      tooltip: 'Primary accent color (hex)',
    }),
  },
});
