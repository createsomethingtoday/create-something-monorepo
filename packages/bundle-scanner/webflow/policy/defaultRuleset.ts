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
    },
    // ============================================================
    // NEW RULES FROM CORTEX v4.0
    // ============================================================
    // 19. CUSTOM CODE INJECTION (consolidates SEC-UNSAFE-HTML + SEC-SCRIPT-INJECTION)
    {
      ruleId: 'SEC-CUSTOM-CODE-INJECTION',
      name: 'Custom Code Injection',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Detects remote script loaders, innerHTML with script content, and custom_code:write patterns.',
      matchers: [
        { id: 'doc-write', type: 'regex', pattern: 'document\\.write(ln)?\\s*\\(', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['document.write'], confidence: 'HIGH' },
        { id: 'innerHTML-script', type: 'regex', pattern: '\\.innerHTML\\s*=\\s*[\'"`].*<script', flags: 'gis', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['innerHTML', '<script'], confidence: 'HIGH' },
        { id: 'outerHTML-script', type: 'regex', pattern: '\\.outerHTML\\s*=\\s*[\'"`].*<script', flags: 'gis', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['outerHTML', '<script'], confidence: 'HIGH' },
        { id: 'insertAdjacentHTML', type: 'regex', pattern: '\\.insertAdjacentHTML\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['insertAdjacentHTML'], confidence: 'MEDIUM' },
        { id: 'script-src-assignment', type: 'regex', pattern: 'createElement\\([\'"]script[\'"]\\).*?\\.src\\s*=', flags: 'gs', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['createElement'], confidence: 'MEDIUM' },
        { id: 'script-tag-literal', type: 'regex', pattern: '<script[^>]+src=[\'"]https?:\\/\\/', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,html,mjs,cjs}'], triggerTokens: ['<script'], confidence: 'MEDIUM' }
      ]
    },
    // 20. PROTOTYPE POLLUTION
    {
      ruleId: 'SEC-PROTO-POLLUTION',
      name: 'Prototype Pollution Prevention',
      category: 'SECURITY',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'HIGH',
      disposition: 'ACTION_REQUIRED',
      description: 'Detects prototype pollution patterns that modify Object.prototype, Array.prototype, or other built-ins.',
      matchers: [
        { id: 'proto-assignment', type: 'regex', pattern: '__proto__\\s*=', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['__proto__'], confidence: 'HIGH' },
        { id: 'object-prototype-mod', type: 'regex', pattern: 'Object\\.prototype\\s*\\[', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['Object.prototype'], confidence: 'HIGH' },
        { id: 'array-prototype-mod', type: 'regex', pattern: 'Array\\.prototype\\s*\\[', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['Array.prototype'], confidence: 'HIGH' },
        { id: 'function-prototype-mod', type: 'regex', pattern: 'Function\\.prototype\\s*\\[', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['Function.prototype'], confidence: 'HIGH' },
        { id: 'setPrototypeOf', type: 'regex', pattern: 'Object\\.setPrototypeOf\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['setPrototypeOf'], confidence: 'MEDIUM' },
        { id: 'defineProperty-prototype', type: 'regex', pattern: 'Object\\.defineProperty\\s*\\([^,]+\\.prototype', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['defineProperty', 'prototype'], confidence: 'MEDIUM' },
        { id: 'constructor-prototype', type: 'regex', pattern: '\\.constructor\\.prototype\\s*=', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['constructor.prototype'], confidence: 'HIGH' }
      ]
    },
    // 21. ADVANCED EVASION
    {
      ruleId: 'SEC-ADVANCED-EVASION',
      name: 'Advanced Evasion Detection',
      category: 'SECURITY',
      reviewBucket: 'AUTO_REJECT',
      severity: 'BLOCKER',
      disposition: 'REJECTED',
      description: 'Detects WASM, steganography, advanced anti-debugging, and evasion techniques.',
      matchers: [
        { id: 'wasm-instantiate', type: 'regex', pattern: 'WebAssembly\\.(instantiate|compile|Module|Instance)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['WebAssembly'], confidence: 'HIGH' },
        { id: 'wasm-file', type: 'regex', pattern: '\\.wasm[\'"`]', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['.wasm'], confidence: 'HIGH' },
        { id: 'devtools-detection-size', type: 'regex', pattern: 'window\\.(outerWidth|outerHeight)\\s*-\\s*window\\.(innerWidth|innerHeight)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['outerWidth', 'outerHeight'], confidence: 'HIGH' },
        { id: 'proxy-console', type: 'regex', pattern: 'new\\s+Proxy\\s*\\(\\s*(console|window|document)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['new Proxy', 'console'], confidence: 'MEDIUM' },
        { id: 'stego-pixel-manipulation', type: 'regex', pattern: 'getImageData\\s*\\([^)]*\\).*putImageData', flags: 'gs', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['getImageData', 'putImageData'], confidence: 'MEDIUM' },
        { id: 'timing-attack', type: 'regex', pattern: 'performance\\.now\\s*\\(\\s*\\)\\s*-\\s*', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['performance.now'], confidence: 'LOW', notes: 'May be benign performance measurement.' }
      ]
    },
    // 22. OAUTH BROWSER SECURITY
    {
      ruleId: 'OAUTH-BROWSER-SECURITY',
      name: 'OAuth Browser Security',
      category: 'SECURITY',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'HIGH',
      disposition: 'ACTION_REQUIRED',
      description: 'Detects OAuth issues: missing state parameter, token exposure in URLs/logs, insecure postMessage.',
      matchers: [
        { id: 'postmessage-wildcard', type: 'regex', pattern: '\\.postMessage\\s*\\([^,]+,\\s*[\'"`]\\*[\'"`]', flags: 'gs', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['postMessage', '*'], confidence: 'HIGH' },
        { id: 'oauth-missing-state', type: 'regex', pattern: '\\/authorize\\?[^&]*client_id=[^&]+(?![\\s\\S]*state=)', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['/authorize', 'client_id'], confidence: 'MEDIUM' },
        { id: 'token-in-url', type: 'regex', pattern: '[?&](access_token|token|auth_token)=', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['access_token', 'auth_token'], confidence: 'HIGH' },
        { id: 'token-logged', type: 'regex', pattern: 'console\\.(log|info|debug)\\s*\\([^)]*(?:token|auth|access_token)', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['console.log', 'token'], confidence: 'MEDIUM' },
        { id: 'location-hash-token', type: 'regex', pattern: 'location\\.hash.*(?:token|access_token)', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['location.hash', 'token'], confidence: 'MEDIUM' },
        { id: 'message-handler', type: 'regex', pattern: 'addEventListener\\s*\\(\\s*[\'"`]message[\'"`]', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['addEventListener', 'message'], confidence: 'LOW', notes: 'Verify origin is checked in handler.' }
      ]
    },
    // 23. SERVICE WORKER
    {
      ruleId: 'SEC-SERVICE-WORKER',
      name: 'Service Worker Registration',
      category: 'SECURITY',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'HIGH',
      disposition: 'ACTION_REQUIRED',
      description: 'Detects service worker registration which can intercept network requests.',
      matchers: [
        { id: 'sw-register', type: 'regex', pattern: 'navigator\\.serviceWorker\\.register\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['serviceWorker.register'], confidence: 'HIGH' },
        { id: 'sw-unregister', type: 'regex', pattern: 'navigator\\.serviceWorker\\.unregister\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['serviceWorker.unregister'], confidence: 'MEDIUM' },
        { id: 'sw-file-reference', type: 'regex', pattern: '(sw\\.js|service[-_]?worker\\.js)', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['sw.js', 'service-worker'], confidence: 'MEDIUM' },
        { id: 'sw-libraries', type: 'regex', pattern: '\\b(workbox|sw-precache|sw-toolbox)\\b', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs,json}'], triggerTokens: ['workbox', 'sw-precache'], confidence: 'MEDIUM' }
      ]
    },
    // 24. STORAGE INJECTION
    {
      ruleId: 'PRIV-STORAGE-INJECTION',
      name: 'Storage Injection Prevention',
      category: 'SECURITY',
      reviewBucket: 'ACTION_REQUIRED',
      severity: 'HIGH',
      disposition: 'ACTION_REQUIRED',
      description: 'Detects storage injection patterns that could lead to data leakage.',
      matchers: [
        { id: 'dynamic-storage-key', type: 'regex', pattern: '(localStorage|sessionStorage)\\.setItem\\s*\\(\\s*[^\'"`]', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['setItem'], confidence: 'MEDIUM', notes: 'Dynamic keys may allow user-controlled storage manipulation.' }
      ]
    },
    // 25. KEYBOARD SHORTCUT HIJACKING
    {
      ruleId: 'UX-NO-SHORTCUT-HIJACK',
      name: 'No Keyboard Shortcut Hijacking',
      category: 'UX',
      reviewBucket: 'NEEDS_EXPLANATION',
      severity: 'MEDIUM',
      disposition: 'INFO',
      description: 'Detects keyboard shortcut hijacking that conflicts with Designer shortcuts.',
      matchers: [
        { id: 'keydown-listener', type: 'regex', pattern: 'addEventListener\\s*\\(\\s*[\'"`]keydown[\'"`]', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['addEventListener', 'keydown'], confidence: 'LOW' },
        { id: 'keyup-listener', type: 'regex', pattern: 'addEventListener\\s*\\(\\s*[\'"`]keyup[\'"`]', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['addEventListener', 'keyup'], confidence: 'LOW' },
        { id: 'onkeydown-handler', type: 'regex', pattern: '\\.onkeydown\\s*=', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['onkeydown'], confidence: 'MEDIUM' },
        { id: 'hotkey-libraries', type: 'regex', pattern: '\\b(mousetrap|hotkeys-js|tinykeys|keymaster)\\b', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs,json}'], triggerTokens: ['mousetrap', 'hotkeys-js'], confidence: 'MEDIUM' },
        { id: 'prevent-default-key', type: 'regex', pattern: '(keydown|keyup|keypress).*\\.preventDefault\\s*\\(', flags: 'gs', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['keydown', 'preventDefault'], confidence: 'MEDIUM' }
      ]
    },
    // 26. DATA CLIENT SECURITY
    {
      ruleId: 'APP-DATA-CLIENT-SECURITY',
      name: 'Data Client Security Patterns',
      category: 'SECURITY',
      reviewBucket: 'NEEDS_EXPLANATION',
      severity: 'MEDIUM',
      disposition: 'INFO',
      description: 'Validates proper Data Client API usage patterns and security configurations.',
      matchers: [
        { id: 'webflow-getIdToken', type: 'regex', pattern: 'webflow\\.getIdToken\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['getIdToken'], confidence: 'LOW', notes: 'Verify token is used securely.' },
        { id: 'direct-api-call', type: 'regex', pattern: 'fetch\\s*\\([\'"`][^\'"`]*(api\\.webflow\\.com|webflow\\.com\\/api)', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['fetch', 'api.webflow.com'], confidence: 'MEDIUM', notes: 'Should use SDK instead of direct API calls.' },
        { id: 'data-client-ops', type: 'regex', pattern: 'webflow\\.(createItems|updateItems|deleteItems|getItems)\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['createItems', 'updateItems', 'deleteItems', 'getItems'], confidence: 'LOW' },
        { id: 'webflow-token-storage', type: 'regex', pattern: '(localStorage|sessionStorage)\\.setItem\\s*\\([\'"`][^\'"]*(?:webflow|idtoken|id_token)', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['setItem', 'webflow', 'idtoken'], confidence: 'MEDIUM' },
        { id: 'sdk-import', type: 'regex', pattern: '@webflow\\/(sdk|designer-extension-sdk)', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['@webflow/sdk'], confidence: 'LOW', notes: 'SDK usage is recommended.' }
      ]
    },
    // 27. HYBRID APP SECURITY
    {
      ruleId: 'APP-HYBRID-SECURITY',
      name: 'Hybrid App Security Patterns',
      category: 'SECURITY',
      reviewBucket: 'NEEDS_EXPLANATION',
      severity: 'MEDIUM',
      disposition: 'INFO',
      description: 'Validates proper Hybrid App ID token patterns and authentication flows.',
      matchers: [
        { id: 'get-current-user', type: 'regex', pattern: 'webflow\\.getCurrentUser\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['getCurrentUser'], confidence: 'LOW' },
        { id: 'hybrid-id-token', type: 'regex', pattern: 'webflow\\.getIdToken\\s*\\(', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['getIdToken'], confidence: 'LOW' },
        { id: 'jwt-library', type: 'regex', pattern: '(from|require)\\s*[\'"`](jose|jsonwebtoken|jwt-decode)[\'"`]', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['jose', 'jsonwebtoken', 'jwt-decode'], confidence: 'LOW' },
        { id: 'user-idtoken-access', type: 'regex', pattern: '\\buser\\.idToken\\b', flags: 'g', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['user.idToken'], confidence: 'MEDIUM' },
        { id: 'bearer-token-header', type: 'regex', pattern: 'Authorization:\\s*[\'"`]Bearer', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['Authorization', 'Bearer'], confidence: 'LOW' },
        { id: 'webflow-user-token-header', type: 'regex', pattern: 'x-webflow-user-token', flags: 'gi', fileGlobs: ['**/*.{js,ts,jsx,tsx,mjs,cjs}'], triggerTokens: ['x-webflow-user-token'], confidence: 'MEDIUM' }
      ]
    }
  ]
};

export default defaultRuleset;
