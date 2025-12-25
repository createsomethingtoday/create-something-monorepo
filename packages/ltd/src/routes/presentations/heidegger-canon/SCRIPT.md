# SCRIPT.md — HEIDEGGER: CANON

## Recording Notes

**Duration**: ~25 minutes
**Pace**: Deliberate. Philosophical. Let concepts breathe.
**Tone**: Direct, confident. Rams-style declarations. No hedging.

---

## Narration Markup Reference

| Markup | Meaning | Example |
|--------|---------|---------|
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

Welcome to Heidegger: Canon.

[PAUSE]

This isn't a philosophy lecture. [BEAT] It's an installation guide.

By the end, you'll have a framework—the Subtractive Triad—that you can apply to *every* decision you make as an engineer.

[PAUSE]

The goal: build tools that *disappear* into use.

{hold 2 seconds on title}

---

## Slide 2: The Meta-Principle [1:30]

{slide transition}

Creation is the discipline of *removing* what obscures.

[PAUSE]

[SLOW]Not addition—subtraction.[/SLOW]

[BEAT]

[SLOW]Not accumulation—revelation.[/SLOW]

[BEAT]

[SLOW]Not decoration—truth.[/SLOW]

[PAUSE 2s]

The Subtractive Triad is *one* principle at *three* scales.

[PAUSE]

Same discipline. Different zoom levels.

---

## Slide 3: The Subtractive Triad [2:45]

{slide transition - ASCII table appears}

Here's the complete framework.

[PAUSE]

Three levels. Three questions. Three actions.

[BREATHE]

At the *Implementation* level, we use DRY. The question is: [SLOW]"Have I built this before↗"[/SLOW] The action is: Unify↘

[PAUSE]

At the *Artifact* level, we use Rams. The question is: [SLOW]"Does this earn its existence↗"[/SLOW] The action is: Remove↘

[PAUSE]

At the *System* level, we use Heidegger. The question is: [SLOW]"Does this serve the whole↗"[/SLOW] The action is: Reconnect↘

[PAUSE 2s]

For any decision, ask the three questions *in order*.

{let the table sit for a moment}

---

## Slide 4: Quote - Rams [4:15]

{slide transition}

[BREATHE]

Dieter Rams spent 40 years at Braun perfecting this philosophy.

[PAUSE]

[QUOTE]
[SLOW]Weniger, aber besser.[/SLOW]
[/QUOTE]

[PAUSE 2s]

[QUOTE]Less, but better.[/QUOTE]

[BEAT]

It's not about removing *everything*. [PAUSE] It's about removing everything that doesn't *serve*.

[PAUSE]

What remains becomes clearer.

---

## Slide 5: Quote - Heidegger [5:30]

{slide transition}

Martin Heidegger described what happens when tools *work*.

[PAUSE]

[QUOTE]
"The less we just stare at the hammer-Thing, and the more we seize hold of it and *use* it, the more primordial does our relationship to it become."
[/QUOTE]

[PAUSE 2s]

You don't think about the hammer. [BEAT] You think about the *nail*.

[PAUSE]

The tool *disappears* into use.

[PAUSE]

This is Zuhandenheit—*ready-to-hand*.

[PAUSE]

When you're building, this is the goal: tools and systems that recede so users focus on their work, not yours.

---

## Slide 6: Level 1 - DRY [7:00]

{slide transition}

Let's walk through each level.

[BREATHE]

Level One: DRY.

[PAUSE]

The question: [SLOW]"Have I built this before↗"[/SLOW]

[PAUSE]

If yes, the action is *Unify*.

[PAUSE]

Auth logic in three services? [BEAT] One identity service.

Validation in five forms? [BEAT] One validation library.

Same API pattern everywhere? [BEAT] One SDK.

[PAUSE 2s]

Duplication creates drift. [PAUSE] Unification creates truth.

---

## Slide 7: DRY Code Example [8:30]

{slide transition - code appears}

