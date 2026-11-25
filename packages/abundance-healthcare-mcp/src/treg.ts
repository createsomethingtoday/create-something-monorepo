/** Bounded routed professional enrichment. Caller supplies registry-attributed identity, never inferred domains. */
export type TregIdentityEvidence = {
  npi: string;
  domain?: string;
  profile_url?: string;
  source_url: string;
};
export type TregOptions = { token: string; fetchFn?: typeof fetch };
const safeText = (value: unknown, max = 120) =>
  typeof value === 'string' && value.length <= max && !/[\r\n\x00-\x1f]/.test(value)
    ? value
    : undefined;
function publicUrl(value: string) {
  const u = new URL(value);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    u.port ||
    u.search ||
    u.hash ||
    !u.hostname.includes('.') ||
    /^(localhost|.*\.local|[\d.]+)$/.test(u.hostname)
  )
    throw Error('Invalid public evidence URL.');
  return u;
}
export function tregIdentity(
  npi: string,
  first: string,
  last: string,
  evidence: TregIdentityEvidence
) {
  if (evidence.npi !== npi) throw Error('Treg identity association failed.');
  const source = publicUrl(evidence.source_url);
  if (evidence.profile_url) {
    const profile = publicUrl(evidence.profile_url);
    if (
      !['linkedin.com', 'www.linkedin.com'].includes(profile.hostname) ||
      !/^\/in\/[A-Za-z0-9_%_-]+\/?$/.test(profile.pathname)
    )
      throw Error('Invalid attributed profile.');
    return { linkedin_url: profile.href };
  }
  const domain = evidence.domain?.toLowerCase();
  if (
    !domain ||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain) ||
    ![domain, 'www.' + domain].includes(source.hostname) ||
    !safeText(first) ||
    !safeText(last)
  )
    throw Error('Corroborated employer domain and registry name required.');
  return { first_name: first, last_name: last, domain };
}
type ContactKind = 'phone' | 'email';
export type TregReceipt = {
  call_id: string | null;
  actual_usd: number | null;
  reported_usd: number | null;
  settled: boolean;
};
export type TregContact = {
  status: 'found' | 'not_found' | 'pending' | 'unresolved';
  value?: string;
  source?: { system: 'treg'; served_by?: string; provider?: string; identity_source_url: string };
  verification?: {
    verdict: string;
    provider?: string;
    checked: boolean;
    pending: boolean;
    call_id: string | null;
    line_type?: string;
  };
  receipt: TregReceipt;
};
type TregInput = {
  npi: string;
  first: string;
  last: string;
  operation_id: string;
  evidence: TregIdentityEvidence;
};
const TREG_REQUEST_TIMEOUT_MS = 90000;

