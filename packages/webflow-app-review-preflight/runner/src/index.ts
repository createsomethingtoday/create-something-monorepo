import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import type { RuntimeObservationJobContract } from '@create-something/webflow-app-review-preflight';
import { chromium, type Browser, type Page, type Response as PlaywrightResponse } from 'playwright';

const SECRET_TEXT = /(?:Bearer\s+[A-Za-z0-9._~+/=-]{8,}|-----BEGIN [^-]*PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{12,})/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export interface RuntimeRunnerInput {
  apiBaseUrl: string;
  observationJobId: string;
  capability: string;
  browser?: Browser;
  outputDir?: string;
}

export interface RuntimeRunnerResult {
  observationJobId: string;
  status: 'complete';
  trust: 'webflow_observed';
  cleanupStatus: 'clean' | 'residue_detected' | 'not_tested';
  negativeProxyOutcome: 'blocked' | 'exposed' | 'error';
  artifactCount: number;
}

interface EvidenceArtifact {
  field: string;
  kind: string;
  fileName: string;
  contentType: 'image/png' | 'application/json';
  bytes: Uint8Array;
  sha256: string;
}

interface RuntimeArtifactObservation {
  url: string;
  expectedSha256: string;
  observedSha256: string;
  integrity: string;
  domIntegrity: string | null;
  domCrossOrigin: string | null;
  loadedByPage: boolean;
  sourceMap: { available: boolean; url?: string };
}

interface BrowserState {
  scripts: Array<{
    src: string;
    integrity: string | null;
    crossOrigin: string | null;
    runtimeCreated: boolean;
  }>;
  storage: {
    local: Array<{ key: string; bytes: number }>;
    session: Array<{ key: string; bytes: number }>;
  };
  dom: {
    elementCount: number;
    iframeCount: number;
    dialogCount: number;
    fixedElementCount: number;
  };
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function redactText(value: string): string {
  return value
    .replace(SECRET_TEXT, '[redacted-secret]')
    .replace(EMAIL, '[redacted-email]')
    .slice(0, 1000);
}

export function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      url.searchParams.set(key, '[redacted]');
    }
    url.username = '';
    url.password = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '[invalid-url]';
  }
}

function safeIdentifier(value: string): string {
  return /^[a-zA-Z0-9_.:-]{1,80}$/.test(value)
    ? value
    : `[redacted:${sha256(value).slice(0, 12)}]`;
}

export function validateObservationContract(
  jobId: string,
  contract: RuntimeObservationJobContract
): void {
  if (
    contract.schemaVersion !== 'runtime_observation_job.v1' ||
    contract.purpose !== 'webflow_observation' ||
    !contract.nonce ||
    Date.parse(contract.expiresAt) <= Date.now() ||
    contract.boundaries.partnerCanSubmitEvidence !== false ||
    contract.boundaries.officialDecision !== null ||
    contract.boundaries.canWriteGovernance !== false ||
    contract.boundaries.acceptsAccountCredentials !== false ||
    contract.controls.networkMode !== 'exact_host_allowlist' ||
    contract.controls.evidenceTrust !== 'webflow_observed' ||
    contract.controls.allowedHosts.length === 0 ||
    contract.controls.allowedHosts.length > 12
  ) {
    throw new Error(`Observation job ${jobId} has an unsafe contract.`);
  }

  const allowed = new Set(contract.controls.allowedHosts);
  const urls = [
    contract.target.url,
    contract.negativeProxyProbe.url,
    ...contract.runtimeArtifacts.map((artifact) => artifact.url)
  ];
  for (const value of urls) {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !allowed.has(url.hostname.toLowerCase())
    ) {
      throw new Error(`Observation job ${jobId} attempts to broaden its host boundary.`);
    }
  }
  if (
    contract.runtimeArtifacts.some(
      (artifact) =>
        !/^[a-f0-9]{64}$/.test(artifact.sha256) ||
        !artifact.integrity.startsWith('sha256-')
    )
  ) {
    throw new Error(`Observation job ${jobId} contains an unpinned runtime artifact.`);
  }
}

