# Partner Onboarding Two-Way Sync

Airtable + Cloudflare Worker + Codex + Slack thread response workflow for Webflow partner onboarding alerts.

## Architecture

1. Inbound agent writes raw Slack alert payload.
2. Airtable automation calls Worker `POST /onboarding/ingest`.
3. Worker parses raw text and upserts one operational record keyed by `Message Key = channel_id:message_ts`.
4. Codex performs manual actions and updates workflow state.
5. Downstream agent triggers on Airtable update (`Workflow State = Done`, `Outbound Status = ready`, `Response Text` present), sends Slack thread reply, and writes send status back.

## Worker Endpoints

- `GET /health`
- `POST /onboarding/ingest`
- `POST /onboarding/transition`
- `POST /onboarding/outbound-payload`

### `POST /onboarding/ingest`

Request:

```json
{
  "source": "slack_alerts_partner_onboarding_requests",
  "channel_id": "C123",
  "message_ts": "1739999999.1234",
  "thread_ts": "1739999999.1234",
  "raw_text": "Agency name: ...",
  "raw_payload": {}
}
```

Response:

```json
{
  "ok": true,
  "message_key": "C123:1739999999.1234",
  "record_id": "recXXX",
  "parse_status": "parsed"
}
```

### `POST /onboarding/transition`

Optional server-enforced state transition endpoint.

Request:

```json
{
  "message_key": "C123:1739999999.1234",
  "to_state": "In-Progress",
  "codex_performed_by": "micah",
  "codex_action_notes": "Started workspace validation"
}
```

- Invalid transitions are rejected and logged to `Last Error`.
- `Done` requires non-empty `Response Text`.

### `POST /onboarding/outbound-payload`

Builds/returns the outbound payload if record satisfies trigger contract.

Request:

```json
{ "message_key": "C123:1739999999.1234" }
```

## Airtable Operational Table Contract

Use one table (default worker env: `Partner Onboarding Ops`) with these fields:

- `Message Key`
- `Slack Channel ID`
- `Slack Message TS`
- `Slack Thread TS`
- `Slack Permalink`
- `Raw Message Text`
- `Raw Payload JSON`
- `Parse Status` (`parsed`, `partial`, `failed`)
- `Workflow State` (`Queue`, `In-Progress`, `Blocked`, `Done`)
- `Retry Count`
- `Dead Letter`
- `Last Error`
- `Agency Name`
- `Contact Name`
- `Contact Email`
- `Partner Type`
- `Acceleration Requested`
- `Partner Points`
- `Enterprise Distinction`
- `Connect With Allish`
- `Workspace Name`
- `Workspace ID`
- `Submitter Name`
- `Additional Info`
- `Codex Action Notes`
- `Codex Action Result` (`success`, `blocked`, `failed`)
- `Codex Performed By`
- `Codex Performed At`
- `Response Text`
- `Response Payload JSON`
- `Outbound Status` (`ready`, `sent`, `failed`)
- `Outbound Attempts`
- `Outbound Last Error`
- `Outbound Sent At`
- `Outbound Message TS`

## State Machine

Allowed transitions:

- `empty -> Queue`
- `Queue -> In-Progress`
- `In-Progress -> Done`
- `In-Progress -> Blocked`
- `Blocked -> In-Progress`

`Done` is terminal for manual workflow.

## Retry and Dead-Letter Policy

Worker write/read operations retry up to 3 attempts with exponential backoff.

After exhaustion:

- `Retry Count = 3`
- `Dead Letter = true`
- `Workflow State = Blocked`
- `Last Error` populated

## Airtable Automation Configuration

### Inbound automation

1. Trigger: new inbound alert record (or webhook action source).
2. Action: call Worker `POST /onboarding/ingest` with raw payload fields.
3. Success path: record created/updated in operational table.

### Outbound automation

1. Trigger: record updated in operational table.
2. Condition:
   - `Workflow State = Done`
   - `Outbound Status = ready`
   - `Response Text` is not empty
3. Action: call downstream connected agent with record fields.
4. Downstream writeback:
   - success: set `Outbound Status = sent`, `Outbound Sent At`, `Outbound Message TS`
   - failure: set `Outbound Status = failed`, increment `Outbound Attempts`, set `Outbound Last Error`

## Codex Manual Runbook (Airtable MCP)

### MCP setup (no secrets in repo)

Add an Airtable MCP entry in local config and pass API key from environment.

```json
{
  "mcpServers": {
    "airtable": {
      "command": "npx",
      "args": ["-y", "airtable-mcp-server"],
      "env": {
        "AIRTABLE_API_KEY": "${AIRTABLE_API_KEY}"
      }
    }
  }
}
```

### Workflow steps

1. Claim task: `Queue -> In-Progress`
2. Perform manual Webflow admin operation.
3. Complete:
   - `In-Progress -> Done`
   - set `Codex Action Result`, `Codex Action Notes`, `Codex Performed By`, `Response Text`, optional `Response Payload JSON`
4. Block when needed:
   - `In-Progress -> Blocked`
   - set `Last Error` and `Codex Action Notes`

### Required before `Done`

- `Response Text` must be non-empty
- `Codex Action Result` should be set
- `Outbound Status` should remain `ready`

## Outbound Payload Contract

When trigger conditions are satisfied, downstream agent should receive:

```json
{
  "event_type": "partner_onboarding_completed",
  "message_key": "C123:1739999999.1234",
  "slack": { "channel_id": "...", "thread_ts": "...", "message_ts": "..." },
  "workspace": { "id": "...", "name": "..." },
  "partner": { "agency_name": "...", "contact_name": "...", "contact_email": "..." },
  "result": {
    "status": "success|blocked|failed",
    "notes": "...",
    "response_text": "...",
    "response_payload": {}
  }
}
```

## Validation Checklist

- Parse success and partial cases validated in worker tests.
- Duplicate ingest for same `Message Key` remains single operational record.
- Dead-letter behavior verified by forcing Airtable failure.
- Outbound payload endpoint only returns payload for records matching trigger contract.
