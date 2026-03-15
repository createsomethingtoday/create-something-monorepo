# Services Review: Nicely Said Audit

*What we say vs. what we should say*

---

## The Standard

From voice-canon.md:
- Lead with outcome: "155 scripts → 13" not "Applying methodology"
- Specific deliverables, not vague promises
- What you get, not what we do

From the voiceover:
- "The training is how your team learns to run it. The playbook is documentation. But the deliverable is the system itself."

---

## Service 1: Web Development ($5,000+)

### Current

> 3 weeks to production. Sub-100ms response. We build the infrastructure agents need to work reliably—clean APIs, typed data, observable state.

### Assessment

**What's working:**
- Leads with timeline: "3 weeks to production"
- Specific metric: "Sub-100ms response"

**What's missing:**
- What do they actually get? The description says "we build" but doesn't say what they own at the end.
- No mention of the stack: SvelteKit, Cloudflare Pages, the component library

### Suggested Rewrite

> 3 weeks to production. You get a SvelteKit codebase on Cloudflare edge. Sub-100ms response. Clean APIs your agents can work with. The code is yours.

### `howItWorks` Review

Current:
- Production-proven component library
- Type-safe TypeScript throughout
- Cloudflare Pages (global edge, sub-100ms)
- Automation audit included—we map what agents could handle next

**Better:**
- SvelteKit codebase you own
- Canon component library (the same one running our sites)
- Cloudflare Pages deployment configured
- Automation audit: we identify what agents can handle next

---

## Service 2: Workflow Automation ($15,000+)

### Current

> 120 hours/week of research became automated. We build systems that process data, make decisions, and talk to your tools—the foundation before agents make sense.

### Assessment

**What's working:**
- Great lead: "120 hours/week of research became automated"
- Explains the progression: "foundation before agents make sense"

**What's missing:**
- What infrastructure do they get?
- "We build systems" is vague. What systems?

### Suggested Rewrite

> 120 hours/week became automated. You get Cloudflare Workers running your logic, OAuth integrations to your tools, and a dashboard showing time saved. The foundation before agents make sense.

### `howItWorks` Review

Current:
- Claude Code for automation design
- Cloudflare Workers for execution
- OAuth integrations for your existing tools
- Metrics you can verify: time saved, errors caught, cost per run

**Assessment:** This is actually good. Specific tools named. Could add "You own the Workers code" to make ownership clearer.

---

## Service 3: Accountable Agents ($35,000+)

### Current

> 155 scripts became 13. 92% cost reduction. Agents that run for hours, make decisions, recover from failures, and prove what they did. The guardrails your compliance team will approve.

### Assessment

**What's working:**
- Excellent lead: "155 scripts became 13. 92% cost reduction."
- Addresses compliance concern directly

**What's missing:**
- What do they actually get installed?
- "Agents that run" describes behavior, not deliverable

### Suggested Rewrite

> 155 scripts became 13. 92% cost reduction. You get Durable Objects workflows that run for hours, checkpoint on failure, and log every decision. Agents your compliance team can audit.

### `howItWorks` Review

Current:
- Durable execution (hours to days)
- Checkpointing—agents resume after failures
- Observable decision trails for every action
- Cost control and production monitoring

**Assessment:** Good specificity. Add ownership: "Your Durable Objects, in your Cloudflare account."

---

## Service 4: Systems Partnership ($5,000/month)

### Current

> 2-4 new features per month. 4-hour response. We maintain what runs, optimize what costs too much, and ship new capabilities you did not have to spec.

### Assessment

**What's working:**
- Specific output: "2-4 new features per month"
- Response time commitment: "4-hour response"

**What's missing:**
- This is ongoing access to patterns and expertise, but doesn't say that
- What's the relationship to the monorepo/infrastructure evolution?

### Suggested Rewrite

> 2-4 new features per month. 4-hour response. Ongoing access to the patterns as we evolve them. Your systems stay current without new hiring.

### `howItWorks` Review

Current:
- System maintenance and monitoring
- Cost and speed optimization
- 2-4 new features per month
- Quarterly research collaboration—your systems become case studies

**Assessment:** "Quarterly research collaboration" is good. Could clarify: "Early access to new patterns from our research."

---

## Service 5: Team Enablement ($50,000+)

### Current

> Your team ships an AI system in 90 days. Hands-on training, a real project in production, and a playbook you own. No vendor lock-in.

### Assessment

**What's working:**
- Clear timeline: "90 days"
- "No vendor lock-in" addresses key concern

**What's missing:**
- THE MAIN DELIVERABLE. They get the infrastructure itself, not just training.
- No mention of Loom, Beads, Harness, CLAUDE.md

### Suggested Rewrite

> 90 days. Your team owns AI infrastructure that works.
>
> You get: Loom for multi-agent coordination. Beads for issue tracking. Harness patterns for autonomous work. Your own CLAUDE.md with your business rules.
>
> We train your team to run it. Then we leave.

### `howItWorks` Review

Current:
- Current state assessment and workflow audit
- Hands-on Claude Code training
- Guided project: your team ships something real
- Internal playbook you keep forever

**This needs the most work.** Should be:
- Loom orchestrator configured for your workflows
- Beads issue tracking with your conventions
- Harness patterns for your team's work style
- Your CLAUDE.md with your business rules
- 90 days of guided implementation
- Internal playbook documenting your setup

---

## Service 6: Advisory ($10,000/month)

### Current

> Monthly office hours. Quarterly architecture reviews. 4-hour response. An outside perspective when you are too close to the problem.

### Assessment

**What's working:**
- Clear cadence: "Monthly office hours. Quarterly architecture reviews."
- Response time: "4-hour response"

**What's missing:**
- What do they actually get access to?
- "Early access to our research" is in howItWorks but not the description

### Suggested Rewrite

> Monthly office hours. Quarterly architecture reviews. 4-hour response. Early access to patterns and research as we develop them. Outside perspective when you're too close to the problem.

---

## Summary: What's Missing Across All Services

| Gap | Services Affected | Fix |
|-----|-------------------|-----|
| **Ownership unclear** | All | Add "You get..." or "The code is yours" |
| **Infrastructure unnamed** | Most | Name the tools: Loom, Beads, Harness, SvelteKit, Cloudflare |
| **Deliverable vs. process** | Team Enablement especially | Lead with what they own, not what we do |
| **Clawdbot context** | None | Consider: "Think Clawdbot, but for your business" |

---

## Recommended Changes

### Priority 1: Team Enablement
This is the flagship "port the infrastructure" service. It should explicitly list:
- Loom
- Beads
- Harness
- CLAUDE.md
- Skills/MCP integrations

### Priority 2: Add `deliverables` Array
The Service interface already has an optional `deliverables?: string[]` field. Use it for all consulting services, not just products.

### Priority 3: Description Pattern
Every description should follow: **Outcome. What you get. Why it matters.**

Example:
> 155 scripts → 13. You get Durable Objects, checkpoints, decision logs. Agents your compliance team can audit.

---

## Execution Plan

1. Update Team Enablement first (biggest gap)
2. Add `deliverables` array to all consulting services
3. Revise descriptions to lead with "You get..."
4. Review and deploy
