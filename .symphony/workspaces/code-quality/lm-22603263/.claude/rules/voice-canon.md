# Voice Canon

Write clearly. That's it.

Everything else in this document exists to help you get there.

## What to Do This Week

Before you publish anything, ask yourself one question: **Would a working engineer understand this in 30 seconds?**

If not, simplify. Here's how:

| This week... | Try this |
|--------------|----------|
| When you want to sound smart | Use shorter words |
| When you're explaining a concept | Lead with what it does, not what it's called |
| When you're documenting a pattern | Show before/after code, not just theory |
| When you're writing about AI | Say "Claude Code" not "AI-native agentic systems" |

**Example**: You're documenting Gas Town agent orchestration.

❌ "Gas Town implements nondeterministic idempotence through session-agnostic persistence."

✅ "Gas Town lets agents pick up where they left off, even after crashes. Work survives restarts."

Same idea. Second one gets read.

---

## The Core Principle

Good writing disappears. When it works, readers understand your idea without noticing your words.

When you catch yourself reaching for jargon—stop. You've found something to transform.

### Recognition Patterns

| When you feel... | You might reach for... | What works better |
|------------------|------------------------|-------------------|
| Wanting to sound professional | "leverage," "synergy" | Plain language |
| Uncertain about your claim | Vague statements | Specific numbers |
| Wanting to look competent | Success-only stories | Honest struggles |
| Wanting to impress | Novel concepts | Useful implementations |

---

## The Five Principles

| Principle | What It Means | What to Cut |
|-----------|---------------|-------------|
| **Clarity Over Cleverness** | Serve the reader | Impressive vocabulary |
| **Specificity Over Generality** | Every claim measurable | "Significantly improved" |
| **Honesty Over Polish** | Document failures | Success-only narratives |
| **Useful Over Interesting** | Focus on implementation | Theory without code |
| **Grounded Over Trendy** | Timeless principles | This month's framework |

---

## Transformation Examples

Show, don't tell. Here's what transformation looks like across properties:

### Research (.io)

| Before | After |
|--------|-------|
| "Significant improvements observed" | "26 hours actual vs 120 estimated (78% reduction)" |
| "Many applications possible" | "Validated in 3 contexts: auth, forms, API integration" |
| "Leveraged AI capabilities" | "Used Claude Code for component generation" |

### Services (.agency)

| Before | After |
|--------|-------|
| "Cutting-edge AI solutions" | "Claude Code generates components. You review and ship." |
| "Transformative digital outcomes" | "Production in 6 hours. $50K under budget." |
| "Streamlined workflow automation" | "155 scripts → 13. Same functionality." |

### Learning (.space)

| Before | After |
|--------|-------|
| "Simply follow these steps" | "Try this. You'll hit an error on step 3—here's why." |
| "Obviously, this approach is best" | "This works for auth. For payments, try X instead." |
| "Best practices dictate..." | "We tried three approaches. Here's what worked." |

---

## Property-Specific Voice

Each property has a job. Match your voice to the job.

### .ltd — Philosophy

Full vocabulary permitted. This is where concepts get named.

**Voice**: Declarative. Compressed. Rams-like austerity.

### .io — Research

Lead with outcomes. Philosophy earns its place after the metrics.

**Voice**: Empirical. Precise. Tufte-like clarity.

**Required**: Hypothesis, measurable outcomes, methodology, limitations.

### .agency — Services

Business outcomes first. Philosophy as brief anchor only.

**Voice**: Confident. Specific. Outcome-oriented.

**Lead with**: "155 scripts → 13" not "Applying subtractive methodology"

### .space — Learning

Show, don't tell. Meet learners where they are.

**Voice**: Warm. Practical. Honest about struggles.

**Focus**: "Try this. Notice what happens." Progressive disclosure.

---

## Dual-Format Writing

Every piece serves two audiences: humans and AI agents.

### For Humans

- Meet readers where they are
- Use second person, present tense
- Show before/after examples
- Help readers notice patterns, then transform them

### For AI Agents

- Use tables for pattern matching
- Include explicit checklists
- Provide clear terminology rules
- List detectable anti-patterns

---

## Detection Patterns

