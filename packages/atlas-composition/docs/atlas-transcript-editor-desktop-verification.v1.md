# Atlas transcript editor: private desktop verification protocol v1

This protocol is the only evidence path for the three-job Descript substitution decision. It must be performed in the local Atlas Studio Desktop app on the operator's Mac. Source recordings, transcript text, account credentials, and raw screenshots remain private; do not add them to git, Linear, public links, or chat.

## Preconditions

- The local Atlas Desktop build has passed `pnpm atlas:desktop:check`.
- Codex reports `Logged in using ChatGPT`; do not configure an API key.
- The source is synthetic or explicitly authorized private media.
- The operator has a local timer and can retain screenshots or a short screen recording privately.

## One job

Start timing when a new Atlas session/project is created. Record source class (talking head, walkthrough, or screen recording), target delivery shape, and whether the job is a synthetic rehearsal or a counted private job.

1. Create a clean Atlas session and attach a local media project. Confirm the source asset hash and timestamped transcript segments are present.
2. Open **Edit**. Confirm the transcript drawer shows the current revision and durable clip nodes.
3. Make a transcript cut. Confirm that its timeline range changes, the media graph shows the exact `cut-list → clip → timeline` path, the clip node shows a before/after diff, and the original source file remains untouched.
4. Enter a bounded Codex instruction, check the private-context confirmation, and select **Propose diff**. Review the proposal but do not treat it as applied.
5. Reject one harmless proposal or confirm the rejected state in a separate branch; verify the current revision does not change. For the selected proposal, approve then select **Apply approved diff**. Confirm the new revision and clip diff reference the proposal.
6. Ensure captions are visible and add one basic composition element permitted by the project fixture. Select **Preview / render local MP4**. Inspect the receipt: project/revision, H.264, dimensions, duration, audio-stream count, cache status, and output hash.
7. Close Atlas Desktop, reopen the same session, and reopen **Edit**. Confirm the same revision, clip diff, proposal decision, and render receipt survive. Rerender and record whether it is a cache hit or a valid fresh render.
8. Stop the timer. Perform a human quality check for cut boundaries, caption timing/readability, audio continuity, visual continuity, and export playability.

## Required private receipt

For every job, retain a private receipt with this exact structure. Redact source names and transcript text before any handoff beyond the operator.

```text
Job ID:
Date / operator:
Counted private job? (yes/no):
Source class / target output:
Start / end / elapsed operator minutes:
Atlas session ID / media project ID / revision ID:
Codex managed-account run used? (yes/no; no credentials):
Rejected proposal proof:
Approved proposal ID / applied diff ID:
Caption + composition element:
Export path (private local path):
FFprobe: codec / duration / dimensions / audio streams:
Output SHA-256 / cache status:
Reopen + rerender result:
Human quality review (pass/fail and defects):
Retries / manual fallbacks:
Codex usage / media-provider usage / render compute / operator time:
Unauthorised network, provider, public, or third-party action? (must be no):
Private screenshot or screen-recording location:
```

## Substitution decision

After three counted jobs, compare each against the current Descript baseline: total operator time, critical defects, retry/manual-fallback rate, output quality, recovery success, and landed cost. Recommend **retain Descript** unless all three jobs pass the protocol with no critical failure and the measured result meets the agreed operating threshold. Subscription changes are outside this protocol and require separate approval.
