# CREATE SOMETHING Ltd

**createsomething.ltd** — The Operating Library for AI Work

The user-facing operating library for people responsible for recurring work with AI. Start with one workflow; leave with a playbook that names the owner, allowed work, wait point, and proof. The Canon remains the deeper standard behind every artifact.

---

## The Core Promise

**Run AI work people can trust.**

`.ltd` gives operators, functional leads, founders, and team members a shared operating picture before work runs:

| Artifact | Job |
|----------|-----|
| **Playbook** | Names the outcome, owner, approved work, wait point, and receipt. |
| **Runbook** | Gives the live steps, checks, exceptions, and recovery path. |
| **Readiness check** | Finds ambiguity, missing access, unnamed ownership, mistrust, and absent proof. |
| **Canon** | Explains the standards that make the operational artifacts worth keeping. |

## The Core Thesis

**MCP consumption is commoditized. MCP creation is not.**

Installing and using AI tools keeps getting easier. The scarce work is deciding what should connect, what can run, when a person must decide, and how the result remains inspectable. A useful agent needs a chassis: data access, authority boundaries, approvals, blocked states, and proof that the work stayed inside its lane.

The entry point to automation is connectivity, not intelligence.

## The Subtractive Triad

Every creation exists simultaneously at three levels:

| Level | Discipline | Question | Action |
|-------|------------|----------|--------|
| **Implementation** | DRY | "Have I built this before?" | Unify |
| **Artifact** | Rams | "Does this earn its existence?" | Remove |
| **System** | Heidegger | "Does this serve the whole?" | Reconnect |

**Meta-principle**: Creation is the discipline of removing what obscures.

## Ecosystem Position

`.ltd` builds the shared language and useful artifacts that earn a returning user base. It remains grounded in Canon while sending people to the property that can answer their next question:

```
.ltd (Operating library) → playbooks, runbooks, readiness →
.io (Research) → evidence, field notes, and validated patterns →
.space (Practice) → rehearsal and live tools →
.agency (Delivery) → a dedicated partner for a named workflow →
.ltd (Canon) → retains the reusable judgment from the work
```

## Agent Legibility Contract

| Field | Value |
|-------|-------|
| Entry point | `src/routes/+page.svelte`, `src/routes/playbooks/+page.svelte`, `src/routes/readiness/+page.svelte` |
| Boot command | `pnpm dev` |
| Smoke command | `pnpm check` |
| Validation surfaces | Svelte check output, route preview, Cloudflare Pages build output |
| UI validation path | `/`, `/playbooks`, `/playbooks/exception-handoff`, `/readiness` |
| Escalation rule | stop if a change alters canon, voice, or standards semantics without an explicit judgment artifact or operator decision |

---

## Development

```bash
# Start dev server
pnpm dev --filter=ltd

# Type check
pnpm --filter=ltd exec tsc --noEmit

# Deploy
pnpm --filter=ltd build && wrangler pages deploy packages/ltd/.svelte-kit/cloudflare --project-name=createsomething-ltd
```

---

## Related

- [The MCP-First Thesis](../../docs/MCP_FIRST_THESIS.md) — Full strategic context
- [CLAUDE.md](../../CLAUDE.md) — Monorepo standards and philosophy
- [Canon Design System](https://createsomething.ltd/canon) — Visual philosophy
