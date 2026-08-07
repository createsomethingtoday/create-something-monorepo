import {
  findProhibitedMarketplaceCustomCode,
  type MarketplaceCustomCodeFinding
} from '@create-something/gsap-validation-worker/font-custom-code-policy';

const DEFAULT_TIMEOUT_MS = 12_000;

type PreflightOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type FreshCustomCodePreflight = {
  passed: boolean;
  findings: MarketplaceCustomCodeFinding[];
};

export async function runFreshCustomCodePreflight(
  normalizedPublishedUrl: string,
  options: PreflightOptions = {}
): Promise<FreshCustomCodePreflight> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await (options.fetchImpl ?? fetch)(normalizedPublishedUrl, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Published site returned HTTP ${response.status}.`);
    }

    const findings = findProhibitedMarketplaceCustomCode(await response.text());
    return { passed: findings.length === 0, findings };
  } finally {
    clearTimeout(timeoutId);
  }
}
