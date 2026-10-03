# Partner App Flag Sync (local launchd)

Daily sync of the "Tech Partners - Business Development" sheet → Airtable `🤝Partnership App` flags (`appMoIgXMTTTNIc3p`/`tblRwzpWoLgE9MrUm`), reporting to #app-review-exceptions (`C0BN54FQU84`) only when something changed.

Runs headless via `claude -p` (sonnet) with the claude.ai connectors (Zapier, Airtable, Slack) — verified these attach in headless runs 2026-08-21. Replaces cloud routine `trig_01Cxr9MbmzDcybJRcKsmsPtL`, **disabled 2026-08-21** after recurring partial-connector-toolset outages (8/10–14, 8/19, 8/21); re-enable it via `RemoteTrigger update {enabled: true}` to roll back.

## Files

- `prompt.md` — the full runbook the headless run follows (matching rules, traps, safety valve, Slack rules). Keep rulings (Shea's Knock AI / Social Intents calls, Greg's Candid Leap / Algolia call) in sync with the cloud routine's prompt if that one is ever revived.
  - Human rulings live in Step 3 and are the only way the sync learns. When Greg Kelly or Shea Sisco settles an ambiguous candidate in Slack, add it there or the run keeps asking (or worse, keeps excluding it).
- `run.sh` — launchd entrypoint; logs to `runs/sync-YYYY-MM-DD.log`, greps on a final `RECEIPT:` line.
- `~/Library/LaunchAgents/com.webflow.partner-flag-sync.plist` — daily 8:05 AM local time, plus `RunAtLoad` for catch-up.

## Catch-up behavior (sleep / reboot)

- **Asleep at 8:05** → launchd natively coalesces missed calendar firings and runs once on wake.
- **Powered off / logged out at 8:05** → `RunAtLoad` fires when the agent loads at next login.
- Both are safe because `run.sh` guards on today's `RECEIPT:` line (already ran → skip) and holds a `runs/.lock` dir against near-simultaneous firings (stale after 30 min). Verified 2026-08-21: RunAtLoad fired on bootstrap and skipped cleanly.

## Ops

```bash
# Run now
launchctl kickstart gui/$UID/com.webflow.partner-flag-sync

# Pause / resume
launchctl bootout gui/$UID/com.webflow.partner-flag-sync
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.webflow.partner-flag-sync.plist

# Check today's result
grep RECEIPT runs/sync-$(date +%F).log
```

Failure mode is laptop-dependent by design: if the Mac is asleep at 8:05, launchd coalesces and fires once on wake; if the run errors, the log has the trail and the prompt's failure handling posts a diagnostic to the channel when it can. A missed day is low-stakes (precision over recall); a wrong flag is not — the safety valve (>15 candidates = report, don't write) and the never-unflag rule guard that.
