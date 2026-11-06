# Abundance ElevenLabs Production Runbook

## Owned agents

- Web Voice Concierge: `agent_3501kz9ts50ef8svj797p494898n`
- Examiner Phone Concierge: `agent_5501kz9wx04yewdapr01g7v82np7`
- NPG Client Service Phone Concierge: `agent_5101kzf7qxfzewrtr9vyw62d5xby`
- Approved cloned voice: `MiyNFjJv2KkZlFTQND0g`

The web agent prepares candidate-controlled nurse application briefs. The NPG client-service agent is the main phone entry point for Loyal Source location, access, late-arrival, and cancellation calls. It transfers examiner-interest callers to the examiner-only agent. The business phone number is `+1 817 765 3279` (`phnum_4501kzf5q9a4efmt3jx3sf4r4xtj`). Do not describe the line as publicly launched while its Twilio account remains in trial mode.

## Current provider checkpoint — 2026-08-07

- ElevenLabs phone-number readback assigns the business number to the NPG Client Service Phone Concierge.
- Agent readback includes the caller-safe location webhook and the `transfer_to_agent` built-in system tool targeting the Examiner Phone Concierge.
- Strict provider suite `suite_8701kzf97g6we5qajsg82x46g9k6` passed location safety, attendance truthfulness, examiner transfer, and emergency redirect: 4/4.
- The cloned voice includes the original sample and the new conversational-range sample described in `voice-sample-manifest.json`.
- A controlled verified-caller phone test and blinded human listening review remain required before production-quality acceptance.

## Release checklist

1. Run `pnpm test`, `pnpm check`, and `pnpm build` in `packages/concierge-chat`.
2. Run `pnpm elevenlabs:preview` and inspect every provider change.
3. Push only the reviewed web, NPG phone, and examiner phone agent configurations.
4. Pull all three agents into a fresh temporary directory and compare privacy, prompt, tool, evaluation, call-limit, TTS, and turn-taking fields with the versioned files.
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
- Never claim that an attendance notice reached a provider unless an approved tool returns a successful receipt.
- Never claim that a cancellation or reschedule was completed from this line.
- If the approved business-support path is unavailable, say that a transfer cannot be completed and give only the approved public alternative.
- If examiner inventory is unavailable, do not invent an opening. Direct the caller to the approved public application experience.
- If a caller starts providing sensitive information, interrupt, do not repeat it, and direct them to the secure process.
- For immediate danger or medical emergencies, direct the caller to 911.

## Rollback

Use ElevenLabs branch/version history to restore the last passing agent configuration. For a phone-routing incident, reassign `phnum_4501kzf5q9a4efmt3jx3sf4r4xtj` to the Examiner Phone Concierge (`agent_5501kz9wx04yewdapr01g7v82np7`) while the NPG entry point is repaired. Roll back Cloudflare Pages to the previously verified deployment when the web surface is affected. Re-run the affected acceptance scenario before restoring traffic. Record provider version and Pages deployment identifiers in Linear CRE-1635.

## External inputs still required

- Twilio trial upgrade before the number is represented as publicly launched.
- Approved human transfer/business-support target.
- Canonical examiner application or current-inventory source.
- Approved provider-notification destination for the Loyal Source workflow.