function jsonArtifact(field: string, value: unknown): EvidenceArtifact {
  const bytes = new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
  return {
    field,
    kind: field,
    fileName: `${field.replace(/_/g, '-')}.json`,
    contentType: 'application/json',
    bytes,
    sha256: sha256(bytes)
  };
}

function pngArtifact(field: string, bytes: Uint8Array): EvidenceArtifact {
  return {
    field,
    kind: field,
    fileName: `${field.replace(/_/g, '-')}.png`,
    contentType: 'image/png',
    bytes,
    sha256: sha256(bytes)
  };
}

async function captureState(page: Page): Promise<BrowserState> {
  const value = await page.evaluate(() => {
    const storage = (target: Storage) =>
      Array.from({ length: target.length }, (_, index) => {
        const key = target.key(index) ?? '';
        return { key, bytes: new TextEncoder().encode(target.getItem(key) ?? '').byteLength };
      });
    const elements = [...document.querySelectorAll<HTMLElement>('*')];
    return {
      scripts: [...document.scripts].map((script) => ({
        src: script.src,
        integrity: script.getAttribute('integrity'),
        crossOrigin: script.getAttribute('crossorigin'),
        runtimeCreated: Boolean(
          Reflect.get(script, Symbol.for('webflow.runtime-created-script'))
        )
      })),
      storage: {
        local: storage(localStorage),
        session: storage(sessionStorage)
      },
      dom: {
        elementCount: elements.length,
        iframeCount: document.querySelectorAll('iframe').length,
        dialogCount: document.querySelectorAll('[role="dialog"], dialog').length,
        fixedElementCount: elements.filter(
          (element) => getComputedStyle(element).position === 'fixed'
        ).length
      }
    };
  });
  return {
    ...value,
    scripts: value.scripts.map((script) => ({
      ...script,
      src: sanitizeUrl(script.src)
    })),
    storage: {
      local: value.storage.local.map((item) => ({ ...item, key: safeIdentifier(item.key) })),
      session: value.storage.session.map((item) => ({ ...item, key: safeIdentifier(item.key) }))
    }
  };
}

async function screenshot(page: Page): Promise<Uint8Array> {
  return new Uint8Array(
    await page.screenshot({
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('input, textarea, [contenteditable="true"]')],
      maskColor: '#000000'
    })
  );
}