async function findContact(
  kind: ContactKind,
  input: TregInput,
  options: TregOptions
): Promise<TregContact> {
  const identity = tregIdentity(input.npi, input.first, input.last, input.evidence);
  const receipt: TregReceipt = {
    call_id: null,
    actual_usd: null,
    reported_usd: null,
    settled: false
  };
  const unresolved: TregContact = { status: 'unresolved', receipt };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = async (): Promise<TregContact> => {
    try {
      const response = await (options.fetchFn ?? fetch)(
        `https://treg.to/call/treg.people.${kind}.find`,
        {
          method: 'POST',
          redirect: 'manual',
          headers: {
            'Content-Type': 'application/json',
            'X-Treg-Token': options.token,
            'X-Treg-Route-Verify': 'true',
            ...(kind === 'email' && 'domain' in identity
              ? { 'X-Treg-Route-Domain-Match': 'strict' }
              : {}),
            'Idempotency-Key': `${input.operation_id}:${kind}`
          },
          body: JSON.stringify(identity),
          signal: controller.signal
        }
      );
      receipt.call_id = safeText(response.headers.get('X-Treg-Call-Id')) ?? null;
      const charge = response.headers.get('X-Treg-Cost-Micro');
      const micro =
        charge !== null && /^\d+$/.test(charge) && Number.isSafeInteger(Number(charge))
          ? Number(charge)
          : null;
      receipt.reported_usd = micro === null ? null : micro / 1e6;
      // Redirects and errors do not establish settled billing or usable contact values.
      if (!response.ok) return unresolved;
      const body: any = await response.json();
      const verification = body?._treg?.verification;
      const pending =
        response.status === 202 ||
        body?.status === 'pending' ||
        verification?.pending === true ||
        !!verification?.async;
      receipt.settled = !pending && micro !== null && !!receipt.call_id;
      receipt.actual_usd = receipt.settled ? micro! / 1e6 : null;
      const value = safeText(body?.output?.[kind], kind === 'email' ? 254 : 40);
      const verdict = safeText(verification?.verdict) ?? 'unknown';
      const invalidVerification =
        /^(?:invalid|undeliverable|risky|disposable|blocked|failed)$/i.test(verdict);
      const validSyntax =
        kind === 'email'
          ? !!value &&
            /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(
              value
            )
          : !!value && /^\+?[\d ().-]{7,40}$/.test(value);
      const domainMatches =
        kind !== 'email' ||
        !('domain' in identity) ||
        value?.split('@')[1]?.toLowerCase() === identity.domain;
      const usable =
        !pending && validSyntax && domainMatches && !(kind === 'email' && invalidVerification);
      return {
        status: pending ? 'pending' : usable ? 'found' : 'not_found',
        ...(usable ? { value } : {}),
        source: {
          system: 'treg',
          served_by: safeText(body?._treg?.served_by),
          provider: safeText(body?._treg?.provider),
          identity_source_url: input.evidence.source_url
        },
        verification: {
          verdict,
          provider: safeText(verification?.served_by),
          checked: verification?.checked === true,
          pending,
          call_id: safeText(verification?.call_id) ?? null,
          ...(kind === 'phone' ? { line_type: safeText(body?.output?.line_type) ?? 'unknown' } : {})
        },
        receipt
      };
    } catch {
      // Missing response is unknown spending, never a zero-cost miss.
      return unresolved;
    }
  };
  try {
    return await Promise.race([
      request(),
      new Promise<TregContact>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve(unresolved);
        }, TREG_REQUEST_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runTregContact(input: TregInput, options: TregOptions) {
  // Independent routed lookups share a 90-second wall-clock budget.
  const [phone, email] = await Promise.all([
    findContact('phone', input, options),
    findContact('email', input, options)
  ]);
  const contacts = { phone, email };
  const receipts = [phone.receipt, email.receipt];
  const settled = receipts.every((receipt) => receipt.settled);
  const knownReceipts = receipts.filter((receipt) => receipt.actual_usd !== null);
  const confirmedSubtotal = knownReceipts.length
    ? knownReceipts.reduce((sum, receipt) => sum + receipt.actual_usd!, 0)
    : null;
  return {
    uncertain_dispatch: [phone, email].some((contact) => contact.status === 'unresolved'),
    status: [phone, email].some((contact) => ['unresolved', 'pending'].includes(contact.status))
      ? 'partial'
      : 'complete',
    npi: input.npi,
    contacts,
    actual_cost_usd: settled ? confirmedSubtotal : null,
    confirmed_subtotal_usd: confirmedSubtotal,
    pending_receipts: receipts.filter((receipt) => !receipt.settled).length,
    receipts,
    verification: 'unverified',
    recruiting_readiness_impact: 'none',
    contact_permission: 'unverified',
    recovery: 'Recover existing call IDs; do not repeat dispatch to recover unknown results.'
  };
}

/** Accept only exact candidate-linked, grounded employer staff/bio evidence. */
export function tregEvidenceFromExa(npi: string, exa: any): TregIdentityEvidence | undefined {
  if (
    exa?.provider?.npi !== npi ||
    exa?.match_status !== 'verified_match' ||
    exa?.identity_verification_status !== 'source_grounded'
  )
    return;
  const citations = exa.source_citations;
  if (!Array.isArray(citations)) return;
  const profile = exa.professional_contact?.profile_url;
  if (typeof profile === 'string' && citations.some((c: any) => c.url === profile)) {
    try {
      const evidence = { npi, profile_url: profile, source_url: profile };
      tregIdentity(npi, '', '', evidence);
      return evidence;
    } catch {}
  }
  const employer = exa.employer_identity;
  if (
    !employer?.domain ||
    !employer?.source_url ||
    !citations.some((c: any) => c.url === employer.source_url)
  )
    return;
  try {
    const url = publicUrl(employer.source_url);
    const host = url.hostname.replace(/^www\./, '');
    if (
      /(?:^|\.)(?:linkedin\.com|facebook\.com|instagram\.com|npiregistry\.cms\.hhs\.gov|npidb\.org|npiprofile\.com|healthgrades\.com|doximity\.com|vitals\.com|webmd\.com|sharecare\.com|zocdoc\.com)$/.test(
        host
      ) ||
      url.pathname === '/' ||
      !/(?:staff|team|provider|physician|doctor|people|bio|about|nurse)/i.test(url.pathname)
    )
      return;
    const evidence = { npi, domain: employer.domain, source_url: employer.source_url };
    tregIdentity(npi, 'first', 'last', evidence);
    return evidence;
  } catch {
    return;
  }
}
