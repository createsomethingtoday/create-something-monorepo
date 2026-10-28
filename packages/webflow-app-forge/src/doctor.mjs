// `wf-forge doctor <project>`: inspect a built Designer Extension project.
//
// Reads bundle.zip (the artifact that ships) and review-artifacts/ (the
// private source-map upload) and reports against the requirements registry.
// It does not build. Run `npm run build` in the project first.
//
// This is a pre-check, not a replacement for App Review Preflight. Preflight
// runs the production bundle in a server-owned browser and issues the receipt
// the form asks for. The doctor catches what you can fix before that run.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readZip } from './lib/zip.mjs';
import { finding } from './lib/report.mjs';
import { requirementsForCheck } from './lib/registry.mjs';

const MAX_BUNDLE_BYTES = 5 * 1024 * 1024;

const SCAFFOLD_DEFAULT_NAMES = [
  /^my react app$/i,
  /^my (first )?extension$/i,
  /^my app$/i,
  /^official-react$/i,
  /^(react|default|typescript-alt)$/i,
  /^__APP_NAME__$/,
  /^untitled/i,
  /^test(ing)?( app)?$/i,
];

// Markers that differ between a dependency's development and production
// output. The React error-decoder URL is deliberately NOT here: production
// React's formatProdErrorMessage also carries it, so it proves nothing (the
// same false-flag class as react-router's dist/development path).
const DEV_RESIDUE = [
  { re: /react(?:-dom)?(?:-server)?\.development\.js/, label: 'React development build file name' },
  { re: /"Warning: [A-Z][^"]{20,}"/, label: 'React development warning string' },
  { re: /process\.env\.NODE_ENV/, label: 'unreplaced process.env.NODE_ENV (no production define step ran)' },
  { re: /webpackHotUpdate|webpack-dev-server|__webpack_require__\.hmr/, label: 'webpack hot-update or dev-server residue' },
  { re: /eval\("\/\/# sourceURL=webpack/, label: 'webpack eval-based dev module wrapper' },
  { re: /sourceMappingURL=data:/, label: 'inline data: source map' },
  { re: /(^|[;{}\s])debugger(;|\s|$)/, label: 'debugger statement' },
];

const DYNAMIC_CODE = [
  { re: /(^|[^.\w])eval\s*\(/, label: 'eval(' },
  { re: /new\s+Function\s*\(/, label: 'new Function(' },
  { re: /\bFunction\s*\(\s*["'`]/, label: 'Function("...")' },
  { re: /set(?:Timeout|Interval)\s*\(\s*["'`]/, label: 'string-argument timer' },
];

const SECRET_PATTERNS = [
  { re: /sk_live_[0-9a-zA-Z]{8,}/, label: 'Stripe live secret key' },
  { re: /AKIA[0-9A-Z]{16}/, label: 'AWS access key id' },
  { re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, label: 'private key block' },
  { re: /client_secret["']?\s*[:=]\s*["'][^"']{8,}/i, label: 'client_secret literal' },
  { re: /ghp_[0-9A-Za-z]{30,}/, label: 'GitHub token' },
  { re: /xox[baprs]-[0-9A-Za-z-]{10,}/, label: 'Slack token' },
];

const NONPROD_HOSTS = [
  { re: /https?:\/\/localhost:\d+/, label: 'localhost with a port' },
  { re: /https?:\/\/localhost\/[^\s"'`]+/, label: 'localhost with a path' },
  { re: /https?:\/\/127\.0\.0\.1[:/]/, label: '127.0.0.1' },
  { re: /https?:\/\/\[::1\]/, label: '::1' },
  { re: /https?:\/\/[^\s"'`/]*\.(?:ngrok(?:-free)?\.(?:io|app|dev)|trycloudflare\.com|loca\.lt)/, label: 'tunnel host' },
  { re: /https?:\/\/[^\s"'`/]*(?:^|[.-])(?:staging|stage|sandbox|uat|qa)[.-][^\s"'`/]*\.[a-z]{2,}/i, label: 'staging-labelled host' },
];

const HOST_DOM = [
  { re: /window\.parent\.document|parent\.document\b/, label: 'parent.document' },
  { re: /window\.top\.document|top\.document\b/, label: 'top.document' },
  { re: /window\.top\.location|top\.location\s*=/, label: 'top.location' },
  { re: /document\.write\s*\(/, label: 'document.write(' },
];

const POPUPS = [
  { re: /(^|[^.\w])alert\s*\(/, label: 'alert(' },
  { re: /(^|[^.\w])confirm\s*\(/, label: 'confirm(' },
  { re: /(^|[^.\w])prompt\s*\(/, label: 'prompt(' },
];

const ANALYTICS_SDKS = [
  /posthog\.com|posthog\.init/i,
  /segment\.(?:io|com)|analytics\.js/i,
  /amplitude\.com|amplitude\.init/i,
  /mixpanel\.(?:com|init)/i,
  /googletagmanager\.com|google-analytics\.com|gtag\(/i,
  /customer\.io|_cio\b/i,
  /hotjar|fullstory|logrocket|smartlook|mouseflow|clarity\.ms/i,
];

const TOKEN_STORAGE = /(?:localStorage|sessionStorage)\.setItem\s*\(\s*["'`][^"'`]*(?:token|secret|api[_-]?key|jwt|bearer|password)[^"'`]*["'`]/i;
const TOKEN_IN_URL = /[?&](?:access_token|id_token|token|api_key|apikey|secret)=/i;

export function runDoctor(projectDir) {
  const root = resolve(projectDir);
  const findings = [];
  const zipPath = join(root, 'bundle.zip');

  if (!existsSync(zipPath)) {
    findings.push(finding('doctor:bundle-size', 'fail', 'blocker', 'bundle.zip is missing', `No bundle.zip in ${root}. Run \`npm run build\` first.`));
    return { root, findings, bundle: null };
  }

  const zipBuffer = readFileSync(zipPath);
  const zip = readZip(zipBuffer);
  const names = zip.files.map((f) => f.name);

  // --- size
  findings.push(
    zipBuffer.length <= MAX_BUNDLE_BYTES
      ? finding('doctor:bundle-size', 'pass', 'blocker', `bundle.zip is ${kb(zipBuffer.length)} (limit 5 MB)`)
      : finding('doctor:bundle-size', 'fail', 'blocker', `bundle.zip is ${kb(zipBuffer.length)}, over the 5 MB upload limit`)
  );

  // --- manifest
  const manifestEntries = zip.files.filter((f) => /(^|\/)webflow\.json$/.test(f.name));
  let manifest = null;
  let manifestSource = '';
  if (manifestEntries.length >= 1) {
    manifest = safeJson(zip.readText(manifestEntries[0]));
    manifestSource = `bundle.zip:${manifestEntries[0].name}`;
  } else if (existsSync(join(root, 'webflow.json'))) {
    manifest = safeJson(readFileSync(join(root, 'webflow.json'), 'utf8'));
    manifestSource = 'webflow.json (project root; not inside bundle.zip)';
  }

  findings.push(
    manifestEntries.length <= 1
      ? finding('doctor:single-manifest', 'pass', 'required', manifestEntries.length === 1 ? 'bundle.zip contains one webflow.json' : 'bundle.zip contains no webflow.json; the CLI attaches the project manifest at upload')
      : finding('doctor:single-manifest', 'fail', 'required', `bundle.zip contains ${manifestEntries.length} webflow.json files`, 'Keep one canonical manifest. Nested copies usually come from a stray build output or a vendored starter.', manifestEntries.map((e) => e.name))
  );

  if (!manifest) {
    findings.push(finding('doctor:manifest-fields', 'fail', 'blocker', 'No readable webflow.json', 'The manifest must exist and parse as JSON.'));
  } else {
    const missing = [];
    if (!manifest.name || typeof manifest.name !== 'string') missing.push('name');
    if (manifest.apiVersion !== '2') missing.push('apiVersion "2"');
    if (!manifest.publicDir || typeof manifest.publicDir !== 'string') missing.push('publicDir');
    findings.push(
      missing.length === 0
        ? finding('doctor:manifest-fields', 'pass', 'blocker', `webflow.json declares name, apiVersion "2", publicDir (${manifestSource})`)
        : finding('doctor:manifest-fields', 'fail', 'blocker', `webflow.json is missing ${missing.join(', ')}`, `Read from ${manifestSource}.`)
    );

    const telemetry = manifest.telemetry && typeof manifest.telemetry === 'object';
    findings.push(
      telemetry
        ? finding('doctor:no-telemetry', 'fail', 'suggested', 'webflow.json carries a CLI telemetry block', 'Written by Webflow CLI 2.3.0 and earlier. Remove the "telemetry" key or upgrade the CLI. Packaging hygiene, not a security finding.')
        : finding('doctor:no-telemetry', 'pass', 'suggested', 'No CLI telemetry block in webflow.json')
    );
  }

  // --- source maps in bundle
  const mapsInBundle = names.filter((n) => n.endsWith('.map'));
  const textFiles = zip.files.filter((f) => /\.(js|mjs|cjs|html|css|json|svg|txt)$/i.test(f.name));
  const texts = new Map(textFiles.map((f) => [f.name, zip.readText(f)]));
  const inlineMaps = [...texts].filter(([, t]) => /sourceMappingURL=data:/.test(t)).map(([n]) => n);
  findings.push(
    mapsInBundle.length === 0 && inlineMaps.length === 0
      ? finding('doctor:no-maps-in-bundle', 'pass', 'required', 'No source maps inside bundle.zip')
      : finding('doctor:no-maps-in-bundle', 'fail', 'required', 'Source maps found inside bundle.zip', 'Source maps go in the submission form\'s private upload, never in the artifact that ships to customers.', [...mapsInBundle, ...inlineMaps.map((n) => `${n} (inline data: map)`)])
  );

  // --- source map artifact for each minified JS file
  const jsFiles = zip.files.filter((f) => /\.(js|mjs|cjs)$/i.test(f.name));
  const artifactsDir = join(root, 'review-artifacts');
  const artifactNames = existsSync(artifactsDir) ? readdirSync(artifactsDir) : [];
  const missingMaps = [];
  const badMaps = [];
  for (const js of jsFiles) {
    const base = js.name.split('/').pop();
    const mapName = `${base}.map`;
    if (!artifactNames.includes(mapName)) {
      missingMaps.push(mapName);
      continue;
    }
    const map = safeJson(readFileSync(join(artifactsDir, mapName), 'utf8'));
    if (!map || map.version !== 3 || !Array.isArray(map.sources)) badMaps.push(`${mapName} is not a version-3 source map`);
    else if (map.file && map.file !== base && !map.file.endsWith(`/${base}`)) badMaps.push(`${mapName} says file "${map.file}" but the bundle file is "${base}"`);
  }
  if (jsFiles.length === 0) {
    findings.push(finding('doctor:sourcemap-artifact', 'skip', 'required', 'No JavaScript in bundle.zip; no source map required'));
  } else if (missingMaps.length === 0 && badMaps.length === 0) {
    findings.push(finding('doctor:sourcemap-artifact', 'pass', 'required', `review-artifacts/ holds a version-3 source map for each bundle script`, '', jsFiles.map((f) => `${f.name} -> review-artifacts/${f.name.split('/').pop()}.map`)));
  } else {
    findings.push(finding('doctor:sourcemap-artifact', 'fail', 'required', 'Source map artifact missing or mismatched', 'The form requires a version-3 map from the exact build that produced the bundle. The template writes it to review-artifacts/ on `npm run build`.', [...missingMaps.map((m) => `missing review-artifacts/${m}`), ...badMaps]));
  }

  // --- scans over JS
  const jsTexts = [...texts].filter(([n]) => /\.(js|mjs|cjs)$/i.test(n));
  const htmlTexts = [...texts].filter(([n]) => /\.html?$/i.test(n));

  findings.push(scan('doctor:prod-build', 'blocker', jsTexts, DEV_RESIDUE, 'Production build', 'Development residue in the bundle', 'Build with `--mode production`. Dev builds embed error-decoder URLs and eval-based module wrappers that review flags.'));
  findings.push(scan('doctor:no-dynamic-code', 'blocker', jsTexts, DYNAMIC_CODE, 'No dynamic code execution', 'Dynamic code execution in the bundle', 'eval(), new Function(), and string timers are prohibited. If it comes from a dependency, replace the dependency.'));
  findings.push(scan('doctor:no-secrets', 'blocker', [...jsTexts, ...htmlTexts], SECRET_PATTERNS, 'No credential material in the bundle', 'Credential material in the bundle', 'Rotate the secret now, then remove it. Secrets never belong in client code.'));
  findings.push(scan('doctor:no-nonprod-hosts', 'required', jsTexts, NONPROD_HOSTS, 'No localhost, staging, or tunnel hosts as request destinations', 'Non-production host in the bundle', 'A bare "localhost" literal in a library fallback is fine; a localhost URL with a port or path, or any tunnel host, is not.'));
  findings.push(scan('doctor:no-host-dom', 'required', jsTexts, HOST_DOM, 'No reach into the Designer document', 'The bundle reaches into the host document', 'Use Designer APIs. The extension only owns its own frame.'));
  findings.push(scan('doctor:no-popups', 'suggested', jsTexts, POPUPS, 'No alert(), confirm(), or prompt()', 'Browser popup dialogs in the bundle', 'Use webflow.notify() and in-extension UI.'));

  // section by type
  const sectionHits = collect(jsTexts, [{ re: /\.type\s*===?\s*["']Section["']|["']Section["']\s*===?\s*[\w$.]+\.type/, label: 'element.type compared to "Section"' }]);
  findings.push(
    sectionHits.length === 0
      ? finding('doctor:section-by-tag', 'pass', 'suggested', 'No element.type === "Section" comparisons')
      : finding('doctor:section-by-tag', 'fail', 'suggested', 'Sections identified by element.type', 'Preset-created sections report type "Block". Use (await el.getTag()) === "section".', sectionHits)
  );

  // tokens in storage / URL
  const tokenHits = collect(jsTexts, [
    { re: TOKEN_STORAGE, label: 'token-like key written to web storage' },
    { re: TOKEN_IN_URL, label: 'token-like query parameter in a URL' },
  ]);
  findings.push(
    tokenHits.length === 0
      ? finding('doctor:no-tokens-in-storage', 'pass', 'required', 'No token-like values written to storage or URLs')
      : finding('doctor:no-tokens-in-storage', 'fail', 'required', 'Token-like value in web storage or a URL', 'Keep credentials server-side or in memory for the session. UI preferences in localStorage are fine.', tokenHits)
  );

  // keyboard shortcut heuristic
  const shortcutHits = collect(jsTexts, [{ re: /addEventListener\s*\(\s*["']keydown["'][\s\S]{0,400}?(?:metaKey|ctrlKey|altKey)/, label: 'keydown listener checking a modifier key' }]);
  findings.push(
    shortcutHits.length === 0
      ? finding('doctor:no-keyboard-shortcut', 'pass', 'suggested', 'No modifier-key keyboard shortcut handlers')
      : finding('doctor:no-keyboard-shortcut', 'fail', 'suggested', 'Possible keyboard shortcut handler', 'Marketplace Apps must not be invoked by keyboard shortcut. Confirm this handler is in-UI navigation only.', shortcutHits)
  );

  // analytics without consent
  const analyticsHits = jsTexts.filter(([, t]) => ANALYTICS_SDKS.some((re) => re.test(t))).map(([n]) => n);
  const hasConsentGate = jsTexts.some(([, t]) => /consent/i.test(t));
  if (analyticsHits.length === 0) {
    findings.push(finding('doctor:analytics-consent', 'pass', 'suggested', 'No analytics SDK detected in the bundle'));
  } else if (hasConsentGate) {
    findings.push(finding('doctor:analytics-consent', 'warn', 'suggested', 'Analytics SDK present; a consent gate was found', 'Confirm the SDK loads only after the user grants consent, and name the vendor in the listing and privacy policy.', analyticsHits));
  } else {
    findings.push(finding('doctor:analytics-consent', 'fail', 'suggested', 'Analytics SDK present with no consent gate', 'Reviewers return extensions that track before the user agrees. Gate the SDK behind explicit consent.', analyticsHits));
  }

  // --- HTML checks
  const inlineHandlerHits = collect(htmlTexts, [
    { re: /\son[a-z]+\s*=\s*["']/i, label: 'inline event handler attribute' },
    { re: /href\s*=\s*["']\s*javascript:/i, label: 'javascript: URL' },
  ]);
  findings.push(
    inlineHandlerHits.length === 0
      ? finding('doctor:csp-inline-handlers', 'pass', 'required', 'No inline event handlers or javascript: URLs in HTML')
      : finding('doctor:csp-inline-handlers', 'fail', 'required', 'Inline event handlers or javascript: URLs in HTML', 'Blocked under the Designer\'s CSP. Attach handlers from the bundle.', inlineHandlerHits)
  );

  const inlineScriptHits = collect(htmlTexts, [{ re: /<script(?![^>]*\ssrc=)[^>]*>\s*[^\s<]/i, label: 'inline <script> block' }]);
  findings.push(
    inlineScriptHits.length === 0
      ? finding('doctor:csp-inline-script', 'pass', 'required', 'No inline <script> blocks')
      : finding('doctor:csp-inline-script', 'fail', 'required', 'Inline <script> block in HTML', 'Move all script into bundled files.', inlineScriptHits)
  );

  const inlineStyleHits = collect(htmlTexts, [
    { re: /<style[\s>]/i, label: 'inline <style> block' },
    { re: /\sstyle\s*=\s*["']/i, label: 'style attribute' },
  ]);
  const runtimeStyleInjection = jsTexts.filter(([, t]) => /createElement\(\s*["']style["']\s*\)/.test(t) && /insertStyleElement|styleTagTransform|__webpack_modules__[\s\S]{0,200}style-loader/.test(t)).map(([n]) => `${n}: style-loader runtime injection`);
  findings.push(
    inlineStyleHits.length === 0 && runtimeStyleInjection.length === 0
      ? finding('doctor:csp-inline-style', 'pass', 'suggested', 'Styles live in stylesheet files')
      : finding('doctor:csp-inline-style', 'fail', 'suggested', 'Inline styles or runtime style injection', 'Reviewers cite inline styles under CSP even though the published docs list only inline handlers. Keep styles in a .css file; drop style-loader.', [...inlineStyleHits, ...runtimeStyleInjection])
  );

  const remoteScriptHits = collect(htmlTexts, [{ re: /<script[^>]*\ssrc\s*=\s*["'](?:https?:)?\/\/[^"']+/i, label: 'script loaded from a remote host' }]);
  findings.push(
    remoteScriptHits.length === 0
      ? finding('doctor:no-remote-scripts', 'pass', 'required', 'All scripts are loaded from the bundle')
      : finding('doctor:no-remote-scripts', 'fail', 'required', 'Script loaded from a remote host', 'Remotely loaded code can change after approval. Bundle it.', remoteScriptHits)
  );

  const iframeHits = [
    ...collect(htmlTexts, [{ re: /<iframe[^>]*\ssrc\s*=\s*["'](?:https?:)?\/\//i, label: 'iframe with a remote src in HTML' }]),
    ...collect(jsTexts, [{ re: /createElement\(\s*["']iframe["']\s*\)|<iframe[^>]+src=|\.src\s*=\s*["']https?:\/\/[^"']+["']\s*;?\s*[\s\S]{0,80}iframe/i, label: 'iframe created at runtime' }]),
  ];
  findings.push(
    iframeHits.length === 0
      ? finding('doctor:no-external-iframe', 'pass', 'required', 'No externally hosted iframe')
      : finding('doctor:no-external-iframe', 'warn', 'required', 'An iframe is created or embedded', 'An external iframe as the primary UI fails review because that surface can change after approval. Iframes for a third-party login flow are acceptable; say so in review notes.', iframeHits)
  );

  // --- real name (manifest + html title)
  const titleMatch = htmlTexts.map(([n, t]) => [n, (t.match(/<title>([^<]*)<\/title>/i) || [])[1]]).filter(([, t]) => t);
  const nameProblems = [];
  if (manifest?.name && SCAFFOLD_DEFAULT_NAMES.some((re) => re.test(manifest.name.trim()))) nameProblems.push(`webflow.json name "${manifest.name}" is a scaffold default`);
  for (const [n, t] of titleMatch) if (SCAFFOLD_DEFAULT_NAMES.some((re) => re.test(t.trim()))) nameProblems.push(`${n} <title> "${t}" is a scaffold default`);
  if (manifest?.name && /webflow/i.test(manifest.name)) nameProblems.push(`webflow.json name "${manifest.name}" uses the Webflow mark`);
  findings.push(
    nameProblems.length === 0
      ? finding('doctor:real-name', 'pass', 'required', 'Manifest name and page title are the real product name')
      : finding('doctor:real-name', 'fail', 'required', 'Scaffold default or Webflow mark in the App name', 'Reviewers read "My React App" as an unfinished submission, and "Webflow" in a name reads as impersonation.', nameProblems)
  );

  // Attach registry requirement ids to each finding for the packet.
  for (const f of findings) f.requirements = requirementsForCheck(f.check).map((r) => r.id);

  return {
    root,
    bundle: { path: zipPath, bytes: zipBuffer.length, files: names, manifest },
    findings,
  };
}

function scan(check, severity, texts, patterns, passTitle, failTitle, detail) {
  const hits = collect(texts, patterns);
  return hits.length === 0 ? finding(check, 'pass', severity, passTitle) : finding(check, 'fail', severity, failTitle, detail, hits);
}

function collect(texts, patterns) {
  const hits = [];
  for (const [name, text] of texts) {
    for (const { re, label } of patterns) {
      const m = re.exec(text);
      if (m) hits.push(`${name}: ${label} (at offset ${m.index})`);
    }
  }
  return hits;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function kb(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}