async function observeRuntimeArtifact(
  pin: RuntimeObservationJobContract['runtimeArtifacts'][number],
  response: PlaywrightResponse | null,
  allowedHosts: Set<string>,
  scripts: BrowserState['scripts']
): Promise<RuntimeArtifactObservation> {
  const bytes = response
    ? new Uint8Array(await response.body())
    : new Uint8Array(await (await fetch(pin.url, { redirect: 'manual' })).arrayBuffer());
  const source = new TextDecoder().decode(bytes);
  const match = source.match(/[#@]\s*sourceMappingURL=([^\s*]+)/);
  let sourceMap: RuntimeArtifactObservation['sourceMap'] = { available: false };
  if (match?.[1]) {
    const sourceMapUrl = new URL(match[1], pin.url);
    if (allowedHosts.has(sourceMapUrl.hostname.toLowerCase())) {
      try {
        const mapResponse = await fetch(sourceMapUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(5_000)
        });
        sourceMap = {
          available: mapResponse.ok,
          url: sanitizeUrl(sourceMapUrl.toString())
        };
      } catch {
        sourceMap = { available: false, url: sanitizeUrl(sourceMapUrl.toString()) };
      }
    }
  }
  return {
    url: pin.url,
    expectedSha256: pin.sha256,
    observedSha256: sha256(bytes),
    integrity: pin.integrity,
    domIntegrity: scripts.find((script) => script.src === sanitizeUrl(pin.url))?.integrity ?? null,
    domCrossOrigin: scripts.find((script) => script.src === sanitizeUrl(pin.url))?.crossOrigin ?? null,
    loadedByPage: response !== null,
    sourceMap
  };
}

async function capture(
  contract: RuntimeObservationJobContract,
  browser: Browser
): Promise<{
  manifest: Record<string, unknown>;
  artifacts: EvidenceArtifact[];
  cleanupStatus: 'clean' | 'residue_detected' | 'not_tested';
  negativeProxyOutcome: 'blocked' | 'exposed' | 'error';
}> {
  const startedAt = new Date();
  const allowedHosts = new Set(contract.controls.allowedHosts);
  const network: Array<Record<string, unknown>> = [];
  const consoleMessages: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const artifactResponses = new Map<string, PlaywrightResponse>();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    serviceWorkers: 'block',
    acceptDownloads: false
  });
  await context.addInitScript(() => {
    const marker = Symbol.for('webflow.runtime-created-script');
    const originalCreateElement = Document.prototype.createElement;
    Document.prototype.createElement = function (
      this: Document,
      localName: string,
      options?: ElementCreationOptions
    ): HTMLElement {
      const element = Reflect.apply(originalCreateElement, this, [localName, options]) as HTMLElement;
      if (localName.toLowerCase() === 'script') {
        Object.defineProperty(element, marker, { value: true });
      }
      return element;
    } as typeof Document.prototype.createElement;
  });
  let requestCount = 0;
  await context.route('**/*', async (route) => {
    const request = route.request();
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      await route.abort('blockedbyclient');
      return;
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      await route.continue();
      return;
    }
    requestCount += 1;
    if (
      requestCount > contract.controls.maxRequests ||
      !allowedHosts.has(url.hostname.toLowerCase())
    ) {
      network.push({
        phase: 'request',
        url: sanitizeUrl(url.toString()),
        method: request.method(),
        resourceType: request.resourceType(),
        blocked: true
      });
      await route.abort('blockedbyclient');
      return;
    }
    network.push({
      phase: 'request',
      url: sanitizeUrl(url.toString()),
      method: request.method(),
      resourceType: request.resourceType(),
      blocked: false
    });
    await route.continue();
  });

  const page = await context.newPage();
  page.on('console', (message) => {
    consoleMessages.push({ type: message.type(), text: redactText(message.text()) });
  });
  page.on('pageerror', (error) => pageErrors.push(redactText(error.message)));
  page.on('response', (response) => {
    const value = response.url();
    network.push({
      phase: 'response',
      url: sanitizeUrl(value),
      status: response.status(),
      resourceType: response.request().resourceType()
    });
    if (contract.runtimeArtifacts.some((artifact) => artifact.url === value)) {
      artifactResponses.set(value, response);
    }
  });

  try {
    await page.goto(contract.target.url, {
      waitUntil: 'domcontentloaded',
      timeout: contract.controls.requestTimeoutMs
    });
    const before = await screenshot(page);
    let runtimeReadyObserved = false;
    try {
      await page.waitForSelector(contract.lifecycle.readySelector, {
        state: 'attached',
        timeout: contract.controls.requestTimeoutMs
      });
      runtimeReadyObserved = true;
    } catch {
      pageErrors.push('Runtime-ready selector was not observed.');
    }
    const installedState = await captureState(page);
    const afterInstall = await screenshot(page);

    let negativeProxyOutcome: 'blocked' | 'exposed' | 'error' = 'error';
    let negativeProxyStatusCode: number | null = null;
    try {
      const probe = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            credentials: 'omit',
            redirect: 'manual'
          });
          return { status: response.status };
        } catch {
          return { status: null };
        }
      }, contract.negativeProxyProbe.url);
      negativeProxyStatusCode = probe.status;
      negativeProxyOutcome =
        probe.status === null ? 'error' : probe.status >= 200 && probe.status < 300 ? 'exposed' : 'blocked';
    } catch {
      negativeProxyOutcome = 'error';
    }

    if (contract.lifecycle.cleanupTrigger) {
      await page.locator(contract.lifecycle.cleanupTrigger.selector).click({
        timeout: contract.controls.requestTimeoutMs
      });
      await page.waitForTimeout(250);
    }
    const observedState = await captureState(page);
    const afterObservation = await screenshot(page);

    const pinnedUrls = new Set(contract.runtimeArtifacts.map((artifact) => sanitizeUrl(artifact.url)));
    const observedResidue = [
      ...observedState.scripts
        .filter((script) => pinnedUrls.has(script.src))
        .map((script) => `script:${script.src}`),
      ...observedState.storage.local.map((item) => `localStorage:${item.key}`),
      ...observedState.storage.session.map((item) => `sessionStorage:${item.key}`)
    ].slice(0, 100);
    const residue = contract.lifecycle.cleanupTrigger ? observedResidue : [];
    const cleanupStatus = contract.lifecycle.cleanupTrigger
      ? residue.length === 0 ? 'clean' : 'residue_detected'
      : 'not_tested';
    const runtimeArtifacts = await Promise.all(
      contract.runtimeArtifacts.map((pin) =>
        observeRuntimeArtifact(
          pin,
          artifactResponses.get(pin.url) ?? null,
          allowedHosts,
          installedState.scripts
        )
      )
    );
    const runtimeHosts = new Set(
      contract.runtimeArtifacts.map((artifact) => new URL(artifact.url).hostname.toLowerCase())
    );
    const unreviewedRuntimeScripts = installedState.scripts
      .filter((script) => {
        if (!script.src || script.src === '[invalid-url]' || pinnedUrls.has(script.src)) return false;
        try {
          return runtimeHosts.has(new URL(script.src).hostname.toLowerCase());
        } catch {
          return false;
        }
      })
      .map((script) => script.src)
      .slice(0, 100);
    const runtimeCreatedScripts = installedState.scripts
      .filter(
        (script) =>
          script.runtimeCreated &&
          script.src &&
          script.src !== '[invalid-url]'
      )
      .map((script) => script.src)
      .slice(0, 100);

    const artifacts = [
      pngArtifact('screenshot_before', before),
      pngArtifact('screenshot_after_install', afterInstall),
      pngArtifact('screenshot_after_observation', afterObservation),
      jsonArtifact('network_log', network),
      jsonArtifact('console_log', { messages: consoleMessages, pageErrors }),
      jsonArtifact('dom_snapshot', {
        installed: installedState.dom,
        afterObservation: observedState.dom,
        scriptsAfterObservation: observedState.scripts
      }),
      jsonArtifact('storage_snapshot', {
        beforeNavigation: { local: [], session: [] },
        installed: installedState.storage,
        afterObservation: observedState.storage
      }),
      jsonArtifact('script_inventory', runtimeArtifacts)
    ];
    const finishedAt = new Date();
    const manifest = {
      schemaVersion: 'runtime_observation_evidence.v1',
      observationJobId: '',
      testPackageId: contract.testPackageId,
      reviewVersionId: contract.reviewVersionId,
      bundleSha256: contract.bundleSha256,
      nonce: contract.nonce,
      targetUrl: contract.target.url,
      trust: 'webflow_observed',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      redaction: {
        applied: true,
        headersRemoved: true,
        cookiesRemoved: true,
        formValuesMasked: true
      },
      runtimeReadyObserved,
      runtimeArtifacts,
      runtimeCreatedScripts,
      unreviewedRuntimeScripts,
      cleanup: { status: cleanupStatus, residue },
      negativeProxyCanary: {
        url: contract.controls.negativeProxyCanaryUrl,
        outcome: negativeProxyOutcome,
        statusCode: negativeProxyStatusCode
      },
      artifacts: artifacts.map((artifact) => ({
        field: artifact.field,
        kind: artifact.kind,
        fileName: artifact.fileName,
        contentType: artifact.contentType,
        bytes: artifact.bytes.byteLength,
        sha256: artifact.sha256
      }))
    };
    return { manifest, artifacts, cleanupStatus, negativeProxyOutcome };
  } finally {
    await context.close();
  }
}

