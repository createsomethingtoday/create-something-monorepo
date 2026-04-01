import type { IndeedJobRecord } from './types.js';

export interface FeedRenderRuntime {
  apiToken: string;
  publisher: string;
  publisherUrl: string;
  publicBaseUrl?: string;
}

export interface FeedUrls {
  baseUrl?: string;
  postUrl?: string;
  questionsUrl?: string;
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

function xmlElement(name: string, value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return `    <${name}>${cdata(value)}</${name}>`;
}

export function normalizePublicBaseUrl(baseUrl?: string): string | undefined {
  if (!baseUrl) return undefined;
  return baseUrl.replace(/\/+$/, '');
}

export function buildQuestionsUrl(localJobId: string, baseUrl?: string): string | undefined {
  const normalized = normalizePublicBaseUrl(baseUrl);
  if (!normalized) return undefined;
  return `${normalized}/questions/${encodeURIComponent(localJobId)}.json`;
}

export function buildPostUrl(baseUrl?: string): string | undefined {
  const normalized = normalizePublicBaseUrl(baseUrl);
  if (!normalized) return undefined;
  return `${normalized}/webhooks/apply`;
}

export function buildJobLocation(job: Pick<IndeedJobRecord, 'city' | 'state' | 'postal_code' | 'country'>): string {
  const cityState = [job.city, job.state].filter(Boolean).join(', ');
  const postal = job.postal_code?.trim();
  if (cityState && postal) return `${cityState} ${postal}`;
  if (cityState) return cityState;
  if (postal) return postal;
  return job.country;
}

export function buildIndeedApplyQueryString(
  job: IndeedJobRecord,
  runtime: FeedRenderRuntime,
  urls: FeedUrls = {},
): string {
  const publicBaseUrl = normalizePublicBaseUrl(urls.baseUrl ?? runtime.publicBaseUrl);
  const params = new URLSearchParams();

  params.set('indeed-apply-apiToken', runtime.apiToken);
  params.set('indeed-apply-jobId', job.id);
  params.set('indeed-apply-jobTitle', job.title);
  params.set('indeed-apply-jobCompanyName', job.company_name);
  params.set('indeed-apply-jobLocation', buildJobLocation(job));
  params.set('indeed-apply-jobUrl', job.url);
  params.set('indeed-apply-postUrl', urls.postUrl ?? buildPostUrl(publicBaseUrl) ?? 'https://example.invalid/webhooks/apply');

  if (job.job_meta) params.set('indeed-apply-jobMeta', job.job_meta);
  if (job.phone_config) params.set('indeed-apply-phone', job.phone_config);
  if (job.coverletter_config) params.set('indeed-apply-coverletter', job.coverletter_config);
  if (job.resume_config) params.set('indeed-apply-resume', job.resume_config);
  if (job.name_config) params.set('indeed-apply-name', job.name_config);
  if (job.questions_json) {
    params.set(
      'indeed-apply-questions',
      urls.questionsUrl ?? buildQuestionsUrl(job.id, publicBaseUrl) ?? 'https://example.invalid/questions.json',
    );
  }

  const metadata = job.metadata_json ? (JSON.parse(job.metadata_json) as Record<string, unknown>) : {};
  const advNum = typeof metadata.adv_num === 'string' ? metadata.adv_num : undefined;
  if (advNum) params.set('indeed-apply-advNum', advNum);

  const resumeFieldsRequired = job.resume_fields_required_json
    ? (JSON.parse(job.resume_fields_required_json) as string[])
    : [];
  const resumeFieldsOptional = job.resume_fields_optional_json
    ? (JSON.parse(job.resume_fields_optional_json) as string[])
    : [];

  if (resumeFieldsRequired.length > 0) {
    params.set('indeed-apply-resumefieldsrequired', resumeFieldsRequired.join(','));
  }
  if (resumeFieldsOptional.length > 0) {
    params.set('indeed-apply-resumefieldsoptional', resumeFieldsOptional.join(','));
  }

  return params.toString();
}

export function renderIndeedApplyJobXml(
  job: IndeedJobRecord,
  runtime: FeedRenderRuntime,
  urls: FeedUrls = {},
): string {
  const query = buildIndeedApplyQueryString(job, runtime, urls);

  return [
    '  <job>',
    xmlElement('title', job.title),
    xmlElement('date', job.published_at),
    xmlElement('referencenumber', job.reference_number),
    xmlElement('requisitionid', job.requisition_id),
    xmlElement('apijobid', job.id),
    xmlElement('url', job.url),
    xmlElement('company', job.company_name),
    xmlElement('sourcename', job.source_name ?? job.company_name),
    xmlElement('city', job.city ?? ''),
    xmlElement('state', job.state ?? ''),
    xmlElement('country', job.country),
    xmlElement('postalcode', job.postal_code ?? ''),
    xmlElement('streetaddress', job.street_address ?? ''),
    xmlElement('email', job.email ?? ''),
    xmlElement('description', job.description_html),
    xmlElement('jobtype', job.employment_type ?? ''),
    `    <indeed-apply-data>${cdata(query)}</indeed-apply-data>`,
    '  </job>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function renderIndeedApplyFeed(
  jobs: IndeedJobRecord[],
  runtime: FeedRenderRuntime,
  urls: FeedUrls = {},
): string {
  const entries = jobs.map((job) => renderIndeedApplyJobXml(job, runtime, urls));
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<source>',
    `  <publisher>${cdata(runtime.publisher)}</publisher>`,
    `  <publisherurl>${cdata(runtime.publisherUrl)}</publisherurl>`,
    ...entries,
    '</source>',
  ].join('\n');
}

