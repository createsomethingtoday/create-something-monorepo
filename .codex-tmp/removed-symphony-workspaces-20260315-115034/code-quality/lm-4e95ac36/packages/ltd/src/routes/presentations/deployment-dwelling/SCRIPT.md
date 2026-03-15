# SCRIPT.md — DEPLOYMENT: DWELLING

## Recording Notes

**Duration**: ~20 minutes
**Pace**: Deliberate and conclusive. This is the synthesis.
**Tone**: Reflective but practical. The journey completes here.

---

## Narration Markup Reference

| Markup | Meaning | Example |
|--------|---------|---------"|
| `[PAUSE]` | Brief pause (1 second) | "Less, but better. [PAUSE] That's it." |
| `[PAUSE 2s]` | Explicit duration pause | "The tool should disappear. [PAUSE 2s]" |
| `[BEAT]` | Dramatic beat (1.5 seconds) | "Not addition. [BEAT] Subtraction." |
| `[BREATHE]` | Take a breath, gather | "[BREATHE] Now let me explain..." |
| `[SLOW]...[/SLOW]` | Slower, deliberate pacing | "[SLOW]Weniger, aber besser.[/SLOW]" |
| `[QUOTE]...[/QUOTE]` | Read as quotation (different register) | "[QUOTE]The hammer disappears into use.[/QUOTE]" |
| `*emphasis*` | Vocal stress on word | "This is *one* principle at *three* scales." |
| `{stage direction}` | Visual/action note | "{slide transition}" |
| `↗` | Rising intonation (question) | "Have I built this before↗" |
| `↘` | Falling intonation (statement) | "Unify↘" |
| `—` | Em-dash = brief pause + emphasis | "Not addition—subtraction." |

---

## Slide 1: Title [0:00]

{slide appears}

[BREATHE]

Deployment: Dwelling.

[PAUSE]

The final step is not deployment. [BEAT] It is beginning to dwell.

[PAUSE 2s]

This is the last presentation in the series. By the end, you'll understand not just how to deploy, but what comes after—the ongoing practice of dwelling in systems you've built.

{hold 2 seconds on title}

---

## Slide 2: What is Dwelling? [1:30]

{slide transition}

[BREATHE]

What is dwelling↗

[PAUSE]

Dwelling is *being at home* in the system you've built.

[PAUSE]

Not visiting—inhabiting.

Not using—belonging.

Not deploying—caring for.

[PAUSE 2s]

Deployment is a moment. [BEAT] Dwelling is ongoing practice.

[PAUSE]

This distinction matters. You don't just ship and forget. You ship and *inhabit*.

---

## Slide 3: Quote - Heidegger [3:00]

{slide transition}

[BREATHE]

Heidegger connected building to dwelling:

[QUOTE]
"Building and thinking are, each in its own way, inescapable for dwelling."
[/QUOTE]

[PAUSE 2s]

To dwell is to be at home. [PAUSE] To be at home is to understand deeply. [PAUSE] Deep understanding comes through building *and* thinking together.

[PAUSE]

That's what this series has been about—not just building, but thinking about what we build.

---

## Slide 4: The Deployment Flow [4:30]

{slide transition - ASCII diagram appears}

[BREATHE]

Here's the flow from code to dwelling.

[PAUSE]

Five steps.

Build. [PAUSE] Deploy. [PAUSE] Migrate. [PAUSE] Verify. [PAUSE] Dwell.

[PAUSE 2s]

The first four are actions. [PAUSE] The fifth is a mode of being.

[PAUSE]

Let's walk through each one.

---

## Slide 5: Step 1 - Build [5:45]

{slide transition - code appears}

[BREATHE]

Step one: Build.

[PAUSE]

`pnpm --filter=space build` [PAUSE] builds a specific package.

Before building, check types: `pnpm --filter=space exec tsc --noEmit`

Generate Cloudflare types: `pnpm --filter=space exec wrangler types`

[PAUSE 2s]

Types first. Then build. Order matters.

[PAUSE]

Catch errors before they reach production.

---

## Slide 6: Step 2 - Deploy [7:00]

{slide transition - code appears}

[BREATHE]

Step two: Deploy.

[PAUSE]

Critical: use *exact* project names.

[PAUSE]

Space, IO, and Agency use `create-something-*` with a hyphen.

`wrangler pages deploy .svelte-kit/cloudflare --project-name=create-something-space`

[PAUSE]

Ltd and LMS use `createsomething-*` without the hyphen in "create something".

`wrangler pages deploy .svelte-kit/cloudflare --project-name=createsomething-ltd`

[PAUSE 2s]

Project names are historical. [PAUSE] Look them up. Don't guess.

---

## Slide 7: Project Names Reference [8:30]

{slide transition - ASCII table appears}

[BREATHE]

Here's the reference table.

[PAUSE]

Space, IO, Agency—`create-something-` prefix.

Ltd, LMS—`createsomething-` prefix. No hyphen.

[PAUSE 2s]

Wrong name means new project. [PAUSE] Production breaks.

[PAUSE]

This is documented in `.claude/rules/PROJECT_NAME_REFERENCE.md`. When in doubt, check the file.

---