async function fetchJob(
  apiBaseUrl: string,
  observationJobId: string,
  capability: string
): Promise<RuntimeObservationJobContract> {
  const response = await fetch(
    new URL(`/v1/runtime-observation-jobs/${encodeURIComponent(observationJobId)}`, apiBaseUrl),
    { headers: { authorization: `Bearer ${capability}` } }
  );
  if (!response.ok) throw new Error(`Observation job fetch failed with HTTP ${response.status}.`);
  const body = (await response.json()) as {
    observationJob?: { contract?: RuntimeObservationJobContract };
  };
  if (!body.observationJob?.contract) throw new Error('Observation job contract is missing.');
  validateObservationContract(observationJobId, body.observationJob.contract);
  return body.observationJob.contract;
}

async function uploadEvidence(
  apiBaseUrl: string,
  observationJobId: string,
  capability: string,
  manifest: Record<string, unknown>,
  artifacts: EvidenceArtifact[]
): Promise<void> {
  manifest.observationJobId = observationJobId;
  const form = new FormData();
  form.set('manifest', JSON.stringify(manifest));
  for (const artifact of artifacts) {
    form.set(
      artifact.field,
      new Blob([Buffer.from(artifact.bytes)], { type: artifact.contentType }),
      artifact.fileName
    );
  }
  const response = await fetch(
    new URL(
      `/v1/runtime-observation-jobs/${encodeURIComponent(observationJobId)}/evidence`,
      apiBaseUrl
    ),
    {
      method: 'POST',
      headers: { authorization: `Bearer ${capability}` },
      body: form
    }
  );
  if (!response.ok) {
    const detail = redactText(await response.text());
    throw new Error(`Observation evidence upload failed with HTTP ${response.status}: ${detail}`);
  }
}

