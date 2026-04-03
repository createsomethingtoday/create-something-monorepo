# Indeed MCP Integration Map

This document maps the current Abundance nurse staffing workflow to the custom Indeed Apply MCP reviewed from `emdash/indeed-mcp-119` at `8de7b62a`.

## Current MCP Scope

The current custom Indeed MCP is an Indeed Apply integration, not a general outbound staffing API.

It currently supports:

- creating or updating local Indeed Apply job configs
- storing hosted screener question JSON
- rendering the active XML feed
- receiving and verifying Indeed Apply webhook deliveries
- persisting applications, webhook events, and resume artifacts
- listing jobs and applications
- recording local recruiter disposition state

It does not currently support:

- Sponsored Jobs account or campaign operations
- remote Indeed disposition sync
- submitting candidates to facilities or employer ATS systems

## Recommended Abundance Model

Use the Indeed MCP in two places only:

1. role publication and inbound apply intake
2. terminal recruiter outcome writeback

Do not use the Indeed MCP as the primary nurse workflow engine. Abundance remains the system of engagement. Indeed is a sourcing and intake channel.

## Stage To Tool Map

| Abundance stage | Trigger | Indeed surface | Writeback into Abundance |
|---|---|---|---|
| internal role approved for public sourcing | operator marks a role publishable in `.agency` | `indeed_apply_upsert_job`, `indeed_apply_set_questions`, `indeed_apply_render_feed`, optional `indeed_apply_get_job` | store `localJobId`, `referenceNumber`, `questionsUrl`, publish timestamp, and feed status on the role record; optionally mirror the selected `localJobId` into a candidate thread later |
| Indeed nurse applies | Indeed calls `/webhooks/apply` | Worker webhook, not an MCP tool call | persist application and resume in Indeed MCP storage; create an Abundance claim record so the nurse can continue in chat |
| nurse claims or resumes in Abundance | nurse opens secure claim link from email/SMS | no MCP call | create or hydrate a concierge thread from the stored Indeed application; seed profile fields, upload artifacts, and guidance message |
| recruiter review booked | nurse books review in Abundance | no Indeed call | keep as Abundance-only state |
| recruiter review completed | recruiter clears candidate into staffing queue | no Indeed call in v1 | keep as Abundance-only state; intermediate status is too ambiguous for Indeed disposition |
| staffing outreach started | internal coordinator takes packet | no Indeed call in v1 | keep as Abundance-only state |
| submitted to facility | internal coordinator submits staffing packet | no Indeed call in v1 | keep as Abundance-only state |
| facility requests interview | internal coordinator records response | no Indeed call in v1 | keep as Abundance-only state |
| placement confirmed | internal team records successful placement | `indeed_apply_record_disposition` | record terminal disposition locally in Indeed MCP and mirror sync state in the thread |
| request closed | internal team closes submission | `indeed_apply_record_disposition` | record terminal decline state locally in Indeed MCP and mirror sync state in the thread |

## Where The Calls Should Sit

### 1. Publish lane

This should sit outside the nurse thread in the staffing control plane.

Do not fire `indeed_apply_upsert_job` from the nurse-facing chat route. The current nurse thread is candidate-scoped, while Indeed Apply jobs are role-scoped.

Recommended placement:

- `.agency` staffing publish action
- or a dedicated Abundance staffing publication service

Input should come from the selected role, not from freeform nurse messages:

- `roleTitle`
- `facility`
- `location`
- `payPackage`
- `shift`
- `startWindow`
- recruiter contact or mailbox
- approved screener questions

The current `MatchingOpportunity` shape already provides most of this payload surface.

### 2. Intake lane

This should sit between the Indeed webhook and concierge thread creation.

Recommended placement:

- new bridge service under `concierge-chat` server code
- or an internal worker that reads persisted Indeed applications and creates claimable Abundance thread seeds

Important constraint:

The current concierge product is cookie-scoped and session-owned. An Indeed webhook cannot safely create a nurse-visible thread directly because there is no browser session yet.

That means v1 needs a claim flow:

1. Indeed webhook stores the application in the Indeed MCP
2. bridge service creates a pending Abundance intake claim
3. nurse receives a secure `continue your application` link
4. nurse opens Abundance and claims the thread into a browser session

### 3. Outcome writeback lane

This should sit in the existing thread action handlers in `concierge-chat`.

Recommended call sites:

- `confirm_placement`
- `close_staffing_request`

Do not write Indeed dispositions on:

- `book_appointment`
- `complete_review`
- `start_staffing_outreach`
- `submit_to_facility`
- `record_facility_interview`
- `start_onboarding`
- `complete_onboarding`

Reason:

- the current MCP only records disposition locally
- remote sync is not wired
- intermediate recruiter and staffing stages do not yet have a stable Indeed mapping contract

## Thread Writeback Contract

Add a first-class external integration object to the thread model instead of hiding everything in profile fields.

Recommended shape:

```ts
interface ThreadIntegrationRefs {
  indeed?: {
    source: 'indeed_apply' | 'abundance_publish';
    accountId: string;
    localJobId?: string;
    referenceNumber?: string;
    indeedApplyId?: string;
    applicantEmail?: string;
    applicantPhone?: string;
    resumeArtifactRef?: string | null;
    dispositionStatus?: string | null;
    dispositionSyncState:
      | 'not_linked'
      | 'job_published'
      | 'application_received'
      | 'claimed_in_abundance'
      | 'recorded_local_only'
      | 'synced_remote';
    webhookReceivedAt?: string;
    claimedAt?: string;
    lastSyncedAt?: string;
  };
}
```

Until that exists, mirror the load-bearing identifiers into `ProfileFieldEvent.fieldClass = 'external_write_key'` for visibility:

- `indeed_local_job_id`
- `indeed_reference_number`
- `indeed_apply_id`

## Nurse-Facing Artifacts

Add explicit nurse-facing artifacts for the Indeed channel.

Recommended additions:

- `indeed_application_receipt`
  - shown when the thread is hydrated from an Indeed application
  - summary example: `Imported your Indeed application and attached resume.`
- `indeed_resume_import`
  - shown when the webhook contained a resume file
  - can reuse the existing `upload` shape if you want the file to behave like a normal credential artifact
- `indeed_disposition_receipt`
  - internal-only by default
  - summary example: `Recorded final Indeed disposition locally. Remote sync pending.`

If you want to avoid adding new artifact kinds immediately:

- reuse `upload` for the resume import
- reuse `tool_action` for disposition receipts

## Profile Field Mapping From Indeed Apply

When a thread is hydrated from an Indeed application, map the payload into the existing progressive profile shape:

| Indeed payload | Abundance field |
|---|---|
| applicant.fullName | legal_name or display name |
| applicant.email | primary_email |
| applicant.phoneNumber | primary_phone |
| applicant.resume.json.location | preferred_region candidate |
| screener answer: compact license | compact_license |
| screener answer: specialty | specialty |
| screener answer: shift preference | preferred_shift |
| job.jobId or job.jobKey | `external_write_key` |
| payload.id | `external_write_key` |

Anything missing should remain a normal concierge follow-up in chat.

## D1 Additions

### Required for v1

Add a claim table so inbound Indeed applications can become nurse-visible Abundance threads later.

Recommended table:

```sql
CREATE TABLE candidate_intake_claims (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,                      -- 'indeed_apply'
  applicant_email TEXT,
  applicant_phone TEXT,
  local_job_id TEXT,
  indeed_apply_id TEXT NOT NULL,
  thread_seed_json TEXT NOT NULL,
  claim_token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  claimed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

This is the missing bridge between the Indeed webhook and the current cookie-scoped concierge session model.

### Recommended for observability

If you want queryable links instead of relying only on `thread_json`, add:

```sql
CREATE TABLE thread_integration_refs (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  session_id TEXT,
  system TEXT NOT NULL,                      -- 'indeed_apply'
  source TEXT NOT NULL,                      -- 'indeed_apply' | 'abundance_publish'
  local_job_id TEXT,
  reference_number TEXT,
  indeed_apply_id TEXT,
  disposition_status TEXT,
  disposition_sync_state TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

If speed matters more than queryability, you can defer this and keep the initial integration refs inside `chat_threads.thread_json`.

## Recommended Implementation Order

### Slice 1: inbound Indeed claim flow

- add `candidate_intake_claims`
- add `integrationRefs.indeed` to thread state
- add a bridge that turns an Indeed application into a claimable Abundance thread seed
- hydrate imported resume as a normal thread artifact

### Slice 2: terminal disposition writeback

- wire `confirm_placement` to `indeed_apply_record_disposition`
- wire `close_staffing_request` to `indeed_apply_record_disposition`
- mirror returned `sync_state` into `integrationRefs.indeed`
- add internal disposition receipt artifact

Status:
- implemented in `src/routes/api/threads/[threadId]/action/+server.ts`
- outbound client lives in `src/lib/server/indeed-mcp.ts`
- imported-claim linkage includes `localApplicationId` for `indeed_apply_record_disposition`

### Slice 3: role publication control-plane flow

- add `.agency` operator publish action
- call `indeed_apply_upsert_job`
- call `indeed_apply_set_questions`
- refresh or validate feed with `indeed_apply_render_feed`

## Recommended Non-Goals For V1

Do not add these in the first pass:

- remote Indeed disposition sync
- Sponsored Jobs
- nurse-thread-triggered role publication
- automatic facility submission through Indeed
- direct webhook-to-cookie-session injection

## Success Criteria

The integration is correct when:

- a nurse who applied on Indeed can continue in Abundance through a secure claim link
- their resume and screener data appear as normal Abundance thread state
- Abundance remains the conversational system of engagement
- successful and closed terminal outcomes are recorded back into the Indeed MCP as local dispositions
- no nurse-facing step depends on internal `.agency` sign-in
