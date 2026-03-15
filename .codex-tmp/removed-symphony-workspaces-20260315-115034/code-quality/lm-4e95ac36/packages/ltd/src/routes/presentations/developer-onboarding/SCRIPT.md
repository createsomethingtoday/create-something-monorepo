# Developer Onboarding Video Script

**Presentation:** https://createsomething.ltd/presentations/developer-onboarding
**Duration:** ~5-6 minutes
**Format:** Slide presentation with terminal split-screen demo

---

## Slide 01 — System Architect

**Visual:** Title slide

**Voiceover:**
> System Architect. The onboarding process. 5 minutes. 3 commands.

---

## Slide 02 — System Architect

**Visual:** Content slide with role definition

**Voiceover:**
> Not developer. Not integrator. System Architect. You build compound workflows — systems where multiple services coordinate to produce outcomes users couldn't achieve alone. Meeting ends — four services update. Payment received — CRM plus Notion plus Slack. Form submitted — AI synthesis plus distribution.

---

## Slide 03 — The Opportunity

**Visual:** Content slide with integration gaps

**Voiceover:**
> WORKWAY fills gaps that major platforms ignore. Gmail to Notion: AI Connector is search-only. Slack to Notion: one-way integration only. Zoom to Notion: no official integration exists. CRM syncing: wide open territory.
>
> You keep 100% of subscription revenue. Platform charges per execution.

---

## Slide 04 — Controlled Rollout

**Visual:** Content slide

**Voiceover:**
> We invite developers in batches of 10. Deliberate. Not artificial scarcity. Each batch receives direct support. We learn from each cohort. The platform improves before the next batch. Quality over quantity. Weniger, aber besser.

---

## Slide 05 — Web Signup Option

**Visual:** ASCII diagram with web flow

**Voiceover:**
> Option A: Web signup. Visit workway.co/waitlist. Enter name and email. Receive confirmation. Wait for invitation — batches of 10. Simple. Minimal friction.

---

## Slide 06 — CLI Flow

**Visual:** Content slide

**Voiceover:**
> The CLI captures more about you. Your profile becomes your professional presence. Technical background. Integrations you work with. Workflows you want to build. GitHub, portfolio links.
>
> This data helps us match you with client work. WORKWAY isn't just a marketplace — it's a system for finding projects.

---

## Slide 07 — Step 1: Install

**Visual:** Code slide with install command

**Voiceover:**
> Step 1: Install. npm install -g @workwayco/cli. Requires Node.js 18 or higher. One global package.

**Terminal Action:**
```bash
npm install -g @workwayco/cli
```

---

## Slide 08 — Step 2: Create Profile

**Visual:** Code slide with init command

**Voiceover:**
> Step 2: Create your profile. workway developer init. Interactive prompts. Saves to ~/.workway/developer-profile.json.

**Terminal Action:**
```bash
workway developer init
```
*Show the interactive prompts*

---

## Slide 09 — Profile Structure

**Visual:** ASCII table with profile sections

**Voiceover:**
> The profile has four sections. Identity: name, email, company optional. Background: what you build, GitHub, portfolio. Workflow Focus: integrations, workflow ideas. Why WORKWAY: your motivation — helps us understand you.
>
> All fields except email are editable later. The profile lives locally until you submit.

---

## Slide 10 — Step 3: Join Waitlist

**Visual:** Code slide with submit command

**Voiceover:**
> Step 3: Join waitlist. workway developer submit. No login required. Submits to public waitlist endpoint.

**Terminal Action:**
```bash
workway developer submit
```

---

## Slide 11 — Step 4: Check Status

**Visual:** Code slide with status command

**Voiceover:**
> Step 4: Check status. workway developer status. Shows your position. Updates when you're invited.

**Terminal Action:**
```bash
workway developer status
```

---

## Slide 12 — When You're Invited

**Visual:** Content slide

**Voiceover:**
> When you're invited, you receive an email with a registration link. Create your account credentials. Invitation code auto-fills from the link. Account activates immediately. Then: workway login.

---

## Slide 13 — Full Access

**Visual:** ASCII diagram with available commands

**Voiceover:**
> After registration, you have access to: workway workflow init — create workflows. workway workflow dev — local development server. workway workflow test — run with mock or live integrations. workway workflow publish — ship to marketplace. workway oauth connect — link production credentials. workway developer stripe — set up revenue collection.
>
> Build locally. Test locally. Publish globally.

---

## Slide 14 — While You Wait

**Visual:** Content slide

**Voiceover:**
> While you wait: the SDK and CLI are open source. You can build now. npm install @workwayco/sdk. workway workflow init. Local testing with mocks.
>
> Contributions accelerate invitations. Good PRs demonstrate capability better than any application.

---

## Slide 15 — The Complete Journey

**Visual:** ASCII flow diagram

**Voiceover:**
> The complete journey. Install CLI. Create profile. Join waitlist. Wait and build with local dev. Get invited via email. Login and publish.
>
> From zero to published. The tool disappears.

---

## Slide 16 — Begin

**Visual:** Title slide with CTA

**Voiceover:**
> npm install -g @workwayco/cli. workway developer init. workway.co/waitlist.

---

## Production Notes

- **Tone:** Direct. Technical. No marketing language.
- **Terminal Demo:** Split screen — slides left, terminal right
- **Pacing:** Allow CLI commands to complete visibly. Don't rush.
- **Show actual output:** Real CLI responses, not mocked
- **Music:** None. Terminal sounds optional.
- **End card:** Hold final slide 3-5 seconds with URL visible

## Terminal Commands Sequence

For the split-screen demo, run these in order:

```bash
# Install (skip if already installed)
npm install -g @workwayco/cli

# Create profile
workway developer init
# Answer prompts: name, email, background, etc.

# Submit to waitlist
workway developer submit

# Check status
workway developer status
```

Show each command's output before advancing to the next slide.