Here's the classic DRY violation.

[PAUSE]

Same logic. Different names. Different locations.

[BREATHE]

Service A calls it `validateEmail`.

Service B calls it `isEmailValid`.

Service C just has the regex inline.

[PAUSE 2s]

Three implementations. Three maintenance points. Three divergence risks.

[PAUSE]

When the regex changes, you change *one*. The others diverge silently.

[PAUSE]

The fix isn't clever—it's extraction. One validation module. Everyone imports it. *One* source of truth.

---

## Slide 8: Level 2 - Rams [10:00]

{slide transition}

Level Two: Rams.

[PAUSE]

The question: [SLOW]"Does this earn its existence↗"[/SLOW]

[PAUSE]

Rams takes us beyond code to *artifacts*—features, UI elements, configuration options.

[BREATHE]

Every element demands cognitive load.

Every option is a decision users must make.

[PAUSE]

The question isn't whether something is *useful*. [BEAT] It's whether it's *essential*.

[PAUSE 2s]

Excess obscures the essential.

---

## Slide 9: Rams Applied [11:15]

{slide transition - split view appears}

Settings screens are where Rams becomes visible.

[PAUSE]

On the left: fifteen options.

Enable notifications. Enable email. Enable push. Enable SMS. Notification sound. Frequency. Quiet hours start. Quiet hours end. [PAUSE] You get the idea.

[BREATHE]

On the right: three options.

Notify me. Quiet hours. Theme.

[PAUSE 2s]

We didn't remove *capability*. [BEAT] We removed *cognitive load*.

[PAUSE]

Smart defaults. Advanced settings hidden.

Users get what they need without parsing what they don't.

---

## Slide 10: Level 3 - Heidegger [12:45]

{slide transition}

Level Three: Heidegger.

[PAUSE]

The question: [SLOW]"Does this serve the whole↗"[/SLOW]

[PAUSE]

Heidegger operates at the *system* level.

[BREATHE]

A perfectly minimal feature—passing DRY and Rams—can still be *wrong* if it doesn't serve the whole.

[PAUSE]

Does it duplicate what another service does? [BEAT] Fragmentation.

Does it disconnect from the user experience? [BEAT] Silos.

[PAUSE 2s]

The system wants to be whole. [PAUSE] Our job is removing what disconnects it.

---

## Slide 11: Zuhandenheit vs Vorhandenheit [14:00]

{slide transition - ASCII diagram appears}

[BREATHE]

Two modes of being with tools.

[PAUSE]

On the left: Zuhandenheit. [SLOW]*Ready-to-hand*.[/SLOW]

Tools disappear into use.

You think about the problem you're solving. The feature you're building. The user you're serving.

*Not* about the infrastructure. Not the configuration. Not the deployment.

[PAUSE 2s]

On the right: Vorhandenheit. [SLOW]*Present-at-hand*.[/SLOW]

Tools demand attention.

You think about OAuth tokens. API pagination. Error handling. Rate limits.

[BEAT]

The tool has *broken*. It's become an *object*. This is failure.

[PAUSE 2s]

{let the diagram sit}

When infrastructure demands attention, it has failed.

---

## Slide 12: The Hermeneutic Circle [16:00]

{slide transition - circle diagram appears}

The Subtractive Triad isn't isolated. It's part of a larger system.

[BREATHE]

CREATE SOMETHING operates as four properties in a hermeneutic circle.

[PAUSE]

Philosophy defines criteria. [PAUSE] Research validates. [PAUSE] Practice applies. [PAUSE] Services test in market.

[BEAT]

Results evolve philosophy.

[PAUSE 2s]

You can't understand any property in isolation. Each serves the whole, and the whole gives meaning to each.

[PAUSE]

This is Heidegger's system level made *organizational*.

---

## Slide 13: Gestell Warning [17:30]

{slide transition}

[BREATHE]

A warning.

[PAUSE]

