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

#### The Lineage

Writing has a philosophical genealogy parallel to design:

| Layer | Philosophy | Writing | Function |
|-------|------------|---------|----------|
| **Foundational** | Heidegger (*Being and Time*) | Orwell (*Politics and the English Language*) | Reveals hidden ontological structure |
| **Methodological** | Gadamer (*Truth and Method*) | Zinsser (*On Writing Well*) | Makes it teachable, applicable |
| **Applied** | Dieter Rams (Ten Principles) | Fenton/Lee (*Nicely Said*) | Practice in specific medium |

**Why this matters**: Orwell doesn't say "write clearly because it's pleasant." He says unclear writing is how people hide from truth—including from themselves. That's an *ontological* claim about language and being, not style advice.

#### The Masters

| Master | Work | Contribution to Canon |
|--------|------|----------------------|
| **George Orwell** | "Politics and the English Language" (1946) | Clarity as ethics; obscurity as political evasion; 6 pages that changed everything |
| **William Zinsser** | "On Writing Well" | Accessible methodology; makes clarity teachable; the practitioner's guide |
| **Nicole Fenton & Kate Kiefer Lee** | "Nicely Said" | Transformation examples; user-centered clarity; applied to web/digital |
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

#### Fenton/Lee Patterns Adopted

- **Transformation examples**: Show before/after, not just rules
- **User-centered framing**: Meet readers where they are
- **Plain language advocacy**: Prefer common words to insider vocabulary
- **Warmth where appropriate**: Acknowledge reader's struggles
- **Recognition over confrontation**: Help readers notice patterns, then transform them

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
