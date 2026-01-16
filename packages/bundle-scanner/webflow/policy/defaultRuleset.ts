import type { Ruleset } from '../types';

const defaultRuleset: Ruleset = {
  schemaVersion: 'wf-marketplace-scanner-ruleset@1.0.0',
  rulesetVersion: '1.3.0-checklist-complete',
  generatedAt: '2026-01-16T14:00:00Z',
  rules: [
    // 1. DYNAMIC CODE EXECUTION
    {
      ruleId: 'SEC-NO-DCE',
      name: 'Dynamic Code Execution',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Disallow runtime compilation/execution of JavaScript (eval, new Function, string timers).',
      matchers: [
        { id: 'eval-call', type: 'regex', pattern: '\\beval\\s*\\(', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['eval('], confidence: 'HIGH' },
        { id: 'new-function', type: 'regex', pattern: '\\bnew\\s+Function\\s*\\(', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['new Function'], confidence: 'HIGH' },
        { id: 'string-timer', type: 'regex', pattern: '(setTimeout|setInterval)\\s*\\(\\s*[\'"`]', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['setTimeout', 'setInterval'], confidence: 'MEDIUM' }
      ]
    },
    // 2. HOST DOM ACCESS
    {
      ruleId: 'SEC-NO-HOST-DOM',
      name: 'Unauthorized Host DOM Access',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Do not access parent/top document or host UI (sandbox escape).',
      matchers: [
        { id: 'parent-doc-access', type: 'regex', pattern: '(parent|top|window\\.parent|window\\.top)\\.document', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['parent.document', 'top.document'], confidence: 'HIGH' },
        { id: 'frame-owner', type: 'regex', pattern: 'frameElement\\.(ownerDocument|contentWindow)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['frameElement'], confidence: 'HIGH' }
      ]
    },
    // 3. EXTERNAL EGRESS
    {
      ruleId: 'NET-EXTERNAL-EGRESS',
      name: 'External API Calls',
      category: 'NETWORK',
      reviewBucket: 'NEEDS_EXPLANATION',
      severity: 'MEDIUM',
      disposition: 'INFO',
      description: 'Review third-party data egress.',
      matchers: [
        { id: 'fetch-xhr', type: 'regex', pattern: '(\\bfetch\\s*\\(|new\\s+XMLHttpRequest)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['fetch', 'XMLHttpRequest'], confidence: 'LOW' }
      ]
    },
    // 4. HARDCODED SECRETS
    {
      ruleId: 'SEC-NO-CLIENT-SECRETS',
      name: 'Hardcoded API Secrets',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Zero tolerance for hardcoded keys (Stripe, AWS, Slack, GitHub, PEM keys).',
      matchers: [
        { id: 'aws-keys', type: 'regex', pattern: '\\bAKIA[0-9A-Z]{16}\\b', flags: 'g', fileGlobs: ['**/*'], triggerTokens: ['AKIA'], confidence: 'HIGH' },
        { id: 'stripe-slack-keys', type: 'regex', pattern: '\\b(sk_live_[0-9a-zA-Z]+|xox[baprs]-[0-9A-Za-z\\-]{10,})\\b', flags: 'g', fileGlobs: ['**/*'], triggerTokens: ['sk_live', 'xox'], confidence: 'HIGH' },
        { id: 'github-tokens', type: 'regex', pattern: '\\b(ghp|gho|ghs)_[A-Za-z0-9]{36}\\b', flags: 'g', fileGlobs: ['**/*'], triggerTokens: ['ghp_', 'gho_', 'ghs_'], confidence: 'HIGH' },
        { id: 'pem-private-key', type: 'regex', pattern: '-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----', flags: 'g', fileGlobs: ['**/*'], triggerTokens: ['-----BEGIN'], confidence: 'HIGH' },
        { id: 'google-api-key', type: 'regex', pattern: '\\bAIza[0-9A-Za-z\\-_]{35}\\b', flags: 'g', fileGlobs: ['**/*'], triggerTokens: ['AIza'], confidence: 'MEDIUM', notes: 'Verify if restricted.' },
        { id: 'generic-secret-assignment', type: 'regex', pattern: '(clientSecret|apiSecret|privateKey)\\s*[:=]\\s*[\'"`][A-Za-z0-9_\\-]{20,}[\'"`]', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['clientSecret', 'apiSecret'], confidence: 'MEDIUM' }
      ]
    },
    // 5. OBFUSCATION
    {
      ruleId: 'SEC-CODE-TRANSPARENCY',
      name: 'Obfuscated Source Code',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Code must be reviewable. Obfuscation (packers, anti-debug, flattening) is prohibited.',
      matchers: [
        { id: 'packer-sig', type: 'regex', pattern: 'eval\\(function\\(p,a,c,k,e,d\\)', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['eval(function(p,a,c,k,e,d)'], confidence: 'HIGH' },
        { id: 'hex-storm', type: 'regex', pattern: '(\\\\x[0-9a-fA-F]{2}){10,}', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['\\x'], confidence: 'HIGH' },
        { id: 'control-flow-flattening', type: 'regex', pattern: 'while\\s*\\(\\s*!!\\[\\]\\s*\\)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['while(!![])'], confidence: 'HIGH' },
        { id: 'string-array-rotation', type: 'regex', pattern: '\\(function\\(_0x[a-f0-9]+,_0x[a-f0-9]+\\)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['_0x'], confidence: 'MEDIUM' },
        { id: 'anti-debug', type: 'regex', pattern: '(debugger|setInterval\\s*\\(\\s*function\\s*\\(\\)\\s*\\{\\s*debugger)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['debugger'], confidence: 'MEDIUM' }
      ]
    },
    // 6. LOCALHOST
    {
      ruleId: 'PROD-NO-LOCALHOST',
      name: 'Non-Production Endpoints',
      category: 'PRODUCTION_READINESS',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'MEDIUM',
      disposition: 'ACTION_REQUIRED',
      description: 'Remove localhost, 127.0.0.1, and tunnels from production code.',
      matchers: [
        { id: 'localhost-url', type: 'regex', pattern: 'https?:\\/\\/(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0|.*\\.ngrok\\.io|.*\\.localtunnel\\.me)', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs,json}'], triggerTokens: ['localhost', '127.0.0.1', 'ngrok'], confidence: 'HIGH' }
      ]
    },
    // 7. INSECURE STORAGE
    {
      ruleId: 'SEC-NO-SENSITIVE-TOKENS-IN-STORAGE',
      name: 'Insecure Token Storage',
      category: 'SECURITY',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'HIGH',
      disposition: 'ACTION_REQUIRED',
      description: 'Do not persist sensitive tokens (JWT, access_token) in localStorage.',
      matchers: [
        { id: 'storage-set-token', type: 'regex', pattern: '(localStorage|sessionStorage)\\.setItem\\s*\\(\\s*[\'"`]([^\'"]*?(token|auth|key|secret)[^\'"]*?)[\'"`]', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['setItem'], confidence: 'MEDIUM' },
        { id: 'jwt-literal', type: 'regex', pattern: '\\beyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\b', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['eyJ'], confidence: 'MEDIUM' }
      ]
    },
    // 8. URL HYGIENE
    {
      ruleId: 'NET-URL-HYGIENE',
      name: 'Insecure Protocols',
      category: 'NETWORK',
      reviewBucket: 'AUTO_REJECT',
      severity: 'HIGH',
      disposition: 'REJECTED',
      description: 'Disallow http://, ws://, javascript: protocols. Exception for W3C/Schema URIs.',
      matchers: [
        { id: 'http-usage', type: 'regex', pattern: '\\b(http:|ws:|javascript:)\\/\\/', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,html,css}'], triggerTokens: ['http:', 'ws:', 'javascript:'], confidence: 'MEDIUM', allowlistPatterns: ['http://www.w3.org', 'http://schema.org', 'http://localhost', 'http://www.google.com'] }
      ]
    },
    // 9. UNSAFE HTML
    {
      ruleId: 'SEC-UNSAFE-HTML',
      name: 'Unsafe HTML Injection',
      category: 'SECURITY',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'HIGH',
      disposition: 'ACTION_REQUIRED',
      description: 'Avoid document.write, innerHTML, outerHTML interactions that bypass React/safe DOM methods.',
      matchers: [
        { id: 'doc-write', type: 'regex', pattern: 'document\\.write(ln)?\\s*\\(', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['document.write'], confidence: 'HIGH' },
        { id: 'inner-outer-html', type: 'regex', pattern: '\\.(innerHTML|outerHTML)\\s*=', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['.innerHTML', '.outerHTML'], confidence: 'MEDIUM' },
        { id: 'insert-adjacent', type: 'regex', pattern: '\\.insertAdjacentHTML\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['insertAdjacentHTML'], confidence: 'MEDIUM' }
      ]
    },
    // 10. SCRIPT INJECTION
    {
      ruleId: 'SEC-SCRIPT-INJECTION',
      name: 'Dynamic Script Injection',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Do not inject dynamic script tags with remote sources.',
      matchers: [
        { id: 'script-src-assignment', type: 'regex', pattern: 'createElement\\([\'"]script[\'"]\\).*?\\.src\\s*=', flags: 'gs', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['createElement'], confidence: 'MEDIUM' },
        { id: 'script-tag-literal', type: 'regex', pattern: '<script[^>]+src=[\'"]https?:\\/\\/', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,html,mjs,cjs}'], triggerTokens: ['<script'], confidence: 'MEDIUM' }
      ]
    },
    // 11. EXTERNAL IFRAMES
    {
      ruleId: 'IFRAME-EXTERNAL-SRC',
      name: 'Externally Hosted Iframe',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'HIGH',
      disposition: 'REJECTED',
      description: 'External iframes are allowed for Auth only. Remote UI loading is prohibited.',
      matchers: [
        { id: 'iframe-http-src', type: 'regex', pattern: '<iframe[^>]+src=[\'"](http|\\/\\/)', flags: 'i', fileGlobs: ['**/*.{html,js,ts,jsx,tsx}'], triggerTokens: ['<iframe'], confidence: 'MEDIUM' }
      ]
    },
    // 12. IFRAME SANDBOX
    {
      ruleId: 'IFRAME-SANDBOX',
      name: 'Weak Iframe Sandbox',
      category: 'SECURITY',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'HIGH',
      disposition: 'ACTION_REQUIRED',
      description: 'Iframe sandboxes must not allow top-navigation or popup escapes.',
      matchers: [
        { id: 'allow-top-nav', type: 'regex', pattern: 'allow-top-navigation', flags: 'i', fileGlobs: ['**/*.{html,js,ts,jsx,tsx}'], triggerTokens: ['allow-top-navigation'], confidence: 'HIGH' }
      ]
    },
    // 13. POSTMESSAGE SECURITY
    {
      ruleId: 'IFRAME-MESSAGING',
      name: 'Insecure postMessage',
      category: 'SECURITY',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'MEDIUM',
      disposition: 'ACTION_REQUIRED',
      description: 'Wildcard targetOrigin (*) is risky, especially for auth.',
      matchers: [
        {
          id: 'postmessage-wildcard',
          type: 'regex',
          pattern: '\\.postMessage\\s*\\(.*?[\'"`]\\*[\'"`]',
          flags: 'gs',
          fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'],
          triggerTokens: ['postMessage'],
          confidence: 'MEDIUM',
          conditionalOverrides: [
            { pattern: '(token|auth|key|secret)', newSeverity: 'BLOCKER', newReviewBucket: 'AUTO_REJECT', newDisposition: 'REJECTED', note: 'Sending secrets via wildcard postMessage is a blocker.' }
          ]
        }
      ]
    },
    // 14. HARDWARE ACCESS
    {
      ruleId: 'SEC-WEBRTC-HARDWARE',
      name: 'Hardware Access (Mic/Cam)',
      category: 'PRIVACY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Accessing microphone, camera, or screen capture in Designer is prohibited.',
      matchers: [
        { id: 'get-user-media', type: 'regex', pattern: 'navigator\\.mediaDevices\\.(getUserMedia|getDisplayMedia|enumerateDevices)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['getUserMedia', 'getDisplayMedia', 'enumerateDevices'], confidence: 'HIGH' },
        { id: 'input-capture', type: 'regex', pattern: '<input[^>]+capture', flags: 'i', fileGlobs: ['**/*.{html,js,ts,jsx,tsx}'], triggerTokens: ['capture'], confidence: 'MEDIUM' }
      ]
    },
    // 15. FINGERPRINTING
    {
      ruleId: 'PRIV-NO-FINGERPRINTING',
      name: 'Fingerprinting & Session Replay',
      category: 'PRIVACY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Session replay (rrweb, FullStory) and fingerprinting are prohibited.',
      matchers: [
        { id: 'replay-libs', type: 'regex', pattern: '\\b(rrweb|FullStory|LogRocket|Hotjar|mixpanel)\\b', flags: 'i', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs,json}'], triggerTokens: ['rrweb', 'FullStory'], confidence: 'MEDIUM' },
        { id: 'canvas-readback', type: 'regex', pattern: '(toDataURL|getImageData|toBlob)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['toDataURL', 'getImageData'], confidence: 'LOW', notes: 'Verify this is not used for persistent ID generation.' }
      ]
    },
    // 16. SILENT MUTATIONS
    {
      ruleId: 'UX-NO-SILENT-MUTATIONS',
      name: 'Silent Canvas Mutations',
      category: 'UX',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'MEDIUM',
      disposition: 'ACTION_REQUIRED',
      description: 'Modifications must be user-initiated. No background loops/observers writing to canvas.',
      matchers: [
        { id: 'mutation-observer', type: 'regex', pattern: 'new\\s+MutationObserver', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['MutationObserver'], confidence: 'LOW' }
      ]
    },
    // 17. FORCED REDIRECTS
    {
      ruleId: 'SEC-UNTRUSTED-REDIRECT',
      name: 'Forced/Untrusted Redirect',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Do not navigate the top frame or force redirects away from Designer.',
      matchers: [
        { id: 'top-nav-assignment', type: 'regex', pattern: '(top|parent|window\\.top|window\\.parent)\\.location\\s*=', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['top.location', 'parent.location'], confidence: 'HIGH' }
      ]
    },
    // 18. POPUPS
    {
      ruleId: 'UX-NO-POPUPS',
      name: 'Prohibited Popups',
      category: 'UX',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Do not spawn new windows/popups. Use in-panel modals.',
      matchers: [
        { id: 'window-open', type: 'regex', pattern: 'window\\.open\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['window.open'], confidence: 'MEDIUM', notes: 'Allowed only for user-initiated docs/auth with _blank.' }
      ]
    }
  ]
};

export default defaultRuleset;
