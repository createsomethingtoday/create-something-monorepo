/**
 * Generated design patterns content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/ltd/src/lib/content/patterns/
 */

import type { Pattern } from '../types.js';

export const PATTERNS: Pattern[] = [
  {
    slug: "arc",
    title: "Arc",
    subtitle: "Efficient connection between points. One-directional sync with minimal transformation. The shortest path that works.\"",
    category: "Pattern",
    content: `## Definition
AnArcis the minimal viable connection between two systems.
				Not bidirectional synchronization. Not complex transformation pipelines.
				Just data flowing efficiently from A to B.

The name comes from geometry: an arc is a portion of a curve—the most direct
				path between two points on a circle. In systems design, an Arc connects two
				services with the least complexity required to achieve the goal.

"The Arc pattern asks: what's the shortest path between these two points
					that actually works in production?"


> "The Arc pattern asks: what's the shortest path between these two points
					that actually works in production?"



## Principles
Data flows one way. Source to destination. No round-trips, no sync conflicts,
					no reconciliation logic. Simplicity through constraint.

Gmail → Notion (not Gmail ↔ Notion)

API → Database (not real-time bidirectional)

Event → Handler (fire and forget)

Transform only what's necessary. Preserve source fidelity. Don't normalize
					data that doesn't need normalizing.

✓ Map fields directly when schemas align

✓ Preserve formatting (links, bold, structure)

✗ Don't build complex ETL when simple mapping works

Arcs should be stateless. No servers to maintain. Run on-demand via
					scheduled triggers or webhooks. Pay only for what you use.

✓ Cloudflare Workers, AWS Lambda

✓ Cron triggers for polling patterns

✓ Webhook endpoints for push patterns

For multi-user systems, OAuth provides proper authorization. Each user
					authenticates with their own credentials. No shared secrets.

✓ User-scoped access tokens

✓ Automatic token refresh

✓ Revocable permissions



## When to Use
- • Data capture from one system to another
- • Automated backups and archiving
- • Event logging and analytics pipelines
- • Notification forwarding
- • Report generation from live data

- • Real-time collaboration features
- • Bidirectional sync requirements
- • Complex data reconciliation
- • Systems requiring strong consistency
- • Interactive user workflows



## Reference Implementation
Multi-user OAuth integration syncing labeled Gmail threads to a Notion database.
					5-minute polling cycle, zero production failures, automatic contact creation.

Gmail API (OAuth) → Cloudflare Worker → Notion API

KV Store for token persistence and sync state

Cron trigger every 5 minutes



## Related Patterns
When the Arc needs memory—understanding accumulates across syncs.

Arcs built on web standards (HTTP, OAuth, JSON) age well.`
  },
  {
    slug: "breakdown-and-repair",
    title: "Breakdown and Repair",
    subtitle: "Something broke. Before you fix it, ask: will this break again? Fixes restore function. Repairs prevent recurrence.\"",
    category: "Pattern",
    content: `## When to Use This Pattern
Get it working again. Users need the system up.

Prevent recurrence. Update documentation and patterns.



## How It Works
When something breaks, you notice what was previously invisible. The deployment
				that "just worked" now reveals its assumptions. The config that was obvious
				turns out to have hidden dependencies.

A system that only fixes accumulates the same breakdowns. A system that repairs
				evolves its understanding. The goal isn't just to get it working—it's to make
				this class of failure impossible.

"True repair requires restructuring understanding—not just mechanical correction."


> "True repair requires restructuring understanding—not just mechanical correction."



## Real Examples

| What Broke | The Fix | The Repair |
|---|---|---|
| Route pattern missing /* | Add /* to wrangler.toml | Document in cloudflare-patterns.md |
| Fallback overwrites index | Rename to 200.html | Add to deployment checklist |
| DNS conflicts with worker | Remove wildcard record | Explain why in Canon Reflection section |



## When to Apply
- • Same failure has occurred before
- • Failure reveals unstated assumption
- • Others could hit the same issue
- • Pattern documentation exists
- • The fix was non-obvious

- • Truly one-off environmental issue
- • External dependency failure
- • Repair would be premature (still learning)
- • Cost of repair exceeds likelihood of recurrence



## The Philosophy
Heidegger called this moment—when tools stop working and become visible—Vorhandenheit("present-at-hand"). When everything works, tools recede into use (Zuhandenheit,
				"ready-to-hand"). Breakdowns reveal what was previously invisible.

Gerry Stahl applied this to software: the distinction betweenfixing(mechanical correction) andrepairing(restructuring understanding).
				Understanding moves cyclically: preunderstanding → breakdown → reinterpretation →
				revised understanding.



## Related Patterns
Breakdown interrupts dwelling. Repair enables return to transparent use.

Each breakdown-repair cycle advances understanding through the spiral.`
  },
  {
    slug: "code-mode",
    title: "Code Mode",
    subtitle: "Code as the primary medium of creation. Not a translation of design, but design itself. When syntax becomes fluent, the tool becomes transparent.\"",
    category: "Pattern",
    content: `> "The medium is the message."



## Definition
Code Modeis the recognition that for certain practitioners,
				code is not a secondary artifact—a translation of design—but the primary
				medium of creation itself. The designer thinks in code. The configuration is code.
				The artifact is code that produces other artifacts.

This mirrors how an architect thinks in spatial relationships, not in
				blueprint conventions. The blueprint is a notation for communicating,
				but the thinking happens in the medium. For code-native practitioners,
				a YAML configuration file is less natural than a TypeScript function.

Code Mode enables Zuhandenheit—Heidegger's ready-to-hand relationship
				where the tool disappears into use. When syntax is fluent, attention
				flows through the code to the creation. The keyboard, the IDE, the
				language all recede. What remains is making.

"When you think in code, you create in code. The translation layer dissolves."


> "When you think in code, you create in code. The translation layer dissolves."



## Principles
Configuration files (YAML, JSON, INI) exist because code was considered
					too complex for non-programmers. For code-native practitioners, these
					formats add translation overhead. Use code for configuration.

✓ TypeScript over JSON where logic is needed

✓ Functions over static declarations

✓ Type safety and autocompletion as features

For component-driven development, the component IS the design.
					A Figma mockup is a translation; the component is the source of truth.
					Design in the medium that will be shipped.

✓ Components as design tokens

✓ Storybook as design documentation

✓ CSS-in-code over separate design files

Well-structured code communicates intent better than documentation.
					The code is the specification. Comments explain why, not what.
					Types document contracts.

✓ Self-documenting function names

✓ Types as API documentation

✓ Tests as usage examples

Code Mode requires fluency—keyboard shortcuts, language idioms,
					tooling mastery. Investment in fluency pays dividends in flow.
					Without fluency, you notice the medium instead of the creation.

✓ Master one language deeply before broadening

✓ Learn IDE shortcuts until automatic

✓ Let syntax become invisible through practice



## When to Apply
- • The team is code-fluent
- • Configuration has logic or conditions
- • Type safety adds value
- • The code IS the deliverable
- • Iteration speed matters

- • Non-programmers need to edit configuration
- • Visual design requires visual tools
- • Domain experts aren't code-fluent
- • Collaboration spans skill sets



## Code Mode in Practice
YAML (Translation Mode)

routes:

- path: /api/users

method: GET

handler: getUsers

- path: /api/users/:id

method: GET

handler: getUser

TypeScript (Code Mode)

const routes = [

get('/api/users', getUsers),

get('/api/users/:id', getUser),

] as const;

// Type-safe, composable, refactorable



## Reference: Claude Code as Code Mode


## Related Patterns
Code Mode enables dwelling. Fluent syntax lets the tool disappear.

Code Mode is the domain for creation. Other domains serve other purposes.`
  },
  {
    slug: "constraint-as-liberation",
    title: "Constraint as Liberation",
    subtitle: "Fewer options, clearer path. Pick your constraints deliberately. Master them before expanding.",
    category: "Pattern",
    content: `## When to Use This Pattern
- • Too many options slowing decisions
- • Output feels scattered or inconsistent
- • Analysis paralysis blocking progress
- • Team debates the same choices repeatedly

- • Choose constraints deliberately (not by accident)
- • Document them visibly
- • Master them before expanding
- • Let constraints eliminate decisions



## How It Works
When everything is possible, nothing is clear. When boundaries are set, creativity focuses.
				This isn't restriction—it's liberation from endless negotiation.

In software: a limited component library forces consistency. A restricted color palette
				creates visual harmony. A fixed grid system makes layout decisions automatic.

"The enemy of art is the absence of limitations."

— Orson Welles


> "The enemy of art is the absence of limitations."



## Four Rules for Working with Constraints
Don't accept accidental limitations. Select constraints that serve your goals.
					Rams chose "less, but better" because it aligned with his vision of honest design.

✓ Black and white palette (forces focus on typography)

✓ Single typeface (forces hierarchy through weight/size)

✓ 5-component limit (forces composition creativity)

The Eameses spent years with plywood before touching fiberglass. Depth comes
					from constraint mastery, not from breadth of options.

✓ Build 10 projects with the same stack

✓ Use one framework until you hit its limits

✓ Exhaust simple solutions before adding complexity

Document your constraints. Make them explicit. When the team knows the
					boundaries, decisions become faster and more consistent.

✓ Design system with explicit rules

✓ Architecture decision records

✓ Style guides that say "no" more than "yes"

Decision fatigue kills velocity. When constraints eliminate options,
					execution accelerates. Less time debating, more time building.

✓ Pre-selected technology stack

✓ Established naming conventions

✓ Template-based starting points



## When to Apply
- • Starting a new design system
- • Team lacks decision-making velocity
- • Output feels scattered or inconsistent
- • Analysis paralysis is slowing progress
- • You want to develop depth over breadth

- • Constraints are accidental, not chosen
- • Limitations serve ego, not users
- • You're avoiding necessary complexity
- • The constraint no longer serves the goal
- • Mastery has been achieved; time to expand



## Examples from the Masters
Not 7, not 15. Exactly 10 principles that governed decades of work at Braun.
					The constraint of 10 forced each principle to earn its place.

A palette of three materials. Barcelona Pavilion, Farnsworth House, Seagram
					Building—all from the same constraint, each utterly distinct.

1941-1956: fifteen years of plywood exploration before the famous fiberglass
					chairs. The constraint became the foundation of their entire practice.



## Related Patterns
Constraints emerge through reduction. Start broad, remove until only essential remains.

Constraints become defaults. Every limitation traces to a principle.`
  },
  {
    slug: "crystallization",
    title: "Crystallization",
    subtitle: "Encode human judgment into configurable constraints. AI executes within those constraints. One expert's judgment scales through AI execution.\"",
    category: "Pattern",
    content: `> "Your judgment, crystallized."



## Definition
Crystallizationis the process of encoding human judgment—taste,
				philosophy, domain expertise—into configurable constraints that AI agents can execute.
				The expert doesn't disappear; they become infrastructure.

This iscurated autonomy: the human decides the boundaries, the AI
				works within them. Unlike "autonomous organizations without humans in the loop,"
				crystallization keeps human judgment central—it just doesn't require human presence
				for every decision.

A legal expert crystallizes contract review criteria. A finance expert crystallizes
				audit trail requirements. A designer crystallizes aesthetic principles. The AI
				executes these judgments at scale.

"The question is not 'can AI do this?' but 'what judgment should guide how AI does this?'"


> "The question is not 'can AI do this?' but 'what judgment should guide how AI does this?'"



## Curated Autonomy vs. Full Autonomy
Human judgment crystallized into constraints. AI executes within boundaries.

"No humans in the loop." AI makes all decisions.

- • Expert encodes quality criteria
- • AI executes at scale
- • Judgment persists across sessions
- • One human serves many
- • Constraints evolve with learning

- • No quality criteria encoding
- • AI decides what "good" means
- • No domain expertise transfer
- • Humans are replaced, not scaled
- • Black box decision-making



## What Gets Crystallized
Which AI model handles which task. Cost optimization meets capability matching.

modelRouting:

patterns:

haiku: [rename, typo, format]

opus: [architect, design, refactor]

sonnet: [add, update, fix]

What must pass before work is considered complete. Domain-specific criteria.

# Legal domain example

qualityGates:

custom:

- name: contract-validation

command: pnpm run validate:contracts

canBlock: true

What reviewers look for. Security, architecture, quality—with custom prompts.

reviewers:

reviewers:

- id: compliance

type: custom

prompt: ./reviewers/compliance.md

canBlock: true

How work is categorized. Reflects organizational structure and priorities.

labels:

scope: [agency, io, space, ltd]

type: [feature, bug, refactor, research]



## Domain Examples
Contract review, compliance checking, redaction validation.

✓ contract-validation: Check clause requirements

✓ redaction-check: Verify PII removal

✓ compliance-review: Regulatory requirements

Audit trails, calculation verification, regulatory compliance.

✓ audit-trail: Ensure transaction logging

✓ calculation-verify: Validate financial math

✓ sox-compliance: SOX requirement checks

Tolerance verification, BOM validation, quality control.

✓ tolerance-check: Verify specifications

✓ bom-validation: Bill of materials accuracy

✓ qc-inspection: Quality control criteria

Canon compliance, accessibility, animation auditing.

✓ canon-audit: Design token compliance

✓ a11y-check: WCAG requirements

✓ motion-review: Animation purposefulness



## Implementation
# Auto-discovers config

harness work cs-xyz

# Explicit config

harness start spec.yaml --config custom.yaml



## Philosophy
Crystallization is the Subtractive Triad applied to human judgment itself:

DRY (Implementation):Encode judgment once, execute many times.
					Don't repeat the same quality decision for every task.

Rams (Artifact):Only crystallize judgment that earns its existence.
					Not every preference needs to be a constraint.

Heidegger (System):Crystallized judgment should serve the whole.
					Constraints that don't serve users get removed.

The hermeneutic circle applies: the crystallized config informs AI execution,
				AI execution reveals what needs crystallizing, which refines the config.
				Understanding deepens through the cycle.

"The goal is not to remove humans from the loop, but to make human judgment
					scale without requiring human presence for every decision."

DRY (Implementation):Encode judgment once, execute many times.
					Don't repeat the same quality decision for every task.

Rams (Artifact):Only crystallize judgment that earns its existence.
					Not every preference needs to be a constraint.

Heidegger (System):Crystallized judgment should serve the whole.
					Constraints that don't serve users get removed.


> "The goal is not to remove humans from the loop, but to make human judgment
					scale without requiring human presence for every decision."



## When to Apply
- • Expert judgment should scale
- • Quality criteria are domain-specific
- • AI is executing, not deciding strategy
- • Consistency matters across executions
- • You want to serve many without being present

- • Novel situations need fresh judgment
- • Over-constraint kills exploration
- • Some decisions should remain human
- • Crystallized != frozen (evolve the config)



## Related Patterns
Every value traces to a principle. Crystallized judgment is principled by definition.

Crystallized constraints free AI to work without constant guidance.

Crystallized judgment enables tools to recede. The harness disappears; work remains.

Crystallized configs evolve. Each execution informs the next refinement.`
  },
  {
    slug: "dwelling-in-tools",
    title: "Dwelling in Tools",
    subtitle: "Build habits that make tools transparent. A carpenter forgets the hammer exists. Workflows become automatic. Infrastructure recedes into invisibility.\"",
    category: "Pattern",
    content: `> "The less we just stare at the hammer-Thing, and the more we seize hold of it
				and use it, the more primordial does our relationship to it become."



## Definition
Dwelling in Toolsis Heidegger'sZuhandenheit—the
				ready-to-hand relationship where tools disappear into use. The carpenter
				doesn't think about the hammer; attention flows through the hammer to the
				nail, the board, the house being built.

This is the goal of tool design: invisibility through mastery. When a tool
				requires constant attention, it fails. When it recedes into the background,
				enabling focus on the actual work, it succeeds.

Dwelling requires investment: learning the tool deeply, configuring it once
				correctly, building habits that become automatic. But once achieved, the
				reward is flow—uninterrupted work where the tool is an extension of thought.

"The tool recedes. The user dwells. Zuhandenheit achieved."


> "The tool recedes. The user dwells. Zuhandenheit achieved."



## Principles
Setup should be a one-time investment. Once configured, the tool should
					work without repeated adjustment. Configuration that requires constant
					tweaking prevents dwelling.

✓ Dotfiles that persist across machines

✓ Sensible defaults requiring minimal overrides

✓ Version-controlled configuration

Repeated actions should become muscle memory. Keyboard shortcuts,
					automated scripts, habitual patterns. Thinking about how dissolves
					into just doing.

✓ Consistent key bindings across tools

✓ Automated repetitive tasks

✓ Practiced patterns that require no thought

Heidegger identifies three modes of tool failure: conspicuousness (broken),
					obtrusiveness (unsuitable), obstinacy (in the way). Design to prevent all three.

✓ Reliable operation (no random failures)

✓ Appropriate capability (right tool for job)

✓ Non-interference (doesn't block other work)

Dwelling requires depth. Using many tools superficially prevents
					mastery of any. Choose fewer tools and know them completely.

✓ Master one editor, not many

✓ Learn shortcuts incrementally until fluent

✓ Invest in understanding, not just usage



## When to Apply
- • Tool friction is slowing work
- • You're repeatedly reconfiguring
- • Attention keeps returning to the tool itself
- • Workflow feels manual and effortful
- • You're ready to invest in mastery

- • Learning a new tool (breakdown is expected)
- • Evaluating alternatives
- • Debugging tool issues
- • Tool requirements are changing



## Reference: Terminal as Dwelling
font_size: 15pt ← canonical body (16-20px)

line_height: 1.5 ← canonical body (1.5-1.6)

padding: 26px ← golden ratio (--space-performance-md)

colors: muted ← functional, not decorative

✓ Configure once, never again

✓ Values trace to principles

✓ Tool recedes into use

font_size: 15pt ← canonical body (16-20px)

line_height: 1.5 ← canonical body (1.5-1.6)

padding: 26px ← golden ratio (--space-performance-md)

colors: muted ← functional, not decorative

✓ Configure once, never again

✓ Values trace to principles

✓ Tool recedes into use



## Related Patterns
Code enables dwelling. Familiar syntax lets tools recede into transparent use.

Configuration derived from principles requires less adjustment, enabling dwelling.`
  },
  {
    slug: "functional-transparency",
    title: "Functional Transparency",
    subtitle: "How something works should be evident. No mystery. No magic. Exposed structure like Eames chairs. Self-documenting code. Honest materials.\"",
    category: "Pattern",
    content: `> "Good design makes a product understandable."



## Definition
Functional Transparencymeans the mechanism is visible. You
				can see how it works by looking at it. The Eames LCW chair exposes its plywood
				layers. A well-written function reveals its purpose through its name and structure.

This is Rams' fourth principle made concrete: the product clarifies its own
				structure. No hidden complexity. No "magic" that mystifies. The user (or
				developer) can trace cause to effect without documentation.

In architecture, this means exposed steel and visible joinery. In software,
				it means self-documenting APIs, clear dependency graphs, and code that reads
				like prose. The structureisthe documentation.

"If you have to explain it, you haven't made it transparent enough."


> "If you have to explain it, you haven't made it transparent enough."



## Principles
Don't hide how things connect. Show the joints. Reveal the dependencies.
					The Pompidou Centre puts its pipes on the outside. Your architecture should too.

✓ Visible folder structure matching mental model

✓ Clear import paths showing relationships

✓ Architecture diagrams derived from code, not imagined

Names should describe function, not obscure it. A function calledprocessDatais opaque.calculateMonthlyRevenueis transparent.

✓ Verb + noun naming (getUserById, sendNotification)

✓ No abbreviations that require lookup

✓ File names that predict contents

Use materials for what they are, not to simulate something else.
					Concrete should look like concrete. A database should behave like a database.

✓ HTML for structure, CSS for style, JS for behavior

✓ Types that reflect actual data shapes

✓ APIs that expose, not hide, underlying capabilities

Every "magical" behavior should be traceable. If something happens
					automatically, the trigger should be visible. No spooky action at a distance.

✓ Explicit over implicit configuration

✓ Visible side effects in function signatures

✓ Clear cause-effect chains in event handling



## When to Apply
- • Building shared libraries or APIs
- • Onboarding new team members
- • Debugging is taking too long
- • Documentation keeps getting out of sync
- • Users ask "how does this work?"

- • Appropriate abstraction (not everything exposed)
- • User-facing simplicity (internal transparency)
- • Security boundaries (some things should hide)
- • Progressive disclosure for complex systems



## Reference: Understanding Graphs
The Understanding Graphs paper demonstrates functional transparency applied
					to codebase navigation. Instead of hiding dependency relationships in
					tooling, UNDERSTANDING.md files expose them in plain markdown.

Every package declares: what it depends on (and why), what depends on it
					(and for what), and where to start reading. The structure is the documentation.



## Related Patterns
Transparency enables dwelling. When you see how tools work, they become extensions of thought.

Code is transparent by nature. The instructions are visible. The mechanism is the message.`
  },
  {
    slug: "hermeneutic-spiral",
    title: "Hermeneutic Spiral",
    subtitle: "Understanding deepens through iteration. The circle becomes a spiral—each pass elevates comprehension. Parts illuminate whole, whole gives meaning to parts.\"",
    category: "Pattern",
    content: `> "Any interpretation which is to contribute understanding must already
				have understood what is to be interpreted."



## Definition
TheHermeneutic Spiralis Heidegger's hermeneutic circle
				understood dynamically. The circle describes how parts and whole mutually
				inform each other—you can't understand a sentence without understanding
				the words, but you can't understand the words without the sentence's context.

The spiral adds the dimension of time: each pass through the circle doesn't
				return you to the same place, but elevates your understanding. The first read
				gives surface meaning. The second reveals structure. The third uncovers intention.
				Each iteration deepens comprehension.

In software, this manifests as iterative design. You can't understand the
				system without building it, but you can't build it well without understanding
				it. The answer is: build, understand, build again. Each cycle produces both
				better software and deeper insight.

"You return to the same place, but you are not the same. Neither is the place."


> "You return to the same place, but you are not the same. Neither is the place."



## The Circle Becomes Spiral
Parts → Whole

↑          ↓

Whole ← Parts

Static: mutual illumination

Parts₁ → Whole₁

↓

Parts₂ → Whole₂

↓

Parts₃ → Whole₃

Dynamic: deepening understanding



## Principles
You can't approach anything with a blank slate. You already have assumptions,
					context, expectations. The spiral acknowledges this—work with your
					pre-understanding, let it evolve.

✓ Name your assumptions before starting

✓ Let first iterations challenge assumptions

✓ Refined understanding becomes new pre-understanding

The spiral only works if each iteration produces new insight.
					Repetition without elevation is a rut, not a spiral.
					Ask: what did I learn this time that I didn't know before?

✓ Document learnings after each iteration

✓ Incorporate insights into next pass

✓ Measure deepening, not just completion

As you understand parts better, the whole changes meaning.
					As the whole clarifies, the parts reveal new significance.
					Both transform together through the spiral.

✓ Revisit "understood" parts after whole clarifies

✓ Let detail insights reshape system view

✓ Neither level is ever "finished"

There's no final understanding—only deeper understanding.
					The spiral continues as long as you engage. Completion is
					practical, not absolute: "deep enough for this purpose."

✓ Define "sufficient" understanding for context

✓ Accept that return will reveal more

✓ Leave paths for future deepening



## When to Apply
- • Learning a new codebase
- • Designing complex systems
- • Writing documentation
- • Onboarding to new domains
- • Any problem too complex for linear understanding

- • "I thought I understood, but..."
- • Details that don't fit the model
- • Questions that emerge after building
- • Insight from seeing the whole assembled



## Reference: CREATE SOMETHING as Spiral


## Related Patterns
Level 3 of the triad embodies hermeneutic thinking—parts serving whole.

Reduction as a spiral—each pass removes more, understanding deepens.`
  },
  {
    slug: "iterative-reduction",
    title: "Iterative Reduction",
    subtitle: "Start complex, remove relentlessly. Rams revised his designs dozens of times. Ship, measure, simplify. The discipline of continuous subtraction.\"",
    category: "Pattern",
    content: `> "Perfection is achieved, not when there is nothing more to add,
				but when there is nothing left to take away."



## Definition
Iterative Reductionis the practice of systematic removal.
				You don't start minimal—youarriveat minimal through cycles of
				building, measuring, and subtracting.

Rams didn't design the SK 4 record player in one pass. He revised it
				repeatedly, removing elements until only the essential remained. Each
				iteration asked: "Can this element be removed without losing function?"

In software, this means shipping features, measuring usage, and removing
				what doesn't prove its value. The first version is never the simplest.
				Simplicity is earned through the discipline of subtraction.

"The first draft of anything is complex. The final draft is simple.
					The work is in between."


> "The first draft of anything is complex. The final draft is simple.
					The work is in between."



## Principles
You cannot know what's essential until you see what's used.
					Ship the complex version. Measure. Then remove what proves unnecessary.

✓ Deploy early, even if "too much"

✓ Instrument everything for usage data

✓ Schedule reduction reviews, not just feature planning

Don't remove based on intuition alone. Let usage data guide subtraction.
					Features with low engagement are candidates for removal.

✓ Track feature usage, not just page views

✓ Measure completion rates, not just starts

✓ Interview users about what they actually use

Deletion is an achievement, not a failure. Create rituals around removal.
					A feature killed is complexity avoided for every future user.

✓ "Deletion Friday" or equivalent practice

✓ Track lines of code removed as a positive metric

✓ Document what was removed and why (for learning)

One reduction pass is never enough. Plan for 3-5 cycles of refinement.
					Each pass reveals new removal opportunities invisible in earlier versions.

✓ Schedule regular refactoring sprints

✓ Revisit "finished" features quarterly

✓ Question assumptions from earlier iterations



## When to Apply
- • Product feels bloated or unfocused
- • Users complain about complexity
- • Onboarding takes too long
- • Maintenance burden is growing
- • You've shipped and have usage data

- • You haven't shipped yet (premature optimization)
- • Removal is avoiding necessary complexity
- • You lack usage data to guide decisions
- • Core functionality is at stake



## The Reduction Cycle


## Related Patterns
The framework for deciding what to remove: DRY, Rams, Heidegger.

Reduction creates constraints. Constraints enable focus.`
  },
  {
    slug: "negative-space",
    title: "Negative Space",
    subtitle: "What you don't build matters as much as what you do. Whitespace in design. Silence in music. Restraint in code. The power of deliberate emptiness.\"",
    category: "Pattern",
    content: `> "Simplicity is not the absence of clutter; that's a consequence of simplicity.
				Simplicity is somehow essentially describing the purpose and place of an object and product."



## Definition
Negative Spaceis the deliberate use of emptiness. In visual design,
				it's whitespace—the areas without content that give structure to what remains. In music,
				it's the rests between notes. In code, it's the features you don't build.

The power of negative space is counterintuitive: emptiness creates meaning. A page with
				generous margins feels calm and intentional. A function that does one thing clearly is
				more powerful than one that attempts everything.

This pattern asks: what would happen if you removed this? If the answer is "nothing much,"
				remove it. If the answer is "the remaining elements gain clarity," definitely remove it.
				Negative space is active design through subtraction.

"The space between things is as important as the things themselves."


> "The space between things is as important as the things themselves."



## Principles
Content needs room to breathe. Margins aren't wasted space—they're
					essential structure. The emptiness around elements defines their importance.

✓ Padding that exceeds expectation

✓ Whitespace that clarifies hierarchy

✓ Empty space as intentional design element

Every element competes for attention. Fewer elements means each one matters more.
					The sparse interface lets users focus on what's important.

✓ One primary action per screen

✓ Progressive disclosure of secondary options

✓ Visual hierarchy through restraint

The negative space around a function's purpose makes it powerful.
					A function that does one thing can be understood, tested, and composed.

✓ Single responsibility principle

✓ Small, focused modules

✓ Clear boundaries between concerns

The most important product decisions are what not to build.
					Every feature adds complexity. Empty product space is a feature.

✓ Explicit "won't do" lists

✓ Scope actively protected

✓ Saying no as product strategy



## When to Apply
- • Interface feels cluttered or overwhelming
- • Users struggle to find primary actions
- • Code is doing too many things
- • Product scope keeps expanding
- • Adding more isn't solving problems

- • Necessary information density
- • Power user needs
- • Accessibility requirements
- • Context that aids understanding



## Visual Demonstration


## Related Patterns
Negative space is created through reduction. Each removal adds emptiness.

The framework for deciding what emptiness to create.`
  },
  {
    slug: "principled-defaults",
    title: "Principled Defaults",
    subtitle: "Every configuration value traces to a principle. No arbitrary numbers. 20px padding—why 20? If you can't answer, it's decoration.\"",
    category: "Pattern",
    content: `> "Indifference towards people and the reality in which they live
				is actually the one and only cardinal sin in design."



## Definition
Principled Defaultsmeans every value in a system can be
				traced to a reason. Not "20px because it looks good" but "20px because
				it's the base unit (16px) multiplied by 1.25 (minor third)."

This isn't pedantry—it's design honesty. Arbitrary values are hidden opinions.
				Principled values are explicit decisions. When you can explain why, you can
				also explain when to deviate and when not to.

The CREATE SOMETHING design system derives all values from principles:
				typography from readability research, spacing from mathematical ratios,
				colors from functional meaning. Nothing is arbitrary. Everything traces.

"If you can't explain the principle behind the value, the value is arbitrary."


> "If you can't explain the principle behind the value, the value is arbitrary."



## Principles
Line height, measure (line length), and font size derive from readability
					studies. Optimal reading: 16-20px body, 45-75 characters per line, 1.5-1.6 line height.

✓ Body: 18px (within 16-20px optimal)

✓ Measure: 65ch (within 45-75ch optimal)

✓ Line height: 1.6 (within 1.5-1.6 optimal)

Use mathematical ratios: golden ratio (1.618), modular scales,
					or consistent base units. Spacing values should relate to each other.

✓ Base unit: 16px

✓ Scale: × 0.618, × 1, × 1.618, × 2.618

✓ All spacing derived from scale (10px, 16px, 26px, 42px)

Colors should have meaning, not just aesthetics. Error is red not because
					red is pretty but because red signals danger. Green means success.

✓ Primary: white (pure information)

✓ Secondary: white/80 (supporting content)

✓ Muted: white/40 (de-emphasized)

Document the principle behind each value. If a value can't be traced,
					question whether it should exist.

✓ Design tokens with documented rationale

✓ Comments explaining "why" not "what"

✓ Review process that questions arbitrary values



## When to Apply
- • Creating design systems
- • Establishing configuration defaults
- • Values will be reused across projects
- • Multiple people will make design decisions
- • Consistency matters long-term

- • Practical constraints (sometimes 20px just works)
- • Exploration phase (find principles through iteration)
- • Context-specific overrides
- • Pragmatism over dogmatism



## Derivation Example

| Token | Value | Derivation |
|---|---|---|
| --space-performance-xs | 10px | 16 × 0.618 ≈ 10 |
| --space-performance-sm | 16px | Base unit (1rem) |
| --space-performance-md | 26px | 16 × 1.618 ≈ 26 |
| --space-performance-lg | 42px | 16 × 2.618 ≈ 42 |
| --space-performance-xl | 68px | 16 × 4.236 ≈ 68 |



## Related Patterns
Principles become constraints. Derivation rules limit options, enabling focus.

Principled defaults require less adjustment, enabling tool-dwelling.`
  },
  {
    slug: "subtractive-triad-audit",
    title: "Subtractive Triad Audit",
    subtitle: "Three questions at three levels. DRY asks about implementation. Rams asks about the artifact. Heidegger asks about the whole.\"",
    category: "Pattern",
    content: `> "Weniger, aber besser."



## Definition
TheSubtractive Triad Auditis a systematic framework for
				evaluating any creation through three lenses, each operating at a different
				level of abstraction. It transforms "should I remove this?" from intuition
				into method.

The triad applies the same principle—subtractive revelation—at three scales:
				implementation (code), artifact (product), and system (ecosystem). Each level
				has its master: DRY eliminates duplication, Rams eliminates excess, Heidegger
				eliminates disconnection.

The power is in the sequence. You must ask the questions in order: DRY before
				Rams before Heidegger. Why? Because you can't evaluate an artifact's essence
				if it's cluttered with duplicates. You can't evaluate systemic fit if the
				artifact itself is unclear.

"Creation is the discipline of removing what obscures."


> "Creation is the discipline of removing what obscures."



## The Three Levels
Don't Repeat Yourself

Question:"Have I built this before?"

Action:Unify. Find the abstraction that eliminates
					duplication without premature generalization.

✓ Extract shared functions and components

✓ Consolidate configuration

✓ Single source of truth for each concept

Weniger, aber besser

Question:"Does this earn its existence?"

Action:Remove. If something doesn't serve an essential
					function, it shouldn't exist.

✓ Every feature must justify itself

✓ Decoration is guilt until proven innocent

✓ Fewer, better elements

The Hermeneutic Circle

Question:"Does this serve the whole?"

Action:Reconnect. Every part must serve the system,
					and the system must give meaning to each part.

✓ Parts reference each other coherently

✓ Nothing is orphaned or purposeless

✓ The whole is revealed through its parts



## When to Apply
- • Reviewing any significant creation
- • Code review or design critique
- • Deciding what to remove
- • System architecture decisions
- • Onboarding new work to existing systems

- • Always DRY before Rams
- • Always Rams before Heidegger
- • Never skip levels
- • Iterate if changes at one level affect others



## Audit Example: Component Library
Level 1: DRY

Are there other button-like components? Does PrimaryButton duplicate
						SecondaryButton logic? Can we unify into one Button with variants?

→ Unify: One Button component with variant prop

Level 2: Rams

Does every prop earn its existence? Is the "loading" state needed,
						or is it decoration? What about the icon slot?

→ Remove: Drop unused size="xl" variant

Level 3: Heidegger

Does Button connect to the design system's purpose? Does it reference
						typography tokens? Does it enable the product vision?

→ Reconnect: Derive from semantic color tokens



## Reference: WORKWAY SDK Audit


## Related Patterns
The triad guides each reduction cycle. Apply, reduce, repeat.

The third level of the triad—ensuring parts serve the whole.`
  },
  {
    slug: "timeless-materials",
    title: "Timeless Materials",
    subtitle: "Choose what ages well. Avoid trends. Mies used steel because it endures. Web standards over frameworks. SQL over NoSQL. Build on what lasts.\"",
    category: "Pattern",
    content: `> "God is in the details."



## Definition
Timeless Materialsare foundations that don't expire. Mies van der Rohe
				chose steel, glass, and travertine not for fashion but for permanence. His buildings
				from the 1950s look contemporary today because the materials transcend their era.

In software, timeless materials are the technologies with staying power: web standards
				(HTML, CSS, JavaScript), relational databases (SQL), foundational protocols (HTTP, TCP/IP).
				These aren't exciting—they're reliable. They won't be deprecated next year.

The anti-pattern is trend-chasing: adopting the latest framework because it's popular,
				choosing NoSQL because it's "modern," using a proprietary protocol because the vendor
				promises better performance. These decisions age poorly.

"The question is not 'what's new?' but 'what will last?'"


> "The question is not 'what's new?' but 'what will last?'"



## Principles
Frameworks come and go. Standards persist. When possible, build on
					web standards directly. Use frameworks as thin layers, not foundations.

✓ HTML/CSS before framework abstractions

✓ Fetch API over axios

✓ Web Components when interoperability matters

Technologies with 20+ years of production use have passed the test.
					New doesn't mean better—often it means untested.

✓ PostgreSQL over the database of the month

✓ HTTP/REST before GraphQL (unless you need it)

✓ Unix philosophy over containerized everything

Even "timeless" choices may need replacement. Ensure you can exit.
					Avoid lock-in. Own your data. Keep abstractions thin.

✓ Data exportable in standard formats

✓ No vendor-specific languages

✓ Thin wrappers over platform APIs

Exciting technology is risky technology. The most reliable systems
					are built on boring, well-understood foundations.

✓ Choose based on requirements, not hype

✓ Innovation in product, not in infrastructure

✓ "Boring" = production-proven = trustworthy



## When to Apply
- • Building for long-term maintenance
- • Team stability is uncertain
- • Requirements are well-understood
- • Reliability trumps novelty
- • You value sleep over excitement

- • Problem genuinely requires new solutions
- • Scale exceeds proven technology limits
- • Competitive advantage from new capability
- • Prototyping where long-term doesn't matter



## Timeless vs. Trendy

| Domain | Timeless | Trendy |
|---|---|---|
| Database | PostgreSQL, SQLite | This year's distributed DB |
| API | REST/HTTP | GraphQL, gRPC (unless needed) |
| Styling | CSS, CSS Variables | CSS-in-JS framework du jour |
| State | URL, forms, localStorage | State management library #47 |
| Hosting | VPS, static files | Serverless everything |



## Related Patterns
Arcs built on timeless materials (HTTP, OAuth, JSON) require less maintenance.

Standards-based materials are universally accessible.`
  },
  {
    slug: "tool-complementarity",
    title: "Tool Complementarity",
    subtitle: "Tools should not compete for the same ontological space. Each has a domain. Clear boundaries. Handoff protocols, not redundancy.\"",
    category: "Pattern",
    content: `> "Equipment is essentially 'something in-order-to...' A totality of equipment
				is constituted by various ways of the 'in-order-to.'"



## Definition
Tool Complementaritymeans each tool has a distinct purpose that
				doesn't overlap with others. The hammer is for hammering; the saw is for sawing.
				You don't debate which to use—the task determines the tool.

In Heidegger's analysis, tools form a "totality of equipment"—an interconnected
				system where each tool points to others. The hammer refers to the nail, the nail
				to the wood, the wood to the house. Tools don't compete; they complement.

Software tools should follow this principle. If two tools can accomplish the
				same task, confusion arises. The user must stop and think: "Which do I use?"
				This breaks flow. Clear domains eliminate the question.

"When tools have clear domains, the question 'which tool?' never arises."


> "When tools have clear domains, the question 'which tool?' never arises."



## Principles
Each tool owns a clear territory. When domains threaten to overlap,
					redraw boundaries or eliminate redundancy.

✓ Claude Code for creation, WezTerm for execution

✓ Notion for documents, GitHub for code

✓ One tool per job, not "also works for..."

Where tools meet, define explicit handoffs. The output of one becomes
					the input of another. Clear interfaces, not blurred responsibilities.

✓ "Claude writes, user deploys"

✓ API contracts between services

✓ Documented transition points

Tools should reference each other, forming a coherent system.
					The design tool points to the development tool, which points to
					the deployment tool. A complete chain.

✓ Tools that integrate, not isolate

✓ Shared data formats and protocols

✓ Workflow that flows through tools naturally

Two tools for the same purpose creates confusion and maintenance burden.
					Choose one. Commit. Eliminate the other.

✓ Regular audit of tool overlap

✓ Deprecation paths for redundant tools

✓ Single source of truth for each function



## When to Apply
- • Users ask "which tool should I use?"
- • Multiple tools solve the same problem
- • Workflow friction at tool boundaries
- • Maintenance burden is duplicated
- • Onboarding involves tool choice paralysis

- • Overlap provides resilience
- • Different contexts need different tools
- • Migration is in progress
- • User expertise varies widely



## Reference: CREATE SOMETHING Domains


## Related Patterns
Clear domains enable dwelling. When you know which tool to use, you can master it.

Code Mode is the domain for tool-mediated action. Tool calling has its own domain.`
  },
  {
    slug: "universal-utility",
    title: "Universal Utility",
    subtitle: "\"The best for the most for the least.\" Charles and Ray Eames' democratic design philosophy. Tools that serve everyone without compromise.\"",
    category: "Pattern",
    content: `> "The role of the designer is that of a very good, thoughtful host
				anticipating the needs of his guests."



## Definition
Universal Utilityis the Eames commitment to democratic design:
				create the best possible solution, make it available to the most people, at the
				lowest possible cost. No compromises on quality. No exclusive pricing.

The Eames molded plywood chair wasn't a luxury item—it was designed for mass
				production. The quality matched or exceeded handcrafted furniture, but the
				manufacturing process made it accessible to ordinary households.

In software, this means accessibility by default, not as an afterthought.
				Progressive enhancement so the tool works everywhere. Zero-config options
				so beginners aren't excluded. The best experience for the broadest audience.

"Universal doesn't mean average. It means excellent for everyone."


> "Universal doesn't mean average. It means excellent for everyone."



## Principles
Accessibility isn't a feature—it's a baseline. Screen readers, keyboard
					navigation, color contrast: these aren't enhancements, they're requirements.

✓ Semantic HTML before ARIA

✓ WCAG AA minimum, AAA preferred

✓ Test with actual assistive technologies

Start with core functionality that works everywhere. Layer enhancements
					for capable environments. Never require the latest technology.

✓ Works without JavaScript where possible

✓ Graceful degradation for older browsers

✓ Core paths work on slow connections

Beginners shouldn't need to configure. The default experience should be
					excellent. Power users can customize, but the out-of-box experience works.

✓ Sensible defaults for all options

✓ Configuration optional, not required

✓ Progressive disclosure of advanced features

The best features shouldn't be paywalled. Core functionality should be
					affordable or free. Premium tiers add convenience, not capability.

✓ Free tier that actually works

✓ Open source when possible

✓ Premium = more, not premium = usable



## When to Apply
- • Building public-facing tools
- • Audience includes diverse abilities
- • Global reach is a goal
- • Democratizing access to capability
- • Long-term sustainability matters

- • Expert-focused tools (universal ≠ dumbed down)
- • Sustainable business models
- • Performance for power users
- • Specialized needs that require depth



## The Eames Example


## Related Patterns
Manufacturing constraints drove Eames innovation. Limitation enabled universality.

Universal tools age well. Build on standards that everyone can access.`
  }
];
