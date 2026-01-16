import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import JSZip from 'jszip';

// Import styles directly for Shadow DOM injection
import './globals.css';
import {
  FileUp, RefreshCw, Download, Play, Loader2, History, ListChecks, Filter,
  CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Mail, Bot,
  ShieldAlert, Info, AlertOctagon, Trash2, BookOpen, Clock, ExternalLink, Wrench,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type Severity = 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type ReviewBucket = 'AUTO_REJECT' | 'ACTION_REQUIRED' | 'NEEDS_EXPLANATION' | 'INFO';
type Category = 'SECURITY' | 'NETWORK' | 'PRIVACY' | 'UX' | 'PRODUCTION_READINESS' | 'INFO';
type Verdict = 'PASS' | 'ACTION_REQUIRED' | 'REJECTED';
type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
type LocationType = 'CODE' | 'COMMENT' | 'DOC' | 'TEST' | 'SOURCE_MAP' | 'STRING';

interface ConditionalOverride {
  pattern: string;
  flags?: string;
  newSeverity?: Severity;
  newReviewBucket?: ReviewBucket;
  note?: string;
}

interface Matcher {
  id: string;
  type: 'regex';
  pattern: string;
  flags?: string;
  fileGlobs?: string[];
  triggerTokens?: string[];
  confidence?: Confidence;
  allowlistPatterns?: string[];
  conditionalOverrides?: ConditionalOverride[];
  notes?: string;
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
}

interface Finding {
  ruleId: string;
  matcherId: string;
  filePath: string;
  line: number;
  column: number;
  snippet: string;
  triggerToken: string;
  locationType: LocationType;
  confidence: Confidence;
  confidenceReason?: string;
  tags: string[];
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

interface AiAnalysisResult {
  reviewStatusRecommendation: 'MANUAL_REVIEW_REQUIRED' | 'LOOKS_GOOD';
  missedRisks: { title: string; confidence: Confidence; whyItMatters: string; evidence: { filePath: string; snippet: string }[] }[];
  suggestedRuleAdditions: { proposedRuleName: string; rationale: string; suggestedRegexOrAstIdea: string }[];
  suggestedNoiseReductions: { currentIssue: string; proposal: string }[];
  questionsForReviewer: string[];
}

interface RemediationInfo {
  whyItMatters: string;
  howToFix: string;
  badExample?: string;
  goodExample?: string;
  commonMistake?: string;
  estimatedFixTime?: string;
  officialDocs?: { title: string; url: string; quote?: string }[];
}

// ============================================================================
// REMEDIATION REGISTRY - Educational content for each rule
// ============================================================================

const REMEDIATION_REGISTRY: Record<string, RemediationInfo> = {
  'SEC-NO-DCE': {
    whyItMatters: 'Dynamic code execution (eval, new Function) allows arbitrary code execution, creating severe security vulnerabilities. It prevents static analysis, making it impossible to verify what code your app actually runs.',
    howToFix: 'Remove all uses of eval() and new Function(). If you are parsing JSON, use JSON.parse(). If you need dynamic logic, use a safe, sandboxed interpreter or a predefined configuration schema.',
    badExample: 'const result = eval(userInput);',
    goodExample: 'const result = JSON.parse(userInput);',
    commonMistake: 'Using eval() to parse JSON responses from an API. Always use JSON.parse().',
    estimatedFixTime: '5-15 minutes',
    officialDocs: [{ title: 'Component Architecture - Security', url: 'https://developers.webflow.com/code-components/component-architecture', quote: 'Avoid using eval() or new Function() with dynamic input.' }]
  },
  'SEC-NO-HOST-DOM': {
    whyItMatters: 'Accessing the parent (Designer) document breaks the sandbox security model. This is often used for phishing or UI redressing attacks.',
    howToFix: 'Only manipulate the DOM within your own extension iframe. Use official Webflow Designer APIs.',
    badExample: 'parent.document.querySelector(".w-editor");',
    goodExample: 'const el = await webflow.getSelectedElement();',
    estimatedFixTime: '15-30 minutes',
    officialDocs: [{ title: 'Designer Extensions', url: 'https://developers.webflow.com/docs/designer-extensions' }]
  },
  'SEC-NO-CLIENT-SECRETS': {
    whyItMatters: 'Client-side code is visible to everyone. Hardcoding secrets allows attackers to steal credentials.',
    howToFix: 'Move sensitive API calls to your backend server using the proxy pattern.',
    badExample: 'const stripeKey = "sk_live_12345...";',
    goodExample: 'await fetch("/api/create-payment");',
    commonMistake: 'Thinking minification hides secrets. It does not.',
    estimatedFixTime: '1-2 hours',
  },
  'SEC-CODE-TRANSPARENCY': {
    whyItMatters: 'Obfuscated code prevents security review. We must be able to verify the shipped code.',
    howToFix: 'Disable obfuscation tools. Standard minification is fine, but anti-debugging or packing is not.',
    badExample: 'eval(function(p,a,c,k,e,d)...',
    goodExample: 'function a(b){return b+1}',
    estimatedFixTime: '10 minutes (Build config)',
  },
  'SEC-UNSAFE-HTML': {
    whyItMatters: 'Injecting raw HTML (innerHTML) allows Cross-Site Scripting (XSS) if content includes user input.',
    howToFix: 'Use safe DOM APIs like textContent or createElement().',
    badExample: 'el.innerHTML = userInput;',
    goodExample: 'el.textContent = userInput;',
    estimatedFixTime: '15-30 minutes',
  },
  'SEC-SCRIPT-INJECTION': {
    whyItMatters: 'Dynamically injecting scripts bypasses the static bundle review.',
    howToFix: 'Bundle all required JavaScript with your extension.',
    badExample: 'const s = document.createElement("script"); s.src = "...";',
    goodExample: 'import { myLib } from "./myLib";',
    estimatedFixTime: '20 minutes',
  },
  'SEC-WEBRTC-HARDWARE': {
    whyItMatters: 'Requesting hardware access inside the Designer is disruptive and raises privacy concerns.',
    howToFix: 'Open a separate tab/window for hardware access.',
    estimatedFixTime: '30 minutes',
  },
  'PRIV-NO-FINGERPRINTING': {
    whyItMatters: 'Session replay libraries are invasive and violate user privacy expectations.',
    howToFix: 'Use privacy-preserving, event-based analytics instead.',
    badExample: 'rrweb.record({ emit: ... });',
    goodExample: 'analytics.track("button_clicked");',
    estimatedFixTime: '15 minutes',
  },
  'PROD-NO-LOCALHOST': {
    whyItMatters: 'Localhost URLs will fail for any user other than the developer.',
    howToFix: 'Replace all localhost URLs with your production HTTPS endpoints.',
    badExample: 'const API = "http://localhost:3000";',
    goodExample: 'const API = "https://api.myapp.com";',
    estimatedFixTime: '5 minutes',
  },
  'NET-URL-HYGIENE': {
    whyItMatters: 'Insecure (http://) URLs expose users to man-in-the-middle attacks.',
    howToFix: 'Ensure all network requests use https://.',
    estimatedFixTime: '5 minutes',
  },
  'SEC-NO-SENSITIVE-TOKENS-IN-STORAGE': {
    whyItMatters: 'Storing tokens in localStorage makes them accessible to any script (XSS risk).',
    howToFix: 'Fetch tokens just-in-time using webflow.getIdToken().',
    badExample: 'localStorage.setItem("auth_token", token);',
    goodExample: 'const token = await webflow.getIdToken();',
    estimatedFixTime: '20-40 minutes',
  },
  'UX-NO-SILENT-MUTATIONS': {
    whyItMatters: 'Silent changes to the user\'s project are confusing and can break the undo stack.',
    howToFix: 'Ensure all write operations are triggered by direct user action.',
    estimatedFixTime: '20-40 minutes',
  },
  'SEC-UNTRUSTED-REDIRECT': {
    whyItMatters: 'Forced redirects are common phishing vectors.',
    howToFix: 'Do not navigate the window or parent. Open external links in new tabs.',
    estimatedFixTime: '10 minutes',
  },
  'UX-NO-POPUPS': {
    whyItMatters: 'Popups are disruptive and often blocked by browsers.',
    howToFix: 'Use in-panel modals or dialogs for UI.',
    estimatedFixTime: '30-60 minutes',
  },
  'IFRAME-EXTERNAL-SRC': {
    whyItMatters: 'External iframes allow remote code loading that bypasses review.',
    howToFix: 'Bundle your UI code within the extension.',
    estimatedFixTime: 'Varies (Architecture change)',
  },
};

// ============================================================================
// COMPLETE 18-RULE RULESET (from original MVP)
// ============================================================================

const DEFAULT_RULESET: ScanRule[] = [
  // 1. DYNAMIC CODE EXECUTION
  { ruleId: 'SEC-NO-DCE', name: 'Dynamic Code Execution', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Disallow runtime compilation/execution of JavaScript (eval, new Function, string timers).',
    matchers: [
      { id: 'eval-call', type: 'regex', pattern: '\\beval\\s*\\(', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' },
      { id: 'new-function', type: 'regex', pattern: '\\bnew\\s+Function\\s*\\(', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' },
      { id: 'string-timer', type: 'regex', pattern: '(setTimeout|setInterval)\\s*\\(\\s*[\'"`]', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' }
    ]
  },
  // 2. HOST DOM ACCESS
  { ruleId: 'SEC-NO-HOST-DOM', name: 'Unauthorized Host DOM Access', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Do not access parent/top document (sandbox escape).',
    matchers: [
      { id: 'parent-doc-access', type: 'regex', pattern: '(parent|top|window\\.parent|window\\.top)\\.document', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' },
      { id: 'frame-owner', type: 'regex', pattern: 'frameElement\\.(ownerDocument|contentWindow)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' }
    ]
  },
  // 3. EXTERNAL EGRESS (Advisory)
  { ruleId: 'NET-EXTERNAL-EGRESS', name: 'External API Calls', category: 'NETWORK', reviewBucket: 'NEEDS_EXPLANATION', severity: 'MEDIUM', disposition: 'INFO', description: 'Review third-party data egress.',
    matchers: [{ id: 'fetch-xhr', type: 'regex', pattern: '(\\bfetch\\s*\\(|new\\s+XMLHttpRequest)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'LOW' }]
  },
  // 4. HARDCODED SECRETS
  { ruleId: 'SEC-NO-CLIENT-SECRETS', name: 'Hardcoded API Secrets', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Zero tolerance for hardcoded keys (Stripe, AWS, Slack, GitHub, PEM keys).',
    matchers: [
      { id: 'aws-keys', type: 'regex', pattern: '\\bAKIA[0-9A-Z]{16}\\b', flags: 'g', fileGlobs: ['**/*'], confidence: 'HIGH' },
      { id: 'stripe-slack-keys', type: 'regex', pattern: '\\b(sk_live_[0-9a-zA-Z]+|xox[baprs]-[0-9A-Za-z\\-]{10,})\\b', flags: 'g', fileGlobs: ['**/*'], confidence: 'HIGH' },
      { id: 'github-tokens', type: 'regex', pattern: '\\b(ghp|gho|ghs)_[A-Za-z0-9]{36}\\b', flags: 'g', fileGlobs: ['**/*'], confidence: 'HIGH' },
      { id: 'pem-private-key', type: 'regex', pattern: '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----', flags: 'g', fileGlobs: ['**/*'], confidence: 'HIGH' },
      { id: 'google-api-key', type: 'regex', pattern: '\\bAIza[0-9A-Za-z\\-_]{35}\\b', flags: 'g', fileGlobs: ['**/*'], confidence: 'MEDIUM' },
      { id: 'generic-secret-assignment', type: 'regex', pattern: '(clientSecret|apiSecret|privateKey)\\s*[:=]\\s*[\'"`][A-Za-z0-9_\\-]{20,}[\'"`]', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' }
    ]
  },
  // 5. OBFUSCATION
  { ruleId: 'SEC-CODE-TRANSPARENCY', name: 'Obfuscated Source Code', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Code must be reviewable. Obfuscation is prohibited.',
    matchers: [
      { id: 'packer-sig', type: 'regex', pattern: 'eval\\(function\\(p,a,c,k,e,d\\)', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' },
      { id: 'hex-storm', type: 'regex', pattern: '(\\\\x[0-9a-fA-F]{2}){10,}', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' },
      { id: 'control-flow-flattening', type: 'regex', pattern: 'while\\s*\\(\\s*!!\\[\\]\\s*\\)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' },
      { id: 'string-array-rotation', type: 'regex', pattern: '\\(function\\(_0x[a-f0-9]+,_0x[a-f0-9]+\\)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' },
      { id: 'anti-debug', type: 'regex', pattern: '(debugger|setInterval\\s*\\(\\s*function\\s*\\(\\)\\s*\\{\\s*debugger)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' }
    ]
  },
  // 6. LOCALHOST
  { ruleId: 'PROD-NO-LOCALHOST', name: 'Non-Production Endpoints', category: 'PRODUCTION_READINESS', reviewBucket: 'ACTION_REQUIRED', severity: 'MEDIUM', disposition: 'ACTION_REQUIRED', description: 'Remove localhost from production code.',
    matchers: [{ id: 'localhost-url', type: 'regex', pattern: 'https?:\\/\\/(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|.*\\.ngrok\\.io|.*\\.localtunnel\\.me)', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs,json}'], confidence: 'HIGH' }]
  },
  // 7. INSECURE STORAGE
  { ruleId: 'SEC-NO-SENSITIVE-TOKENS-IN-STORAGE', name: 'Insecure Token Storage', category: 'SECURITY', reviewBucket: 'ACTION_REQUIRED', severity: 'HIGH', disposition: 'ACTION_REQUIRED', description: 'Do not persist sensitive tokens in localStorage.',
    matchers: [
      { id: 'storage-set-token', type: 'regex', pattern: '(localStorage|sessionStorage)\\.setItem\\s*\\(\\s*[\'"`]([^\'"]*?(token|auth|key|secret)[^\'"]*?)[\'"`]', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' },
      { id: 'jwt-literal', type: 'regex', pattern: '\\beyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\b', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' }
    ]
  },
  // 8. URL HYGIENE
  { ruleId: 'NET-URL-HYGIENE', name: 'Insecure Protocols', category: 'NETWORK', reviewBucket: 'AUTO_REJECT', severity: 'HIGH', disposition: 'REJECTED', description: 'Disallow http://, ws://, javascript: protocols.',
    matchers: [{ id: 'http-usage', type: 'regex', pattern: '\\b(http:|ws:|javascript:)\\/\\/', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,html,css}'], confidence: 'MEDIUM', allowlistPatterns: ['http://www.w3.org', 'http://schema.org', 'http://localhost'] }]
  },
  // 9. UNSAFE HTML
  { ruleId: 'SEC-UNSAFE-HTML', name: 'Unsafe HTML Injection', category: 'SECURITY', reviewBucket: 'ACTION_REQUIRED', severity: 'HIGH', disposition: 'ACTION_REQUIRED', description: 'Avoid innerHTML and document.write.',
    matchers: [
      { id: 'doc-write', type: 'regex', pattern: 'document\\.write(ln)?\\s*\\(', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' },
      { id: 'inner-outer-html', type: 'regex', pattern: '\\.(innerHTML|outerHTML)\\s*=', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' },
      { id: 'insert-adjacent', type: 'regex', pattern: '\\.insertAdjacentHTML\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' }
    ]
  },
  // 10. SCRIPT INJECTION
  { ruleId: 'SEC-SCRIPT-INJECTION', name: 'Dynamic Script Injection', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Do not inject dynamic script tags.',
    matchers: [
      { id: 'script-src-assignment', type: 'regex', pattern: 'createElement\\([\'"]script[\'"]\\).*?\\.src\\s*=', flags: 'gs', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' },
      { id: 'script-tag-literal', type: 'regex', pattern: '<script[^>]+src=[\'"]https?:\\/\\/', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,html,mjs,cjs}'], confidence: 'MEDIUM' }
    ]
  },
  // 11. EXTERNAL IFRAMES
  { ruleId: 'IFRAME-EXTERNAL-SRC', name: 'Externally Hosted Iframe', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'HIGH', disposition: 'REJECTED', description: 'External iframes are allowed for Auth only.',
    matchers: [{ id: 'iframe-http-src', type: 'regex', pattern: '<iframe[^>]+src=[\'"](http|\\/\\/)', flags: 'i', fileGlobs: ['**/*.{html,js,ts,jsx,tsx}'], confidence: 'MEDIUM' }]
  },
  // 12. IFRAME SANDBOX
  { ruleId: 'IFRAME-SANDBOX', name: 'Weak Iframe Sandbox', category: 'SECURITY', reviewBucket: 'ACTION_REQUIRED', severity: 'HIGH', disposition: 'ACTION_REQUIRED', description: 'Iframe sandboxes must not allow top-navigation.',
    matchers: [{ id: 'allow-top-nav', type: 'regex', pattern: 'allow-top-navigation', flags: 'i', fileGlobs: ['**/*.{html,js,ts,jsx,tsx}'], confidence: 'HIGH' }]
  },
  // 13. POSTMESSAGE SECURITY
  { ruleId: 'IFRAME-MESSAGING', name: 'Insecure postMessage', category: 'SECURITY', reviewBucket: 'ACTION_REQUIRED', severity: 'MEDIUM', disposition: 'ACTION_REQUIRED', description: 'Wildcard targetOrigin is risky.',
    matchers: [{ id: 'postmessage-wildcard', type: 'regex', pattern: '\\.postMessage\\s*\\(.*?[\'"`]\\*[\'"`]', flags: 'gs', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM',
      conditionalOverrides: [{ pattern: '(token|auth|key|secret)', newSeverity: 'BLOCKER', newReviewBucket: 'AUTO_REJECT', note: 'Sending secrets via wildcard postMessage is a blocker.' }]
    }]
  },
  // 14. HARDWARE ACCESS
  { ruleId: 'SEC-WEBRTC-HARDWARE', name: 'Hardware Access (Mic/Cam)', category: 'PRIVACY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Accessing microphone, camera in Designer is prohibited.',
    matchers: [
      { id: 'get-user-media', type: 'regex', pattern: 'navigator\\.mediaDevices\\.(getUserMedia|getDisplayMedia|enumerateDevices)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' },
      { id: 'input-capture', type: 'regex', pattern: '<input[^>]+capture', flags: 'i', fileGlobs: ['**/*.{html,js,ts,jsx,tsx}'], confidence: 'MEDIUM' }
    ]
  },
  // 15. FINGERPRINTING
  { ruleId: 'PRIV-NO-FINGERPRINTING', name: 'Fingerprinting & Session Replay', category: 'PRIVACY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Session replay and fingerprinting are prohibited.',
    matchers: [
      { id: 'replay-libs', type: 'regex', pattern: '\\b(rrweb|FullStory|LogRocket|Hotjar|mixpanel)\\b', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs,json}'], confidence: 'MEDIUM' },
      { id: 'canvas-readback', type: 'regex', pattern: '(toDataURL|getImageData|toBlob)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'LOW' }
    ]
  },
  // 16. SILENT MUTATIONS
  { ruleId: 'UX-NO-SILENT-MUTATIONS', name: 'Silent Canvas Mutations', category: 'UX', reviewBucket: 'ACTION_REQUIRED', severity: 'MEDIUM', disposition: 'ACTION_REQUIRED', description: 'Modifications must be user-initiated.',
    matchers: [{ id: 'mutation-observer', type: 'regex', pattern: 'new\\s+MutationObserver', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'LOW' }]
  },
  // 17. FORCED REDIRECTS
  { ruleId: 'SEC-UNTRUSTED-REDIRECT', name: 'Forced/Untrusted Redirect', category: 'SECURITY', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Do not navigate the top frame.',
    matchers: [{ id: 'top-nav-assignment', type: 'regex', pattern: '(top|parent|window\\.top|window\\.parent)\\.location\\s*=', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'HIGH' }]
  },
  // 18. POPUPS
  { ruleId: 'UX-NO-POPUPS', name: 'Prohibited Popups', category: 'UX', reviewBucket: 'AUTO_REJECT', severity: 'BLOCKER', disposition: 'REJECTED', description: 'Do not spawn new windows/popups.',
    matchers: [{ id: 'window-open', type: 'regex', pattern: 'window\\.open\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], confidence: 'MEDIUM' }]
  },
];

// ============================================================================
// CONFIG & UTILS
// ============================================================================

interface ScanConfig { maxFileSizeBytes: number; maxTotalSizeBytes: number; maxFileCount: number; maxMatchesPerFile: number; textExtensions: string[]; ignorePatterns: string[]; }

const DEFAULT_CONFIG: ScanConfig = {
  maxFileSizeBytes: 5 * 1024 * 1024, maxTotalSizeBytes: 100 * 1024 * 1024, maxFileCount: 1000, maxMatchesPerFile: 100,
  textExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.html', '.htm', '.css', '.scss', '.less', '.json', '.xml', '.svg', '.md', '.txt', '.vue', '.svelte', '.astro'],
  ignorePatterns: ['node_modules/**', '.git/**', '*.min.js', '*.min.css', '*.map', '*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const formatBytes = (bytes: number) => { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]; };

// Expand brace patterns like {js,ts,tsx} into multiple patterns
const expandBraces = (pattern: string): string[] => {
  const braceMatch = pattern.match(/\{([^}]+)\}/);
  if (!braceMatch) return [pattern];
  const [fullMatch, inner] = braceMatch;
  const options = inner.split(',');
  const results: string[] = [];
  for (const opt of options) {
    const expanded = pattern.replace(fullMatch, opt.trim());
    results.push(...expandBraces(expanded)); // Recursively expand nested braces
  }
  return results;
};

const matchGlob = (path: string, pattern: string): boolean => {
  // First expand any brace patterns
  const expandedPatterns = expandBraces(pattern);
  for (const p of expandedPatterns) {
    // Escape dots first, then handle glob patterns
    let regexPattern = p
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{GLOBSTAR}}/g, '.*')
      .replace(/\?/g, '.');
    if (new RegExp(`^${regexPattern}$`).test(path)) return true;
  }
  return false;
};

const matchesAnyGlob = (path: string, globs?: string[]): boolean => !globs || globs.length === 0 || globs.some(g => matchGlob(path, g));
const isTextFile = (filename: string, config: ScanConfig) => config.textExtensions.includes('.' + filename.split('.').pop()?.toLowerCase());
const shouldIgnore = (path: string, config: ScanConfig) => config.ignorePatterns.some(p => matchGlob(path, p));

// ============================================================================
// ENHANCED SCANNING ENGINE
// ============================================================================

interface UnzippedFile { path: string; content: string; sizeBytes: number; isTextCandidate: boolean; isIgnored: boolean; tags: string[]; ext: string; }

function detectFileTags(path: string, content: string): string[] {
  const tags: string[] = [];
  const lower = path.toLowerCase();
  if (lower.endsWith('.min.js') || lower.endsWith('.min.css')) tags.push('MINIFIED_FILE');
  if (lower.endsWith('.map')) tags.push('SOURCE_MAP');
  if (lower.includes('.bundle.') || lower.includes('.chunk.')) tags.push('GENERATED_BUNDLE');
  if (lower.includes('vendor') || lower.includes('node_modules')) tags.push('VENDOR_DIR');
  if (lower.includes('test') || lower.includes('spec') || lower.includes('__tests__')) tags.push('TEST_FILE');
  if (content.length > 50000 && !content.includes('\n')) tags.push('MINIFIED_FILE');
  return tags;
}

async function processZipFile(file: File, config: ScanConfig, onProgress: (msg: string) => void): Promise<UnzippedFile[]> {
  if (file.size > config.maxTotalSizeBytes) throw new Error(`File too large: ${formatBytes(file.size)}`);
  onProgress('Reading ZIP file...');
  const zip = await JSZip.loadAsync(file);
  const entries = Object.entries(zip.files).filter(([_, f]) => !f.dir);
  if (entries.length > config.maxFileCount) throw new Error(`Too many files: ${entries.length}`);
  const results: UnzippedFile[] = [];
  let processed = 0;
  for (const [path, zipEntry] of entries) {
    processed++;
    if (processed % 50 === 0) onProgress(`Extracting files... ${processed}/${entries.length}`);
    const isTextCandidate = isTextFile(path, config);
    const isIgnored = shouldIgnore(path, config);
    let content = '';
    if (isTextCandidate && !isIgnored) { try { content = await zipEntry.async('string'); } catch { content = ''; } }
    const tags = detectFileTags(path, content);
    const ext = '.' + path.split('.').pop()?.toLowerCase();
    results.push({ path, content, sizeBytes: content.length, isTextCandidate, isIgnored, tags, ext });
  }
  return results;
}

function getLineCol(text: string, index: number) { const upToMatch = text.substring(0, index); const matches = upToMatch.match(/\n/g); const line = (matches ? matches.length : 0) + 1; const lastNewline = upToMatch.lastIndexOf('\n'); const col = index - lastNewline; return { line, col }; }

function getContextualSnippet(content: string, matchIndex: number, matchLength: number, contextLines = 3): string {
  if (!content) return "";
  let start = matchIndex, end = matchIndex + matchLength, linesBefore = 0, linesAfter = 0;
  while (start > 0 && linesBefore <= contextLines) { start--; if (content[start] === '\n') linesBefore++; }
  if (content[start] === '\n') start++;
  while (end < content.length && linesAfter <= contextLines) { if (content[end] === '\n') linesAfter++; end++; }
  return content.substring(start, end);
}

function scanFiles(files: UnzippedFile[], ruleset: ScanRule[], config: ScanConfig, onProgress: (msg: string) => void): Finding[] {
  const findings: Finding[] = [];
  const textFiles = files.filter(f => f.isTextCandidate && !f.isIgnored && f.content);
  let scanned = 0;
  for (const file of textFiles) {
    scanned++;
    if (scanned % 20 === 0) onProgress(`Scanning ${scanned}/${textFiles.length} files...`);
    let fileMatchCount = 0;
    for (const rule of ruleset) {
      for (const matcher of rule.matchers) {
        if (!matchesAnyGlob(file.path, matcher.fileGlobs)) continue;
        const regex = new RegExp(matcher.pattern, (matcher.flags || 'g'));
          regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(file.content)) !== null) {
          if (fileMatchCount >= config.maxMatchesPerFile) break;
          const index = match.index;
          const matchText = match[0];
          if (!matchText || matchText.length === 0) { regex.lastIndex++; continue; }
          
          // Allowlist check
          if (matcher.allowlistPatterns?.some(p => matchText.includes(p) || file.content.substring(Math.max(0, index - 50), index + matchText.length + 50).includes(p))) continue;
          
          const snippet = getContextualSnippet(file.content, index, matchText.length, 3);
          const { line, col } = getLineCol(file.content, index);
          
          // Location type detection
          let locationType: LocationType = 'CODE';
          const lowerPath = file.path.toLowerCase();
          if (file.tags.includes('SOURCE_MAP') || lowerPath.endsWith('.map')) locationType = 'SOURCE_MAP';
          else if (lowerPath.includes('test') || lowerPath.includes('spec')) locationType = 'TEST';
          else if (lowerPath.endsWith('.md') || lowerPath.includes('readme')) locationType = 'DOC';
          else if (file.ext === '.json') locationType = 'STRING';
          
          // Comment check
          const lineStart = file.content.lastIndexOf('\n', index) + 1;
          const lineEnd = file.content.indexOf('\n', index);
          const lineContent = file.content.substring(lineStart, lineEnd !== -1 ? lineEnd : file.content.length).trim();
          if (lineContent.startsWith('//') || lineContent.startsWith('*') || lineContent.startsWith('/*')) locationType = 'COMMENT';

          // Confidence adjustment
          let confidence = matcher.confidence || 'MEDIUM';
          let confidenceReason;
          if (file.tags.includes('MINIFIED_FILE') || file.tags.includes('GENERATED_BUNDLE')) { confidence = 'LOW'; confidenceReason = 'Generated/Minified Code'; }
          if (locationType === 'COMMENT' || locationType === 'DOC') { confidence = 'LOW'; confidenceReason = 'Comment/Doc Match'; }
          
          findings.push({ ruleId: rule.ruleId, matcherId: matcher.id, filePath: file.path, line, column: col, snippet, triggerToken: matchText.substring(0, 50), locationType, confidence, confidenceReason, tags: file.tags });
          fileMatchCount++;
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
    groups[finding.ruleId].count++;
    groups[finding.ruleId].items.push(finding);
    }
  const hasBlocker = Object.values(groups).some(g => g.rule.reviewBucket === 'AUTO_REJECT');
  const hasActionRequired = Object.values(groups).some(g => g.rule.reviewBucket === 'ACTION_REQUIRED');
  let verdict: Verdict = 'PASS';
  const verdictReasons: string[] = [];
  if (hasBlocker) { verdict = 'REJECTED'; verdictReasons.push('Contains auto-reject issues'); }
  else if (hasActionRequired) { verdict = 'ACTION_REQUIRED'; verdictReasons.push('Contains issues requiring manual review'); }
  return { scanReportVersion: '2.0.0', runId: generateId(), createdAt: new Date().toISOString(), policyMetadata: { rulesetVersion: '1.3.0-checklist-complete', configVersion: '1.0.0' }, verdict, verdictReasons, bundleSummary: { fileCount: files.length, totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0), scannedFileCount: files.filter(f => f.isTextCandidate && !f.isIgnored).length, skippedFileCount: files.filter(f => f.isIgnored).length }, findings: groups };
}

// ============================================================================
// AI ANALYSIS WITH CHECKLIST CONTEXT
// ============================================================================

const CHECKLIST_SUMMARY = `WEBFLOW MARKETPLACE SECURITY CHECKLIST SUMMARY:
Auto-Reject: eval(), new Function(), host DOM access, hardcoded secrets (sk_live_, AKIA, ghp_, PEM keys), obfuscation, external iframes for non-auth, hardware access, session replay libraries, forced redirects, unauthorized popups.
Action Required: localhost URLs, sensitive tokens in storage, innerHTML/document.write, insecure protocols (http://), wildcard postMessage, silent mutations, weak iframe sandboxes.
Advisory: External API calls (fetch/XHR), WebSocket usage, third-party tracking scripts.`;

async function analyzeWithAi(report: ScanReport, apiKey: string): Promise<AiAnalysisResult | null> {
  if (!apiKey) return null;
  const prompt = `You are a Webflow Marketplace Security Review Assistant. Analyze this scan report against the official checklist.

${CHECKLIST_SUMMARY}

SCAN SUMMARY:
- Files scanned: ${report.bundleSummary.scannedFileCount}
- Total findings: ${Object.values(report.findings).reduce((sum, g) => sum + g.count, 0)}
- Current verdict: ${report.verdict}

FINDINGS BY RULE:
${Object.values(report.findings).map(g => `- ${g.rule.ruleId} (${g.rule.name}): ${g.count} occurrences - ${g.rule.severity}`).join('\n')}

SAMPLE FINDINGS:
${Object.values(report.findings).slice(0, 5).flatMap(g => g.items.slice(0, 2).map(i => `  ${i.filePath}:${i.line} - ${i.triggerToken} (${i.confidence} confidence, ${i.locationType})`)).join('\n')}

Respond with ONLY a JSON object:
{"reviewStatusRecommendation": "MANUAL_REVIEW_REQUIRED" | "LOOKS_GOOD", "missedRisks": [{"title": "", "confidence": "HIGH"|"MEDIUM"|"LOW", "whyItMatters": "", "evidence": []}], "suggestedRuleAdditions": [{"proposedRuleName": "", "rationale": "", "suggestedRegexOrAstIdea": ""}], "suggestedNoiseReductions": [{"currentIssue": "", "proposal": ""}], "questionsForReviewer": []}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } }) });
    if (!response.ok) { const errorText = await response.text(); throw new Error(`API error ${response.status}: ${errorText.substring(0, 200)}`); }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as AiAnalysisResult;
    return null;
  } catch { return null; }
}

// ============================================================================
// INDEXEDDB & EMAIL
// ============================================================================

interface ScanHistoryEntry { id: string; fileName: string; scanDate: string; verdict: Verdict; findingCount: number; fileCount: number; }
const DB_NAME = 'bundle-scanner-v2', DB_VERSION = 1, STORE_NAME = 'scan-history';
function openDatabase(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, DB_VERSION); request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result); request.onupgradeneeded = (event) => { const db = (event.target as IDBOpenDBRequest).result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' }); }; }); }
async function saveToHistory(entry: ScanHistoryEntry): Promise<void> { const db = await openDatabase(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).put(entry); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }
async function getHistory(): Promise<ScanHistoryEntry[]> { const db = await openDatabase(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readonly'); const request = tx.objectStore(STORE_NAME).getAll(); request.onsuccess = () => { const entries = request.result as ScanHistoryEntry[]; entries.sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()); resolve(entries); }; request.onerror = () => reject(request.error); }); }
async function clearHistory(): Promise<void> { const db = await openDatabase(); return new Promise((resolve, reject) => { const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).clear(); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); }

function generateRejectionEmail(report: ScanReport): string {
  const blockers = Object.values(report.findings).filter(g => g.rule.reviewBucket === 'AUTO_REJECT');
  const actionItems = Object.values(report.findings).filter(g => g.rule.reviewBucket === 'ACTION_REQUIRED');
  let email = `Subject: Webflow Marketplace App Review - Action Required\n\nHello,\n\nThank you for submitting your app. We've identified issues:\n\n`;
  if (blockers.length > 0) {
    email += `## Critical Issues (Must Fix)\n\n`;
    for (const g of blockers) {
      const remediation = REMEDIATION_REGISTRY[g.rule.ruleId];
      email += `### ${g.rule.name} (${g.count} occurrences)\n${g.rule.description}\n`;
      if (remediation) email += `**Why it matters:** ${remediation.whyItMatters}\n**How to fix:** ${remediation.howToFix}\n`;
      email += '\n';
    }
  }
  if (actionItems.length > 0) {
    email += `## Items Requiring Review\n\n`;
    for (const g of actionItems) email += `### ${g.rule.name}\n${g.rule.description}\nFound ${g.count} occurrence(s). Please provide documentation.\n\n`;
    }
  email += `---\nPlease address these issues and resubmit.\n\nWebflow Marketplace Review Team`;
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
  Object.values(report.findings).forEach(g => {
    if (g.count === 0) return;
    if (g.rule.reviewBucket === 'AUTO_REJECT' || g.rule.severity === 'BLOCKER') blockerCount += g.count;
    else if (g.rule.reviewBucket === 'ACTION_REQUIRED' || g.rule.severity === 'HIGH') reviewCount += g.count;
    else infoCount += g.count;
  });
  return (
    <section className="bg-white p-6 rounded-xl border shadow-sm mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div><h2 className="text-xl font-bold text-gray-900">Triage Dashboard</h2><p className="text-sm text-gray-500">60-second review summary</p></div>
        <div className={`px-4 py-2 rounded-lg font-bold text-sm border whitespace-nowrap ${blockerCount > 0 ? 'bg-red-50 text-red-700 border-red-200' : reviewCount > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
          {blockerCount > 0 ? "RECOMMENDATION: REJECT" : reviewCount > 0 ? "RECOMMENDATION: MANUAL REVIEW" : "RECOMMENDATION: LIKELY PASS"}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-100"><div className="p-2 bg-white rounded-full shadow-sm shrink-0"><XCircle className="w-6 h-6 text-red-600" /></div><div><div className="text-2xl font-bold text-red-900">{blockerCount}</div><div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Auto-Reject</div></div></div>
        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100"><div className="p-2 bg-white rounded-full shadow-sm shrink-0"><AlertTriangle className="w-6 h-6 text-yellow-600" /></div><div><div className="text-2xl font-bold text-yellow-900">{reviewCount}</div><div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Review Needed</div></div></div>
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-100"><div className="p-2 bg-white rounded-full shadow-sm shrink-0"><CheckCircle className="w-6 h-6 text-green-600" /></div><div><div className="text-2xl font-bold text-green-900">{infoCount}</div><div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Informational</div></div></div>
      </div>
      <button onClick={onDraftEmail} className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-black transition-all text-sm font-medium"><Mail className="w-4 h-4" /> Copy Rejection Email Draft</button>
    </section>
  );
};

const FindingCard: React.FC<{ group: FindingGroup }> = ({ group }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { rule, count, items } = group;
  const remediation = REMEDIATION_REGISTRY[rule.ruleId];
  const getSeverityColor = (sev: string) => sev === 'BLOCKER' ? 'bg-red-50 text-red-900 border-red-200' : sev === 'HIGH' ? 'bg-orange-50 text-orange-900 border-orange-200' : 'bg-blue-50 text-blue-900 border-blue-200';
  const Icon = rule.severity === 'BLOCKER' ? ShieldAlert : rule.severity === 'HIGH' ? AlertOctagon : Info;

  return (
    <article className="border rounded-xl mb-4 overflow-hidden shadow-sm bg-white">
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
          {/* Educational Content */}
          {remediation ? (
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-2"><Info className="w-4 h-4" /> Why This Matters</h4>
                <p className="text-sm text-blue-900">{remediation.whyItMatters}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-green-800"><CheckCircle className="w-4 h-4" /> How to Fix</h4>
                  {remediation.estimatedFixTime && <span className="text-xs font-medium text-green-700 flex items-center gap-1"><Clock className="w-3 h-3" /> {remediation.estimatedFixTime}</span>}
                </div>
                <p className="text-sm text-green-900 mb-3">{remediation.howToFix}</p>
                {(remediation.badExample || remediation.goodExample) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {remediation.badExample && <div className="border border-red-200 rounded overflow-hidden"><div className="bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800 flex items-center gap-2 border-b border-red-200"><XCircle className="w-3 h-3" /> Before (Incorrect)</div><div className="bg-red-50 p-3 font-mono text-xs text-red-900 whitespace-pre-wrap">{remediation.badExample}</div></div>}
                    {remediation.goodExample && <div className="border border-green-200 rounded overflow-hidden"><div className="bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800 flex items-center gap-2 border-b border-green-200"><CheckCircle className="w-3 h-3" /> After (Correct)</div><div className="bg-green-50 p-3 font-mono text-xs text-green-900 whitespace-pre-wrap">{remediation.goodExample}</div></div>}
            </div>
          )}
                </div>
              {remediation.commonMistake && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                  <div><h4 className="text-sm font-bold text-yellow-800 mb-1">Common Mistake</h4><p className="text-sm text-yellow-900">{remediation.commonMistake}</p></div>
                </div>
              )}
              {remediation.officialDocs && remediation.officialDocs.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500 mb-3"><BookOpen className="w-3 h-3" /> Official Policy Reference</h4>
                  <div className="space-y-2">
                    {remediation.officialDocs.map((doc, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">{doc.title}</span>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-medium">Read Docs <ExternalLink className="w-3 h-3" /></a>
                        </div>
                        {doc.quote && <blockquote className="text-xs italic text-gray-600 border-l-2 border-gray-300 pl-2 mt-1">"{doc.quote}"</blockquote>}
              </div>
            ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4"><p className="text-sm text-gray-700">{rule.description}</p></div>
          )}
          {/* Findings List */}
          <div className="bg-gray-50 border-t border-gray-100 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2"><ShieldAlert className="w-3 h-3" /> Detected Violations ({count})</h4>
            <div className="space-y-3">
              {items.slice(0, 5).map((item, idx) => (
                <div key={idx} className="bg-white rounded border p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-semibold text-gray-700">{item.filePath}:{item.line}</span>
                    {item.confidence === 'LOW' && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Low Confidence</span>}
                    {item.tags.includes('VENDOR_DIR') && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">Vendor Library</span>}
                    {item.locationType !== 'CODE' && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">{item.locationType}</span>}
                  </div>
                  <pre className="text-xs bg-gray-50 p-2 rounded font-mono overflow-x-auto whitespace-pre-wrap text-gray-800">{item.snippet}</pre>
                </div>
              ))}
              {items.length > 5 && <p className="text-xs text-gray-500 text-center bg-gray-100 py-2 rounded">+ {items.length - 5} more findings hidden</p>}
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

  const handleAnalyze = async () => { setAnalyzing(true); setError(null); try { const data = await analyzeWithAi(report, apiKey); if (data) setResult(data); else setError('Failed to get AI analysis'); } catch (err: any) { setError(err.message); } finally { setAnalyzing(false); } };

  if (!result && !analyzing && !error) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-white p-4 rounded-xl border border-purple-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-600" /><h3 className="font-bold text-purple-900 text-sm">AI Suggestions</h3></div>
          <button onClick={handleAnalyze} disabled={!apiKey} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"><Bot className="w-3 h-3" /> {apiKey ? 'Analyze with AI' : 'Add API Key'}</button>
        </div>
        <p className="mt-2 text-xs text-purple-800 opacity-80">Cross-references findings against official checklist.</p>
    </div>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between">
        <div className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-600" /><h3 className="font-bold text-purple-900 text-sm">AI Suggestions</h3><span className="ml-2 text-[10px] uppercase font-bold tracking-wider bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">Advisory Only</span></div>
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-purple-400 hover:text-purple-600">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
      </div>
      {isExpanded && (
        <div className="p-4 space-y-4">
          {analyzing && <div className="flex flex-col items-center justify-center py-8 text-purple-600 gap-2"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-xs font-medium">Analyzing with Gemini 2.0 Flash...</span></div>}
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200"><strong>Error:</strong> {error}<button onClick={handleAnalyze} className="block mt-2 text-blue-600 underline">Retry</button></div>}
          {result && (
            <>
              <div className={`p-3 rounded-lg flex items-center gap-3 border ${result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                {result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                <div><div className="text-xs font-bold uppercase">AI Recommendation</div><div className="text-sm font-semibold">{result.reviewStatusRecommendation === 'MANUAL_REVIEW_REQUIRED' ? 'Manual Review Required' : 'Looks Good'}</div></div>
              </div>
              {result.missedRisks.length > 0 && <div><h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2"><ShieldAlert className="w-4 h-4 text-orange-500" /> Potential Missed Risks</h4>{result.missedRisks.map((risk, idx) => <div key={idx} className="ml-2 pl-4 border-l-2 border-orange-200 py-2"><h5 className="text-sm font-semibold text-gray-800">{risk.title}</h5><p className="text-xs text-gray-600 mt-1">{risk.whyItMatters}</p></div>)}</div>}
              {result.suggestedRuleAdditions.length > 0 && <div><h4 className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wide mb-2"><Wrench className="w-4 h-4 text-blue-500" /> Rule Suggestions</h4>{result.suggestedRuleAdditions.map((rule, idx) => <div key={idx} className="ml-2 pl-4 border-l-2 border-blue-200 py-2"><h5 className="text-sm font-semibold text-gray-800">{rule.proposedRuleName}</h5><p className="text-xs text-gray-600 mt-1">{rule.rationale}</p></div>)}</div>}
              {result.questionsForReviewer.length > 0 && <div><h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Reviewer Questions</h4><ul className="ml-6 list-disc text-xs text-gray-600 space-y-1">{result.questionsForReviewer.map((q, idx) => <li key={idx}>{q}</li>)}</ul></div>}
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

interface BundleScannerProps { geminiApiKey: string; showHistory: boolean; maxFileSizeMB: number; }

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
      const findings = scanFiles(files, DEFAULT_RULESET, config, setProgress);
      setProgress('Generating report...');
      const scanReport = generateReport(findings, DEFAULT_RULESET, files);
      setReport(scanReport);
      if (showHistory) { await saveToHistory({ id: scanReport.runId, fileName: file.name, scanDate: scanReport.createdAt, verdict: scanReport.verdict, findingCount: Object.values(scanReport.findings).reduce((sum, g) => sum + g.count, 0), fileCount: scanReport.bundleSummary.fileCount }); setHistory(await getHistory()); }
    } catch (err: any) { setError(err.message || 'An unknown error occurred.'); }
    finally { setIsScanning(false); setProgress(''); }
  };

  const handleReset = () => { setFile(null); setReport(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleDraftEmail = () => { if (report) { navigator.clipboard.writeText(generateRejectionEmail(report)); alert('Rejection email copied to clipboard!'); } };
  const handleClearHistory = async () => { await clearHistory(); setHistory([]); };

  const groupedFindings = report ? {
    blockers: Object.values(report.findings).filter(g => g.count > 0 && (g.rule.severity === 'BLOCKER' || g.rule.reviewBucket === 'AUTO_REJECT')),
    review: Object.values(report.findings).filter(g => g.count > 0 && (g.rule.severity === 'HIGH' || g.rule.reviewBucket === 'ACTION_REQUIRED') && g.rule.reviewBucket !== 'AUTO_REJECT' && g.rule.severity !== 'BLOCKER'),
    info: Object.values(report.findings).filter(g => g.count > 0 && g.rule.severity !== 'BLOCKER' && g.rule.severity !== 'HIGH' && g.rule.reviewBucket !== 'AUTO_REJECT' && g.rule.reviewBucket !== 'ACTION_REQUIRED')
  } : { blockers: [], review: [], info: [] };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">WF</div>
            <h1 className="font-semibold text-lg hidden md:block">Marketplace Bundle Scanner <span className="text-gray-400 font-normal text-sm">V2.0</span></h1>
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
        {activeTab === 'scan' ? (
          <div className="space-y-6 order-2 md:order-1">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <h2 className="font-bold mb-4 flex items-center gap-2 text-gray-800"><FileUp className="w-5 h-5 text-blue-600" /> Upload Bundle</h2>
              {!report ? (
                <div className="space-y-4">
                  <input ref={fileInputRef} type="file" accept=".zip" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                  <p className="text-xs text-gray-500">Select a .zip file (Max {maxFileSizeMB}MB unzipped).</p>
                  <button onClick={handleScan} disabled={!file || isScanning} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2">{isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run Scan</button>
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
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Scanner Info</h3>
              <p className="text-xs text-gray-600"><strong>Version:</strong> 2.0.0</p>
              <p className="text-xs text-gray-600"><strong>Rules:</strong> {DEFAULT_RULESET.length} active</p>
              <p className="text-xs text-gray-600"><strong>Ruleset:</strong> 1.3.0-checklist-complete</p>
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

        <div className="space-y-6 order-1 md:order-2">
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">Scan History</h2>
              {history.length === 0 ? <p className="text-gray-500 text-center py-8">No scans yet</p> : (
                          <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
  description: 'Webflow Marketplace bundle security scanner with 18 rules, remediation registry, and AI analysis',
  group: 'Marketplace Tools',
  props: {
    geminiApiKey: props.String({ name: 'Gemini API Key', defaultValue: '', tooltip: 'Google Gemini API key for AI-powered analysis (optional)' }),
    showHistory: props.Boolean({ name: 'Show History', defaultValue: true, tooltip: 'Enable scan history tab' }),
    maxFileSizeMB: props.Number({ name: 'Max File Size (MB)', defaultValue: 100, tooltip: 'Maximum allowed ZIP file size' }),
  },
});