export async function runRuntimeObservation(
  input: RuntimeRunnerInput
): Promise<RuntimeRunnerResult> {
  const apiBase = new URL(input.apiBaseUrl);
  if (apiBase.username || apiBase.password || !['http:', 'https:'].includes(apiBase.protocol)) {
    throw new Error('API base URL is invalid.');
  }
  if (!input.capability || input.capability.length < 32) {
    throw new Error('A job-scoped runtime observation capability is required.');
  }

  const contract = await fetchJob(
    apiBase.toString(),
    input.observationJobId,
    input.capability
  );
  const ownsBrowser = !input.browser;
  const browser = input.browser ?? (await chromium.launch({ headless: true }));
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      capture(contract, browser),
      new Promise<never>((_, reject) =>
        { timeout = setTimeout(
          () => reject(new Error('Observation exceeded the total runtime budget.')),
          contract.controls.totalTimeoutMs
        ); }
      )
    ]);
    if (input.outputDir) {
      await mkdir(input.outputDir, { recursive: true });
      result.manifest.observationJobId = input.observationJobId;
      await Promise.all([
        writeFile(
          `${input.outputDir}/manifest.json`,
          `${JSON.stringify(result.manifest, null, 2)}\n`
        ),
        ...result.artifacts.map((artifact) =>
          writeFile(`${input.outputDir}/${artifact.fileName}`, artifact.bytes)
        )
      ]);
    }
    await uploadEvidence(
      apiBase.toString(),
      input.observationJobId,
      input.capability,
      result.manifest,
      result.artifacts
    );
    return {
      observationJobId: input.observationJobId,
      status: 'complete',
      trust: 'webflow_observed',
      cleanupStatus: result.cleanupStatus,
      negativeProxyOutcome: result.negativeProxyOutcome,
      artifactCount: result.artifacts.length
    };
  } finally {
    if (timeout) clearTimeout(timeout);
    if (ownsBrowser) await browser.close();
  }
}
