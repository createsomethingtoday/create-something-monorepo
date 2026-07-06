# Half Dozen MCP Onboarding Example

**Status:** Example  
**Audience:** Half Dozen team  
**Scope:** selected MCPs for internal adoption

---

## MCP inventory snapshot

| MCP | Primary users | Primary workflow | Safe actions | Approval-required actions | Blocked actions | Owner |
|-----|---------------|------------------|--------------|---------------------------|-----------------|-------|
| `halfdozen-notion-mcp` | operators, coordinators | read from Half Dozen workspace and create/update in client Notion workspace | reading workspace state, drafting content, preparing structured entries | updates that change client-facing project state if team policy requires review | deleting client records or writing to the wrong workspace | Half Dozen operator lead |
| `halfdozen-gmail-sync` | ops, relationship managers | Gmail to Notion interaction and contact sync | read/search/sync preview | write paths that create or update canonical records when policy requires review | destructive contact or interaction changes outside approved flow | workflow owner |
| `halfdozen-zoom-sync` | meeting capture team | Zoom clips extraction and Notion sync | clip lookup, transcript retrieval, draft analysis | syncs that publish to canonical client workspace when review is required | destructive edits outside sync scope | technical owner |
| `halfdozen-telemetry-mcp` | operators, maintainers | monitor MCP health and usage | querying health, usage, and incident status | none in normal use | mutating operational state outside approved admin flow | MCP maintainer |

---

## Example live onboarding flow

### 1. Frame the workflow

- `halfdozen-notion-mcp` is for working across the Half Dozen internal workspace and a client workspace from one MCP surface
- `halfdozen-gmail-sync` is for syncing interaction data into the operating system, not for arbitrary mailbox manipulation
- `halfdozen-zoom-sync` is for governed meeting capture workflows
- `halfdozen-telemetry-mcp` is for seeing MCP fleet health and issues

### 2. Frame the policy boundary

- auto-allow:
  - reading workspace or workflow state
  - generating drafts
  - querying health data
- approval-required:
  - client-facing sends
  - writes to canonical client systems when human review is required
  - exception creation or state changes that affect downstream work
- block:
  - destructive record deletion
  - refund-like or financially destructive actions
  - writing into the wrong workspace or system on ambiguous context

### 3. Frame the failure path

- if workspace or source state is ambiguous, stop and escalate
- if auth fails, switch to fallback and notify owner
- if a write action is uncertain, do not improvise; use approval path

### 4. Frame evidence

- use runbooks for operator response
- use golden-task checks for validation
- use Langfuse for traces/evals where enabled

---

## Example completion criteria

- each team member can name which MCP supports which workflow
- each team member can identify one auto-allow action, one approval-required action, and one blocked action
- each team member knows the fallback owner for the MCPs they use