## Slide 8: Step 3 - Migrate [9:45]

{slide transition - code appears}

[BREATHE]

Step three: Migrate.

[PAUSE]

If you changed the database schema, apply migrations.

`wrangler d1 migrations apply DB_NAME`

[PAUSE]

Migrations are idempotent. Safe to re-run.

[PAUSE 2s]

Schema changes require *explicit* migration. [PAUSE] They don't happen automatically on deploy.

---

## Slide 9: Step 4 - Verify [10:45]

{slide transition - code appears}

[BREATHE]

Step four: Verify.

[PAUSE]

Tail production logs—this is interactive, use WezTerm:

`wrangler pages deployment tail --project-name=create-something-space`

[PAUSE]

Check deployment status:

`wrangler pages deployment list --project-name=create-something-space`

[PAUSE]

Visit production. See it with your eyes.

[PAUSE 2s]

Deploy is not done until verified. [BEAT] Trust, but verify.

---

## Slide 10: Session Close Protocol [12:00]

{slide transition - ASCII diagram appears}

[BREATHE]

Before saying "done", follow the close protocol.

[PAUSE]

Step one: `git status` [PAUSE]—check what changed.

Step two: `git add` [PAUSE]—stage your code changes.

Step three: `bd sync --from-main` [PAUSE]—pull beads updates.

Step four: `git commit` [PAUSE]—commit your code.

[PAUSE 2s]

Every session ends deliberately. [BEAT] Never just close the terminal.

[PAUSE]

The protocol ensures nothing is lost.

---

## Slide 11: Syncing State [13:30]

{slide transition}

[BREATHE]

Work persists in two places: Git and Beads.

[PAUSE]

Code goes to Git—your changes.

Issues go to Beads—your progress.

[PAUSE]

Both must sync before session ends.

[PAUSE 2s]

`bd sync --from-main` pulls issue updates.

`git commit` pushes code changes.

[PAUSE]

Two systems, one discipline.

---

## Slide 12: Step 5 - Dwell [14:45]

{slide transition}

[BREATHE]

Step five: Dwell.

[PAUSE]

After deployment, the *ongoing practice* begins.

[PAUSE]

Monitor logs when something feels wrong.

Document breakdowns as they occur.

Repair patterns, not just symptoms.

Update rules when understanding deepens.

[PAUSE 2s]

The system isn't finished. [BEAT] You now *inhabit* it.

[PAUSE]

Dwelling is care. Care is practice. Practice is ongoing.

---

## Slide 13: The Hermeneutic Spiral [16:15]

{slide transition - ASCII diagram appears}

[BREATHE]

Look at where you've been.

[PAUSE]

Session one: Heidegger Canon. [PAUSE] Philosophy installed.

Session two: Claude Code Partner. [PAUSE] Environment configured.

Session three: Beads Continuity. [PAUSE] Memory established.

Session four: Cloudflare Edge. [PAUSE] Infrastructure understood.

Session five: Canon Design. [PAUSE] Aesthetics internalized.

Session six: Deployment Dwelling. [PAUSE] Practice begins.

[PAUSE 2s]

This is the hermeneutic spiral. [PAUSE] Each session deepens understanding. The spiral continues.

[PAUSE]

Session N plus one brings deeper understanding still.

---

## Slide 14: You Are Ready [18:00]

{slide transition}

[BREATHE]

[PAUSE 2s]

[SLOW]The infrastructure disappears.[/SLOW]

[PAUSE]

[SLOW]Only the work remains.[/SLOW]

[PAUSE 2s]

You have the philosophy. [PAUSE] The Subtractive Triad.

You have the partner. [PAUSE] Claude Code configured.

You have the memory. [PAUSE] Beads tracking your progress.

You have the infrastructure. [PAUSE] Cloudflare at the edge.

You have the design. [PAUSE] Canon tokens for coherence.

You have the practice. [PAUSE] Deployment as dwelling.

[BEAT]

You are ready.

[PAUSE 2s]

Now go build something.

{hold on final slide}

[END]

---

## Post-Production Notes

### Audio Cleanup
- Remove mouth clicks
- Normalize audio levels
- Add subtle room tone between sections

### Visual Sync
- Ensure slide transitions align with `{slide transition}` markers
- Add fade transitions (300ms) at section breaks
- Consider subtle zoom on ASCII diagrams

### Accessibility
- Generate captions from script
- Ensure captions include pause markers as `[...]`
- Verify contrast on all slides

---

## Narration Checklist

Before recording:

- [ ] Room is quiet (no HVAC, no fans)
- [ ] Microphone positioned correctly
- [ ] Water available (avoid mouth sounds)
- [ ] Script printed or on teleprompter
- [ ] Practiced full read-through once

During recording:

- [ ] Maintain consistent distance from microphone
- [ ] Pause fully at `[PAUSE]` markers
- [ ] Slow down at `[SLOW]` sections
- [ ] Breathe at `[BREATHE]` markers
- [ ] Emphasize `*words*` with vocal stress

After recording:

- [ ] Review for clarity and pacing
- [ ] Check for mouth sounds or clicks
- [ ] Verify all 14 slides covered
- [ ] Run /audit-voice on transcript
