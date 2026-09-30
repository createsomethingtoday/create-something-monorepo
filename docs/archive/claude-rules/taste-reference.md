# Taste Reference

Human-curated visual references from Are.na that inform Canon design decisions.

## Source Channels

### CREATE SOMETHING (Primary)
| Channel | Slug | Purpose | Sync |
|---------|------|---------|------|
| CANON MINIMALISM | `canon-minimalism` | Rams' visual vocabulary | Primary |
| MOTION LANGUAGE | `motion-language-4hbfmugttwe` | Animation/transition examples | Primary |
| CLAUDE CODE | `claude-code-puz_2pgfxky` | Human-AI partnership patterns | Primary |
| ARCHITECTURAL DWELLING | `architectural-dwelling` | Space-making, nature integration | Primary |

### External (Secondary)
| Channel | Curator | Content |
|---------|---------|---------|
| `people-dieter-rams` | Chad Mazzola | Rams artifacts, products |
| `examples-swiss-design` | J-MB | Swiss/International style |
| `motion-minimal-simple` | Meg W | Subtle motion |
| `brutalist-x-web-design` | — | Brutalist web |
| `interfaces-motion` | — | UI animation patterns |
| `less-but-better` | Alex Chantré | Rams-aligned minimalism |
| `grids-organizational-systems` | Rachel Steele | Swiss grid systems, Müller-Brockmann |
| `a-website-as-a-poem...` | Esther Bouquet | Poetic dwelling, craft computing (Claude Code) |
| `offlining` | H R T | Critique of technological enframing (Claude Code) |
| `delightful-interactions...` | Nicky Knicky | Purposeful UI motion, 483 blocks (Motion Language) |
| `10x10-material-cultures` | M V | Information design, Tufte, Isotype |
| `systems-diagrams...` | Anne-Laure Lemaitre | Cybernetics, systematic visualization |
| `user-interface-fuu0gctxwj8` | Stanislav Govorukhin | UI patterns: smart, elegant (filter for decorative "weird") |

### Philosophical References (Agent Orchestration)

Not visual references, but conceptual references for how AI agents should work.

