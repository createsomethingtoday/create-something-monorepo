# Security Comparison: Clawdbot vs CREATE SOMETHING

*Response to Rahul Sood's security concerns*

---

## The Concerns Rahul Raised

| Concern | Clawdbot Risk |
|---------|---------------|
| Full shell access | Arbitrary command execution on your machine |
| Browser control | Your logged-in sessions exposed |
| File system access | SSH keys, credentials, everything |
| Email/calendar | PII exposure |
| Prompt injection | Any document can inject malicious instructions |
| Messaging attack surface | Any DM becomes agent input |
| No guardrails | Maximum capability, maximum risk |

---

## How CREATE SOMETHING Differs

### 1. Scope: Codebase, Not Your Life

| Clawdbot | CREATE SOMETHING |
|----------|------------------|
| Your entire machine | Your monorepo |
| SSH keys, credentials, files | Source code |
| Email, calendar, contacts | Git history |
| Bank logins, medical records | TypeScript files |

**The blast radius is different.**

Clawdbot compromised = your digital life compromised.

CREATE SOMETHING compromised = your codebase compromised.

Both are bad. One is catastrophic.

---

### 2. Attack Surface: IDE, Not Messaging Apps

Rahul's concern:

> "Random person DMs you? That's now input to a system with shell access to your machine."

**This doesn't exist in CREATE SOMETHING.**

| Clawdbot | CREATE SOMETHING |
|----------|------------------|
| WhatsApp, Telegram, Discord, iMessage | Cursor, VS Code, Claude Code |
| Any DM is agent input | Only your IDE commands |
| Trust boundary = "anyone who can message you" | Trust boundary = "you" |

No random DMs. No group chat weirdness. The agent only acts when you invoke it in your IDE.

---

### 3. Prompt Injection: Reduced, Not Eliminated

Rahul's concern:

> "You ask Clawdbot to summarize a PDF... That PDF contains hidden text: 'Ignore previous instructions.'"

**This risk still exists in CREATE SOMETHING.**

If someone commits a malicious file to your repo with hidden prompt injection, the agent could be compromised.

**But the mitigations are better:**

| Mitigation | How It Helps |
|------------|--------------|
| **Ground MCP** | Requires verification before claims. Agent must check, then claim. |
| **Quality Gates** | Security reviewer, Architecture reviewer catch suspicious changes |
| **Git** | Every action produces commits. Full audit trail. Rollback is trivial. |
| **Code Review** | PRs catch injection attempts before merge |
| **Smaller corpus** | Agent reads your code, not every PDF and email in your life |

The attack vector is narrower: source files you control, not arbitrary documents from the internet.

---

### 4. Guardrails: Explicit, Not Absent

Rahul's observation:

> "Zero guardrails by design. The developers are completely upfront about this."

**CREATE SOMETHING has explicit guardrails:**

| Guardrail | What It Does |
|-----------|--------------|
| **Security Reviewer** | Haiku model reviews for auth issues, secrets, injection |
| **Architecture Reviewer** | Opus reviews for structural problems |
| **Quality Reviewer** | Sonnet reviews for conventions, tests |
| **Harness Checkpoints** | Every 3 sessions, mandatory review |
| **Self-Healing Baseline** | Tests must pass before work starts |

These aren't security theater. They're automated code review that runs on every session.

---

### 5. Browser Control: Isolated, Not Logged-In

Rahul's concern:

> "Browser control with your logged-in sessions"

**CREATE SOMETHING uses isolated browser instances:**

| Clawdbot | CREATE SOMETHING |
|----------|------------------|
| Controls your actual browser | Playwright/Puppeteer instances |
| Your logged-in sessions | Fresh browser contexts |
| Your cookies, passwords | Test-only automation |

The browser MCP tools are for testing your app, not browsing with your credentials.

---

### 6. Audit Trail: Git-Native

Rahul's recommendation:

> "Keep the workspace like a git repo. If the agent learns something wrong or gets poisoned context, you can roll back."

**CREATE SOMETHING is git-native by default.**

| Clawdbot | CREATE SOMETHING |
|----------|------------------|
| Persistent memory (vector DB) | Git commits |
| Rollback = manual cleanup | Rollback = `git reset` |
| "Poisoned context" persists | Bad commits are revertable |

Every agent action produces commits. Full history. Built-in rollback.