Heidegger warned about Gestell—the danger of technology that *consumes* rather than *serves*.

[PAUSE]

Not all automation is good.

[PAUSE]

Ask: Does this free me to focus on meaningful work↗ [BEAT] Or does it create its own demands↗

[PAUSE 2s]

[SLOW]Gelassenheit[/SLOW] is the answer.

Neither rejection nor submission. Full engagement *without capture*.

[PAUSE]

The craftsman uses the hammer. [BEAT] The hammer does not use him.

---

## Slide 14: Breakdown and Repair [19:00]

{slide transition}

Breakdowns are inevitable.

[PAUSE]

The question is: do you just *fix*, or do you *repair*↗

[BREATHE]

Fixing is mechanical correction.

Restart the service. Clear the cache. Rollback the deployment.

[PAUSE]

Repairing is restructuring understanding.

Document *why* it failed. Update the patterns. Make implicit explicit.

[PAUSE 2s]

Fixing restores function. [BEAT] Repairing prevents recurrence.

[PAUSE]

In CREATE SOMETHING, every breakdown becomes documentation—rules files, pattern updates, deployment checklists.

We don't just survive failures. We *learn* from them permanently.

---

## Slide 15: The Triad Applied [20:30]

{slide transition - code appears}

Here's the triad in code.

[BREATHE]

Line one: DRY. We *import* shared validation, not rewriting it.

[PAUSE]

Lines four through seven: Rams. We removed twelve optional parameters—users can set those later in settings.

[PAUSE]

The comments: Heidegger. We connect to existing services rather than duplicating their logic. We follow patterns in CLAUDE.md.

[PAUSE 2s]

Each line could pass Rams and DRY but *fail* Heidegger if it didn't integrate with the system.

[PAUSE]

One function. Three questions answered. The tool disappears.

---

## Slide 16: Installation [22:00]

{slide transition - ASCII table appears}

Here's what you take with you.

[BREATHE]

CLAUDE.md encodes the philosophy into your AI development partner. Claude Code understands the triad.

[PAUSE]

Rules files capture breakdowns as repair. Cloudflare patterns. CSS canon. Beads patterns.

[PAUSE]

Canon tokens give you CSS values that trace to principles. You don't think about spacing—you use `--space-md`.

[PAUSE]

Beads tracks work across sessions. Robot mode for agents.

[PAUSE]

Skills automate common patterns. `/audit-canon`. `/deploy`. `/harness-spec`.

[PAUSE 2s]

Install these, and the methodology becomes invisible.

[BEAT]

Zuhandenheit achieved.

---

## Slide 17: The Daily Practice [23:30]

{slide transition}

[BREATHE]

This is your daily practice.

[PAUSE]

*Before* adding anything, ask:

[SLOW]One: DRY. "Have I built this before↗" Unify.[/SLOW]

[SLOW]Two: Rams. "Does this earn its existence↗" Remove.[/SLOW]

[SLOW]Three: Heidegger. "Does this serve the whole↗" Reconnect.[/SLOW]

[PAUSE 2s]

*After* breakdown, ask:

Did I just fix, or did I repair↗

Is this pattern documented↗

Will the next person avoid this↗

[PAUSE 2s]

It becomes automatic—like the carpenter with the hammer.

You stop thinking about the methodology and start thinking about the *work*.

[BEAT]

That's the goal. Not philosophy for its own sake. Philosophy that disappears into craft.

---

## Slide 18: Final [25:00]

{slide transition}

[BREATHE]

[PAUSE 2s]

[SLOW]The tool should disappear.[/SLOW]

[PAUSE]

[SLOW]The methodology should recede.[/SLOW]

[PAUSE]

What remains is clear thinking, honest design, and systems that serve.

[PAUSE 2s]

[BEAT]

Welcome to the Canon.

[PAUSE]

Now build something.

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
- [ ] Verify all 18 slides covered
- [ ] Run /audit-voice on transcript
