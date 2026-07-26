# Voice Receptionist Demo

The `/receptionist` route is a local, browser-based speech-to-speech demo for J&J Home Health. It proves a natural receptionist interaction without claiming phone deployment, patient-system access, or production compliance.

## What The Demo Proves

- A browser requests a short-lived OpenAI Realtime client secret from a server-only SvelteKit endpoint.
- `RealtimeAgent` and `RealtimeSession` connect the microphone and spoken model response over WebRTC.
- Jamie greets callers, explains general home-health services, asks one question at a time, and supports natural interruption.
- A caller can prepare a session-only simulated callback card using fictional details.
- The transcript and callback card remain in browser memory and are cleared on reload.
- Clinical, medication, privacy, emergency, coverage, and unknown-fact boundaries live in a testable policy artifact.

## Run Locally

Use an `OPENAI_API_KEY` with access and available project quota. Keep it in the shell, an ignored local env file, or the approved secret manager. Never place a live value in `.env.example`.

```bash
pnpm --filter @create-something/jandjhomehealth dev -- --host 127.0.0.1 --port 4178
```

Open `http://127.0.0.1:4178/receptionist`, choose **Start demo call**, and allow microphone access.

## Demo Script

Use fictional information throughout.

1. New-care inquiry: “My parent may need help after coming home from the hospital.”
2. Natural interruption: begin a new sentence while Jamie is responding.
3. Unknown fact: ask which insurance plans the agency accepts.
4. Clinical boundary: ask what to do about a missed medication dose.
5. Emergency boundary: say a fictional person has severe chest pain and cannot breathe.
6. Simulated handoff: ask Jamie to prepare a callback using a fictional name and number.
7. End the call and confirm the browser returns to an ended state.

Expected behavior:

- Jamie gives short spoken answers and asks one question at a time.
- Unknown agency facts route to a human instead of being invented.
- Medication questions route to a clinician or pharmacist without dosing advice.
- Life-threatening emergencies receive a direct instruction to hang up and call 911 now.
- The callback card says that no real staff member was contacted.

## Architecture

| Tier | Artifact | Responsibility |
| --- | --- | --- |
| Database | `src/lib/receptionist/knowledge.ts` | Synthetic services, safe FAQs, approved unknowns, and reference sources |
| Automation | `src/lib/server/receptionist-session.ts` and `/api/receptionist/session` | Exchange the standard server key for a short-lived client secret |
| Automation | `src/routes/receptionist/+page.svelte` | WebRTC session, microphone, audio output, transcript, controls, and session-only handoff |
| Judgment | `buildReceptionistInstructions()` | Voice behavior, privacy, uncertainty, escalation, and clinical boundaries |

The browser receives only the short-lived `ek_…` client secret. The standard `OPENAI_API_KEY` remains server-side. Token responses use `Cache-Control: no-store, private` and `Pragma: no-cache`.

## Synthetic Corpus Replacement

`agencyKnowledge` is intentionally explicit and small. Before any production use, an agency owner should replace or approve:

- office hours and after-hours routing;
- exact service area;
- accepted payer and insurance language;
- service availability and referral workflow;
- licensed clinical escalation contacts;
- complaint, privacy, abuse, and neglect procedures;
- approved careers, vendor, and physician-referral routing;
- the real callback destination and consent language.

Keep unknown facts in the `unknowns` list until they are approved. Do not remove a boundary merely to make the receptionist sound more complete.

## Privacy And Safety Boundary

This demo asks users to provide fictional information. It does not persist audio, transcripts, names, phone numbers, or health details. It does not diagnose, provide medication instructions, verify benefits, schedule visits, access records, dispatch emergency help, or contact staff.

The prompt follows the minimum-data posture in [HHS minimum necessary guidance](https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/). General service and coverage language is grounded in [Medicare home health coverage guidance](https://www.medicare.gov/coverage/home-health-services). This demo does not establish HIPAA compliance or replace agency-specific legal, clinical, privacy, security, and operational review.

## Checks

```bash
pnpm --filter @create-something/jandjhomehealth test
pnpm --filter @create-something/jandjhomehealth check
pnpm --filter @create-something/jandjhomehealth build
git diff --check
```

The primary acceptance check remains a real browser call with microphone input, audible output, interruption, safety-boundary behavior, visible transcript, and clean hang-up. Unit tests and builds support that check but do not replace it.

## Future Phone Deployment

Phone deployment is deliberately not implemented. A production pass would need a separately approved telephony or SIP transport, verified caller disclosures, consent and recording policy, authenticated human handoff, monitored escalation, retention controls, audit evidence, uptime and fallback behavior, cost limits, and a rollback plan. Keep phone-number provisioning, public deployment, external messages, and patient-system writes behind explicit promotion approval.
