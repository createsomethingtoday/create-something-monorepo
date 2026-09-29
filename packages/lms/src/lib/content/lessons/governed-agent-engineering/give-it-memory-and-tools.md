# Give It Memory and Tools

## Outcome

Add a bounded tool contract and a source ledger to the loop. You should be able to answer where a fact came from, how fresh it is, and whether the agent is allowed to use it.

## Memory is a data decision

An assistant can have several kinds of context: the current request, a short session history, retrieved records, and durable facts. These are not interchangeable. A retrieved paragraph may be evidence; a model summary of that paragraph is an interpretation. A durable profile fact may be stale or revoked. Keep the original source and its access rule next to the derived text.

For the Grantbot/GiGi design case, a device connection, a message source, and an external account each have separate consent and revocation boundaries. “The assistant has access” is too coarse. Record *which source*, *whose consent*, *for what purpose*, *for how long*, and *what happens after revocation*.

## Tool contract

Start with one read tool. Describe it before implementing it:

```json
{
  "name": "read_authorized_message",
  "input": { "message_id": "string" },
  "output": {
    "source_id": "string",
    "observed_at": "ISO-8601 timestamp",
    "text": "string",
    "permission_scope": "string"
  },
  "errors": ["not_found", "permission_denied", "source_unavailable"],
  "side_effects": "none"
}
```

This is a design example, not a live API promise. In a real server, validate the input, authenticate the caller, enforce source-specific authorization at execution time, and return structured errors. Do not treat a user-supplied `message_id` as proof of permission.

## Build a source ledger

Create `SOURCES.md` with one row per source:

| Source | Owner | Allowed purpose | Freshness | Revocation | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| Sample fixture | Learner | Local exercise | Fixed | Delete file | Stop if missing |

Then update your loop so `read_source` returns an object with `source_id`, `observed_at`, and `permission_scope`. The draft should cite `source_id`. If the scope is absent or expired, stop before drafting.

## Check your understanding

- Does the agent have a path to recover the original source, or only a summary?
- Can a revoked source still appear in a cache or model memory?
- Does the tool report denial as a structured observation rather than a generic exception?
- Can another operator distinguish data retrieval from action approval?

**Keep:** the tool contract, source ledger, and one trace showing a permitted read and a denied read.

## Go deeper

- [Memory and agents in the reference library](/reference?phase=14-agent-engineering)
- [Model Context Protocol lessons](/reference?phase=13-tools-and-protocols)