| Reference | Creator | Content | Why Included |
|-----------|---------|---------|--------------|
| [VC (VibeCoder)](https://github.com/steveyegge/vc) | Steve Yegge | Zero Framework Cognition, colony orchestration, quality gates | Yegge created Beads; VC is the canonical reference for agent patterns |

**VC Patterns Adopted:**
- **Zero Framework Cognition**: Let AI reason; don't constrain with hardcoded heuristics
- **Quality Gates**: Test → E2E → Review pipeline (90.9% pass rate)
- **Work Extraction**: Review findings → discovered issues → hermeneutic loop
- **Bounded Tasks**: Each agent handles focused, well-defined work

**VC Patterns Adapted** (philosophical tension with Zuhandenheit):
- "AI Supervisor" → reframed as partnership (tool recedes)
- Orchestration layer → integrated into Claude Code's Task subagents (subtraction)

**Bidirectional exchange**: CREATE SOMETHING contributed directory-aware priority scoping to Beads upstream. VC patterns flow back into harness-patterns.md.

### Writing Masters (Voice References)

Not visual references, but stylistic references for how we write.

#### The Two Writing Lineages

CREATE SOMETHING's writing foundations span two parallel lineages—**Clarity** and **Authenticity**—that converge on honesty from different angles:

| Layer | Clarity Lineage | Authenticity Lineage |
|-------|-----------------|----------------------|
| **Foundational** | Orwell (*Politics and the English Language*, 1946) | Montaigne (*Essays*, 1580) |
| **Methodological** | Zinsser (*On Writing Well*, 1976) | King (*On Writing*, 2000) + Vonnegut |
| **Applied** | Fenton/Lee (*Nicely Said*, 2014) | Yegge ("Drunken Blog Rants", 2004+) |

| Dimension | Clarity Lineage | Authenticity Lineage |
|-----------|-----------------|----------------------|
| **Question Answered** | How do we remove obstacles to understanding? | How do we build trust through voice? |
| **Core Insight** | Obscurity enables bad thinking | Confession reveals universal truth |
| **Method** | Strip sentences to cleanest components | Write directly from your soul |
| **Practice** | Meet readers where they are | Bring readers where you are |

**The Convergent Insight**: Both lineages arrive at honesty independently:
- Orwell: Clear prose is honest prose (lies require obscurity)
- Montaigne: Confessional prose is honest prose (vulnerability requires truth)

This convergence—discovered across two traditions that started 400 years apart—validates the principle.

#### The Unified Lineage (Full Context)

CREATE SOMETHING's intellectual foundations span philosophy, writing, and systems:

| Layer | Philosophy | Writing (Clarity) | Writing (Authenticity) | Systems |
|-------|------------|-------------------|------------------------|---------|
| **Foundational** | Heidegger | Orwell | Montaigne | Wiener |
| **Methodological** | Gadamer | Zinsser | King + Vonnegut | Meadows |
| **Applied** | Dieter Rams | Fenton/Lee | Yegge | Senge |

**Why this matters**: Each column addresses a different dimension of CREATE SOMETHING's work. Orwell shows that clarity is ethical. Montaigne shows that confession builds trust. Together: we write clearly AND authentically about systems that we understand deeply.

#### The Masters

**Clarity Lineage**:

| Master | Work | Contribution to Canon |
|--------|------|----------------------|
| **George Orwell** | "Politics and the English Language" (1946) | Clarity as ethics; obscurity as political evasion; 6 pages that changed everything |
| **William Zinsser** | "On Writing Well" (1976) | Accessible methodology; makes clarity teachable; the practitioner's guide |
| **Nicole Fenton & Kate Kiefer Lee** | "Nicely Said" (2014) | Transformation examples; user-centered clarity; applied to web/digital |

**Authenticity Lineage**:

| Master | Work | Contribution to Canon |
|--------|------|----------------------|
| **Michel de Montaigne** | *Essays* (1580) | Invented the personal essay; "I am myself the matter of my book"; confession as path to truth |
| **Stephen King** | *On Writing* (2000) | Made confessional craft teachable; "write directly from your soul"; memoir + methodology |
| **Kurt Vonnegut** | "How to Write with Style" (1982) | 8 rules for authentic voice; "write for one person"; genuine caring over language games |
| **Steve Yegge** | "Drunken Blog Rants" (2004+) | Applied confession to technical writing; allegory, humor, purposeful verbosity |

**Design Masters** (shared across lineages):

| Master | Work | Contribution to Canon |
|--------|------|----------------------|
| **Edward Tufte** | Visual Display of Quantitative Information | Empirical grounding; "show the data"; high density |
| **Dieter Rams** | Ten Principles | Declarative compression; aphoristic wisdom; "less, but better" |
| **Charles & Ray Eames** | — | "The best for the most for the least"; functional elegance |
| **Ludwig Mies van der Rohe** | — | "Less is more"; "God is in the details"; architectural austerity |

#### Orwell's Core Insight

From "Politics and the English Language":

> "Political language... is designed to make lies sound truthful and murder respectable, and to give an appearance of solidity to pure wind."

This reframes clarity as *ethical*, not aesthetic. Bad writing isn't just unpleasant—it enables bad thinking. Orwell's rules:

1. Never use a metaphor, simile, or figure of speech you've seen in print
2. Never use a long word where a short one will do
3. If it's possible to cut a word, cut it
4. Never use the passive where you can use the active
5. Never use jargon if you can think of an everyday equivalent
6. Break any of these rules sooner than say anything outright barbarous

**Canon adoption**: Rules 1-5 are subtractive. Rule 6 is Heideggerian—judgment over formula.

#### Fenton/Lee's Core Insight

From "Nicely Said: Writing for the Web with Style and Purpose":

> "Good writing serves the reader, not the writer. It meets people where they are and helps them get where they want to go."

This reframes clarity as *service*, not showmanship. Fenton and Lee bridge Orwell's ethical clarity with practical application for digital content. Their transformation examples:

**Before/After Examples** (the Fenton/Lee method):

| Before | After | Why |
|--------|-------|-----|
| "Utilize our platform" | "Use our tools" | Shorter word, same meaning |
| "Solutions for your needs" | "Tools for building websites" | Specific over vague |
| "Simply click here" | "Click here to start" | "Simply" implies it's obvious (dismissive) |
| "Please be advised that..." | "Starting May 1..." | Direct over bureaucratic |
| "Best-in-class features" | "Fast search, real-time updates" | Specific features over marketing jargon |

**Fenton/Lee Patterns Adopted**:

- **Transformation examples**: Show before/after, not just rules
- **User-centered framing**: Meet readers where they are
- **Plain language advocacy**: Prefer common words to insider vocabulary
- **Warmth where appropriate**: Acknowledge reader's struggles
- **Recognition over confrontation**: Help readers notice patterns, then transform them
- **Active voice preference**: "We built this" not "This was built"
- **Conversational tone**: Write like you talk (but edited)

#### Heideggerian Connection

A human-accessible bridge to philosophical concepts:

| What It Feels Like | Canon Term | Heidegger Term |
|-------------------|------------|----------------|
| You don't notice the prose | Transparent writing | Zuhandenheit |
| You notice the prose | Writing breakdown | Vorhandenheit |
| Words that sound important but mean little | Marketing jargon | — |
| Safe statements that can't be disproven | Vague claims | — |
| Elements for "interest" not function | Decoration | — |

**The connection**: Orwell reveals that jargon and obscurity are *political*—they serve evasion. Heidegger reveals that tool-breakdown makes the invisible visible. Together: unclear writing is a breakdown we should notice, diagnose, and repair.

---

### The Authenticity Lineage

The second writing lineage traces confession and authentic voice from Montaigne through King to Yegge.

#### Montaigne's Core Insight (Foundational)

From *Essays* (1580):

> "I am myself the matter of my book."

Montaigne invented the personal essay—the confessional, digressive, exploratory form. What made his work revolutionary was its "complete honesty and informality," unusual for the 16th century. Rather than displaying erudition, he prioritized exercising his own judgment and drawing on personal experience.

**Why Foundational**: Montaigne revealed that the self could be legitimate subject matter. Before him, writing about oneself was considered vanity. After him, confession became a path to universal truth. He established that readers connect with honest struggle, not polished authority.

**Key Quote**: "I have never seen a greater monster or miracle than myself."

#### King's Core Insight (Methodological)

From *On Writing: A Memoir of the Craft* (2000):

> "Un-learn the stuff they taught you about writing in school, and just write directly from your soul."

King made Montaigne's confessional insight teachable for modern writers. His memoir combines autobiography with craft advice, showing that personal struggle and technical methodology aren't opposites—they reinforce each other.

**King's Methodology**:
- Read widely, write daily
- Tell the truth even when it's embarrassing
- Write with the door closed, rewrite with the door open
- Revise ruthlessly but preserve the raw truth

**Key Quote**: "The most important things are the hardest to say, because words diminish them."

#### Vonnegut's Parallel Contribution (Methodological)

From "How to Write with Style" (1982):

> "Write to please just one person. If you open a window and make love to the world, your story will get pneumonia."

Vonnegut's 8 rules codified authentic voice into teachable principles:

1. Find a subject you care about
2. Do not ramble
3. Keep it simple
4. Have the guts to cut
5. Sound like yourself
6. Say what you mean to say
7. Pity the readers
8. **Write for one person** (the key insight)

**Key Quote**: "It is this genuine caring, and not your games with language, which will be the most compelling and seductive element in your style."

#### Yegge's Core Insight (Applied)

From "You Should Write Blogs" (2005):

> "Your blog will totally suck, of course, if you maintain careful neutrality, straddling the bland fence of noncommittal objectivity. If you want people to read it, then be yourself."

Yegge applied the confessional essay tradition to technical writing. He showed that programming essays could use allegory, humor, confession, and purposeful verbosity to achieve deeper impact than neutral documentation.

**Yegge Patterns Adopted**:

- **Confessional frame**: Start with what didn't work before showing what does
- **Extended allegory**: Use narrative to make technical points memorable (e.g., "Kingdom of Nouns")
- **One-person writing**: Pick a specific reader and write for them
- **Purposeful verbosity**: Depth over brevity when the idea demands it ("better survival characteristics")
- **Self-aware humor**: Acknowledge absurdity without abandoning rigor
- **Earned opinion**: Declare your bias openly ("I'm a huge Stan")

**Key Quote**: "Blogging is a source of both innovation and clarity. I have many of my best ideas and insights while blogging."

#### The Hybrid Pattern (CREATE SOMETHING Default)

The two lineages aren't opposites—they're **registers**. The best writing uses both:

| Register | Function | Example |
|----------|----------|---------|
| **Clarity** (structure) | Headers, tables, actionable answers upfront | "Just be a web designer. Leave hosting to providers." |
| **Authenticity** (voice) | Confessional frame, personal struggle, earned opinion | "I was scared to lose the client..." |

**The Hybrid Pattern** (for .io papers and .space tutorials):

```
1. Confessional hook (Authenticity): "I was scared to lose the client"
2. Direct answer (Clarity): "Just be a web designer. Leave hosting to providers."
3. Failure story (Authenticity): The 2am server crash
4. Structured comparison (Clarity): Options table with clear trade-offs
5. Earned opinion (Authenticity): "I'm biased. I'm a huge Stan."
6. Call to action (Clarity): "Reach out. I will be happy to help."
```

#### When to Use Each Register

| Context | Primary Register | Secondary Register |
|---------|------------------|-------------------|
| Product pages (.agency) | Clarity | — |
| Technical papers (.io) | Authenticity | Clarity for structure |
| Philosophy (.ltd) | Clarity | Authenticity for examples |
| Tutorials (.space) | Both equally | — |
| Case studies | Authenticity | Clarity for results |
| Social/community | Authenticity | — |

---

### Systems Thinking Masters

Not visual references, but structural references for how we understand interconnection.

#### The Lineage

Systems thinking has its own philosophical genealogy:

| Layer | Philosophy | Systems | Function |
|-------|------------|---------|----------|
| **Foundational** | Heidegger (*Being and Time*) | Wiener (*Cybernetics*) / Bertalanffy (*General System Theory*) | Reveals the formal structure of interconnection |
| **Methodological** | Gadamer (*Truth and Method*) | Meadows (*Thinking in Systems*) | Makes systems visible to practitioners |
| **Applied** | Dieter Rams (Ten Principles) | Senge (*The Fifth Discipline*) | Practice in organizations |

**Why this matters**: Meadows doesn't say "use systems thinking because it's useful." She reveals that most problems arise from *system structure*, not bad actors—that's an ontological claim about causation, not a technique.

#### The Masters

| Master | Work | Contribution to Canon |
|--------|------|----------------------|
| **Norbert Wiener** | *Cybernetics* (1948) | Feedback loops; the mathematics of circular causality; foundational science |
| **Ludwig von Bertalanffy** | *General System Theory* (1968) | Systems as wholes; isomorphism across domains; formal foundations |
| **Donella H. Meadows** | *Thinking in Systems* (2008) | Stocks, flows, delays; leverage points; makes the invisible visible |
| **Peter Senge** | *The Fifth Discipline* (1990) | Mental models; organizational learning; systems in practice |

#### Meadows' Core Insight

From *Thinking in Systems*:

> "We can't control systems or figure them out. But we can dance with them."

And her hierarchy of leverage points reveals where intervention matters:

1. **Transcending paradigms** (highest leverage)
2. **Paradigm shifts**
3. **Goals of the system**
4. **Self-organization**
5. **Rules of the system**
6. **Information flows**
7. **Reinforcing/balancing feedback**
8. **Delays**
9. **Stock and flow structures**
10. **Buffers**
11. **Numbers/parameters** (lowest leverage)

**Canon adoption**: CREATE SOMETHING operates at levels 2-5. The Subtractive Triad is a paradigm (level 2). The hermeneutic circle defines goals (level 3). Canon tokens enable self-organization (level 4). Voice guidelines are rules (level 5).

#### Canon Connection

Systems thinking underlies CREATE SOMETHING's structure:

| CREATE SOMETHING Element | Systems Concept |
|--------------------------|-----------------|
| Subtractive Triad (DRY → Rams → Heidegger) | Nested feedback loops at different scales |
| Hermeneutic circle (.ltd → .io → .space → .agency) | Circular causality; each property feeds the next |
| Template evolution | Stocks (templates) and flows (deployments, learning) |
| Agent orchestration (Beads, Gastown) | Distributed control; emergence from local rules |
| Canon tokens | Leverage point: rules that enable self-organization |

**The insight**: CREATE SOMETHING is itself a system. Understanding Meadows helps us see where to intervene—not at the level of individual artifacts (low leverage) but at the level of paradigms and goals (high leverage).

### Award Winners (Design Excellence)

Award-winning sites that validate Canon principles. Filtered for functional minimalism, not formal accolades.

| Site | Award | Year | URL | Pattern Demonstrated |
|------|-------|------|-----|---------------------|
| Monochrome (ELEMENT) | Awwwards SOTD | 2024 | [awwwards.com/sites/monochrome](https://www.awwwards.com/sites/monochrome) | Single-color constraint, Three.js depth without decoration |
| Shuka Design | Awwwards HM | 2024 | [awwwards.com/sites/shuka-design](https://www.awwwards.com/sites/shuka-design) | Typography-only hierarchy, no smooth scroll |
| Typography Principles (Obys) | Awwwards SOTD 7.73 | 2024 | [awwwards.com/sites/typography-principles](https://www.awwwards.com/sites/typography-principles) | Scroll-triggered transitions, horizontal layout |
| CalArts 2024 | Awwwards HM | 2024 | [awwwards.com/sites/calarts-2024](https://www.awwwards.com/sites/calarts-2024) | Interactive grid with purposeful interaction |
| U.I.WD. | Awwwards SOTD | 2024 | [awwwards.com/sites/uiwd](https://www.awwwards.com/sites/uiwd) | Typography-first portfolio, minimal chrome |
| Baseborn Studio | Awwwards | 2024 | [awwwards.com/sites/baseborn](https://www.awwwards.com/sites/baseborn) | Parallax depth, whitespace rhythm |

**Curation criteria**: Design excellence validated by international awards. NOT "what won" but "what won AND aligns with Canon."

| Accept | Reject |
|--------|--------|
| Functional minimalism | Decoration that won awards |
| Typography as structure | Color-dependent hierarchy |
| Purposeful motion | Animation for attention |
| Clear information architecture | Complexity mistaken for craft |
| Timeless black & white aesthetics | Fashion-forward color trends |
| Constraint as liberation | Technical complexity as virtue |

**Curation question**: "Would Dieter Rams approve, regardless of the award?"

**Philosophy**: These sites prove monochrome constraint produces better design. When color is removed, typography, spacing, and motion must carry all meaning. This forces intentionality. Award-winning B&W sites validate what Canon already knew: constraint is craft.

## Per-Channel Curation Criteria

### CANON MINIMALISM (`canon-minimalism`)
Visual vocabulary for Dieter Rams' principles. Maps to css-canon.md tokens.

| Accept | Reject |
|--------|--------|
| Pure black/white compositions | Grey backgrounds, muted palettes |
| Golden ratio spacing (φ = 1.618) | Mechanical even spacing |
| Typography as structure | Decorative ornament |
| Functional minimal design | Trendy "minimalism" aesthetic |
| Dieter Rams products, Braun | Apple products (too commercial) |
| Swiss/International style | Brutalism for its own sake |
| Negative space that breathes | Cluttered layouts |

**Curation question**: "Does this demonstrate *weniger, aber besser*?"

### MOTION LANGUAGE (`motion-language-4hbfmugttwe`)
Animation/transition examples. Maps to css-canon.md motion tokens.

| Accept | Reject |
|--------|--------|
| Purposeful state transitions | Decorative animation |
| `--duration-micro` (200ms) examples | Slow, sluggish motion (>500ms) |
| Single easing curve consistency | Mixed easing chaos |
| Motion that guides attention | Motion that demands attention |
| Loading states with meaning | Spinners without context |
| Reduced motion alternatives | Inaccessible animation |

**Curation question**: "Does this animation communicate state or seek attention?"

### CLAUDE CODE (`claude-code-puz_2pgfxky`)
Human-AI partnership patterns. Maps to Heideggerian tool philosophy.

| Accept | Reject |
|--------|--------|
| Tools that recede into use (Zuhandenheit) | AI as autonomous replacement |
| Human-AI collaboration patterns | AI doing everything alone |
| Breakdown→understanding moments | "Magic" black box AI |
| Craft computing | Consumption computing |
| Poetic dwelling with technology | Pure automation without craft |
| Partnership, not delegation | Human as passive observer |

**Curation question**: "Does this show the tool receding, or the tool demanding attention?"

### ARCHITECTURAL DWELLING (`architectural-dwelling`)
Space-making that embodies Heideggerian dwelling. Architecture as the practice of letting-be.

| Accept | Reject |
|--------|--------|
| Buildings that recede into landscape | Architecture as spectacle |
| "Design for rain, design for moss" | Climate-denial construction |
| Contemplative retreat spaces | Luxury resort aesthetics |
| Material honesty (wood, stone, concrete) | Decorative cladding, fake materials |
| Threshold moments (inside↔outside) | Hermetic sealed environments |
| Japanese hospitality minimalism | Western hotel maximalism |
| Light as material | Artificial lighting-first design |

**Curation question**: "Does this space enable dwelling, or demand attention?"

**Seed sources**: NOT A HOTEL competition, Wonderwall projects, Japanese residential architecture

## Visual Principles (Derived from References)

### Minimalism
- **Negative space**: Let elements breathe
- **Monochrome first**: Color as emphasis, not decoration
- **Typography as structure**: Type creates hierarchy without ornament
- **Grid discipline**: Alignment creates order

### Motion
- **Purposeful**: Animation reveals state, guides attention
- **Subtle**: `--duration-micro` (200ms) for most interactions
- **Consistent**: One easing curve (`--ease-standard`)
- **Reducible**: Respect `prefers-reduced-motion`

### Anti-Patterns (What NOT to Do)
- Decorative animation (bouncing icons, pulsing elements)
- Gratuitous color (rainbow gradients, neon accents)
- Cluttered layouts (every pixel filled)
- Inconsistent motion (mixed timing, varied easing)

## Canon Token Mapping

Visual references inform these token decisions:

| Visual Pattern | Canon Token |
|----------------|-------------|
| Rams' muted grays | `--color-fg-muted: rgba(255,255,255,0.46)` |
| Swiss grid proportions | `--space-*` (golden ratio) |
| Braun product radii | `--radius-sm: 6px` through `--radius-lg: 12px` |
| Functional transitions | `--duration-micro: 200ms` |

## API Commands

### Sync (Read from Are.na)

```bash
# Sync all channels
curl https://createsomething.ltd/api/arena/sync

# Sync specific channel
curl https://createsomething.ltd/api/arena/sync?channel=canon-minimalism

# View synced references
https://createsomething.ltd/taste
```

### Contribute (Write to Are.na)

```bash
# Create image/link block
curl -X POST https://createsomething.ltd/api/arena/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "canon-minimalism",
    "source": "https://example.com/image.jpg",
    "title": "Example Title",
    "description": "Optional description"
  }'

# Create text block
curl -X POST https://createsomething.ltd/api/arena/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "motion-language-4hbfmugttwe",
    "content": "Your markdown content here",
    "title": "Optional Title"
  }'
```

### Curate (Connect existing Are.na blocks)

```bash
# Connect an existing Are.na block to a channel
curl -X POST https://createsomething.ltd/api/arena/connect \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "canon-minimalism",
    "blockId": 722667
  }'
```

This enables the hermeneutic flow: **discover** (browsing Are.na) → **curate** (selecting blocks) → **connect** (adding to channel) → **sync** (pulling to /taste).

**UI**: Contributors can use the "+ Contribute Reference" button on `/taste`

**Channels**: `canon-minimalism`, `motion-language-4hbfmugttwe`, `claude-code-puz_2pgfxky`, and `architectural-dwelling` accept contributions

## Hermeneutic Flow

```
Are.na (human curation)
    ↓ sync
.ltd/taste (structured examples)
    ↓ informs
Canon tokens (css-canon.md)
    ↓ applies to
.io, .space, .agency (implementations)
    ↓ discovers
Are.na (new references)
```

## When to Reference

Use taste references when:
- Choosing between visual approaches
- Validating a design decision against Canon principles
- Understanding why a token has a specific value
- Seeking inspiration within constraints

The goal is **informed constraint**, not imitation. References reveal the aesthetic; implementations express it.
