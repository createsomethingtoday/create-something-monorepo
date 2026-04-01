import type { D1Database } from '@create-something/mcp-core';

export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | Blob | string,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
}

export interface IndeedEnv {
  DB?: D1Database;
  STORAGE?: R2BucketLike;
  INDEED_APPLY_CLIENT_ID?: string;
  INDEED_APPLY_SECRET?: string;
  INDEED_SPONSORED_JOBS_CLIENT_ID?: string;
  INDEED_SPONSORED_JOBS_SECRET?: string;
  INDEED_SPONSORED_JOBS_EMPLOYER_ID?: string;
  INDEED_APPLY_BASE_URL?: string;
  INDEED_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
  INDEED_ACCOUNT_ID?: string;
  INDEED_FEED_PUBLISHER?: string;
  INDEED_FEED_PUBLISHER_URL?: string;
}

export type IndeedJobStatus = 'draft' | 'active' | 'expired';

export interface IndeedJobRecord {
  id: string;
  account_id: string;
  status: string;
  reference_number: string;
  requisition_id: string;
  title: string;
  company_name: string;
  source_name: string | null;
  url: string;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  street_address: string | null;
  description_html: string;
  employment_type: string | null;
  email: string | null;
  job_meta: string | null;
  phone_config: string;
  coverletter_config: string;
  resume_config: string;
  name_config: string;
  questions_json: string | null;
  resume_fields_required_json: string | null;
  resume_fields_optional_json: string | null;
  metadata_json: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface IndeedApplicationRecord {
  id: string;
  account_id: string;
  job_id: string;
  indeed_apply_id: string;
  status: string;
  applicant_full_name: string | null;
  applicant_first_name: string | null;
  applicant_last_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_location_json: string | null;
  applicant_json: string;
  analytics_json: string | null;
  answers_json: string | null;
  raw_payload_json: string;
  resume_artifact_ref: string | null;
  resume_sha256: string | null;
  disposition_status: string | null;
  disposition_notes: string | null;
  disposition_recorded_at: string | null;
  disposition_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndeedApplicationListRecord extends IndeedApplicationRecord {
  job_title: string | null;
  job_company_name: string | null;
  job_status: string | null;
}

export interface IndeedWebhookEventRecord {
  id: number;
  account_id: string;
  application_id: string | null;
  job_id: string | null;
  indeed_apply_id: string | null;
  signature_verified: number;
  signature_reason: string | null;
  duplicate: number;
  payload_json: string;
  created_at: string;
}
