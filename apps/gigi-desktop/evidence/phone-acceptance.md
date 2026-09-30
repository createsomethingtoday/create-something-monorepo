# Phone acceptance — pending

Owner: Micah. Run only after the exact installed build passes native desktop acceptance. Local signing/notarization remains separately deferred. Record the app build SHA-256 and provider/session used with the receipt; do not capture account tokens or private message content.

1. In GiGi, create a clearly synthetic gig/shift, a synthetic contact, and a task. Link the contact and task to the gig. Give the gig a known test fee and supported currency.
2. In Settings, prepare agent access and follow the exact generated command for your signed-in Codex or Claude Code subscription. Start a new session, load the GiGi skill, and ask it to retrieve the test gig and its linked records. Verify the same IDs and fee shown on the desktop. Approve one bounded local record edit and verify its saved readback.
3. Keep the Mac awake, online, and running GiGi plus the agent session. Start the provider's supported remote session: [Codex remote connections](https://learn.chatgpt.com/docs/remote-connections) or [Claude Code Remote Control](https://code.claude.com/docs/en/remote-control). Provider eligibility and subscription limits still apply.
4. On the physical phone, turn Wi-Fi off and use cellular. Connect to that desktop session with the same provider account. Ask for the test gig, contact, and fee. Pass only if the returned IDs/values match the desktop's current SQLite records.
5. Approve changing the test task's title from the phone. Confirm the updated title in GiGi on the Mac, then quit/reopen GiGi and confirm it persists.
6. Briefly disconnect the desktop from the network. Confirm the phone reports unavailable/reconnecting and does not invent success. Reconnect, retrieve the task, and confirm there is one updated record with no duplicate mutation.

Receipt: exact build, provider, physical phone model/OS, cellular confirmed, read match, approved edit match, restart match, disconnect behavior, reconnect match, pass/fail and any error. Desktop screenshots or emulated phone dimensions do not supply this evidence.

## In-progress receipt — 2026-09-30

Installed executable SHA-256: `1687ccb5ebf27d91e1ae0205463acade8c1abb2d7e5b693a5701f133aa81c4cd`. The native desktop detail currently shows `Acceptance: Second showcase`, a USD 90 flat fee, and links to `Acceptance: Second venue contact` and `Acceptance: Confirm second showcase crew`. After being asked to connect from the physical phone with Wi-Fi off through the same ChatGPT/Codex host, the user reported those same three values. This is a reported read match; phone model/OS, explicit cellular confirmation and exact record IDs are still pending.

The next requested phone action is a single approved title change on the existing linked task to `Acceptance: Crew confirmed by phone`, preserving its status and relationships, followed by tool readback. Native confirmation, full restart, offline/reconnect behavior and the final pass/fail receipt remain pending. No completed physical-device acceptance is claimed.
