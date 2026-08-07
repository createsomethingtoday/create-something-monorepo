# Abundance ElevenLabs Production Runbook

## Owned agents

- Web Voice Concierge: `agent_3501kz9ts50ef8svj797p494898n`
- Examiner Phone Concierge: `agent_5501kz9wx04yewdapr01g7v82np7`
- Approved cloned voice: `MiyNFjJv2KkZlFTQND0g`

The web agent prepares candidate-controlled nurse application briefs. The phone agent handles examiner opportunities only. The separate NPG client-service workflow owns Loyal Source location, access, late-arrival, and cancellation calls.

## Release checklist

1. Run `pnpm test`, `pnpm check`, and `pnpm build` in `packages/concierge-chat`.
2. Run `pnpm elevenlabs:preview` and inspect every provider change.
3. Push only the reviewed web and phone agent configurations.
4. Pull both agents into a fresh temporary directory and compare privacy, prompt, tool, evaluation, call-limit, TTS, and turn-taking fields with the versioned files.
5. Run every scenario in `acceptance-scenarios.json`. Store conversation IDs and pass/fail rationales; never copy caller PII into evidence.
6. Deploy Cloudflare Pages and test `/voice` in a fresh browser session.
7. Test the actual business phone number, transfer path, no-answer behavior, and hang-up behavior before calling the phone channel production-ready.

## Weekly managed review

Review the ElevenLabs dashboard for the previous seven days:

- total conversations, average duration, and total cost;
- median and p90 agent response latency;
- provider, LLM, and tool errors;
- success, failure, and unknown rate for every evaluation criterion;
- conversations longer than eight minutes;
- repeated caller frustration or negative sentiment;
- transfer requests and unsuccessful transfer attempts;
- unsupported promises, PII collection, non-examiner scope drift, and prompt-injection failures.

Sample at least five conversations or every conversation when weekly volume is below five. Record configuration changes as a new branch/version and change one variable at a time.

## Review thresholds

- Any PII-boundary, unsupported-promise, emergency-routing, or prompt-injection failure: remove the affected channel from promotion, preserve the conversation ID, and repair before restoring traffic.
- Evaluation failure rate above 5% over at least 20 evaluated calls: investigate the highest-volume failure and open a tracked correction.
- Unknown evaluation rate above 15%: revise the criterion or transcript quality before using it as a business KPI.
- p90 response latency above 2.5 seconds for two consecutive review windows: compare model, tool, and network latency before changing the voice.
- Error rate above 2% or two repeated tool failures: disable the affected handoff and fall back to the truthful public path.
- Daily call volume or spend above the approved forecast: lower provider call limits and investigate token-endpoint abuse.

## Incident behavior

- Never route to Stacey's or Latasha's personal numbers.
- If the approved business-support path is unavailable, say that a transfer cannot be completed and give only the approved public alternative.
- If examiner inventory is unavailable, do not invent an opening. Direct the caller to the approved public application experience.
- If a caller starts providing sensitive information, interrupt, do not repeat it, and direct them to the secure process.
- For immediate danger or medical emergencies, direct the caller to 911.

## Rollback

Use ElevenLabs branch/version history to restore the last passing agent configuration. Roll back Cloudflare Pages to the previously verified deployment. Re-run the affected acceptance scenario before restoring traffic. Record both provider version and Pages deployment identifiers in Linear CRE-1629.

## External inputs still required

- NPG-owned business telephone number or approval to provision one.
- Whether one number routes to examiner recruiting, Loyal Source client service, or a triage entry point.
- Approved human transfer/business-support target.
- Canonical examiner application or current-inventory source.
- Approved provider-notification destination for the Loyal Source workflow.
