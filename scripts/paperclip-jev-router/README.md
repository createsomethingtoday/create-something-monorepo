# Jev routing advisor for Paperclip

This is a bounded process-adapter command for the `create-something` Paperclip instance. It recommends a model lane; it does not assign work, change an issue, authorize a write, or decide completion.

The Paperclip run must be tied to exactly one assigned issue. The wrapper resolves that issue from `PAPERCLIP_TASK_ID` or, when the process adapter omits it, from the run's linked issues. It accepts API bases with or without `/api` and sends the run ID header on Paperclip requests. Its description must contain exactly one `jev-routing` fenced JSON packet with exactly `taskId`, `summary`, `goal`, and `riskFlags`. `taskId` must equal the resolved issue ID. The packet is the only task content sent to TypeSafe. Use a task-relevant summary without credentials or unnecessary client data. Supported risk flags are `security_boundary`, `identity`, `payments`, `production_release`, and `destructive`.

Exact risk rules bypass Jev: `security_boundary` recommends Daybreak; identity, payments, production release, and destructive work recommend Astra. Each retains a human gate. Other packets receive a typed Jev choice among Luna, Sol, Astra, Daybreak, and abstain. Every outcome is advisory. A malformed response or provider failure abstains. Missing task context or credential exits with a clear error. In Paperclip, the wrapper posts a structured issue comment; a repeat run reuses an existing receipt from this agent for the same packet hash, avoiding a duplicate Jev call.

The process adapter should invoke `python3` with `scripts/paperclip-jev-router/route.py` from a stable merged monorepo checkout. Bind `TYPESAFE_API_KEY` through a Paperclip company secret reference in the adapter environment. Do not put it in agent instructions, repository files, command arguments, or a startup MCP launcher. Keep automatic heartbeat disabled for the initial canary. Assign one scoped issue with an explicit packet and inspect the native run receipt before enabling further work.

Validation without a provider call:

```bash
python3 -m unittest discover -s scripts/paperclip-jev-router -p 'test_*.py' -v
python3 -m py_compile scripts/paperclip-jev-router/route.py
```

The first production canary must confirm the secret binding, the exact task ID, a valid `jev-1.13.0` response, and a Paperclip run receipt. Then compare recommendations against independently labeled historical tasks. Model confidence is not authority or proof that a task is complete.
