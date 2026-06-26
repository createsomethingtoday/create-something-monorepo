# Retool Operating Model

Retool is the review surface for compact Core Ink signals. It is not the owner
of client approvals, production deploys, secret rotation, or autonomous agent
expansion.

## Decision Garden Import

Core Ink posts Decision Garden check-ins to the existing Ink bridge import path:

```text
POST /ink/operator-event
```

The firmware event type is `offline_decision_garden`. The device sends only
compact state:

- `source`
- `marked_slots`
- `cursor`
- `device_id`
- `battery`

The bridge observes the timestamp, stores the event in the Durable Object events
table, and attaches a Retool `review_packet` to the stored payload. The packet is
defined by `config/retool/operating-model.json`:

```json
{
  "source": "core-ink",
  "marked_slots": 7,
  "cursor": 6,
  "timestamp": "2026-05-10T04:31:00.000Z",
  "device_id": "core-ink",
  "battery": 82,
  "suggested_review_lane": "workflow-readiness-map",
  "blocked_actions": [
    "expand_into_config",
    "mutate_client_metadata",
    "create_client_work",
    "change_code_or_production",
    "rotate_or_write_secrets",
    "change_permissions"
  ]
}
```

`marked_slots` is intentionally just a count for v1. It is a lightweight signal
that something deserves review, not a semantic classification. Retool may route
it into an operator inbox or Workflow Readiness Map review lane, but it must not
infer task content, client context, permissions, or production intent from the
count.

## Human Approval Boundary

Until a human approves the review packet, these actions are blocked:

- expand the signal into config
- mutate client metadata
- create client work
- change code or production state
- rotate or write secrets
- change permissions

After approval, the approved packet can be used as context for a normal Linear,
repo, or Retool workflow. The approval record, not the Core Ink mark, is the
source of truth for expansion.

## Local State Boundary

Firmware local state may include sound settings, the cached operator brief,
Decision Garden marked-slot count, and Decision Garden cursor. It must not store
client names, task text, business context, secrets, approval notes, permission
changes, or code changes.

## Checks

Run the manifest check after editing Retool or Decision Garden contracts:

```bash
pnpm retool:operating-model:check
```

The check enforces the import path, packet fields, blocked actions, approval
boundary, and firmware local-state boundary.