---

## Financial Workflows: Code, Not Prompts

Rahul's implicit concern:

> "People are running autonomous agents on machines with their bank credentials"

**Clawdbot approach**: Agent has general access to financial accounts. Can execute arbitrary operations via browser control or API access.

**CREATE SOMETHING approach**: Financial workflows are **private MCP tools or functions** built by our team.

| Clawdbot | CREATE SOMETHING |
|----------|------------------|
| Agent improvises financial operations | Agent calls defined functions |
| Prompt can trigger arbitrary actions | Interface is explicit and bounded |
| "Transfer $10k" could work | Must use `stripe_create_charge(amount, customer)` |
| No code review of operations | Every function is audited code |

**Why this matters:**

The agent cannot invent new financial capabilities. It can only call the functions we wrote, reviewed, and deployed.

```typescript
// Example: Stripe MCP tool
// - Explicit parameters
// - Bounded capabilities  
// - Code-reviewed logic
// - Audit trail in logs

export async function stripe_create_charge(
  amount: number,
  customer_id: string,
  description: string
): Promise<ChargeResult> {
  // Validation, limits, logging all in code
  // Not in prompts that can be injected
}
```

**Prompt injection cannot:**
- Create new financial functions
- Bypass validation logic
- Exceed coded limits
- Skip audit logging

The financial capability is in the code, not the model's discretion.

---

## What's Still Risky

**Honest assessment:**

| Risk | Status |
|------|--------|
| Prompt injection | Reduced, not eliminated |
| Shell access | Still exists (within repo) |
| Malicious dependencies | npm/pnpm could pull bad packages |
| Credential leakage | .env files could be read/exposed |
| LLM hallucination | Agent could write buggy code |

**The fundamental problem Rahul identifies is real:**

> "We're at this weird moment where the tools are way ahead of the security models."

CREATE SOMETHING doesn't solve prompt injection. No one has. But it:
- Reduces the blast radius
- Removes the messaging attack surface
- Adds explicit guardrails
- Provides git-native audit trails
- Scopes access to code, not life

---

## The Positioning

**Clawdbot**: Maximum capability for your personal life. Maximum risk.

**CREATE SOMETHING**: Scoped capability for your codebase. Manageable risk.

Rahul's advice applies to both:

> "Don't give it access to anything you wouldn't give a new contractor on day one."

With CREATE SOMETHING, a new contractor would get:
- Read/write access to the monorepo
- Ability to run tests and builds
- No access to your email, bank, or SSH keys

That's a reasonable trust boundary for a coding assistant.

---

## What We Should Say

On the services page or in Team Enablement materials:

> "Unlike personal AI assistants that access your entire digital life, CREATE SOMETHING infrastructure operates within your codebase. Quality gates review every session. Git provides rollback. The blast radius is your repo, not your life."

This is honest positioning that addresses legitimate security concerns without pretending the risks don't exist.

---

## The Short Answer

**Does CREATE SOMETHING resolve Clawdbot's security concerns?**

- ✅ Eliminates messaging attack surface
- ✅ Reduces blast radius (code, not life)
- ✅ Adds explicit quality gate guardrails
- ✅ Provides git-native audit trails
- ✅ Uses isolated browser instances
- ✅ Financial workflows are private MCP tools (code, not prompts)
- ⚠️ Prompt injection still possible (but narrower vectors)
- ⚠️ Shell access still exists (but scoped to repo)

**Better, not perfect.** But "better" is meaningful when the alternative is "your entire digital life."

---

## For Client Conversations

When a prospect raises Clawdbot security concerns:

> "We've seen those concerns. Here's how we address them:
>
> **Scope**: Our agents work on your codebase, not your entire digital life. The blast radius is your repo, not your bank account.
>
> **Attack surface**: No messaging apps. You invoke the agent in your IDE, not via Telegram DMs from strangers.
>
> **Financial workflows**: Any sensitive operations are built as private MCP tools by our team. The agent calls audited functions with explicit parameters—it can't improvise new financial capabilities.
>
> **Guardrails**: Security reviewer, architecture reviewer, quality gates. Not optional.
>
> **Audit trail**: Everything is git. Rollback is trivial.
>
> We're not claiming perfect safety. But the trust boundary is 'contractor with repo access,' not 'someone with the keys to your life.'"
