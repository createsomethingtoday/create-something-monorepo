/**
 * Submission gate status: does the stored Webflow Way Validator pass still
 * describe the published site?
 *
 * The submission form accepts a template only with a stored 100% pass. A site
 * can be published again after that pass, at submit time before the form
 * checked it (submissions before 2026-11) or while the template waits for a
 * review or a re-review. This reads the same two public facts the form reads,
 * so a reviewer sees the state before a full review. It changes no review
 * status and sends nothing to the creator. The validation worker records the
 * lookup in its usage log, as it does for a lookup by the form.
 */

export const DEFAULT_VALIDATOR_RESULT_URL = 'https://validation-worker.createsomething.workers.dev/app-validator/submission/latest';

export type SubmissionGateStatus =
  | 'current' // 100% pass, run after the last publish
  | 'stale' // 100% pass, but the site was published again after the run
  | 'failed' // the latest stored run is not a 100% pass
  | 'partial' // the latest stored run did not cover the full template
  | 'no_result' // no stored run for this site
  | 'site_mismatch' // the Validator script on the page names a different site
  | 'unavailable'; // the page or the result could not be read

export interface SubmissionGateReport {
  status: SubmissionGateStatus;
  /** One sentence for the reviewer. */
  summary: string;
  siteId?: string;
  lastPublishedAt?: string;
  validatorRunAt?: string;
  /** Hours between the Validator run and the last publish. Positive when the site was published after the run. */
  hoursPublishedAfterRun?: number;
  result?: { score: number; totalErrors: number; passed: boolean; rulesetVersion?: string };
}

export interface SubmissionGateConfig {
  validatorResultUrl?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

const LAST_PUBLISHED_COMMENT = /<!--\s*Last Published:\s*([^>]*?)\s*-->/i;
const SITE_ID = /<html\b[^>]*\bdata-wf-site=["']([0-9a-f]{24})["']/i;
/** The bridge object only: a site id in a later script is not the bridge's. */
const BRIDGE_OBJECT = /window\.__WF_REVIEW_BRIDGE\s*=\s*\{([^}]*)\}/;
const BRIDGE_SITE_ID = /\bsiteId\s*:\s*["'`]([0-9a-f]{24})["'`]/i;
const REQUIRED_CHECKS = ['designer', 'assets', 'content'];

function readLastPublishedAt(html: string): string | undefined {
  const match = LAST_PUBLISHED_COMMENT.exec(html);
  if (!match) return undefined;
  const time = Date.parse(match[1].replace(/\s*\([^)]*\)\s*$/, ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function get(url: string, accept: string, config: Required<Pick<SubmissionGateConfig, 'timeoutMs' | 'fetcher'>>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    return await config.fetcher(url, { headers: { Accept: accept }, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Reads the published home page and the stored Validator result, and compares them. Never throws. */
export async function readSubmissionGateStatus(publishedUrl: string, config: SubmissionGateConfig = {}): Promise<SubmissionGateReport> {
  const settings = { timeoutMs: config.timeoutMs ?? 12_000, fetcher: config.fetcher ?? fetch };
  try {
    const page = await get(new URL('/', publishedUrl).href, 'text/html', settings);
    if (!page.ok) return { status: 'unavailable', summary: `The published home page answered HTTP ${page.status}, so the gate status is not known.` };
    const html = await page.text();
    const siteId = SITE_ID.exec(html)?.[1].toLowerCase();
    const lastPublishedAt = readLastPublishedAt(html);
    if (!siteId) return { status: 'unavailable', summary: 'The page has no Webflow site id, so the gate status is not known.', lastPublishedAt };

    const bridgeSiteId = BRIDGE_SITE_ID.exec(BRIDGE_OBJECT.exec(html)?.[1] ?? '')?.[1].toLowerCase();
    if (bridgeSiteId && bridgeSiteId !== siteId) {
      return {
        status: 'site_mismatch',
        summary: `The Validator script on the page names site ${bridgeSiteId}, not this site (${siteId}). A pass found through that script belongs to another site, for example the project this one was duplicated from.`,
        siteId,
        lastPublishedAt
      };
    }

    const lookup = new URL(config.validatorResultUrl ?? DEFAULT_VALIDATOR_RESULT_URL);
    lookup.searchParams.set('siteId', siteId);
    const response = await get(lookup.href, 'application/json', settings);
    const data = record(await response.json().catch(() => null));
    if (response.status === 404 || data.status === 'missing') {
      return { status: 'no_result', summary: 'No stored Validator result exists for this site.', siteId, lastPublishedAt };
    }
    if (!response.ok) return { status: 'unavailable', summary: `The Validator result lookup answered HTTP ${response.status}.`, siteId, lastPublishedAt };

    const summary = record(data.summary);
    const scope = record(data.scope);
    const validatorRunAt = typeof data.submittedAt === 'string' ? data.submittedAt : undefined;
    const result = {
      score: Number(summary.score ?? 0),
      totalErrors: Number(summary.totalErrors ?? 0),
      passed: data.passed === true || summary.passed === true,
      ...(typeof data.workerVersion === 'string' ? { rulesetVersion: data.workerVersion } : {})
    };
    const runTime = Date.parse(validatorRunAt ?? '');
    const publishTime = Date.parse(lastPublishedAt ?? '');
    const hoursPublishedAfterRun =
      Number.isFinite(runTime) && Number.isFinite(publishTime) ? Math.round(((publishTime - runTime) / 3_600_000) * 10) / 10 || 0 : undefined;
    const base = { siteId, lastPublishedAt, validatorRunAt, hoursPublishedAfterRun, result };

    const selected = Array.isArray(scope.selectedChecks) ? scope.selectedChecks.map((check) => String(check).trim().toLowerCase()) : null;
    const partial =
      (selected !== null && REQUIRED_CHECKS.some((check) => !selected.includes(check))) || scope.pageScope === 'current' || scope.publishedChecks === 'designer-only';
    if (partial) return { status: 'partial', summary: 'The latest stored Validator run did not cover the full template (skipped checks, one page only, or no published-site checks).', ...base };

    const fullPass = result.passed && result.score === 100 && result.totalErrors === 0 && Number(summary.failedCategories ?? 0) === 0;
    if (!fullPass) {
      return { status: 'failed', summary: `The latest stored Validator run is not a 100% pass (${result.score}%, ${result.totalErrors} error(s)).`, ...base };
    }
    // The form compares the two times exactly, so this does too: the rounded hours are for reading only.
    if (Number.isFinite(runTime) && Number.isFinite(publishTime) && publishTime > runTime) {
      const gap = hoursPublishedAfterRun ? `${hoursPublishedAfterRun} hour(s)` : 'a few minutes';
      return {
        status: 'stale',
        summary: `The site was published ${gap} after the latest stored Validator run, so the stored 100% pass does not describe the site under review. Read the live validation results before a full review.`,
        ...base
      };
    }
    return {
      status: 'current',
      summary: lastPublishedAt ? 'The stored 100% pass was run after the last publish.' : 'A stored 100% pass exists. The page shows no publish time, so its age against the publish is not known.',
      ...base
    };
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? 'timed out' : 'failed';
    return { status: 'unavailable', summary: `The gate status read ${reason}.` };
  }
}
