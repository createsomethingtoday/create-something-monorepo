# Half Dozen Current MCP Onboarding Checklist

**Status:** Working draft  
**Audience:** session lead for current Half Dozen MCP onboarding

---

## Before the session

- confirm which MCPs are in scope for this onboarding:
  - `halfdozen-notion-mcp`
  - `halfdozen-operator-notion-mcp`
  - `halfdozen-gmail-sync`
  - `halfdozen-dm-mcp`
  - `halfdozen-zoom-sync`
  - `half-dozen-youtube-sync`
  - `halfdozen-telemetry-mcp`
- confirm named owners for each MCP family
- confirm auth/connectivity is working for live demos where required
- prepare the current onboarding pack
- prepare relevant runbooks and golden-task checks if already available

---

## During the session

- explain which workflow each MCP supports
- explain which MCPs touch internal vs client systems
- explain which MCPs include operator-only flows
- explain `auto-allow`, `approval-required`, and `block`
- call out these non-negotiables:
  - no ambiguous workspace writes in Notion
  - no bypassing DM allow-list controls
  - no end-user management of Zoom Clips session/profile auth
  - no destructive actions outside explicit workflow scope
- show where telemetry/Braintrust evidence lives

---

## User understanding check

For each team member, confirm they can answer:

- which MCP do I use for this workflow?
- what is safe to do directly?
- when do I stop and ask for review?
- what actions are blocked or operator-only?
- who do I escalate to if the MCP fails?

---

## After the session

- share the current onboarding pack
- share follow-up artifact links
- record any unresolved policy decisions
- assign owners for unresolved auth or permission gaps
- set a usage review checkpoint date

---

## Exit criteria

- workflow-to-MCP mapping is clear
- approval boundaries are understood
- operator-only actions are understood
- failure and escalation paths are understood
