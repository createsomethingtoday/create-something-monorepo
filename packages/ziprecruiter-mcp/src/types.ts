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

export interface ZipRecruiterEnv {
  DB?: D1Database;
  STORAGE?: R2BucketLike;
  ZIPRECRUITER_API_KEY?: string;
  ZIPRECRUITER_WEBHOOK_SECRET?: string;
  ZIPRECRUITER_API_BASE_URL?: string;
  ZIPRECRUITER_HIRING_SIGNAL_BASE_URL?: string;
  ZIPRECRUITER_SIGNATURE_TOLERANCE_SECONDS?: string;
  ZIPRECRUITER_MCP_API_KEY?: string;
  MCP_API_KEY?: string;
  ZIPRECRUITER_ACCOUNT_ID?: string;
}

export type StaffingJobStatus = 'active' | 'closed' | 'unmapped';
export type StaffingApplicationStatus =
  | 'received'
  | 'viewed'
  | 'contacted'
  | 'assessment'
  | 'interviewed'
  | 'offered'
  | 'prehire'
  | 'hired'
  | 'rejected'
  | 'unable_to_map';

export interface StaffingJobRecord {
  id: string;
  employer_id: string;
  employer_name: string | null;
  title: string;
  job_type: string;
  status: string;
  country: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  description: string;
  apply_url: string | null;
  requirements: string | null;
  specialty: string | null;
  discipline: string | null;
  shift: string | null;
  compensation_min: number | null;
  compensation_max: number | null;
  compensation_currency: string | null;
  starts_on: string | null;
  source: string;
  partner_attributes_json: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffingCandidateRecord {
  id: string;
  source: string;
  external_candidate_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  nurse_specialties_json: string | null;
  license_summary_json: string | null;
  profile_json: string | null;
  latest_resume_sha256: string | null;
  latest_resume_artifact_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffingApplicationRecord {
  id: string;
  job_id: string;
  candidate_id: string;
  source: string;
  external_application_id: string | null;
  ziprecruiter_response_id: string | null;
  zr_application_id: string | null;
  status: string;
  status_name: string | null;
  status_group: string | null;
  rejection_reason: string | null;
  answers_json: string | null;
  attributes_json: string | null;
  profile_json: string | null;
  additional_data_json: string | null;
  resume_sha256: string | null;
  resume_artifact_ref: string | null;
  created_at: string;
  updated_at: string;
  last_event_at: string;
}

export interface ZipRecruiterJobLinkRecord {
  job_id: string;
  ziprecruiter_job_id: string;
  employer_id: string;
  sync_status: string;
  last_payload_hash: string | null;
  questions_json: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}