For AI agents and `/audit-voice` command:

### Marketing Jargon (Flag These)

```
cutting-edge, revolutionary, game-changing, leverage, synergy,
solutions, best-in-class, world-class, industry-leading,
transformative, innovative, seamless, robust, scalable
```

### Vague Claims (Flag These)

```
significantly improved, many users, fast performance,
substantial savings, enhanced experience, better outcomes,
various benefits, considerable improvements
```

### Terminology Corrections

| Before | After |
|--------|-------|
| AI-assisted, AI-powered | AI-native development |
| blog posts, articles | papers |
| best practices | canonical standards |
| influences, inspiration | masters |
| projects | experiments |
| findings | reproducible results |

---

## Writing Checklist

Before publishing:

- [ ] Would a working engineer understand this in 30 seconds?
- [ ] Does it lead with outcome or insight?
- [ ] Are all claims specific and measurable?
- [ ] Did you include what didn't work?
- [ ] Does philosophy earn its place (not lead)?
- [ ] Can AI agents parse it (tables, checklists)?

---

## The Two Writing Lineages

Voice emerges from two parallel traditions—**Clarity** and **Authenticity**—that converge on honesty from different angles.

| Layer | Clarity Lineage | Authenticity Lineage |
|-------|-----------------|----------------------|
| Foundational | Orwell (1946) | Montaigne (1580) |
| Methodological | Zinsser (1976) | King + Vonnegut (2000) |
| Applied | Fenton/Lee (2014) | Yegge (2004+) |

### Clarity Lineage (Structure)

**Orwell**: Clarity is ethical. Obscure writing enables bad thinking.

**Zinsser**: Strip every sentence to its cleanest components.

**Fenton/Lee** (Nicely Said): Write for your reader, not yourself. Meet people where they are.

### Authenticity Lineage (Voice)

**Montaigne**: "I am myself the matter of my book." Confession reveals universal truth.

**King**: "Un-learn what they taught you in school. Write directly from your soul."

**Vonnegut**: "Write for one person. If you make love to the world, your story gets pneumonia."

**Yegge**: "Your blog will suck if you maintain careful neutrality." Personality serves technical communication.

### The Convergent Insight

Both lineages arrive at honesty independently:
- Orwell: Clear prose is honest prose (lies require obscurity)
- Montaigne: Confessional prose is honest prose (vulnerability requires truth)

---

## The Hybrid Pattern

The two lineages aren't opposites—they're **registers**. The best writing uses both.

### The Pattern (for .io papers and .space tutorials)

```
1. Confessional hook (Authenticity): "I was scared to lose the client"
2. Direct answer (Clarity): "Just be a web designer. Leave hosting to providers."
3. Failure story (Authenticity): The 2am server crash
4. Structured comparison (Clarity): Options table with clear trade-offs
5. Earned opinion (Authenticity): "I'm biased. I'm a huge Stan."
6. Call to action (Clarity): "Reach out. I will be happy to help."
```

### Register Selection by Context

| Context | Primary Register | Secondary Register |
|---------|------------------|-------------------|
| Product pages (.agency) | Clarity | — |
| Technical papers (.io) | Authenticity | Clarity for structure |
| Philosophy (.ltd) | Clarity | Authenticity for examples |
| Tutorials (.space) | Both equally | — |
| Case studies | Authenticity | Clarity for results |
| Social/community | Authenticity | — |

### Authenticity Patterns

When using the Authenticity register:

- **Confessional frame**: Start with what didn't work before showing what does
- **Extended allegory**: Use narrative to make technical points memorable
- **One-person writing**: Pick a specific reader and write for them
- **Purposeful verbosity**: Depth over brevity when the idea demands it
- **Self-aware humor**: Acknowledge absurdity without abandoning rigor
- **Earned opinion**: Declare your bias openly ("I'm a huge Stan")

For the full intellectual history, see [Intellectual Genealogy](https://createsomething.io/papers/intellectual-genealogy).

---

## Related

- [/voice](https://createsomething.ltd/voice) — Public voice guide
- [css-canon.md](./css-canon.md) — Visual canon
- [social-patterns.md](./social-patterns.md) — Social posting voice
