/**
 * Generated Canon design system content — DO NOT EDIT MANUALLY.
 * Run: npm run build:content
 * Source: packages/ltd/src/lib/content/canon/
 */

import type { CanonPage } from '../types.js';

export const CANON_PAGES: CanonPage[] = [
  {
    slug: "components/atlas",
    section: "components",
    title: "Atlas",
    description: "Workflow map renderers and headless artifacts for governed systems.",
    content: `## What Ships Today

- \`AtlasFlow\`: renderer for workflow graph artifacts
- \`AtlasStoryCanvas\`: narrative canvas for mapped workflow evidence
- \`@create-something/canon/atlas/headless\`: renderer-independent graph contract
- \`@create-something/canon/atlas/handoff\`: development handoff packet builder

## Selection Rules

1. Use the headless Atlas artifact as the source of truth.
2. Use visual renderers when the operator needs topology, ownership, or status at a glance.
3. Use handoff packets when an agent or implementation team needs the work translated into Database, Automation, Judgment, validation, and stop conditions.

## Related

- [Clear Components](/canon/components/clear)
- [Registry](/canon/resources/registry)
- [Diagrams](/canon/components/diagrams)`
  },
  {
    slug: "components/brand",
    section: "components",
    title: "Brand",
    description: "Brand marks, 3D marks, and identity-adjacent surfaces owned by Canon.",
    content: `## What Ships Today

- 3D brand mark candidates for high-fidelity product surfaces
- CSS support for brand icon assets
- shared brand utilities and mark primitives

## Selection Rules

1. Use stable identity assets before creating local marks.
2. Keep expressive 3D brand work behind explicit brand review.
3. Do not copy third-party identity, campaign language, or category framing into Canon.

## Related

- [Icons](/canon/components/icons)
- [Clear Components](/canon/components/clear)
- [Theming](/canon/guidelines/theming)`
  },
  {
    slug: "components/button",
    section: "components",
    title: "Button",
    description: "Action controls for primary, secondary, and ghost interactions.",
    content: `## What Ships Today

- \`variant\`: \`primary\`, \`secondary\`, \`ghost\`
- \`size\`: \`sm\`, \`md\`, \`lg\`
- \`href\`: render link navigation with button treatment
- \`disabled\`: preserve state and suppress interaction
- \`fullWidth\`: stretch to the container when layout needs it

## Example

\`\`\`svelte
<script lang="ts">
  import { Button } from '@create-something/canon';
</script>

<Button>Save changes</Button>
<Button variant="secondary">Preview</Button>
<Button variant="ghost" href="/canon/components">Browse components</Button>
\`\`\`

## Selection Rules

1. Use \`primary\` for the one action that moves the user forward.
2. Use \`secondary\` when the choice matters but should not dominate the screen.
3. Use \`ghost\` for supporting actions, dense toolbars, or low-emphasis UI.

## Related

- [Clear Components](/canon/components/clear)
- [Card](/canon/components/card)
- [Navigation](/canon/components/navigation)
- [Get Started](/canon/resources/get-started)`
  },
  {
    slug: "components/card",
    section: "components",
    title: "Card",
    description: "Flexible containers for grouping related content with controlled emphasis.",
    content: `## What Ships Today

- \`variant\`: \`standard\`, \`elevated\`, \`outlined\`, \`glass\`
- \`radius\`: \`sm\`, \`md\`, \`lg\`, \`xl\`
- \`padding\`: \`none\`, \`sm\`, \`md\`, \`lg\`, \`xl\`
- \`hover\`: opt into interactive lift when the whole card is actionable
- \`href\`: render the card as a link target

## Example

\`\`\`svelte
<script lang="ts">
  import { Card, Button } from '@create-something/canon';
</script>

<Card variant="elevated" padding="lg">
  <h2>Deployment Ready</h2>
  <p>Record evidence, then promote with the narrowest trustworthy validation surface.</p>
  <Button variant="secondary">Review checklist</Button>
</Card>
\`\`\`

## When To Reach For Each Variant

1. Use \`standard\` for most content groupings.
2. Use \`elevated\` when the card needs stronger separation from the canvas.
3. Use \`outlined\` when you want structure without added depth.
4. Use \`glass\` sparingly for automation, shell, or overlay surfaces.

## Related

- [Clear Components](/canon/components/clear)
- [Button](/canon/components/button)
- [Navigation](/canon/components/navigation)
- [Layout](/canon/foundations/layout)`
  },
  {
    slug: "components/clear",
    section: "components",
    title: "Clear Components",
    description: "Ona-derived communication primitives for mapped, governed, proof-bearing work.",
    content: `## What Ships Today

- \`ClearPageSection\`: open page bands for claims, proof, actions, and asides
- \`ClearPlatformHero\`: first-viewport product, system, or platform anchors
- \`ClearProofStrip\`: compact evidence objects scanned together
- \`ClearDecisionPanel\`: allow, review, block, or neutral decision states
- \`ClearStateRows\`: explicit run, wait, stop, or handoff rows
- \`ClearReceiptGrid\`: delivery evidence, artifacts, and validation receipts
- \`ClearArtifactCard\`: one evidence object with status and link
- \`ClearCtaBand\`: restrained next-action bands

## When To Use Clear Components

Use clear components when the page needs to show at least one operational answer:

1. What workflow or system has been mapped?
2. What can run, what needs review, and what is blocked?
3. Which policy, contract, receipt, or validation gate proves the claim?
4. What should the buyer, operator, reviewer, system, or agent do next?

Do not use clear components as generic light-themed decoration. If the surface does not carry
maps, trust boundaries, approval states, receipts, validation gates, or handoff evidence, use the
standard Canon components instead.

## Example

\`\`\`svelte
<script lang="ts">
  import { ClearDecisionPanel, ClearPageSection, ClearReceiptGrid } from '@create-something/canon';
</script>

<ClearPageSection
  variant="hero"
  titleLevel="h1"
  eyebrow="Governed workflow"
  title="Map the action before the agent runs."
  description="Name the object, approval rule, stop condition, and receipt before execution."
/>

<ClearDecisionPanel
  title="Show whether to run, review, or stop."
  items={[
    {
      label: 'Review',
      summary: 'Approval needed',
      title: 'The write path changes customer data.',
      detail: 'The policy requires an operator review before the tool can run.',
      tone: 'review',
      evidence: ['Write target is named', 'Policy rule is attached'],
      receipts: ['workflow-map', 'approval-log']
    }
  ]}
/>

<ClearReceiptGrid
  receipts={[
    {
      title: 'Workflow map',
      status: 'Ready',
      description: 'Objects, tools, approval rules, and stop states are documented.'
    }
  ]}
/>
\`\`\`

## Copy Rules

- Use nouns from the workflow: object, tool, record, tenant, bundle, policy, receipt.
- Use verbs from the work: map, review, approve, block, run, validate, hand off.
- Put proof beside the claim.
- Keep headings plain and short.
- Use mono labels for short state, receipt, or identifier text.

## Related

- [Navigation](/canon/components/navigation)
- [Colors](/canon/foundations/colors)
- [Typography](/canon/foundations/typography)`
  },
  {
    slug: "components/content",
    section: "components",
    title: "Content",
    description: "Media, article, carousel, and editorial surfaces that can graduate into shared content patterns.",
    content: `## What Ships Today

- media and carousel candidate components
- editorial content utilities that can graduate through repeated use
- registry policy that separates reusable content patterns from property-specific content

## Selection Rules

1. Use content candidates when the structure repeats across surfaces.
2. Keep property-specific copy, research data, and routing outside Canon.
3. Promote only after the evidence model, accessibility, and responsive behavior are clear.

## Related

- [Card](/canon/components/card)
- [Patterns](/canon/components/patterns)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "components/conversion",
    section: "components",
    title: "Conversion",
    description: "Trust, action, and proof surfaces for product conversion flows.",
    content: `## What Ships Today

- \`TrustSignals\`
- \`StickyCTA\`
- \`ProcessSteps\`
- \`MetricCounters\`
- \`ExitIntent\`

## Selection Rules

1. Put proof beside the action.
2. Prefer restrained action states over urgency theater.
3. Keep conversion claims tied to receipts, metrics, or a clear product promise.

## Related

- [Button](/canon/components/button)
- [Clear Components](/canon/components/clear)
- [Patterns](/canon/components/patterns)`
  },
  {
    slug: "components/diagrams",
    section: "components",
    title: "Diagrams",
    description: "Flow, chart, timeline, matrix, and graph components for explaining systems.",
    content: `## What Ships Today

- flow, bar, line, pie, timeline, matrix, and graph candidates
- canvas-oriented diagram surfaces for richer system maps
- registry contracts for accessibility, evidence, motion, and extension

## Selection Rules

1. Use diagrams to reveal relationships, not to decorate a section.
2. Provide text alternatives and readable labels.
3. Keep source data and transformation logic inspectable.

## Related

- [Atlas](/canon/components/atlas)
- [Clear Components](/canon/components/clear)
- [Insights](/canon/components/insights)`
  },
  {
    slug: "components/feedback",
    section: "components",
    title: "Feedback",
    description: "Stable alerts, toasts, dialogs, progress, spinners, and skeleton states.",
    content: `## What Ships Today

- \`Alert\`
- \`Toast\`
- \`Dialog\`
- \`Progress\`
- \`Spinner\`
- \`Skeleton\`

## Selection Rules

1. Use alerts for persistent status that belongs in the page flow.
2. Use toasts for transient confirmation, not critical errors.
3. Use dialogs only when focus and decision state need to be contained.

## Related

- [Button](/canon/components/button)
- [Patterns](/canon/components/patterns)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "components/filtering",
    section: "components",
    title: "Filtering",
    description: "Product and agent-assisted filtering surfaces for searchable collections.",
    content: `## What Ships Today

- product grid candidates
- filter toggle panel candidates
- agent panel candidates for assisted filtering

## Selection Rules

1. Show the criteria that changed the result set.
2. Keep empty and loading states explicit.
3. Treat agent suggestions as reviewable assistance, not hidden filtering logic.

## Related

- [Forms](/canon/components/forms)
- [Patterns](/canon/components/patterns)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "components/form",
    section: "components",
    title: "Form Controls",
    description: "Stable input controls for text, choice, selection, and switch interactions.",
    content: `## What Ships Today

- \`TextField\`
- \`TextArea\`
- \`Checkbox\`
- \`CheckboxGroup\`
- \`Radio\`
- \`RadioGroup\`
- \`Select\`
- \`Switch\`

## Selection Rules

1. Use stable controls for ordinary input before reaching for advanced patterns.
2. Keep labels, descriptions, errors, and required state visible.
3. Preserve keyboard and screen-reader behavior when composing controls.

## Related

- [Advanced Forms](/canon/components/forms)
- [Patterns](/canon/components/patterns)
- [Accessibility](/canon/guidelines/accessibility)`
  },
  {
    slug: "components/forms",
    section: "components",
    title: "Advanced Forms",
    description: "Candidate form patterns that build on the stable form controls.",
    content: `## What Ships Today

- \`FormField\`
- \`Combobox\`
- \`DatePicker\`
- \`FileUpload\`
- \`OTPInput\`

## Selection Rules

1. Start with stable text, select, checkbox, radio, and switch controls.
2. Use advanced candidates when keyboard behavior, validation, and fallback states are understood.
3. Keep errors and required evidence visible.

## Related

- [Form Controls](/canon/components/form)
- [Patterns](/canon/components/patterns)
- [Accessibility](/canon/guidelines/accessibility)`
  },
  {
    slug: "components/heading",
    section: "components",
    title: "Heading",
    description: "Stable semantic heading primitive for readable page and section structure.",
    content: `## What Ships Today

- a stable \`Heading\` component in the root Canon component barrel
- registry coverage as \`component.heading\`
- token-backed typography behavior

## Selection Rules

1. Preserve semantic heading order.
2. Use visual scale to clarify hierarchy, not to compensate for unclear copy.
3. Keep headings short and specific to the workflow or content object.

## Related

- [Typography](/canon/components/typography)
- [Button](/canon/components/button)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "components/icons",
    section: "components",
    title: "Icons",
    description: "Accessible icon primitive and icon support exports.",
    content: `## What Ships Today

- \`Icon\`: stable accessible icon primitive
- icon path support exports under review
- registry coverage as \`component.icon\`

## Selection Rules

1. Prefer a labeled control over an unlabeled icon-only control.
2. Use icons to reinforce meaning, not as decoration.
3. Keep icon names and advanced accessibility behavior reviewable.

## Related

- [Button](/canon/components/button)
- [Navigation](/canon/components/navigation)
- [Brand](/canon/components/brand)`
  },
  {
    slug: "components/index",
    section: "components",
    title: "Components",
    description: "",
    content: `<section class="component-grid">
<a class="component-card" href="/canon/components/button">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<rect height="8" rx="2" width="18" x="3" y="8"></rect>
</svg>
</div>
<div class="card-content">
<h2 class="card-title">Button</h2>
<p class="card-description">
				Prompt users to take action with primary, secondary, and ghost styles.
			</p>
</div>
<div class="card-arrow">
<svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16">
<path d="M5 12h14M12 5l7 7-7 7"></path>
</svg>
</div>
</a>
<a class="component-card" href="/canon/components/card">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<rect height="18" rx="2" width="18" x="3" y="3"></rect>
</svg>
</div>
<div class="card-content">
<h2 class="card-title">Card</h2>
<p class="card-description">
				Group related content together with three depth levels to choose from.
			</p>
</div>
<div class="card-arrow">
<svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16">
<path d="M5 12h14M12 5l7 7-7 7"></path>
</svg>
</div>
</a>
<a class="component-card" href="/canon/components/clear">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<path d="M4 6h16"></path>
<path d="M4 12h10"></path>
<path d="M4 18h7"></path>
<path d="M17 11l2 2 4-4"></path>
</svg>
</div>
<div class="card-content">
<h2 class="card-title">Clear Components</h2>
<p class="card-description">
				Map workflows, proof, receipts, and governed states with Ona-derived clarity.
			</p>
</div>
<div class="card-arrow">
<svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16">
<path d="M5 12h14M12 5l7 7-7 7"></path>
</svg>
</div>
</a>
<a class="component-card" href="/canon/components/navigation">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
<polyline points="9 22 9 12 15 12 15 22"></polyline>
</svg>
</div>
<div class="card-content">
<h2 class="card-title">Navigation</h2>
<p class="card-description">
				Help users find their way with headers, sidebars, breadcrumbs, and tabs.
			</p>
</div>
<div class="card-arrow">
<svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16">
<path d="M5 12h14M12 5l7 7-7 7"></path>
</svg>
</div>
</a>
</section>


<section class="principles">
<h2 class="section-title">How We Build These</h2>
<p class="section-description">
		We test each component against three questions before shipping it.
	</p>
<div class="principles-grid">
<div class="principle-item">
<h3>One Pattern, One Place</h3>
<p>If a component already exists, use it. No duplicates.</p>
</div>
<div class="principle-item">
<h3>Earn Your Place</h3>
<p>Every prop and variant must solve a real problem.</p>
</div>
<div class="principle-item">
<h3>Disappear When Working</h3>
<p>Good tools get out of the way. You should focus on your work, not ours.</p>
</div>
</div>
</section>


<section class="token-reference">
<h2 class="section-title">Design Tokens</h2>
<p class="section-description">
		Use these variables for colors, spacing, and motion. They keep your design consistent automatically.
	</p>
<div class="token-grid">
<div class="token-category">
<h3>Colors</h3>
<code>--color-bg-surface</code>
<code>--color-fg-primary</code>
<code>--color-border-default</code>
</div>
<div class="token-category">
<h3>Motion</h3>
<code>--duration-micro</code>
<code>--ease-standard</code>
</div>
<div class="token-category">
<h3>Spacing</h3>
<code>--space-xs</code>
<code>--space-sm</code>
<code>--space-md</code>
</div>
<div class="token-category">
<h3>Borders</h3>
<code>--radius-sm</code>
<code>--radius-md</code>
<code>--radius-lg</code>
</div>
</div>
</section>`
  },
  {
    slug: "components/insights",
    section: "components",
    title: "Insights",
    description: "Shareable key insight and statement visuals for proof-bearing content.",
    content: `## What Ships Today

- key insight candidates
- statement text candidates
- insight card candidates

## Selection Rules

1. Anchor the visual to a specific claim.
2. Keep the source, metric, or proof object close to the statement.
3. Avoid treating insight visuals as generic pull quotes.

## Related

- [Content](/canon/components/content)
- [Diagrams](/canon/components/diagrams)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "components/interactive",
    section: "components",
    title: "Interactive",
    description: "Interactive candidates and effects that require explicit review before stable promotion.",
    content: `## What Ships Today

- contextual disclosure candidates
- integration flow candidates
- authoring and timeline candidates
- decorative effects that remain classified out

## Selection Rules

1. Do not depend on hover as the only path to meaning.
2. Provide keyboard and reduced-motion behavior.
3. Keep visual effects out of the stable registry unless they carry a clear product contract.

## Related

- [Motion](/canon/foundations/motion)
- [Patterns](/canon/components/patterns)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "components/layout",
    section: "components",
    title: "Layout",
    description: "Stable and candidate layout primitives for sections, grids, and split surfaces.",
    content: `## What Ships Today

- \`Section\`
- \`SectionHeader\`
- \`BentoGrid\`
- \`BentoItem\`
- \`SplitSection\`
- \`ProjectGridInteractive\` candidate

## Selection Rules

1. Use open page sections for top-level page structure.
2. Keep cards for repeated items, modals, or bounded tools.
3. Make responsive behavior and composition rules explicit before stable promotion.

## Related

- [Card](/canon/components/card)
- [Typography](/canon/components/typography)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "components/navigation",
    section: "components",
    title: "Navigation",
    description: "Wayfinding surfaces for headers, breadcrumbs, and tabbed interfaces.",
    content: `## Available Surfaces

- \`Navigation\`: primary site header with desktop and mobile states
- \`Footer\`: property directory, grouped links, newsletter, legal, and cross-property links
- \`Breadcrumbs\`: hierarchical wayfinding with optional home icon
- \`Tabs\`: WAI-ARIA tab panels with keyboard navigation and bindable active state

## Primary Navigation Example

\`\`\`svelte
<script lang="ts">
  import { Navigation } from '@create-something/canon';

  const links = [
    { label: 'Canon', href: '/canon' },
    { label: 'Principles', href: '/principles' }
  ];
</script>

<Navigation
  logo="CREATE"
  logoSuffix=".something"
  {links}
  currentPath="/canon"
  ctaLabel="Contact"
  ctaHref="/contact"
/>
\`\`\`

## Clear Communication Navigation

\`Navigation\` and \`Footer\` both accept \`visualStyle?: 'classic' | 'clear'\`. The default is
\`classic\` to preserve existing callers while the Ona-derived clear system rolls out.

Use \`clear\` when the page must serve a buyer or operator who needs immediate orientation before
brand atmosphere. The clear style follows the Ona-derived communication layer: frosted light shell,
compact readable links, crisp dividers, restrained active states, direct dark CTA, and no decorative
navigation complexity.

Clear navigation should route people into proof-bearing work, not generic brand exploration. Prefer
labels for maps, policies, systems, workflows, receipts, and contact paths. Keep the primary CTA
bounded to a concrete next action such as mapping one workflow, reviewing a handoff, or opening a
governed surface.

\`\`\`svelte
<Navigation
  logo="CREATE SOMETHING"
  logoSuffix=".agency"
  links={links}
  currentPath="/"
  fixed={true}
  ctaLabel="Map one workflow"
  ctaHref="/book"
  visualStyle="clear"
/>

<Footer
  mode="agency"
  aboutText="Governed workflows with clear trust boundaries and receipt-backed delivery."
  quickLinkGroups={footerGroups}
  footerCta={{
    label: 'Map one workflow',
    href: '/book',
    description: 'Leave with the workflow, boundary, and proof path.'
  }}
  visualStyle="clear"
/>
\`\`\`

## Clear Communication Primitives

The clear navigation and footer are designed to pair with:

- \`ClearPageSection\`: claim, proof, action, and split hero sections
- \`ClearProofStrip\`: compact objects/actions/states/receipts proof
- \`ClearStateRows\`: governed run/wait/stop rows
- \`ClearDecisionPanel\`: selectable allow/review/block decision paths with evidence and receipts
- \`ClearReceiptGrid\` and \`ClearArtifactCard\`: evidence and delivery receipts
- \`ClearCtaBand\`: restrained final action band

## Breadcrumbs and Tabs

\`\`\`svelte
<script lang="ts">
  import { Breadcrumbs, Tabs } from '@create-something/canon';

  const items = [
    { label: 'Canon', href: '/canon' },
    { label: 'Navigation' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'api', label: 'API' }
  ];

  let activeTab = 'overview';
</script>

<Breadcrumbs {items} showHomeIcon={true} />

<Tabs {tabs} bind:activeTab>
  {#snippet children(tabId)}
    <p>{tabId} content</p>
  {/snippet}
</Tabs>
\`\`\`

## Design Guidance

1. Keep the primary header focused on top-level choices.
2. Use breadcrumbs when the user needs a clear sense of depth.
3. Use tabs for peer content, not for hiding unrelated workflows.
4. Use \`visualStyle="clear"\` for the new CREATE SOMETHING communication layer: plain-language
   orientation, visible proof, and a direct next action.

## Related

- [Clear Components](/canon/components/clear)
- [Layout](/canon/foundations/layout)
- [Content](/canon/guidelines/content)
- [Responsive](/canon/guidelines/responsive)`
  },
  {
    slug: "components/patterns",
    section: "components",
    title: "Patterns",
    description: "Reusable composition patterns built from stable Canon primitives.",
    content: `## What Ships Today

- form layout and validation candidates
- multi-step form candidates
- empty, loading, error, and onboarding candidates

## Selection Rules

1. Prefer stable primitives before choosing a pattern.
2. Use patterns when composition, state, and copy rules repeat.
3. Promote patterns only after evidence from multiple surfaces.

## Related

- [Advanced Forms](/canon/components/forms)
- [Filtering](/canon/components/filtering)
- [Registry](/canon/resources/registry)`
  },
  {
    slug: "components/skip-to-content",
    section: "components",
    title: "Skip To Content",
    description: "Stable keyboard bypass primitive for accessible page navigation.",
    content: `## What Ships Today

- stable \`SkipToContent\` export in the root component barrel
- registry coverage as \`component.skip-to-content\`
- focus behavior governed by Canon accessibility rules

## Selection Rules

1. Place the skip link before repeated navigation.
2. Point it at the primary content landmark.
3. Keep focus treatment visible.

## Related

- [Navigation](/canon/components/navigation)
- [Accessibility](/canon/guidelines/accessibility)
- [Layout](/canon/components/layout)`
  },
  {
    slug: "components/typography",
    section: "components",
    title: "Typography",
    description: "Typography surfaces that align headings, tokens, and readable content structure.",
    content: `## What Ships Today

- \`TypographyHero\` candidate
- stable \`Heading\` primitive
- token-backed typography scales and line-height rules

## Selection Rules

1. Use semantic headings before visual display treatments.
2. Reserve hero-scale type for true first-viewport claims.
3. Keep copy plain, specific, and tied to the object or workflow.

## Related

- [Heading](/canon/components/heading)
- [Token Reference](/canon/resources/tokens)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "concepts/complementarity",
    section: "concepts",
    title: "Complementarity",
    description: "The principle that human and AI capabilities complete rather than replace each other.",
    content: `<h2>Definition</h2>
<blockquote class="definition-block">
<p>
			The principle that human and AI capabilities complete rather than replace each other.
			Neither is sufficient alone; together they form a whole greater than the sum of parts.
			The human provides judgment, context, and purpose; the AI provides scale, consistency,
			and tireless execution.
		</p>
</blockquote>



<h2>Origin</h2>
<p>
		The term derives from Niels Bohr's principle in quantum mechanics, where wave and particle
		descriptions are both necessary but mutually exclusive views of the same phenomenon. CREATE
		SOMETHING adapts this to human-AI collaboration: different modes of intelligence that cannot
		be reduced to each other but together describe the complete picture.
	</p>
<p>
		In the CREATE SOMETHING context, complementarity emerged from practical experience with
		Claude Code—discovering that the most effective work happens when human and AI each do
		what they do best, with clear handoff points rather than blurred responsibilities.
	</p>



<h2>In Practice</h2>
<p>
		The Complementarity Principle manifests in how CREATE SOMETHING divides work between
		human and AI:
	</p>
<div class="complementarity-table">
<div class="column human">
<h3>Human (WezTerm)</h3>
<ul>
<li>Monitor logs</li>
<li>Verify production</li>
<li>Debug edge cases</li>
<li>Interactive sessions</li>
<li>Observe and decide</li>
<li>Provide context and judgment</li>
<li>Set direction and purpose</li>
</ul>
</div>
<div class="column ai">
<h3>AI (Claude Code)</h3>
<ul>
<li>Write code</li>
<li>Deploy code</li>
<li>Run migrations</li>
<li>Execute tests</li>
<li>Plan and execute</li>
<li>Scale repetitive tasks</li>
<li>Maintain consistency</li>
</ul>
</div>
</div>
<p class="table-note">
		The boundary is not rigid but principled: handoff occurs where one mode of intelligence
		reaches its limit and the other excels.
	</p>



<h2>Relationship to Zuhandenheit</h2>
<p>
		Complementarity enables <a href="/canon/concepts/zuhandenheit">Zuhandenheit</a> (ready-to-hand).
		When human and AI work in their proper domains, the tool recedes. The human doesn't think
		about the AI; the AI doesn't demand attention. They simply work together.
	</p>
<p>
		When complementarity breaks down—when the AI attempts judgment it cannot make, or the human
		micromanages execution—the tool becomes <a href="/canon/concepts/vorhandenheit">present-at-hand</a>.
		We notice the partnership instead of the work.
	</p>



<h2>Anti-Patterns</h2>
<p>
		What Complementarity is <strong>not</strong>:
	</p>
<ul class="antipattern-list">
<li>
<strong>Replacement</strong> — AI replacing human judgment, or humans doing what AI
			does better. Complementarity is completion, not substitution.
		</li>
<li>
<strong>Delegation without oversight</strong> — The human remains responsible.
			Complementarity is partnership, not abdication.
		</li>
<li>
<strong>50/50 split</strong> — The division is by capability, not by quantity.
			Some tasks are 90% AI; others are 90% human.
		</li>
<li>
<strong>Static boundaries</strong> — As AI capabilities grow, the boundary shifts.
			What required human judgment yesterday may be AI-appropriate today.
		</li>
</ul>



<h2>The Complementarity Test</h2>
<p>
		When deciding who should do a task, ask:
	</p>
<blockquote class="test-block">
<p>"Does this require judgment, or execution?"</p>
</blockquote>
<p>
		Judgment—weighing tradeoffs, understanding context, deciding what matters—belongs to humans.
		Execution—implementing decisions consistently at scale—belongs to AI. The boundary is where
		one transforms into the other.
	</p>



<h2>In the Hermeneutic Circle</h2>
<p>
		Complementarity connects to the broader CREATE SOMETHING system:
	</p>
<ul class="connection-list">
<li>
<strong>.agency</strong> applies complementarity to client work—AI handles implementation,
			humans handle relationships and strategy.
		</li>
<li>
<strong>.io</strong> uses complementarity in research—AI gathers and synthesizes,
			humans interpret and apply.
		</li>
<li>
<strong>.space</strong> explores complementarity—experiments test where the boundary lies.
		</li>
<li>
<strong>.ltd</strong> defines complementarity—Canon documents the principle so it can
			be applied consistently.
		</li>
</ul>


<section class="concept-section references">
<h2>References</h2>
<ul class="reference-list">
<li>
			Bohr, Niels. "The Quantum Postulate and the Recent Development of Atomic Theory." <em>Nature</em>, 1928.
		</li>
<li>
<a href="/canon/concepts/zuhandenheit">Canon Concept: Zuhandenheit</a>
</li>
<li>
<a href="/canon/concepts/vorhandenheit">Canon Concept: Vorhandenheit</a>
</li>
<li>
<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
</li>
</ul>
</section>`
  },
  {
    slug: "concepts/gelassenheit",
    section: "concepts",
    title: "Gelassenheit",
    description: "'Releasement' - Heidegger's concept of the proper stance toward technology: neither rejection nor submission, but engaged openness.",
    content: `<h2>Definition</h2>
<blockquote class="definition-block">
<p>
			The stance of engaged openness toward technology: neither rejection nor submission,
			but full engagement without capture. The craftsman uses the hammer; the hammer does
			not use him. In Canon, Gelassenheit is the posture that enables sustainable human-AI
			partnership—we use technology extensively while remaining free from it.
		</p>
</blockquote>



<h2>Origin</h2>
<p>
		Heidegger developed <em>Gelassenheit</em> in his later work, particularly the 1959
		text <em>Gelassenheit</em> (translated as "Discourse on Thinking"). The word has
		roots in medieval German mysticism, where Meister Eckhart used it to describe the
		soul's release from attachment to creatures in openness to God.
	</p>
<p>
		Heidegger secularizes the concept: Gelassenheit is release from capture by
		<a href="/canon/concepts/gestell">Gestell</a> (enframing). It is not rejection of
		technology—we still use it fully—but freedom from being defined by it. We can say
		"yes" and "no" to technology simultaneously.
	</p>



<h2>The Double Gesture</h2>
<p>
		Gelassenheit involves a paradoxical double gesture:
	</p>
<div class="gesture-block">
<div class="gesture yes">
<h3>Yes</h3>
<p>
				We use technology. Claude Code writes our code. Cloudflare deploys our sites.
				Analytics inform our decisions. We engage fully with modern tools.
			</p>
</div>
<div class="gesture no">
<h3>No</h3>
<p>
				We refuse to let technology define our meaning. Efficiency is not the only value.
				The human remains the source of judgment. Technology serves; it does not rule.
			</p>
</div>
</div>
<p>
		This is not compromise or moderation. It is not "use technology, but not too much."
		It is full engagement and full freedom simultaneously—the hammer is used completely,
		and the craftsman remains completely free.
	</p>



<h2>In Canon</h2>
<p>
		Gelassenheit manifests in how CREATE SOMETHING approaches its tools:
	</p>
<div class="manifestation-grid">
<div class="manifestation">
<h3>AI Partnership</h3>
<p>
				Claude Code is used extensively—writing code, deploying, planning. But the human
				provides judgment, context, and purpose. Neither rejection nor delegation.
			</p>
</div>
<div class="manifestation">
<h3>Edge Infrastructure</h3>
<p>
				Cloudflare Workers, D1, KV—fully embraced for what they enable. But infrastructure
				is not identity. The work matters, not the technology stack.
			</p>
</div>
<div class="manifestation">
<h3>Automation</h3>
<p>
				Deployment is automated. Testing is automated. But not everything is automated.
				Some gaps are left unfilled. Some processes remain manual by design.
			</p>
</div>
<div class="manifestation">
<h3>Metrics</h3>
<p>
				Analytics inform decisions. But metrics are not the only truth. What matters
				cannot always be measured. Qualitative judgment persists.
			</p>
</div>
</div>



<h2>Gelassenheit vs. Alternatives</h2>
<p>
		Gelassenheit is distinguished from other responses to technology:
	</p>
<div class="comparison-table">
<div class="response rejection">
<h3>Rejection</h3>
<p class="stance">"Technology is the problem"</p>
<p>
				Romanticizes pre-technological life. Ignores what technology enables.
				Impractical and often hypocritical (uses technology while condemning it).
			</p>
</div>
<div class="response submission">
<h3>Submission</h3>
<p class="stance">"Technology is inevitable"</p>
<p>
				Surrenders judgment to efficiency. "Move fast and break things."
				Technology becomes the only value. Humans become obstacles.
			</p>
</div>
<div class="response gelassenheit-response">
<h3>Gelassenheit</h3>
<p class="stance">"Technology is a tool"</p>
<p>
				Full engagement without capture. Yes and no simultaneously.
				Technology serves human purposes. Freedom and use coexist.
			</p>
</div>
</div>



<h2>The Practice of Letting-Be</h2>
<p>
		Gelassenheit is not a state to achieve but a practice to cultivate:
	</p>
<ul class="practice-list">
<li>
<strong>Notice the pull</strong> — When technology demands that you optimize
			everything, automate everything, measure everything—notice. The pull toward
			Gestell is constant.
		</li>
<li>
<strong>Ask what is hidden</strong> — Every technological frame reveals and conceals.
			What does this tool make invisible? What mode of being does it exclude?
		</li>
<li>
<strong>Preserve non-technological goods</strong> — Some things matter that cannot
			be measured, automated, or optimized. Protect space for them.
		</li>
<li>
<strong>Use fully, hold lightly</strong> — Engage completely with the tools you use.
			But remain ready to set them down. The tool serves the work, not the reverse.
		</li>
</ul>



<h2>The Gelassenheit Test</h2>
<p>
		When evaluating your relationship with technology, ask:
	</p>
<blockquote class="test-block">
<p>"Could I put this down?"</p>
</blockquote>
<p>
		Not "should I?" but "could I?" If the answer is no—if the technology has become
		essential to your identity, not just your work—Gelassenheit has been lost. The
		hammer has begun to use the craftsman.
	</p>



<h2>Relation to Other Concepts</h2>
<p>
		Gelassenheit completes Canon's philosophical vocabulary:
	</p>
<ul class="relation-list">
<li>
<strong><a href="/canon/concepts/zuhandenheit">Zuhandenheit</a></strong> describes
			tools that recede into use. Gelassenheit is the stance that allows this recession—we
			use the tool fully because we are not captured by it.
		</li>
<li>
<strong><a href="/canon/concepts/gestell">Gestell</a></strong> is the danger of
			technological thinking. Gelassenheit is the response—not rejection but release,
			engagement without capture.
		</li>
<li>
<strong><a href="/canon/concepts/weniger-aber-besser">Weniger, aber besser</a></strong>
			is enabled by Gelassenheit. Only when we are free from the compulsion to optimize
			everything can we choose to do less, but better.
		</li>
<li>
<strong><a href="/canon/concepts/complementarity">Complementarity</a></strong>
			expresses Gelassenheit in human-AI partnership. We work with AI fully while
			retaining human judgment and purpose.
		</li>
</ul>


<h2>Operationalizing Gelassenheit</h2>
<p>
		The question Gelassenheit poses—"when should automation yield to human judgment?"—requires 
		a practical framework for answering. The 
		<a href="https://github.com/quietloudlab/ai-interaction-atlas">AI Interaction Atlas</a> 
		provides this framework through its <code>human_oversight</code> taxonomy.
	</p>
<div class="manifestation-grid">
<div class="manifestation">
<h3>Required</h3>
<p>
				<strong>Gestell boundary.</strong> These are the gaps that must not be filled. 
				Irreversible actions, safety-critical decisions, situations where automation would 
				"fill every gap" and consume human agency.
			</p>
</div>
<div class="manifestation">
<h3>Recommended</h3>
<p>
				<strong>Verification gates.</strong> The craftsman checks the work. High-stakes 
				outputs where confidence thresholds determine routing—if uncertain, the human 
				reviews; if confident, automation proceeds.
			</p>
</div>
<div class="manifestation">
<h3>Optional</h3>
<p>
				<strong>Quality assurance.</strong> Automation is acceptable with appropriate 
				monitoring. Human review available but not required. The double gesture of 
				"yes and no" in equilibrium.
			</p>
</div>
<div class="manifestation">
<h3>None</h3>
<p>
				<strong>Zuhandenheit achieved.</strong> The tool disappears in use. Infrastructure 
				that should be invisible—logging, caching, format conversion. Full automation 
				serves human purposes without requiring attention.
			</p>
</div>
</div>
<p>
		This taxonomy answers Gelassenheit's central question not through abstract principle but 
		through operational decision: for each task, what level of human engagement serves both 
		full use and full freedom?
	</p>


<section class="concept-section references">
<h2>References</h2>
<ul class="reference-list">
<li>
			Heidegger, Martin. <em>Discourse on Thinking</em>. Trans. John M. Anderson and E. Hans Freund. New York: Harper &amp; Row, 1966.
		</li>
<li>
			Heidegger, Martin. "The Question Concerning Technology." <em>The Question Concerning Technology and Other Essays</em>. Trans. William Lovitt. New York: Harper &amp; Row, 1977.
		</li>
<li>
			Harwood, Brandon. <a href="https://github.com/quietloudlab/ai-interaction-atlas">AI Interaction Atlas</a>. quietloudlab, 2025. 
			<em>A shared language for designing AI experiences—provides the <code>human_oversight</code> taxonomy for operationalizing Gelassenheit.</em>
		</li>
<li>
<a href="/canon/concepts/gestell">Canon Concept: Gestell</a>
</li>
<li>
<a href="/canon/concepts/zuhandenheit">Canon Concept: Zuhandenheit</a>
</li>
<li>
<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
</li>
</ul>
</section>`
  },
  {
    slug: "concepts/gestell",
    section: "concepts",
    title: "Gestell",
    description: "'Enframing' - Heidegger's concept of the essence of modern technology as a way of revealing that reduces everything to standing-reserve.",
    content: `<h2>Definition</h2>
<blockquote class="definition-block">
<p>
			The essence of modern technology understood as a mode of revealing that reduces everything
			to "standing-reserve" (<em>Bestand</em>)—resources waiting to be optimized, extracted,
			and consumed. Gestell is not technology itself but the way of thinking that sees the
			world as raw material for human projects. In Canon, Gestell is the danger we navigate:
			automation that fills every gap is not efficiency but invasion.
		</p>
</blockquote>



<h2>Origin</h2>
<p>
		Heidegger developed the concept of <em>Gestell</em> in "The Question Concerning Technology"
		(1954). He argued that modern technology is not merely a collection of tools but a way of
		understanding the world—one that "enframes" everything as available for use.
	</p>
<p>
		The Rhine becomes hydroelectric power. The forest becomes lumber inventory. The human
		becomes "human resources." Gestell is the frame through which modernity sees: everything
		is standing-reserve, waiting to be ordered and optimized.
	</p>
<p>
		This is not wrong in itself—technology enables human flourishing. But when Gestell becomes
		the <em>only</em> way of seeing, we lose access to other modes of being. The Rhine as
		sacred river disappears; only the power source remains.
	</p>



<h2>In Canon</h2>
<p>
		Canon acknowledges Gestell as both useful and dangerous:
	</p>
<div class="manifestation-grid">
<div class="manifestation danger">
<h3>AI as Optimization</h3>
<p>
				The temptation to automate everything. Claude Code could write all the code,
				make all the decisions, fill every gap. But this is Gestell—reducing human
				creativity to a resource problem to be solved.
			</p>
</div>
<div class="manifestation danger">
<h3>Metrics as Meaning</h3>
<p>
				The temptation to measure everything. Analytics, KPIs, conversion rates—all useful,
				but when they become the only truth, meaning itself becomes standing-reserve.
			</p>
</div>
<div class="manifestation balance">
<h3>Efficiency with Limits</h3>
<p>
				Canon uses technology extensively—Cloudflare edge, AI partnership, automated
				deployment. But it refuses to let efficiency become the only value.
			</p>
</div>
<div class="manifestation balance">
<h3>Complementarity as Counter</h3>
<p>
				The <a href="/canon/concepts/complementarity">Complementarity Principle</a> resists
				Gestell by insisting on human judgment. The AI executes; the human decides. Neither
				is reducible to the other.
			</p>
</div>
</div>



<h2>The Danger and the Saving Power</h2>
<p>
		Heidegger famously quoted Hölderlin: "But where danger is, grows the saving power also."
		The same technology that threatens to reduce everything to standing-reserve can also
		reveal new modes of being.
	</p>
<div class="tension-block">
<div class="danger-side">
<h3>The Danger</h3>
<ul>
<li>Technology becomes the only way of seeing</li>
<li>Humans become resources to be optimized</li>
<li>Meaning is reduced to measurable outcomes</li>
<li>Efficiency crowds out all other values</li>
<li>We forget what technology cannot reveal</li>
</ul>
</div>
<div class="saving-side">
<h3>The Saving Power</h3>
<ul>
<li>Technology reveals Gestell itself</li>
<li>Awareness of enframing opens alternatives</li>
<li>AI partnership can free human creativity</li>
<li>Efficiency creates space for non-efficient goods</li>
<li>The question of technology is asked</li>
</ul>
</div>
</div>
<p>
		Canon's response is not to reject technology but to use it with awareness—to let efficiency
		serve meaning rather than replace it.
	</p>



<h2>Gestell in Software</h2>
<p>
		Software development is particularly susceptible to Gestell:
	</p>
<ul class="gestell-list">
<li>
<strong>Move fast and break things</strong> — Everything becomes material for
			iteration. Users become test subjects. Ethics becomes friction.
		</li>
<li>
<strong>Engagement optimization</strong> — Attention becomes standing-reserve to be
			captured, measured, and monetized. The human becomes an attention-producing resource.
		</li>
<li>
<strong>AI replacement narratives</strong> — Humans become obstacles to automation.
			The goal is removing the human from the loop entirely.
		</li>
<li>
<strong>Infinite scale</strong> — Every gap in the market must be filled. Every
			problem must have a technological solution. Limitation becomes failure.
		</li>
</ul>
<p>
		Canon resists these patterns not through rejection but through <em>Gelassenheit</em>—a
		posture of engaged openness that uses technology without being captured by it.
	</p>



<h2>The Gestell Test</h2>
<p>
		When evaluating a technological decision, ask:
	</p>
<blockquote class="test-block">
<p>"What does this make invisible?"</p>
</blockquote>
<p>
		Every frame reveals and conceals. Gestell is not wrong for revealing the world as
		standing-reserve—this revealing enables modern life. But we must ask what other modes
		of being are concealed. What does efficiency hide? What does optimization exclude?
	</p>



<h2>Canon's Response</h2>
<p>
		CREATE SOMETHING navigates Gestell through:
	</p>
<ul class="response-list">
<li>
<strong>Complementarity</strong> — Insisting on human judgment in partnership with AI,
			not replacement by it.
		</li>
<li>
<strong>Zuhandenheit as goal</strong> — Technology that recedes into use rather than
			demanding attention and optimization.
		</li>
<li>
<strong>Weniger, aber besser</strong> — Subtraction rather than accumulation. Not
			every gap needs filling; not every problem needs solving.
		</li>
<li>
<strong>Gelassenheit</strong> — A posture of engaged openness that neither rejects
			nor submits to technology.
		</li>
</ul>


<section class="concept-section references">
<h2>References</h2>
<ul class="reference-list">
<li>
			Heidegger, Martin. "The Question Concerning Technology." <em>The Question Concerning Technology and Other Essays</em>. Trans. William Lovitt. New York: Harper &amp; Row, 1977.
		</li>
<li>
			Dreyfus, Hubert. "Heidegger on the Connection between Nihilism, Art, Technology, and Politics." <em>The Cambridge Companion to Heidegger</em>. Cambridge University Press, 1993.
		</li>
<li>
<a href="/canon/concepts/gelassenheit">Canon Concept: Gelassenheit</a>
</li>
<li>
<a href="/canon/concepts/zuhandenheit">Canon Concept: Zuhandenheit</a>
</li>
<li>
<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
</li>
</ul>
</section>`
  },
  {
    slug: "concepts/hermeneutic-circle",
    section: "concepts",
    title: "Hermeneutic Circle",
    description: "'Understanding through parts and whole' - The interpretive principle that parts inform the whole while the whole informs parts.",
    content: `<h2>What It Means</h2>
<blockquote class="definition-block">
<p>
			You understand sentences through words, and words through sentences. Neither comes first—meaning emerges through going back and forth. At CREATE SOMETHING, this describes how our properties work together: philosophy shapes practice, practice tests philosophy, and the whole system evolves.
		</p>
</blockquote>



<h2>Where It Comes From</h2>
<p>
		This started with interpreting religious texts—you need the whole book to understand a verse, but you need verses to understand the book. Friedrich Schleiermacher turned this into a formal method.
	</p>
<p>
		Heidegger took it further in <em>Being and Time</em> (1927). For him, the circle isn't a problem to solve—it's how understanding works. We always bring assumptions that shape what we see. Each pass through the circle deepens what we know.
	</p>
<p>
		Gadamer built on this in <em>Truth and Method</em> (1960): understanding is always shaped by context and history. You bring your perspective to a text; the text expands your perspective. Understanding isn't copying—it's transformation.
	</p>



<h2>The Structure of Understanding</h2>
<p>
		The hermeneutic circle operates at multiple levels:
	</p>
<div class="circle-levels">
<div class="circle-level">
<h3>Text Level</h3>
<p>Words ↔ Sentences ↔ Paragraphs ↔ Document</p>
<p class="example">
				Understanding "bank" requires context; context requires understanding "bank."
			</p>
</div>
<div class="circle-level">
<h3>Interpretation Level</h3>
<p>Reader ↔ Text ↔ Author ↔ Tradition</p>
<p class="example">
				We read with questions; the text answers and transforms our questions.
			</p>
</div>
<div class="circle-level">
<h3>Existence Level</h3>
<p>Self ↔ World ↔ Others ↔ Being</p>
<p class="example">
				Understanding ourselves requires understanding our world; understanding our world
				requires understanding ourselves.
			</p>
</div>
</div>



<h2>In Canon</h2>
<p>
		CREATE SOMETHING operates as a hermeneutic system. Each property informs and is
		informed by the others:
	</p>
<div class="property-circle">
<div class="property-node ltd">
<h3>.ltd</h3>
<p class="property-mode">Being-as-Canon</p>
<p>
				Philosophy. Defines principles, articulates the Canon.
				Provides criteria for judging what is and isn't aligned.
			</p>
</div>
<div class="property-arrow">→ provides criteria for →</div>
<div class="property-node io">
<h3>.io</h3>
<p class="property-mode">Being-as-Document</p>
<p>
				Research. Validates approaches, documents patterns.
				Tests philosophical claims against technical reality.
			</p>
</div>
<div class="property-arrow">→ validates →</div>
<div class="property-node space">
<h3>.space</h3>
<p class="property-mode">Being-as-Experience</p>
<p>
				Practice. Experiments, systems, learning.
				Where patterns become products at scale.
			</p>
</div>
<div class="property-arrow">→ applies to →</div>
<div class="property-node agency">
<h3>.agency</h3>
<p class="property-mode">Being-as-Service</p>
<p>
				Services. Client work, commercial application.
				Where philosophy meets market reality.
			</p>
</div>
<div class="property-arrow">→ tests and evolves →</div>
<div class="property-return">.ltd (Philosophy)</div>
</div>
<p>
		No property is foundational. Philosophy without practice is abstract; practice without
		philosophy is blind. The system understands itself through circulation.
	</p>



<h2>Automation Platform Example</h2>
<p>
		The Automation Platform demonstrates the hermeneutic circle in infrastructure:
	</p>
<div class="example-flow">
<div class="flow-step">
<h3>1. Canon defines appearance</h3>
<p>
				.ltd articulates what Canon-compliant sites look like: pure black, Canon tokens,
				<a href="/canon/concepts/weniger-aber-besser">Weniger, aber besser</a>.
			</p>
</div>
<div class="flow-step">
<h3>2. Research validates patterns</h3>
<p>
				.io documents the patterns—CSS Canon, component architecture, deployment patterns.
				Technical feasibility tests philosophical claims.
			</p>
</div>
<div class="flow-step">
<h3>3. Practice builds systems</h3>
<p>
				.space creates vertical systems embodying the patterns.
				The platform routes requests, injects config, and serves outcomes.
			</p>
</div>
<div class="flow-step">
<h3>4. Services tests with clients</h3>
<p>
				.agency delivers custom MCP systems. Client feedback reveals
				what works and what doesn't in commercial reality.
			</p>
</div>
<div class="flow-step">
<h3>5. Philosophy evolves</h3>
<p>
				Insights from client work flow back to .ltd. The Canon itself evolves.
				What was once experimental becomes canonical.
			</p>
</div>
</div>



<h2>The Circle Test</h2>
<p>
		When evaluating a contribution to any property, ask:
	</p>
<blockquote class="test-block">
<p>"How does this participate in the whole?"</p>
</blockquote>
<p>
		A component on .space should embody .ltd principles, use patterns documented on .io,
		and be applicable to .agency work. If it doesn't participate in the circle, it's isolated—
		and isolation is the first sign of disconnection.
	</p>



<h2>Fore-Understanding</h2>
<p>
		Heidegger emphasized that we never approach anything without presuppositions. This
		"fore-structure" has three components:
	</p>
<ul class="fore-list">
<li>
<strong>Fore-having</strong> (<em>Vorhabe</em>) — The context we bring. A designer
			approaches CSS differently than a philosopher. Both are valid entry points.
		</li>
<li>
<strong>Fore-sight</strong> (<em>Vorsicht</em>) — The perspective that guides our
			looking. We see what we're oriented to see. The Canon orients perception.
		</li>
<li>
<strong>Fore-conception</strong> (<em>Vorgriff</em>) — The concepts we use to
			articulate what we find. "Zuhandenheit" makes visible what "usability" obscures.
		</li>
</ul>
<p>
		These are not biases to eliminate but conditions of understanding. The hermeneutic
		circle transforms fore-understanding through encounter with what is understood.
	</p>



<h2>Vicious vs. Productive Circles</h2>
<p>
		Not all circles are the same:
	</p>
<div class="circle-comparison">
<div class="circle-type vicious">
<h3>Vicious Circle</h3>
<p class="pattern">Assumption → Confirmation → Same Assumption</p>
<p>
				Closed loop. Nothing new enters. The conclusion is smuggled into the premise.
				No growth, no learning.
			</p>
</div>
<div class="circle-type productive">
<h3>Productive Circle</h3>
<p class="pattern">Understanding → Encounter → Transformed Understanding</p>
<p>
				Open spiral. Each iteration deepens. What we understood transforms through
				what we encounter. Growth and learning emerge.
			</p>
</div>
</div>
<p>
		The difference is openness to transformation. A productive circle is vulnerable—
		willing to have its assumptions challenged by what it encounters.
	</p>



<h2>Relation to Other Concepts</h2>
<p>
		The hermeneutic circle connects Canon's conceptual vocabulary:
	</p>
<ul class="relation-list">
<li>
<strong><a href="/canon/concepts/zuhandenheit">Zuhandenheit</a></strong> is
			hermeneutically prior—we understand through use before theory. The hammer's
			meaning is in hammering, not measurement.
		</li>
<li>
<strong><a href="/canon/concepts/vorhandenheit">Vorhandenheit</a></strong> emerges
			from breakdown, which is itself hermeneutically significant—failure reveals what
			was presupposed.
		</li>
<li>
<strong><a href="/canon/concepts/weniger-aber-besser">Weniger, aber besser</a></strong>
			is a hermeneutic discipline: subtraction clarifies the whole by removing what
			obscures part-whole relations.
		</li>
<li>
<strong><a href="/canon/concepts/gelassenheit">Gelassenheit</a></strong> enables
			productive circulation—openness to being transformed by what is encountered.
		</li>
</ul>


<section class="concept-section references">
<h2>References</h2>
<ul class="reference-list">
<li>
			Heidegger, Martin. <em>Being and Time</em>. Trans. Macquarrie &amp; Robinson. New York: Harper &amp; Row, 1962. §32.
		</li>
<li>
			Gadamer, Hans-Georg. <em>Truth and Method</em>. Trans. Weinsheimer &amp; Marshall. London: Continuum, 2004.
		</li>
<li>
			Ricoeur, Paul. <em>Hermeneutics and the Human Sciences</em>. Cambridge University Press, 1981.
		</li>
<li>
<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
</li>
<li>
<a href="/canon/concepts/zuhandenheit">Canon Concept: Zuhandenheit</a>
</li>
</ul>
</section>`
  },
  {
    slug: "concepts/index",
    section: "concepts",
    title: "Concepts",
    description: "Canonical definitions for the philosophical vocabulary of CREATE SOMETHING's design system.",
    content: `<section class="concepts-grid">
<a class="concept-card" href="/canon/concepts/weniger-aber-besser">
<h2>Weniger, aber besser</h2>
<p class="concept-translation">"Less, but better"</p>
<p class="concept-summary">
			Quality comes from removing what doesn't belong. If it doesn't serve a purpose, it doesn't stay.
		</p>
<span class="concept-origin">Dieter Rams</span>
</a>
<a class="concept-card" href="/canon/concepts/zuhandenheit">
<h2>Zuhandenheit</h2>
<p class="concept-translation">"Ready-to-hand" — tools that disappear into use</p>
<p class="concept-summary">
			Good tools get out of your way. You don't think about the hammer—you think about the nail.
		</p>
<span class="concept-origin">Martin Heidegger</span>
</a>
<a class="concept-card" href="/canon/concepts/vorhandenheit">
<h2>Vorhandenheit</h2>
<p class="concept-translation">"Present-at-hand" — when tools demand attention</p>
<p class="concept-summary">
			When you notice the design, something's broken. Failure makes the invisible visible.
		</p>
<span class="concept-origin">Martin Heidegger</span>
</a>
<a class="concept-card" href="/canon/concepts/gestell">
<h2>Gestell</h2>
<p class="concept-translation">"Enframing" — seeing everything as a resource</p>
<p class="concept-summary">
			The trap of treating everything as raw material to optimize. Not every gap needs filling.
		</p>
<span class="concept-origin">Martin Heidegger</span>
</a>
<a class="concept-card" href="/canon/concepts/gelassenheit">
<h2>Gelassenheit</h2>
<p class="concept-translation">"Releasement" — using tools without being used by them</p>
<p class="concept-summary">
			Use technology fully, but stay free from it. The craftsman uses the hammer; the hammer doesn't use him.
		</p>
<span class="concept-origin">Martin Heidegger</span>
</a>
<a class="concept-card" href="/canon/concepts/complementarity">
<h2>Complementarity</h2>
<p class="concept-translation">"Mutual completion" — humans and AI working together</p>
<p class="concept-summary">
			Human judgment + AI execution = more than either alone. Partnership, not replacement.
		</p>
<span class="concept-origin">CREATE SOMETHING</span>
</a>
<a class="concept-card" href="/canon/concepts/hermeneutic-circle">
<h2>Hermeneutic Circle</h2>
<p class="concept-translation">"Parts and whole" — understanding through iteration</p>
<p class="concept-summary">
			You understand sentences through words, and words through sentences. Each pass deepens meaning.
		</p>
<span class="concept-origin">Hermeneutic Tradition</span>
</a>
</section>`
  },
  {
    slug: "concepts/vorhandenheit",
    section: "concepts",
    title: "Vorhandenheit",
    description: "'Present-at-hand' - Heidegger's concept of detached theoretical observation, when tools become objects of attention.",
    content: `<h2>Definition</h2>
<blockquote class="definition-block">
<p>
			The mode of being in which things become objects of detached theoretical observation.
			When a tool breaks or proves unsuitable, it shifts from ready-to-hand to present-at-hand—we
			notice it as an object rather than using it transparently. In Canon design, Vorhandenheit
			signals failure: the infrastructure has become visible.
		</p>
</blockquote>



<h2>Origin</h2>
<p>
		Martin Heidegger distinguished <em>Vorhandenheit</em> from <em>Zuhandenheit</em> in
		<em>Being and Time</em> (1927). Western philosophy, he argued, had privileged the
		present-at-hand mode—treating the world as a collection of objects to be studied,
		measured, and categorized.
	</p>
<p>
		But this theoretical stance is derived, not primordial. We first encounter hammers
		by hammering, not by measuring their mass. Vorhandenheit emerges from the breakdown
		of Zuhandenheit—when the hammer breaks, we suddenly see it as an object.
	</p>



<h2>In Canon</h2>
<p>
		Vorhandenheit is the diagnostic signal for design failure:
	</p>
<div class="manifestation-grid">
<div class="manifestation warning">
<h3>When Components Demand Attention</h3>
<p>
				A button that makes you think about its styling. A form that requires consulting
				documentation. The component has become present-at-hand.
			</p>
</div>
<div class="manifestation warning">
<h3>When Infrastructure Becomes Visible</h3>
<p>
				Deployment that requires manual steps. Database queries that need optimization
				mid-feature. The infrastructure has surfaced as an obstacle.
			</p>
</div>
<div class="manifestation warning">
<h3>When Motion Draws Eyes</h3>
<p>
				Animation that users notice and comment on. Loading states that feel slow.
				The motion has become the subject rather than the transition.
			</p>
</div>
<div class="manifestation warning">
<h3>When AI Partnership Breaks</h3>
<p>
				Needing to explain context repeatedly. Correcting obvious errors. The AI has
				shifted from invisible partner to visible obstacle.
			</p>
</div>
</div>



<h2>The Three Modes of Breakdown</h2>
<p>
		Heidegger identified three ways Zuhandenheit fails, revealing Vorhandenheit:
	</p>
<div class="breakdown-modes">
<div class="breakdown-mode">
<h3>Conspicuousness</h3>
<p class="german">Auffälligkeit</p>
<p>
				The tool breaks. A component throws an error; the build fails; the API returns 500.
				The tool announces its presence through malfunction.
			</p>
<p class="response">
<strong>Response:</strong> Fix the immediate failure, but also ask—why did this
				break? What assumption proved wrong?
			</p>
</div>
<div class="breakdown-mode">
<h3>Obtrusiveness</h3>
<p class="german">Aufdringlichkeit</p>
<p>
				The tool is missing. You reach for a component that doesn't exist; a feature
				you assumed was available isn't. The absence becomes present.
			</p>
<p class="response">
<strong>Response:</strong> Create what's missing, but also ask—why did we
				assume this existed? What pattern suggested it?
			</p>
</div>
<div class="breakdown-mode">
<h3>Obstinacy</h3>
<p class="german">Aufsässigkeit</p>
<p>
				The tool doesn't fit. The component exists but doesn't match the use case; the
				API returns data in the wrong shape. The tool resists its intended use.
			</p>
<p class="response">
<strong>Response:</strong> Adapt or replace, but also ask—was the tool wrong,
				or was the expectation? What does this resistance reveal?
			</p>
</div>
</div>



<h2>Vorhandenheit as Information</h2>
<p>
		While Vorhandenheit signals failure in design, it provides valuable information:
	</p>
<ul class="info-list">
<li>
<strong>Reveals hidden dependencies</strong> — We don't notice what we rely on until
			it fails. Breakdown exposes the network of assumptions.
		</li>
<li>
<strong>Enables theoretical understanding</strong> — Sometimes we need to study an
			object, not just use it. Debugging requires Vorhandenheit.
		</li>
<li>
<strong>Invites repair</strong> — Breakdown creates the opportunity for improvement.
			The visible tool can be examined and refined.
		</li>
<li>
<strong>Tests design claims</strong> — A design that claims to recede into use can
			be tested: does it ever become present-at-hand in normal operation?
		</li>
</ul>



<h2>The Vorhandenheit Test</h2>
<p>
		When evaluating design in use, ask:
	</p>
<blockquote class="test-block">
<p>"When did users last notice this?"</p>
</blockquote>
<p>
		If the answer is "during normal operation," the design has failed. If the answer is
		"only when something went wrong," the design may be succeeding. If the answer is
		"never," the design has achieved Zuhandenheit.
	</p>



<h2>Productive Vorhandenheit</h2>
<p>
		Not all presence-at-hand is failure. Some contexts require it:
	</p>
<ul class="productive-list">
<li>
<strong>Learning</strong> — Beginners need to see the tool as an object before they
			can use it transparently. Documentation serves this mode.
		</li>
<li>
<strong>Debugging</strong> — When something fails, we must shift to theoretical
			observation. Console logs are Vorhandenheit tools.
		</li>
<li>
<strong>Design iteration</strong> — Creating new components requires studying them
			as objects. The designer works in Vorhandenheit so users can work in Zuhandenheit.
		</li>
<li>
<strong>Philosophy</strong> — Understanding concepts like Vorhandenheit itself
			requires theoretical reflection on our practical engagement.
		</li>
</ul>
<p>
		The goal is not to eliminate Vorhandenheit but to place it appropriately—in learning,
		debugging, and design, not in normal operation.
	</p>


<section class="concept-section references">
<h2>References</h2>
<ul class="reference-list">
<li>
			Heidegger, Martin. <em>Being and Time</em>. Trans. Macquarrie &amp; Robinson. New York: Harper &amp; Row, 1962. §15-18.
		</li>
<li>
			Dreyfus, Hubert. <em>Being-in-the-World: A Commentary on Heidegger's Being and Time, Division I</em>. MIT Press, 1991.
		</li>
<li>
<a href="/canon/concepts/zuhandenheit">Canon Concept: Zuhandenheit</a>
</li>
<li>
<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
</li>
<li>
<a href="/patterns/breakdown-and-repair">Pattern: Breakdown and Repair</a>
</li>
</ul>
</section>`
  },
  {
    slug: "concepts/weniger-aber-besser",
    section: "concepts",
    title: "Weniger, aber besser",
    description: "'Less, but better' - Dieter Rams' guiding principle and the philosophical foundation of Canon design.",
    content: `<h2>Definition</h2>
<blockquote class="definition-block">
<p>
			The principle that quality emerges through disciplined subtraction rather than addition.
			Every element must earn its existence by serving a purpose. What remains after removing
			the unnecessary is not diminished but revealed.
		</p>
</blockquote>



<h2>Origin</h2>
<p>
		Attributed to <strong>Dieter Rams</strong>, Chief Design Officer at Braun (1961–1995),
		who distilled his design philosophy into this phrase. Rams' work influenced generations
		of designers, from Apple's Jonathan Ive to the entire modern minimalist movement.
	</p>
<p>
		The phrase captures what Rams demonstrated through decades of product design: that
		removing what doesn't belong creates space for what does. A Braun radio with fewer
		controls is not simpler—it is <em>clearer</em>.
	</p>



<h2>In Canon</h2>
<p>
<em>Weniger, aber besser</em> is the generative principle behind every Canon decision.
		It manifests across scales:
	</p>
<div class="manifestation-grid">
<div class="manifestation">
<h3>Tokens</h3>
<p>
				One color palette. One type scale. One spacing system based on the golden ratio (φ = 1.618).
				Constraints that liberate rather than limit.
			</p>
</div>
<div class="manifestation">
<h3>Components</h3>
<p>
				Each component earns existence by solving a real problem. No "nice to have" variants.
				A button does what buttons do—nothing more, nothing less.
			</p>
</div>
<div class="manifestation">
<h3>Motion</h3>
<p>
				Animation reveals state changes, never decorates. 200ms for micro-interactions.
				One easing curve. Movement that guides attention, not demands it.
			</p>
</div>
<div class="manifestation">
<h3>Code</h3>
<p>
				Tailwind for structure, Canon for aesthetics. No abstractions for hypothetical futures.
				Three similar lines are better than premature extraction.
			</p>
</div>
</div>



<h2>The Subtractive Triad</h2>
<p>
		CREATE SOMETHING operationalizes <em>weniger, aber besser</em> through three levels
		of disciplined subtraction:
	</p>
<ol class="triad-list">
<li>
<strong>DRY</strong> (Implementation) — "Have I built this before?" → Unify
		</li>
<li>
<strong>Rams</strong> (Artifact) — "Does this earn its existence?" → Remove
		</li>
<li>
<strong>Heidegger</strong> (System) — "Does this serve the whole?" → Reconnect
		</li>
</ol>
<p>
		The triad is coherent because it applies one principle—<em>subtractive revelation</em>—at
		three scales. Each question removes a different kind of excess: duplication, ornament,
		disconnection.
	</p>



<h2>Rams' Ten Principles</h2>
<p>
		The fuller context for <em>weniger, aber besser</em>. Good design is:
	</p>
<ol class="principles-list">
<li><strong>Innovative</strong> — Possibilities of progress are never exhausted</li>
<li><strong>Useful</strong> — A product is bought to be used</li>
<li><strong>Aesthetic</strong> — Well-executed affects our wellbeing</li>
<li><strong>Understandable</strong> — Clarifies the product's structure</li>
<li><strong>Unobtrusive</strong> — Products are tools, not decorations</li>
<li><strong>Honest</strong> — Does not manipulate or make promises it cannot keep</li>
<li><strong>Long-lasting</strong> — Avoids being fashionable, never appears antiquated</li>
<li><strong>Thorough</strong> — Nothing must be arbitrary or left to chance</li>
<li><strong>Environmentally friendly</strong> — Conserves resources throughout lifecycle</li>
<li><strong>As little design as possible</strong> — Concentrates on essential aspects</li>
</ol>
<p class="principle-note">
		The tenth principle is <em>weniger, aber besser</em> restated: design is complete
		not when there is nothing left to add, but when there is nothing left to take away.
	</p>



<h2>Anti-Patterns</h2>
<p>
		What <em>weniger, aber besser</em> is <strong>not</strong>:
	</p>
<ul class="antipattern-list">
<li>
<strong>Minimalism as aesthetic</strong> — The goal is clarity, not emptiness.
			Removing the necessary leaves a void; removing the unnecessary reveals structure.
		</li>
<li>
<strong>Feature reduction</strong> — Fewer features ≠ better product.
			The right features, fully realized, is the goal.
		</li>
<li>
<strong>Austerity</strong> — Subtraction serves human needs, not budgets.
			A Braun radio was not cheap; it was <em>complete</em>.
		</li>
<li>
<strong>One-size-fits-all</strong> — Context determines what is "less."
			A form needs labels; a dashboard needs density.
		</li>
</ul>



<h2>Application Test</h2>
<p>
		When evaluating any design decision—token, component, pattern, or page—ask:
	</p>
<blockquote class="test-block">
<p>"If I remove this, what breaks?"</p>
</blockquote>
<p>
		If nothing breaks, remove it. If something breaks, the element has earned its existence.
		This is the operational meaning of <em>weniger, aber besser</em>.
	</p>


<section class="concept-section references">
<h2>References</h2>
<ul class="reference-list">
<li>
			Rams, Dieter. <em>Less and More: The Design Ethos of Dieter Rams</em>. Berlin: Gestalten, 2009.
		</li>
<li>
			Hustwit, Gary. <em>Rams</em> (documentary film). Film First, 2018.
		</li>
<li>
<a href="/canon/foundations/philosophy">Canon Foundations: Philosophy</a>
</li>
<li>
<a href="/patterns/subtractive-triad-audit">Pattern: Subtractive Triad Audit</a>
</li>
</ul>
</section>`
  },
  {
    slug: "concepts/zuhandenheit",
    section: "concepts",
    title: "Zuhandenheit",
    description: "'Ready-to-hand' - Heidegger's concept of tools that recede into transparent use.",
    content: `<h2>The Test</h2>
<blockquote class="test-block">
<p>"Does this get out of the way, or demand attention?"</p>
</blockquote>
<p>
		If people notice the design, something's wrong. Success means the work gets done and the tool is forgotten.
	</p>



<h2>What It Means</h2>
<p>
		Think about using a hammer. When it works well, you don't think about the hammer—you think about the nail. The tool disappears from your awareness.
	</p>
<p>
		Only when the hammer breaks or feels too heavy do you suddenly notice it. That shift from invisible to visible is what we're trying to prevent. Good design means infrastructure that disappears, leaving only the work.
	</p>



<h2>Where You'll See This</h2>
<p>
		This guides every Canon design decision:
	</p>
<div class="manifestation-grid">
<div class="manifestation">
<h3>Infrastructure</h3>
<p>
				When deployment works, you don't think about deployment. Cloudflare Workers, databases, storage—all invisible during normal use.
			</p>
</div>
<div class="manifestation">
<h3>Components</h3>
<p>
				If a button makes you think about styling, it's failed. Canon components work without checking documentation.
			</p>
</div>
<div class="manifestation">
<h3>AI Partnership</h3>
<p>
				At its best, you don't notice Claude Code. The code appears, the commit happens, the deployment succeeds. Just the work remains.
			</p>
</div>
<div class="manifestation">
<h3>Motion</h3>
<p>
				Animation that draws attention has failed. Motion should guide your eye, not demand your focus.
			</p>
</div>
</div>



<h2>Working vs. Broken</h2>
<p>
		Two states. One is success, one signals failure:
	</p>
<div class="comparison-table">
<div class="mode ready">
<h3>Zuhandenheit</h3>
<p class="mode-translation">Ready-to-hand (working)</p>
<ul>
<li>Tool fades into background</li>
<li>You focus on the work</li>
<li>The tool is invisible</li>
<li>This is the goal</li>
</ul>
</div>
<div class="mode present">
<h3>Vorhandenheit</h3>
<p class="mode-translation">Present-at-hand (broken)</p>
<ul>
<li>Tool demands attention</li>
<li>You focus on the tool</li>
<li>Something went wrong</li>
<li>Failure reveals hidden assumptions</li>
</ul>
</div>
</div>
<p>
		When you notice the tool, you've shifted from ready-to-hand to present-at-hand. The breakdown shows you what was hidden.
	</p>



<h2>Three Ways Tools Break Down</h2>
<p>
		Breakdowns are useful—they reveal what you couldn't see before:
	</p>
<ul class="breakdown-list">
<li>
<strong>It breaks</strong> — A component throws an error. Now you see the dependencies you forgot about.
		</li>
<li>
<strong>It's missing</strong> — You reach for a feature that doesn't exist. Now you see your assumptions.
		</li>
<li>
<strong>It doesn't fit</strong> — The component exists but doesn't match your needs. Now you see the gap between design and reality.
		</li>
</ul>
<p>
		The goal: fix it so the tool disappears again. See <a href="/patterns/breakdown-and-repair">Breakdown and Repair</a> for more.
	</p>



<h2>What Gets in the Way</h2>
<p>
		These patterns break transparent use:
	</p>
<ul class="antipattern-list">
<li>
<strong>Decorative complexity</strong> — Animations that show off. UI flourishes with no purpose. Every ornament is a tiny breakdown.
		</li>
<li>
<strong>Cognitive load</strong> — Needing documentation for basic tasks. Too many options demanding decisions.
		</li>
<li>
<strong>Inconsistency</strong> — Different patterns in different places. You have to stop and think: which one applies here?
		</li>
<li>
<strong>Unreliability</strong> — Tools that sometimes work. When you can't trust it, you're always watching it.
		</li>
</ul>


<section class="concept-section references">
<h2>The Philosophy</h2>
<p>
		Martin Heidegger introduced <em>Zuhandenheit</em> (ready-to-hand) in <em>Being and Time</em> (1927). His insight: we don't first encounter things as objects to study—we encounter them as equipment to use. The theoretical view comes later, usually after something breaks.
	</p>
<h3>Further Reading</h3>
<ul class="reference-list">
<li>
			Heidegger, Martin. <em>Being and Time</em>. Trans. Macquarrie &amp; Robinson. Harper &amp; Row, 1962. §15-18.
		</li>
<li>
			Dreyfus, Hubert. <em>Being-in-the-World</em>. MIT Press, 1991.
		</li>
<li>
<a href="/canon/concepts/vorhandenheit">Canon Concept: Vorhandenheit</a>
</li>
<li>
<a href="/patterns/breakdown-and-repair">Pattern: Breakdown and Repair</a>
</li>
</ul>
</section>`
  },
  {
    slug: "foundations/colors",
    section: "foundations",
    title: "Colors",
    description: "Canon color tokens: backgrounds, foregrounds, semantic colors, and data visualization palette.",
    content: `## Why so few colors?

More colors mean more decisions. We use black and white as the foundation, then adjust opacity to create hierarchy—no need to pick new shades. When you need to show success, error, or a warning, semantic colors do the work.

> "Color communicates. Decoration distracts."

## Backgrounds

Four levels from pure black to subtle grey. Stack them to create depth—like layers of paper.

| Token | Value | Description |
|-------|-------|-------------|
| \`--color-bg-pure\` | \`#000000\` | Pure black, the canvas |
| \`--color-bg-base\` | \`#0a0a0a\` | Slight lift for main surfaces |
| \`--color-bg-surface\` | \`#111111\` | Cards and elevated elements |
| \`--color-bg-elevated\` | \`#1a1a1a\` | Modals and popovers |

## Foregrounds

Five text colors, all white at different opacities. Use brighter for headlines, dimmer for captions.

| Token | Value | Contrast | Description |
|-------|-------|----------|-------------|
| \`--color-fg-primary\` | \`rgba(255,255,255,1)\` | 21:1 | Headlines, emphasis |
| \`--color-fg-secondary\` | \`rgba(255,255,255,0.8)\` | 13.7:1 | Body text |
| \`--color-fg-tertiary\` | \`rgba(255,255,255,0.6)\` | 9.7:1 | Secondary information |
| \`--color-fg-muted\` | \`rgba(255,255,255,0.46)\` | 4.56:1 | Captions, hints |
| \`--color-fg-subtle\` | \`rgba(255,255,255,0.2)\` | 2.1:1 | Decorative only |

**WCAG Compliance:** \`--color-fg-muted\` (4.56:1) meets AA for normal text. \`--color-fg-subtle\` should only be used for decorative elements.

## Borders

Three border levels for separation and emphasis.

| Token | Value | Description |
|-------|-------|-------------|
| \`--color-border-default\` | \`rgba(255,255,255,0.1)\` | Subtle separation |
| \`--color-border-emphasis\` | \`rgba(255,255,255,0.2)\` | Hover states |
| \`--color-border-strong\` | \`rgba(255,255,255,0.3)\` | Active states |

## Clear Communication Palette

The Ona-derived CREATE SOMETHING communication layer uses a light operational palette. Use these
tokens for buyer-facing and operator-facing surfaces that need immediate comprehension.

This is now a stable Canon layer, not a one-off property treatment. Ona sets the clarity bar;
CREATE SOMETHING owns the implementation language. Use the palette when the interface must show
workflow maps, trust boundaries, approval states, receipts, validation gates, or handoff evidence.

| Token | Value | Use |
|-------|-------|-----|
| \`--color-clear-porcelain\` | \`#f9f9f9\` | Page canvas |
| \`--color-clear-porcelain-soft\` | \`#f2f2f2\` | Secondary bands and inactive states |
| \`--color-clear-panel\` | \`#ffffff\` | Cards, panels, receipts |
| \`--color-clear-onyx\` | \`#0a0e19\` | Primary text and dark CTAs |
| \`--color-clear-grey\` | \`#636363\` | Secondary copy |
| \`--color-clear-grey-quiet\` | \`#818181\` | Low-emphasis labels |
| \`--color-clear-border\` | \`#e1e1e1\` | Hairline panel borders |
| \`--color-clear-border-strong\` | \`#cecece\` | Focused panel borders |
| \`--color-clear-ocean\` | \`#0048ff\` | System/action accent |
| \`--color-clear-moss\` | \`#1e3c2c\` | Governed run/wait states |
| \`--color-clear-stop\` | \`#c41e3a\` | Stop/block states |

Do not use the clear palette as generic decoration. A clear surface should answer at least one
operational question: what is mapped, what can run, what needs review, what is blocked, or what
evidence proves the handoff.

## Semantic Colors

Four colors that mean something: success, error, warning, info. Each comes with \`-muted\` and \`-border\` variants.

| Token | Value | Use |
|-------|-------|-----|
| \`--color-success\` | \`#22c55e\` | Positive feedback |
| \`--color-error\` | \`#ef4444\` | Errors, destructive actions |
| \`--color-warning\` | \`#f59e0b\` | Caution states |
| \`--color-info\` | \`#3b82f6\` | Informational |

### Variants

Each semantic color has muted and border variants:

\`\`\`css
/* Success variants */
--color-success: #22c55e;
--color-success-muted: rgba(34, 197, 94, 0.1);
--color-success-border: rgba(34, 197, 94, 0.3);

/* Error variants */
--color-error: #ef4444;
--color-error-muted: rgba(239, 68, 68, 0.1);
--color-error-border: rgba(239, 68, 68, 0.3);
\`\`\`

## Interactive States

| Token | Value | Use |
|-------|-------|-----|
| \`--color-hover\` | \`rgba(255,255,255,0.05)\` | Hover backgrounds |
| \`--color-active\` | \`rgba(255,255,255,0.1)\` | Active/pressed states |
| \`--color-focus\` | \`rgba(255,255,255,0.5)\` | Focus rings |

## Usage Example

\`\`\`css
.card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  color: var(--color-fg-secondary);
}

.card:hover {
  border-color: var(--color-border-emphasis);
  background: var(--color-hover);
}

.card-title {
  color: var(--color-fg-primary);
}

.card-meta {
  color: var(--color-fg-muted);
}
\`\`\``
  },
  {
    slug: "foundations/elevation",
    section: "foundations",
    title: "Elevation",
    description: "Canon elevation system: shadows and layering for visual hierarchy.",
    content: `## Shadow Scale

Three levels of elevation for clear visual hierarchy.

| Token | Use |
|-------|-----|
| \`--shadow-sm\` | Buttons, inputs, subtle lift |
| \`--shadow-md\` | Cards, dropdowns |
| \`--shadow-lg\` | Modals, popovers |

## Shadow Values

\`\`\`css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
             0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
             0 4px 6px -2px rgba(0, 0, 0, 0.05);
\`\`\`

## Usage Patterns

### Cards

\`\`\`css
.card {
  box-shadow: var(--shadow-md);
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
\`\`\`

### Modals

\`\`\`css
.modal {
  box-shadow: var(--shadow-lg);
}
\`\`\`

### Buttons

\`\`\`css
.button {
  box-shadow: var(--shadow-sm);
}

.button:active {
  box-shadow: none;
}
\`\`\`

## Z-Index Scale

Consistent stacking order for overlapping elements.

| Token | Value | Use |
|-------|-------|-----|
| \`--z-dropdown\` | 100 | Dropdowns, tooltips |
| \`--z-modal\` | 200 | Modal dialogs |
| \`--z-toast\` | 300 | Toast notifications |
| \`--z-tooltip\` | 400 | Tooltips on top |

## Best Practices

1. **Use sparingly** - Not every element needs elevation
2. **Maintain hierarchy** - Higher z-index = more shadow
3. **Animate transitions** - Smooth shadow changes on hover
4. **Dark mode** - Shadows less visible; use borders instead

\`\`\`css
/* Elevation transition */
.card {
  transition: box-shadow var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-standard);
}
\`\`\``
  },
  {
    slug: "foundations/layout",
    section: "foundations",
    title: "Layout",
    description: "Canon layout system: containers, grids, and responsive patterns.",
    content: `## Container Widths

Consistent max-widths for content containment.

| Token | Value | Use |
|-------|-------|-----|
| \`--container-sm\` | 640px | Narrow content |
| \`--container-md\` | 768px | Articles, forms |
| \`--container-lg\` | 1024px | Standard pages |
| \`--container-xl\` | 1280px | Wide layouts |
| \`--container-2xl\` | 1536px | Full-width |

## Container Usage

\`\`\`css
.container {
  width: 100%;
  max-width: var(--container-lg);
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.container-narrow {
  max-width: var(--container-md);
}

.container-wide {
  max-width: var(--container-xl);
}
\`\`\`

## Grid System

A 12-column grid for flexible layouts.

\`\`\`css
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-lg);
}

.col-span-4 { grid-column: span 4; }
.col-span-6 { grid-column: span 6; }
.col-span-8 { grid-column: span 8; }
.col-span-12 { grid-column: span 12; }
\`\`\`

## Responsive Patterns

### Stack to Grid

\`\`\`css
.responsive-grid {
  display: grid;
  gap: var(--space-lg);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
\`\`\`

### Auto-fit Grid

\`\`\`css
.auto-grid {
  display: grid;
  gap: var(--space-lg);
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
\`\`\`

## Breakpoints

| Token | Value | Target |
|-------|-------|--------|
| \`--breakpoint-sm\` | 640px | Mobile landscape |
| \`--breakpoint-md\` | 768px | Tablet |
| \`--breakpoint-lg\` | 1024px | Desktop |
| \`--breakpoint-xl\` | 1280px | Large desktop |
| \`--breakpoint-2xl\` | 1536px | Ultra-wide |

## Flexbox Utilities

\`\`\`css
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-md { gap: var(--space-md); }
\`\`\``
  },
  {
    slug: "foundations/motion",
    section: "foundations",
    title: "Motion",
    description: "Canon motion system: timing, easing, and animation principles for purposeful motion.",
    content: `## Motion Philosophy

Every animation must answer: what does this communicate that stillness cannot? Motion exists to reduce cognitive load, not increase visual complexity.

<div class="principles-grid">
<div class="principle-card">
<h4>Purposeful</h4>
<p>Motion communicates state change. No decorative animation.</p>
</div>
<div class="principle-card">
<h4>Subtle</h4>
<p>Users should feel the effect, not notice the animation.</p>
</div>
<div class="principle-card">
<h4>Consistent</h4>
<p>One easing curve for coherent motion language.</p>
</div>
<div class="principle-card">
<h4>Reducible</h4>
<p>Always respect <code>prefers-reduced-motion</code>.</p>
</div>
</div>

## Clear Communication Motion

Ona-derived clear surfaces use motion only when it clarifies operational state. The acceptable uses
are narrow:

- state changed: allow, review, block, waiting, complete
- selection changed: the active proof object, decision tab, or receipt changed
- progression happened: a step moved from mapped to validated to handed off
- attention is needed: an operator must review or stop before execution

Do not animate decorative backgrounds, idle proof panels, or generic AI atmosphere. If the motion
does not clarify state, selection, progression, or handoff, remove it.

## Duration Tokens

Five duration levels from instant feedback to deliberate reveals.

| Token | Value | Use Case |
|-------|-------|----------|
| \`--duration-instant\` | 0ms | Immediate state changes |
| \`--duration-micro\` | 100ms | Hover states, button feedback |
| \`--duration-fast\` | 200ms | Tooltips, dropdowns |
| \`--duration-normal\` | 300ms | Modal transitions, page elements |
| \`--duration-slow\` | 500ms | Complex reveals, hero animations |

## Easing

Canon uses a single easing curve for consistency:

\`\`\`css
--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
\`\`\`

This is Material Design's standard easing—quick acceleration, gradual deceleration. It feels natural because it mimics physical motion.

## Accessibility

Always respect user preferences:

\`\`\`css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
\`\`\`

## Usage Examples

### Button Hover

\`\`\`css
.button {
  transition: all var(--duration-micro) var(--ease-standard);
}

.button:hover {
  transform: translateY(-1px);
}
\`\`\`

### Modal Entrance

\`\`\`css
.modal {
  animation: fadeIn var(--duration-normal) var(--ease-standard);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
\`\`\`

### Dropdown

\`\`\`css
.dropdown {
  transition: opacity var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-standard);
}

.dropdown[data-state="closed"] {
  opacity: 0;
  transform: translateY(-4px);
}
\`\`\``
  },
  {
    slug: "foundations/philosophy",
    section: "foundations",
    title: "Philosophy",
    description: "The philosophical foundations of Canon: Zuhandenheit, the Subtractive Triad, and tools that recede into use.",
    content: `<h2>Zuhandenheit</h2>
<p class="pronunciation">/ˈtsuːˌhandənˌhaɪt/ — German: "ready-to-hand"</p>
<p>
		Martin Heidegger distinguished between two modes of encountering tools:
		<strong>present-at-hand</strong> (Vorhandenheit) and <strong>ready-to-hand</strong> (Zuhandenheit).
	</p>
<div class="concept-grid">
<div class="concept-card">
<h3>Present-at-Hand</h3>
<p class="concept-german">Vorhandenheit</p>
<p>
				The hammer as an object of study. You notice its weight, its material, its construction.
				The tool demands attention. Work stops.
			</p>
<div class="concept-example">
<span class="label">In Design Systems:</span>
<span class="value">Documentation you must study. Components that require memorization.</span>
</div>
</div>
<div class="concept-card featured">
<h3>Ready-to-Hand</h3>
<p class="concept-german">Zuhandenheit</p>
<p>
				The hammer disappears into hammering. You think only of the nail, the wall, the picture
				you're hanging. The tool recedes into transparent use.
			</p>
<div class="concept-example">
<span class="label">In Design Systems:</span>
<span class="value">Tokens that feel inevitable. Components that just work.</span>
</div>
</div>
</div>
<blockquote class="philosophy-quote">
		"The less we just stare at the hammer-thing, and the more we seize hold of it and use it,
		the more primordial does our relationship to it become."
		<cite>— Martin Heidegger, Being and Time</cite>
</blockquote>
<p>
		Canon's goal is Zuhandenheit: a design system that disappears into use. When you reach for
		<code>var(--space-md)</code>, you shouldn't think about the golden ratio—you
		achieve the spacing that feels right.
	</p>



<h2>The Subtractive Triad</h2>
<p>
		Every creation exists simultaneously at three levels. Each level has its own discipline,
		question, and action. Applied in sequence, they reveal what truly matters.
	</p>
<div class="triad-grid">
<div class="triad-card">
<div class="triad-number">1</div>
<h3>DRY</h3>
<p class="triad-level">Implementation Level</p>
<div class="triad-question">"Have I built this before?"</div>
<div class="triad-action">Unify</div>
<p class="triad-description">
				Eliminate duplication. Don't repeat patterns, tokens, or components.
				Every abstraction should exist exactly once.
			</p>
</div>
<div class="triad-card">
<div class="triad-number">2</div>
<h3>Rams</h3>
<p class="triad-level">Artifact Level</p>
<div class="triad-question">"Does this earn its existence?"</div>
<div class="triad-action">Remove</div>
<p class="triad-description">
				Dieter Rams: "Weniger, aber besser"—less, but better. Every element must justify
				its presence. Ornament is crime. Function is beauty.
			</p>
</div>
<div class="triad-card">
<div class="triad-number">3</div>
<h3>Heidegger</h3>
<p class="triad-level">System Level</p>
<div class="triad-question">"Does this serve the whole?"</div>
<div class="triad-action">Reconnect</div>
<p class="triad-description">
				The hermeneutic circle: parts must serve the whole, and the whole must illuminate
				the parts. Eliminate disconnection.
			</p>
</div>
</div>
<h3>Application</h3>
<p>
		For any design decision, ask the three questions in order:
	</p>
<ol class="application-list">
<li>
<strong>DRY</strong>: Is this pattern already defined? If so, use it. If not, should it become a pattern?
		</li>
<li>
<strong>Rams</strong>: Does this element justify its existence? Can it be removed without loss?
		</li>
<li>
<strong>Heidegger</strong>: Does this serve the system's coherence? Does it enable the whole?
		</li>
</ol>



<h2>Weniger, aber besser</h2>
<p class="pronunciation">/ˈveːnɪɡɐ ˈaːbɐ ˈbɛsɐ/ — German: "less, but better"</p>
<p>
		Dieter Rams' principle guides every Canon decision. It is not minimalism for aesthetics—it is
		minimalism for function. We remove what obscures.
	</p>
<div class="rams-principles">
<div class="principle">
<span class="principle-number">1</span>
<span class="principle-text">Good design is innovative</span>
</div>
<div class="principle">
<span class="principle-number">2</span>
<span class="principle-text">Good design makes a product useful</span>
</div>
<div class="principle">
<span class="principle-number">3</span>
<span class="principle-text">Good design is aesthetic</span>
</div>
<div class="principle">
<span class="principle-number">4</span>
<span class="principle-text">Good design makes a product understandable</span>
</div>
<div class="principle">
<span class="principle-number">5</span>
<span class="principle-text">Good design is unobtrusive</span>
</div>
<div class="principle highlighted">
<span class="principle-number">6</span>
<span class="principle-text">Good design is honest</span>
</div>
<div class="principle">
<span class="principle-number">7</span>
<span class="principle-text">Good design is long-lasting</span>
</div>
<div class="principle">
<span class="principle-number">8</span>
<span class="principle-text">Good design is thorough down to the last detail</span>
</div>
<div class="principle">
<span class="principle-number">9</span>
<span class="principle-text">Good design is environmentally friendly</span>
</div>
<div class="principle highlighted">
<span class="principle-number">10</span>
<span class="principle-text">Good design is as little design as possible</span>
</div>
</div>
<blockquote class="philosophy-quote">
		"Indifference towards people and the reality in which they live is actually the one and only
		cardinal sin in design."
		<cite>— Dieter Rams</cite>
</blockquote>



<h2>Mathematical Foundation</h2>
<p>
		Canon's spacing and typography derive from the golden ratio (φ = 1.618033...). This is not
		arbitrary aestheticism—it is the recognition that proportional relationships feel natural
		because they occur throughout nature.
	</p>
<div class="math-demo">
<div class="phi-visual">
<div class="phi-rect large"></div>
<div class="phi-rect medium"></div>
<div class="phi-rect small"></div>
</div>
<div class="phi-values">
<div class="phi-row">
<code>--space-xs</code>
<span>0.5rem</span>
<span class="phi-note">φ⁻²</span>
</div>
<div class="phi-row">
<code>--space-sm</code>
<span>1rem</span>
<span class="phi-note">φ⁻¹</span>
</div>
<div class="phi-row">
<code>--space-md</code>
<span>1.618rem</span>
<span class="phi-note">φ⁰ × base</span>
</div>
<div class="phi-row">
<code>--space-lg</code>
<span>2.618rem</span>
<span class="phi-note">φ¹</span>
</div>
<div class="phi-row">
<code>--space-xl</code>
<span>4.236rem</span>
<span class="phi-note">φ²</span>
</div>
</div>
</div>
<p>
		Each step in the scale multiplies by φ. The result: spacing that relates harmoniously at
		every level. Adjacent elements feel balanced. The mathematics recede; the harmony remains.
	</p>
<p class="mt-4">
<strong>Why the golden ratio?</strong> It appears throughout nature—flower petals,
		nautilus shells, human proportions. Using it in spacing creates rhythm that feels
		natural, not arbitrary. Your eye recognizes the pattern subconsciously, even if you
		can't name it.
	</p>
<div class="callout-info">
<h3 class="callout-heading">Why This Matters</h3>
<p>
			The golden ratio isn't decoration—it's practical. When spacing follows φ, layouts compose predictably. A card with <code>--space-md</code> padding naturally nests inside a section with <code>--space-lg</code> margins. The proportions align without manual adjustment. This is why Zuhandenheit works: the system makes correct spacing automatic.
		</p>
</div>



<h2>Color Philosophy</h2>
<p>
		Canon's palette is functional, not decorative. Black and white provide structure. Opacity
		creates hierarchy. Semantic colors serve specific purposes—never ornament.
	</p>
<div class="color-philosophy">
<div class="color-principle">
<h4>Black as Canvas</h4>
<p>
				Pure black (<code>#000000</code>) is the canvas. Everything else is light revealing form.
			</p>
</div>
<div class="color-principle">
<h4>Opacity for Hierarchy</h4>
<p>
				White at varying opacities (100%, 80%, 60%, 46%, 20%) creates text hierarchy without
				introducing new colors.
			</p>
</div>
<div class="color-principle">
<h4>Semantic Only</h4>
<p>
				Colors beyond black/white exist only for meaning: success, error, warning, info.
				Never for decoration.
			</p>
</div>
</div>
<blockquote class="philosophy-quote">
		"Color is not to decorate, but to communicate."
	</blockquote>



<h2>In Practice</h2>
<p>
		Philosophy without application is empty. Here is how Canon's philosophy manifests in code:
	</p>

\`\`\`css
/* Subtractive Triad Applied */
.card {
  /* 1. DRY: Use existing tokens, don't reinvent */
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  
  /* 2. Rams: Only necessary properties */
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  
  /* 3. Heidegger: Serve the system's coherence */
  transition: all var(--duration-micro) var(--ease-standard);
}

.card:hover {
  /* Consistent hover states with other components */
  border-color: var(--color-border-emphasis);
  /* No gradients, shadows, or decoration */
}
\`\`\``
  },
  {
    slug: "foundations/spacing",
    section: "foundations",
    title: "Spacing",
    description: "Canon spacing system: a golden ratio scale for consistent rhythm and harmony.",
    content: `## Spacing Scale

Built on the golden ratio (φ = 1.618). Each step is derived from φⁿ where base = 1rem.

| Token | Value | Derivation | Recommended Use |
|-------|-------|------------|-----------------|
| \`--space-xs\` | 0.618rem (~10px) | φ⁻¹ | Tight gaps, inline elements |
| \`--space-sm\` | 1rem (16px) | φ⁰ (base) | Form element gaps, small padding |
| \`--space-md\` | 1.618rem (~26px) | φ¹ | Default component spacing |
| \`--space-lg\` | 2.618rem (~42px) | φ² | Card padding, section gaps |
| \`--space-xl\` | 4.236rem (~68px) | φ³ | Large component gaps |
| \`--space-2xl\` | 6.854rem (~110px) | φ⁴ | *See guidance below* |
| \`--space-3xl\` | 11.09rem (~177px) | φ⁵ | *See guidance below* |

## Tailwind for Structure, Canon for Aesthetics

**Important**: The golden ratio produces mathematically elegant values, but \`--space-2xl\` (110px) and \`--space-3xl\` (177px) are impractical for most page-level padding.

**Use Tailwind utilities for layout spacing:**
- Page padding: \`py-16\`, \`py-24\`, \`px-6\`
- Section gaps: \`gap-8\`, \`space-y-12\`
- Nav offset: \`calc(var(--header-height) + var(--space-md))\`

**Use Canon tokens for component internals:**
- \`--space-xs\` through \`--space-xl\` work well for component padding, gaps, and margins

## Usage Patterns

### Component Padding

\`\`\`css
.button {
  padding: var(--space-xs) var(--space-sm);
}

.card {
  padding: var(--space-lg);
}

.modal {
  padding: var(--space-xl);
}
\`\`\`

### Stack Spacing

\`\`\`css
.stack > * + * {
  margin-top: var(--space-md);
}

.stack-lg > * + * {
  margin-top: var(--space-lg);
}
\`\`\`

### Grid Gaps

\`\`\`css
.grid {
  gap: var(--space-lg);
}

.grid-tight {
  gap: var(--space-sm);
}
\`\`\`

## Why Golden Ratio?

When spacing follows φ, adjacent elements feel balanced:

- \`--space-xs\` × φ = \`--space-sm\`
- \`--space-sm\` × φ = \`--space-md\`
- \`--space-md\` × φ = \`--space-lg\`
- \`--space-lg\` × φ = \`--space-xl\`

This creates rhythm without manual calculation.

## Page Layout (Tailwind)

For page-level spacing, use Tailwind utilities which provide more practical values:

\`\`\`html
<!-- Section padding -->
<section class="py-16 px-6">
  <div class="max-w-5xl mx-auto">
    <!-- content -->
  </div>
</section>

<!-- Hero section -->
<section class="pt-24 pb-16 px-6">
  <!-- content -->
</section>

<!-- Fixed nav offset -->
<main class="pt-[calc(var(--header-height)+1.618rem)]">
  <!-- content -->
</main>
\`\`\``
  },
  {
    slug: "foundations/typography",
    section: "foundations",
    title: "Typography",
    description: "Canon typography system: scale, weights, and responsive type built on the golden ratio.",
    content: `## Type Scale

Built on the golden ratio (φ = 1.618). Each step multiplies by φ for natural visual rhythm.

| Token | Size | Use |
|-------|------|-----|
| \`--text-xs\` | 0.75rem | Fine print, labels |
| \`--text-sm\` | 0.875rem | Captions, metadata |
| \`--text-base\` | 1rem | Body text |
| \`--text-lg\` | 1.125rem | Lead paragraphs |
| \`--text-xl\` | 1.25rem | Section intros |
| \`--text-2xl\` | 1.5rem | H4 headings |
| \`--text-3xl\` | 1.875rem | H3 headings |
| \`--text-4xl\` | 2.25rem | H2 headings |
| \`--text-5xl\` | 3rem | H1 headings |
| \`--text-display\` | 4rem | Hero text |

## Font Weights

| Token | Weight | Use |
|-------|--------|-----|
| \`--font-light\` | 300 | Display text |
| \`--font-normal\` | 400 | Body text |
| \`--font-medium\` | 500 | Emphasis |
| \`--font-semibold\` | 600 | Subheadings |
| \`--font-bold\` | 700 | Headings |

## Line Height

| Token | Value | Use |
|-------|-------|-----|
| \`--leading-none\` | 1 | Single-line text |
| \`--leading-tight\` | 1.25 | Headings |
| \`--leading-normal\` | 1.5 | Body text |
| \`--leading-relaxed\` | 1.75 | Long-form reading |

## Letter Spacing

| Token | Value | Use |
|-------|-------|-----|
| \`--tracking-tight\` | -0.025em | Large headings |
| \`--tracking-normal\` | 0 | Body text |
| \`--tracking-wide\` | 0.025em | Buttons |
| \`--tracking-widest\` | 0.1em | Labels, caps |

## Font Stack

\`\`\`css
--font-sans: 'ABC Diatype', 'Stack Sans Notch', system-ui, sans-serif;
--font-mono: 'ABC Diatype Mono', 'JetBrains Mono', monospace;
--font-serif: 'Martina Plantijn', Georgia, serif;
\`\`\`

The Ona-derived clear communication layer uses ABC Diatype for interface and body text, ABC Diatype
Mono for compact system labels, and Martina Plantijn only when an editorial serif voice is useful.
CREATE SOMETHING keeps local fallbacks so surfaces remain stable if external font loading fails.

The type rule is operational comprehension first. Headlines name the workflow or offer plainly;
supporting copy explains the object, action, policy, owner, receipt, or next step. Use mono for
short state labels and identifiers, not long explanatory paragraphs.

## Fluid Typography

Display text scales with viewport:

\`\`\`css
--text-display: clamp(2.5rem, 4vw + 1.5rem, 4.5rem);
\`\`\`

## Usage Example

\`\`\`css
.article-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
}

.article-body {
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  line-height: var(--leading-relaxed);
}

.article-meta {
  font-size: var(--text-sm);
  color: var(--color-fg-muted);
  letter-spacing: var(--tracking-wide);
}
\`\`\``
  },
  {
    slug: "guidelines/accessibility",
    section: "guidelines",
    title: "Accessibility",
    description: "WCAG 2.1 AA accessibility guidelines for the Canon Design System",
    content: `## Color Contrast

All text in the Canon system meets WCAG AA contrast requirements. The minimum ratio is 4.5:1 for normal text and 3:1 for large text.

| Text Type | Ratio | Token |
|-----------|-------|-------|
| Primary Text | 21:1 | \`--color-fg-primary\` |
| Secondary Text | 13.7:1 | \`--color-fg-secondary\` |
| Muted Text | 4.56:1 | \`--color-fg-muted\` |

**Note:** \`--color-fg-subtle\` (0.2 opacity) does not meet AA contrast and should only be used for decorative elements, never for informational content.

### Clear Proof and Status Surfaces

Ona-derived clear surfaces often show workflow state, receipts, validation gates, and approval
boundaries. Do not communicate those states with color alone.

Every proof or status surface must include:

- a visible text label such as \`Review\`, \`Blocked\`, \`Ready\`, or \`Validated\`
- a semantic region or heading when the proof object is a major page section
- keyboard-reachable actions for any approval, review, receipt, or handoff link
- live-region behavior only for meaningful state changes, not decorative rotation

## Focus Management

All interactive elements must have visible focus indicators. Canon uses a consistent focus ring system.

\`\`\`css
/* Standard focus pattern */
.interactive:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* High contrast mode enhancement */
@media (prefers-contrast: more) {
  .interactive:focus-visible {
    outline: 3px solid var(--color-focus);
    outline-offset: 3px;
  }
}
\`\`\`

### Focus Order

- Focus order must follow visual reading order
- Never use \`tabindex\` greater than 0
- Modal dialogs must trap focus within the modal
- Skip links should be provided for complex layouts

## Semantic HTML

Use the correct HTML elements for their intended purpose. Semantic markup provides meaning to assistive technologies.

| Do | Don't |
|----|-------|
| \`<button>Submit</button>\` | \`<div onclick="...">Submit</div>\` |
| \`<nav aria-label="Main">\` | \`<div class="nav">\` |

### Landmark Regions

- \`<header>\` or \`role="banner"\` for page header
- \`<nav>\` or \`role="navigation"\` for navigation
- \`<main>\` or \`role="main"\` for main content
- \`<footer>\` or \`role="contentinfo"\` for page footer

## ARIA Patterns

Use ARIA attributes to enhance accessibility, but remember: **no ARIA is better than bad ARIA**.

### Live Regions

Use live regions to announce dynamic content changes to screen readers.

\`\`\`html
<!-- For important updates -->
<div aria-live="polite" role="status">
  Status message here
</div>

<!-- For urgent alerts -->
<div aria-live="assertive" role="alert">
  Error message here
</div>
\`\`\`

### Common ARIA Patterns

| Pattern | Attributes | Use Case |
|---------|------------|----------|
| Disclosure | \`aria-expanded\`, \`aria-controls\` | Accordion, dropdown |
| Modal | \`role="dialog"\`, \`aria-modal\` | Dialog boxes |
| Tabs | \`role="tablist"\`, \`aria-selected\` | Tab interfaces |
| Loading | \`aria-busy\`, \`aria-describedby\` | Loading states |

## Reduced Motion

Respect users who prefer reduced motion. All animations in Canon include reduced motion alternatives.

\`\`\`css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
\`\`\`

**Tip:** Use \`transition\` instead of \`animation\` when possible—transitions are easier to disable and more performant.

## High Contrast Mode

Canon supports \`prefers-contrast: more\` with enhanced visibility tokens.

| Token | Standard | High Contrast |
|-------|----------|---------------|
| \`--color-fg-muted\` | 0.46 opacity | 0.75 opacity |
| \`--color-border-default\` | 0.1 opacity | 0.3 opacity |
| \`--color-focus\` | 0.5 opacity | 0.9 opacity |

## Checklist

Use this checklist when building with Canon components.

### Perceivable
- All images have descriptive alt text
- Color is not the only way to convey information
- Text contrast meets 4.5:1 minimum
- Content is readable at 200% zoom

### Operable
- All functionality available via keyboard
- Focus indicators are visible
- No keyboard traps exist
- Users can pause/stop animations

### Understandable
- Language is declared on the page
- Navigation is consistent
- Error messages are descriptive
- Labels are associated with inputs

### Robust
- Valid HTML structure
- ARIA attributes used correctly
- Works with assistive technologies
- Tested with screen readers`
  },
  {
    slug: "guidelines/content",
    section: "guidelines",
    title: "Content",
    description: "Content guidelines for writing clear, consistent copy in the Canon design system.",
    content: `## Voice Principles

### Be Direct

Say what you mean. No filler words, no corporate speak.

| Don't | Do |
|-------|-----|
| "In order to" | "To" |
| "At this point in time" | "Now" |
| "Due to the fact that" | "Because" |
| "It is important to note that" | (Just state it) |

### Be Helpful

Guide users toward success. Answer the question they're asking.

| Don't | Do |
|-------|-----|
| "Invalid input" | "Enter a valid email address" |
| "Error occurred" | "Couldn't save. Check your connection." |
| "Access denied" | "You need editor permissions to do this" |

### Be Human

Write like a colleague, not a robot.

| Don't | Do |
|-------|-----|
| "The operation was successful" | "Done!" |
| "Please wait while processing" | "Working on it..." |
| "Terminate session" | "Sign out" |

## Clear Communication Copy

For Ona-derived clear surfaces, write for operational comprehension before brand atmosphere. The
copy should make the mapped workflow, governed action, proof object, and next step visible.

Use the concrete noun before the abstract category:

| Don't | Do |
|-------|-----|
| "AI-powered workflow automation" | "Map the approval before the agent writes." |
| "Seamless governance layer" | "Attach the policy, receipt, and rollback path." |
| "Unlock productivity" | "Route the intake, review the match, then hand off." |

Clear copy should answer one of these questions:

1. What object is being mapped?
2. What action can run, needs review, or is blocked?
3. What policy, contract, receipt, trace, or eval proves the claim?
4. Who owns the next step?

Avoid generic AI language when a workflow noun exists. Prefer \`map\`, \`review\`, \`approve\`, \`block\`,
\`run\`, \`validate\`, and \`hand off\` over softer verbs like \`streamline\`, \`unlock\`, or \`empower\`.

## Capitalization

### Sentence case

Use for most UI text:
- Button labels
- Form labels
- Menu items
- Tooltips

**Example:** "Save changes" not "Save Changes"

### Title case

Reserve for:
- Page titles
- Section headings
- Product names

## Error Messages

Good error messages have three parts:

1. **What happened** - State the problem clearly
2. **Why it happened** - If helpful, explain the cause
3. **What to do** - Give a clear next step

\`\`\`
✗ Error 500
✓ Couldn't save your changes. Our servers are having trouble. Try again in a few minutes.
\`\`\`

## Buttons

Use verbs. Be specific.

| Don't | Do |
|-------|-----|
| "OK" | "Save" |
| "Submit" | "Send message" |
| "Yes" | "Delete account" |
| "Cancel" | "Keep editing" |

## Empty States

Don't just say "nothing here." Help users take action.

\`\`\`
No projects yet

Projects you create will appear here.
[Create your first project]
\`\`\`

## Loading States

Tell users what's happening.

| Context | Message |
|---------|---------|
| Saving | "Saving..." |
| Loading data | "Loading your projects..." |
| Processing | "Generating report..." |
| Long wait | "This might take a minute..." |

## Numbers and Dates

- Use numerals: "3 items" not "three items"
- Relative dates when recent: "2 hours ago"
- Absolute dates when older: "Jan 15, 2026"
- Abbreviate large numbers: "1.2K" not "1,234"`
  },
  {
    slug: "guidelines/images",
    section: "guidelines",
    title: "Images",
    description: "CREATE SOMETHING image guidelines for marketing, articles, social previews, decks, and client proof artifacts.",
    content: `## Decision

Use Ona.com as the design and communication foundation for CREATE SOMETHING images.
The reference is communication quality, not identity: calm hierarchy, plain claims,
compact proof, governed execution, visible customer evidence, and restrained action
states.

CREATE SOMETHING owns the implementation language. Our images should show how AI
work gets mapped, integrated, governed, validated, shipped, and handed off.

Use \`docs/IMAGE_LANGUAGE_FOUNDATION.md\` when a generated, designed, captured, or
rendered image needs TASTE-backed judgment context. TASTE references are inputs
for review and prompting; they are not source assets to copy.

## What images should prove

Every generated or designed image must answer at least one operational question:

1. What object, workflow, or system is being mapped?
2. What can run, needs review, or must stop?
3. What policy, contract, receipt, trace, eval, or screenshot proves the claim?
4. Who owns the next step?

If the image cannot answer one of those questions, it is decoration. Do not use it.

## Visual grammar

Use this foundation for marketing materials, article visuals, social cards, pitch
decks, and client updates:

| Layer | Rule |
|-------|------|
| **Canvas** | Prefer porcelain, white, or quiet near-black surfaces. Avoid noisy gradients. |
| **Hierarchy** | One plain claim, then proof beside or below it. |
| **Structure** | Use maps, lanes, cards, state rows, gates, receipts, and arrows. |
| **Brand mark** | Use the isometric cube as the persistent system signature. |
| **Color** | Use Canon clear tokens first: onyx, porcelain, cobalt, moss, and stop red. |
| **Type** | Use direct labels. Prefer workflow nouns over category language. |
| **Motion** | For video or animated exports, move only state, selection, progression, or handoff. |
| **Proof** | Make validation visible through receipts, tests, links, dates, owners, and status. |

## Image families

Create reusable image families instead of one-off illustrations:

- **System map hero**: the full operating path from input to governed outcome.
- **Database / Automation / Judgment diagram**: the three-tier framework as lanes or columns.
- **Policy gate chart**: allowed, ask, blocked, escalated, complete.
- **Evidence map**: artifact cards connected to the claim they prove.
- **Handoff receipt**: owner, state, validation, rollback, and next action.
- **Screenshot annotation**: real product evidence with restrained callouts.
- **CTA visual**: the specific next action, not generic AI promise.

## GPT Image 2 prompt contract

Use \`gpt-image-2\` for production image generation when access is available. Keep
prompts structured and repeatable:

\`\`\`text
Model: gpt-image-2
Quality: high
Size: <target size>

Create a CREATE SOMETHING <image family> for <surface>.
Purpose: <what the image must prove>.
Audience: <operator, buyer, builder, reviewer, client>.
Show: <workflow objects, states, proof artifacts, owners, gates>.
Style: Ona.com communication foundation translated into CREATE SOMETHING artifacts:
calm hierarchy, porcelain surfaces, compact proof panels, governed execution,
crisp labels, restrained cobalt/moss/stop accents, isometric cube signature.
Avoid: glowing robots, circuit faces, blue AI gradients, generic brains,
fake dashboards, stock photography, unreadable file paths, private data,
client secrets, vendor endorsement, watermarks.
\`\`\`

The prompt should name the artifact family and proof requirement before style. Style
cannot rescue a vague visual brief.

For article, social, deck, sales, or client-update images, start from
\`packages/agency/content/templates/marketing/image-prompt.md\` and store the
completed prompt beside the generated export.

Use the Image API for a single completed generation or edit. Use the Responses
API image generation tool for conversational, multi-turn image refinement.

## Review gate

Before publishing or reusing an image:

- Text is legible at 50% size.
- The image still works without animation.
- The claim is supported by visible proof or a real screenshot.
- No fake UI is presented as a screenshot.
- No secrets, private data, private prompts, client records, or tokens appear.
- The asset has source prompt, model, date, owner, target surface, and refresh date.
- The result feels like governed operations, not generic AI atmosphere.

Use deterministic repo checks as the required gate for this workflow. Braintrust
is not required to generate, store, or approve image assets. Add Braintrust later
only if CREATE SOMETHING needs a scored rubric across many generated images,
prompt variants, or approval outcomes.

## File metadata

Every generated image should keep a source prompt beside the export:

\`\`\`text
<asset-slug>--prompt--vYYYYMMDD.txt
<asset-slug>--source--vYYYYMMDD.svg
<asset-slug>--export--1200x630--vYYYYMMDD.png
\`\`\`

Include the model, snapshot if known, quality, size, source inputs, and review status
in the prompt file. This makes the visual system auditable and repeatable.
For article image sets, copy
\`packages/agency/content/templates/marketing/image-metadata.md\` into the asset
folder and fill it before publish.

Run the metadata/template check before publishing reusable article assets:

\`\`\`bash
node scripts/marketing-image-assets-check.mjs
\`\`\`

## Boundary

Do not copy Ona identity, campaign language, page layouts, or category framing.
Use Ona.com as the standard for how supervised autonomy should communicate. Use
CREATE SOMETHING to show how that autonomy gets connected to real systems, policy,
evidence, and delivery.`
  },
  {
    slug: "guidelines/responsive",
    section: "guidelines",
    title: "Responsive",
    description: "Responsive design patterns for Canon: mobile-first, breakpoints, and adaptive layouts.",
    content: `## Mobile-First Approach

Start with mobile styles, add complexity for larger screens.

\`\`\`css
/* Base: Mobile */
.card {
  padding: var(--space-md);
}

/* Enhancement: Tablet+ */
@media (min-width: 768px) {
  .card {
    padding: var(--space-lg);
  }
}

/* Enhancement: Desktop+ */
@media (min-width: 1024px) {
  .card {
    padding: var(--space-xl);
  }
}
\`\`\`

## Breakpoints

| Breakpoint | Min-width | Target |
|------------|-----------|--------|
| \`sm\` | 640px | Large phones |
| \`md\` | 768px | Tablets |
| \`lg\` | 1024px | Laptops |
| \`xl\` | 1280px | Desktops |
| \`2xl\` | 1536px | Large screens |

## Responsive Typography

Font sizes that adapt:

\`\`\`css
.title {
  font-size: var(--text-2xl);
}

@media (min-width: 768px) {
  .title {
    font-size: var(--text-3xl);
  }
}

@media (min-width: 1024px) {
  .title {
    font-size: var(--text-4xl);
  }
}
\`\`\`

Or use fluid typography:

\`\`\`css
.title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
}
\`\`\`

## Responsive Spacing

Scale spacing proportionally:

| Context | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Section padding | \`--space-lg\` | \`--space-xl\` | \`--space-2xl\` |
| Card padding | \`--space-md\` | \`--space-lg\` | \`--space-lg\` |
| Stack gap | \`--space-sm\` | \`--space-md\` | \`--space-md\` |

## Layout Patterns

### Stack → Grid

\`\`\`css
.features {
  display: grid;
  gap: var(--space-lg);
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .features {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .features {
    grid-template-columns: repeat(3, 1fr);
  }
}
\`\`\`

### Sidebar → Stack

\`\`\`css
.layout {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .layout {
    flex-direction: row;
  }
  
  .sidebar {
    width: 280px;
    flex-shrink: 0;
  }
  
  .main {
    flex: 1;
  }
}
\`\`\`

## Touch Targets

Minimum touch target size: 44×44px

\`\`\`css
.button {
  min-height: 44px;
  min-width: 44px;
  padding: var(--space-sm) var(--space-md);
}
\`\`\`

## Testing Checklist

- [ ] Works on 320px width (iPhone SE)
- [ ] Touch targets are 44px minimum
- [ ] Text is readable without zooming
- [ ] No horizontal scroll
- [ ] Forms are usable with thumb
- [ ] Modals work on small screens`
  },
  {
    slug: "guidelines/theming",
    section: "guidelines",
    title: "Theming",
    description: "Create custom themes by extending Canon's design tokens. Dark mode, light mode, and brand customization patterns.",
    content: `## Philosophy

Themes should extend, not replace. Canon provides a complete token system that establishes relationships between colors, spacing, and typography. Custom themes override specific tokens while maintaining these relationships.

> "A system is not the sum of its parts but the product of their interactions."
> — Russell Ackoff

## Token Categories

These tokens form the theming surface. Override them to create custom themes.

### Background Tokens
- \`--color-bg-pure\`
- \`--color-bg-base\`
- \`--color-bg-surface\`
- \`--color-bg-elevated\`

### Foreground Tokens
- \`--color-fg-primary\`
- \`--color-fg-secondary\`
- \`--color-fg-tertiary\`
- \`--color-fg-muted\`

### Border Tokens
- \`--color-border-default\`
- \`--color-border-emphasis\`
- \`--color-border-strong\`

### Semantic Tokens
- \`--color-success\`
- \`--color-error\`
- \`--color-warning\`
- \`--color-info\`

## Creating a Custom Theme

Override Canon's tokens at the root level:

\`\`\`css
:root {
  /* Brand color as accent */
  --color-accent: #6366f1;
  --color-accent-muted: rgba(99, 102, 241, 0.1);
  
  /* Custom backgrounds */
  --color-bg-pure: #0f0f23;
  --color-bg-base: #1a1a2e;
  --color-bg-surface: #252538;
  --color-bg-elevated: #2f2f45;
}
\`\`\`

## Dark & Light Modes

Canon defaults to dark mode. Add light mode with a theme attribute:

\`\`\`css
/* Dark mode (default) */
:root {
  --color-bg-pure: #000000;
  --color-bg-base: #0a0a0a;
  --color-fg-primary: rgba(255, 255, 255, 1);
  --color-fg-secondary: rgba(255, 255, 255, 0.8);
}

/* Light mode override */
[data-theme="light"] {
  --color-bg-pure: #ffffff;
  --color-bg-base: #fafafa;
  --color-fg-primary: rgba(0, 0, 0, 0.9);
  --color-fg-secondary: rgba(0, 0, 0, 0.7);
}
\`\`\`

### Theme Toggle

\`\`\`html
<button onclick="toggleTheme()">Toggle Theme</button>

<script>
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme = 
    current === 'light' ? 'dark' : 'light';
}
</script>
\`\`\`

## System Preference Detection

Respect user's system preference:

\`\`\`css
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --color-bg-pure: #ffffff;
    --color-bg-base: #fafafa;
    /* ... light mode tokens ... */
  }
}
\`\`\`

## Theme Best Practices

1. **Override, don't replace** - Maintain token relationships
2. **Test contrast** - Ensure AA compliance in all themes
3. **Preserve semantics** - Success should still feel "green"
4. **Respect preferences** - Honor \`prefers-color-scheme\`
5. **Provide toggle** - Let users choose their preference

## Complete Light Theme Example

\`\`\`css
[data-theme="light"] {
  /* Backgrounds - inverted */
  --color-bg-pure: #ffffff;
  --color-bg-base: #fafafa;
  --color-bg-surface: #f5f5f5;
  --color-bg-elevated: #ffffff;
  
  /* Foregrounds - dark text */
  --color-fg-primary: rgba(0, 0, 0, 0.9);
  --color-fg-secondary: rgba(0, 0, 0, 0.7);
  --color-fg-tertiary: rgba(0, 0, 0, 0.5);
  --color-fg-muted: rgba(0, 0, 0, 0.4);
  
  /* Borders - adjusted for light bg */
  --color-border-default: rgba(0, 0, 0, 0.1);
  --color-border-emphasis: rgba(0, 0, 0, 0.2);
  --color-border-strong: rgba(0, 0, 0, 0.3);
  
  /* Interactive - adjusted */
  --color-hover: rgba(0, 0, 0, 0.05);
  --color-active: rgba(0, 0, 0, 0.1);
}
\`\`\``
  },
  {
    slug: "index",
    section: "root",
    title: "Canon",
    description: "",
    content: `<section class="philosophy-quote">
<blockquote>
<p>"Weniger, aber besser"</p>
<cite>— Dieter Rams (Less, but better)</cite>
</blockquote>
</section>


<section class="quick-access">
<h2 class="section-title">Explore the System</h2>
<div class="card-grid">
<!-- Foundations -->
<a class="feature-card" href="/canon/foundations/colors">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<circle cx="12" cy="12" r="10"></circle>
<circle cx="12" cy="12" r="4"></circle>
</svg>
</div>
<h3>Foundations</h3>
<p>Start here. Colors, typography, spacing, and motion tokens you can copy directly into your project.</p>
</a>
<!-- Components -->
<a class="feature-card" href="/canon/components">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<rect height="7" rx="1" width="7" x="3" y="3"></rect>
<rect height="7" rx="1" width="7" x="14" y="3"></rect>
<rect height="7" rx="1" width="7" x="3" y="14"></rect>
<rect height="7" rx="1" width="7" x="14" y="14"></rect>
</svg>
</div>
<h3>Components</h3>
<p>Ready-to-use buttons, cards, navigation, and form elements with code examples.</p>
</a>
<!-- Patterns -->
<a class="feature-card" href="/canon/patterns">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<path d="M12 2L2 7l10 5 10-5-10-5z"></path>
<path d="M2 17l10 5 10-5"></path>
<path d="M2 12l10 5 10-5"></path>
</svg>
</div>
<h3>Patterns</h3>
<p>How to handle forms, loading states, and navigation across your application.</p>
</a>
<!-- Philosophy -->
<a class="feature-card" href="/canon/foundations/philosophy">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<circle cx="12" cy="12" r="10"></circle>
<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
<path d="M2 12h20"></path>
</svg>
</div>
<h3>Philosophy</h3>
<p>Why we made these choices. The principles that guide every design decision.</p>
</a>
</div>
</section>


<section class="principles">
<h2 class="section-title">How We Decide What Stays</h2>
<p class="section-description">
		Before adding anything to Canon, we ask three questions.
	</p>
<div class="triad-grid">
<div class="triad-item">
<span class="triad-label">First</span>
<h3>Does it already exist?</h3>
<p class="triad-question">If we've built something similar, we combine them into one solution.</p>
<p class="triad-action">→ Unify</p>
</div>
<div class="triad-item">
<span class="triad-label">Second</span>
<h3>Does it earn its place?</h3>
<p class="triad-question">Every element needs a clear purpose. Decoration without function gets cut.</p>
<p class="triad-action">→ Remove</p>
</div>
<div class="triad-item">
<span class="triad-label">Third</span>
<h3>Does it fit the whole?</h3>
<p class="triad-question">Each piece should work with everything else. If it doesn't, we rethink it.</p>
<p class="triad-action">→ Reconnect</p>
</div>
</div>
</section>


<section class="token-preview">
<h2 class="section-title">Spacing That Feels Natural</h2>
<p class="section-description">
		We use the golden ratio (1.618) for spacing. It creates visual rhythm that feels 
		balanced without you having to think about why.
	</p>
<div class="token-examples">
<div class="token-group">
<h4>Spacing Scale</h4>
<div class="spacing-demo">
<div class="space-box space-xs"><span>xs</span></div>
<div class="space-box space-sm"><span>sm</span></div>
<div class="space-box space-md"><span>md</span></div>
<div class="space-box space-lg"><span>lg</span></div>
<div class="space-box space-xl"><span>xl</span></div>
</div>
</div>
<div class="token-group">
<h4>Color Hierarchy</h4>
<div class="color-demo">
<div class="color-swatch bg-pure"></div>
<div class="color-swatch bg-elevated"></div>
<div class="color-swatch bg-surface"></div>
<div class="color-swatch bg-subtle"></div>
</div>
</div>
</div>
</section>`
  },
  {
    slug: "patterns/forms",
    section: "patterns",
    title: "Forms",
    description: "Composed patterns for form structure, validation, and multi-step flows.",
    content: `## Pattern Set

- \`FormLayout\`: shared structure for grouped fields and supporting copy
- \`FormValidation\`: validation framing for errors and recovery states
- \`MultiStepForm\`: step-based flows when a single screen would overwhelm the user

Canon also ships the field primitives these patterns compose with, including \`TextField\`, \`TextArea\`, \`Checkbox\`, \`CheckboxGroup\`, \`RadioGroup\`, \`Select\`, and \`Switch\`.

## Import Surface

\`\`\`svelte
<script lang="ts">
  import {
    FormLayout,
    FormValidation,
    MultiStepForm,
    TextField,
    CheckboxGroup
  } from '@create-something/canon';
</script>
\`\`\`

## Pattern Selection

1. Use \`FormLayout\` when the fields are straightforward and the job is clarity.
2. Add \`FormValidation\` when users need fast recovery from mistakes.
3. Use \`MultiStepForm\` only when chunking reduces cognitive load more than it adds navigation cost.

## Documentation Status

Expanded usage examples are still being documented. For now, treat this page as the stable surface map for the form patterns that already ship in the package.

## Related

- [Loading](/canon/patterns/loading)
- [Accessibility](/canon/guidelines/accessibility)
- [Content](/canon/guidelines/content)`
  },
  {
    slug: "patterns/index",
    section: "patterns",
    title: "Patterns",
    description: "",
    content: `<section class="philosophy">
<h2 class="section-title">Components vs Patterns</h2>
<p class="section-description">
		Components are atomic building blocks. Patterns are molecular compositions that solve
		specific user problems.
	</p>
<div class="comparison-grid">
<div class="comparison-item">
<h3>Components</h3>
<ul>
<li>Single responsibility</li>
<li>Stateless or minimal state</li>
<li>Context-agnostic</li>
<li>Building blocks</li>
</ul>
<p class="comparison-example">Button, TextField, Card, Spinner</p>
</div>
<div class="comparison-item">
<h3>Patterns</h3>
<ul>
<li>Composed solutions</li>
<li>Handle user flows</li>
<li>Context-aware</li>
<li>Complete experiences</li>
</ul>
<p class="comparison-example">FormLayout, LoadingSkeleton, ErrorBoundary</p>
</div>
</div>
</section>


<section class="pattern-grid-section">
<h2 class="section-title">Available Patterns</h2>
<p class="section-description">
		Each pattern documents the problem it solves, shows implementation examples, and explains
		when to use it.
	</p>
<div class="pattern-grid">
<a class="pattern-card" href="/canon/patterns/forms">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<rect height="18" rx="2" width="18" x="3" y="3"></rect>
<path d="M9 9h6M9 13h6M9 17h4"></path>
</svg>
</div>
<div class="card-content">
<h3 class="card-title">Forms</h3>
<p class="card-description">
					Input layouts, validation feedback, multi-step flows, and error states. Accessible
					form patterns that guide users through data entry.
				</p>
</div>
<div class="card-arrow">
<svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16">
<path d="M5 12h14M12 5l7 7-7 7"></path>
</svg>
</div>
</a>
<a class="pattern-card" href="/canon/patterns/loading">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<circle cx="12" cy="12" r="10"></circle>
<path d="M12 6v6l4 2"></path>
</svg>
</div>
<div class="card-content">
<h3 class="card-title">Loading</h3>
<p class="card-description">
					Skeleton screens, spinners, progress indicators, and content placeholders.
					Patterns that communicate system status during async operations.
				</p>
</div>
<div class="card-arrow">
<svg fill="none" height="16" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="16">
<path d="M5 12h14M12 5l7 7-7 7"></path>
</svg>
</div>
</a>
<!-- Planned Patterns -->
<div class="pattern-card pattern-card-planned">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
<line x1="12" x2="12" y1="9" y2="13"></line>
<line x1="12" x2="12.01" y1="17" y2="17"></line>
</svg>
</div>
<div class="card-content">
<h3 class="card-title">Error Handling</h3>
<p class="card-description">
					Error boundaries, inline errors, toast notifications, and recovery flows.
					Graceful degradation when things go wrong.
				</p>
</div>
<span class="badge">Planned</span>
</div>
<div class="pattern-card pattern-card-planned">
<div class="card-icon">
<svg fill="none" height="24" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="24">
<rect height="18" rx="2" width="18" x="3" y="3"></rect>
<circle cx="12" cy="12" r="3"></circle>
<path d="M3 3l18 18"></path>
</svg>
</div>
<div class="card-content">
<h3 class="card-title">Empty States</h3>
<p class="card-description">
					Zero-data views, first-time user experiences, and call-to-action placeholders.
					Making "nothing" helpful.
				</p>
</div>
<span class="badge">Planned</span>
</div>
</div>
</section>


<section class="structure-section">
<h2 class="section-title">Pattern Documentation Structure</h2>
<p class="section-description">
		Each pattern follows a consistent documentation format.
	</p>
<div class="structure-grid">
<div class="structure-item">
<h3>Problem</h3>
<p>What user need does this pattern address? When should you reach for it?</p>
</div>
<div class="structure-item">
<h3>Solution</h3>
<p>Visual examples and interactive demos showing the pattern in action.</p>
</div>
<div class="structure-item">
<h3>Implementation</h3>
<p>Code examples using Canon components and tokens. Copy-paste ready.</p>
</div>
<div class="structure-item">
<h3>Accessibility</h3>
<p>Keyboard navigation, screen reader considerations, and reduced motion support.</p>
</div>
<div class="structure-item">
<h3>Variants</h3>
<p>Alternative approaches for different contexts or requirements.</p>
</div>
<div class="structure-item">
<h3>Anti-patterns</h3>
<p>Common mistakes to avoid and why they cause problems.</p>
</div>
</div>
</section>


<section class="triad-section">
<h2 class="section-title">Pattern Philosophy</h2>
<p class="section-description">
		Every Canon pattern follows the Subtractive Triad.
	</p>
<div class="triad-grid">
<div class="triad-item">
<h3>DRY (Implementation)</h3>
<p>
				Patterns unify repeated solutions. If you find yourself composing the same components
				the same way, it becomes a pattern.
			</p>
</div>
<div class="triad-item">
<h3>Rams (Artifact)</h3>
<p>
				Every pattern must earn its existence. If a pattern doesn't solve a real,
				recurring problem, it doesn't belong.
			</p>
</div>
<div class="triad-item">
<h3>Heidegger (System)</h3>
<p>
				Patterns serve the whole. They should feel invisible when used correctly, the
				infrastructure receding into the experience.
			</p>
</div>
</div>
</section>


<section class="canon-section">
<blockquote class="canon-quote">
<p>"Weniger, aber besser."</p>
<cite>Less, but better. - Dieter Rams</cite>
</blockquote>
<p class="canon-explanation">
		Patterns reduce cognitive load by providing proven solutions. A well-designed pattern is
		one you never think about because it simply works.
	</p>
</section>`
  },
  {
    slug: "patterns/loading",
    section: "patterns",
    title: "Loading",
    description: "Patterns for waiting states, perceived progress, and handoff between system and user.",
    content: `## Pattern Set

- \`LoadingSkeleton\`: preserve layout while content is on the way
- \`LoadingOverlay\`: communicate temporary lock states without replacing the entire screen
- \`Spinner\`, \`Skeleton\`, and \`Progress\`: lower-level feedback primitives for smaller status moments

## Import Surface

\`\`\`svelte
<script lang="ts">
  import {
    LoadingSkeleton,
    LoadingOverlay,
    Spinner,
    Progress
  } from '@create-something/canon';
</script>
\`\`\`

## Selection Rules

1. Use skeletons when you already know the shape of the arriving content.
2. Use overlays when the user stays on the current surface and needs continuity.
3. Use spinners and progress indicators for compact status moments, not as a substitute for structure.

## Documentation Status

Expanded examples for async tables, upload flows, and inline refresh states are still being documented. The route is now live so the docs surface matches the package surface.

## Related

- [Forms](/canon/patterns/forms)
- [Motion](/canon/foundations/motion)
- [Accessibility](/canon/guidelines/accessibility)`
  },
  {
    slug: "resources/changelog",
    section: "resources",
    title: "Changelog",
    description: "Version history and release notes for the Canon Design System",
    content: `<section class="release">
<div class="release-header">
<h2>v1.1.0</h2>
<time datetime="2026-02-04">February 4, 2026</time>
<span class="badge badge--new">Latest</span>
</div>
<p class="release-summary">
			WORKWAY alignment release. The Canon Design System is now synchronized with 
			WORKWAY's implementation, establishing a shared visual language across all 
			CREATE SOMETHING properties and the WORKWAY vertical.
		</p>
<h3>WORKWAY Alignment</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				Infrastructure grid backgrounds (.bg-grid, .bg-grid-fade, .bg-grid-vignette)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				WORKWAY-aligned button system with glass effects
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Interactive state utilities (.interactive, .pressable, .hover-lift)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Scroll reveal animations (.reveal, .reveal-delay-*)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Dim siblings pattern (.dim-siblings-on-hover)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Skeleton loading animations
			</li>
</ul>
<h3>Glass Design System</h3>
<ul class="change-list">
<li class="change change--changed">
<span class="change-type">Changed</span>
				Glass utilities now match WORKWAY's Liquid Glass implementation
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Glass blur layer technique for button secondary variant
			</li>
</ul>
<h3>Notes</h3>
<p class="release-note">
			WORKWAY (the construction vertical) has advanced the shared Canon system with 
			Tailwind v4, shadcn/ui components, and MagicUI animations. This release begins 
			aligning CREATE SOMETHING properties (.agency first) with these updates. 
			Properties .io, .space, and .ltd will be migrated incrementally.
		</p>
<p class="release-note">
			<strong>Reference implementation:</strong> WORKWAY's <code>workway-platform/apps/web/src/styles.css</code>
			serves as the canonical source for new utility classes and patterns.
		</p>
</section>

<section class="release">
<div class="release-header">
<h2>v1.0.0</h2>
<time datetime="2024-12-27">December 27, 2024</time>
</div>
<p class="release-summary">
			Initial release of the Canon Design System. Foundations, components,
			patterns, and comprehensive documentation.
		</p>
<h3>Foundations</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				Color tokens with WCAG AA compliance
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Typography scale using fluid sizing
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Spacing system based on golden ratio (φ = 1.618)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Motion tokens with reduced-motion support
			</li>
</ul>
<h3>Components</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				Button component with variants (primary, secondary, ghost, danger)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Card component with header/footer slots
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				TextField with validation states
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				TextArea with auto-resize option
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Checkbox and Radio components
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Select dropdown
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Toggle switch
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Toast notifications
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Badge component
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Breadcrumb navigation
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Tabs component
			</li>
</ul>
<h3>Patterns</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				FormLayout for form structure
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				FormValidation with error summary
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				MultiStepForm for wizard flows
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				EmptyState for zero-data scenarios
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				FirstTimeUser onboarding pattern
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				LoadingSkeleton and LoadingOverlay
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				InlineError and ErrorBoundary
			</li>
</ul>
<h3>Token Export</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				CSS custom properties (tokens.css)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				SCSS variables (tokens.scss)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				W3C DTCG format (tokens.dtcg.json)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Figma/Tokens Studio format (tokens.figma.json)
			</li>
</ul>
<h3>Documentation</h3>
<ul class="change-list">
<li class="change change--added">
<span class="change-type">Added</span>
				Interactive documentation site
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Component API reference pages
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Accessibility guidelines (WCAG 2.1 AA)
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Content writing guidelines
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Responsive design patterns
			</li>
<li class="change change--added">
<span class="change-type">Added</span>
				Theming guide
			</li>
</ul>
</section>


<section class="versioning">
<h2>Versioning</h2>
<p>
			Canon follows <a href="https://semver.org" rel="noopener" target="_blank">Semantic Versioning</a>.
		</p>
<table class="spec-table">
<thead>
<tr>
<th>Version</th>
<th>Meaning</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Major</strong> (1.x.x)</td>
<td>Breaking changes to component APIs or tokens</td>
</tr>
<tr>
<td><strong>Minor</strong> (x.1.x)</td>
<td>New features, backwards compatible</td>
</tr>
<tr>
<td><strong>Patch</strong> (x.x.1)</td>
<td>Bug fixes, documentation updates</td>
</tr>
</tbody>
</table>
</section>


<section class="legend">
<h2>Change Types</h2>
<div class="legend-grid">
<div class="legend-item">
<span class="change-type change-type--added">Added</span>
<span>New features</span>
</div>
<div class="legend-item">
<span class="change-type change-type--changed">Changed</span>
<span>Updates to existing features</span>
</div>
<div class="legend-item">
<span class="change-type change-type--deprecated">Deprecated</span>
<span>Features to be removed</span>
</div>
<div class="legend-item">
<span class="change-type change-type--removed">Removed</span>
<span>Deleted features</span>
</div>
<div class="legend-item">
<span class="change-type change-type--fixed">Fixed</span>
<span>Bug fixes</span>
</div>
<div class="legend-item">
<span class="change-type change-type--security">Security</span>
<span>Vulnerability fixes</span>
</div>
</div>
</section>`
  },
  {
    slug: "resources/contributing",
    section: "resources",
    title: "Contributing",
    description: "How to contribute to the Canon Design System",
    content: `<h2>Philosophy</h2>
<p>
			Before contributing, understand the principles that guide Canon:
		</p>
<div class="principle-grid">
<div class="principle">
<h3>DRY (Implementation)</h3>
<p>"Have I built this before?" Unify. No duplicate patterns.</p>
</div>
<div class="principle">
<h3>Rams (Artifact)</h3>
<p>"Does this earn its existence?" Remove. Less, but better.</p>
</div>
<div class="principle">
<h3>Heidegger (System)</h3>
<p>"Does this serve the whole?" Reconnect. Parts inform whole.</p>
</div>
</div>



<h2>Getting Started</h2>
<h3>1. Clone the Repository</h3>
<div class="code-block">
<pre><code>{\`git clone https://github.com/createsomethingtoday/create-something-monorepo.git
cd create-something-monorepo
pnpm install\`}</code></pre>
</div>
<h3>2. Run the Dev Server</h3>
<div class="code-block">
<pre><code>pnpm dev --filter=components</code></pre>
</div>
<h3>3. Run Type Checks</h3>
<div class="code-block">
<pre><code>pnpm --filter=components check</code></pre>
</div>



<h2>Adding a Component</h2>
<ol class="numbered-list">
<li>
<strong>Check if it exists</strong> — Search existing components. Don't duplicate.
			</li>
<li>
<strong>Question necessity</strong> — Does this component earn its existence?
				Can a pattern or composition of existing components work instead?
			</li>
<li>
<strong>Create the component</strong> — Follow the file structure below.
			</li>
<li>
<strong>Document it</strong> — Add a documentation page in <code>/canon/components/</code>.
			</li>
<li>
<strong>Export it</strong> — Add to the appropriate index.ts.
			</li>
</ol>
<h3>File Structure</h3>
<div class="code-block">
<pre><code>{\`packages/components/src/lib/components/
├── Button/
│   ├── Button.svelte      # Component file
│   └── index.ts           # Re-export
├── TextField/
│   ├── TextField.svelte
│   └── index.ts
└── index.ts               # Package exports\`}</code></pre>
</div>
<h3>Component Template</h3>
<div class="code-block">
<pre><code>{\`<script lang="ts">
  /**
   * ComponentName
   *
   * Brief description of what this component does.
   *
   * Canon Principle: Which principle does this embody?
   */

  interface Props {
    /** Prop description */
    label: string;
    /** Optional prop */
    variant?: 'primary' | 'secondary';
  }

  let {
    label,
    variant = 'primary'
  }: Props = \$props();
</script>

<element class="component component--{variant}">
  {label}
</element>

<style>
  .component {
    /* Use Canon tokens */
    padding: var(--space-sm);
    color: var(--color-fg-primary);
  }
</style>\`}</code></pre>
</div>



<h2>Modifying Tokens</h2>
<p>
			Tokens are the foundation. Changes cascade everywhere.
		</p>
<div class="warning">
<strong>Warning:</strong> Token changes affect all properties (.io, .space, .agency, .ltd).
			Ensure changes are intentional and documented.
		</div>
<h3>Token Source</h3>
<p>Edit tokens in:</p>
<div class="code-block">
<pre><code>packages/components/src/lib/styles/tokens.css</code></pre>
</div>
<h3>Regenerate Exports</h3>
<p>After editing tokens, regenerate derived formats:</p>
<div class="code-block">
<pre><code>pnpm --filter=components tokens:export</code></pre>
</div>
<p>This generates:</p>
<ul class="guidelines-list">
<li><code>tokens.scss</code> — SCSS variables</li>
<li><code>tokens.dtcg.json</code> — W3C Design Token format</li>
<li><code>tokens.figma.json</code> — Tokens Studio format</li>
<li><code>canon.json</code> — Structured JSON</li>
</ul>



<h2>Code Standards</h2>
<h3>TypeScript</h3>
<ul class="guidelines-list">
<li>All components use TypeScript</li>
<li>Define explicit <code>Props</code> interface</li>
<li>Document props with JSDoc comments</li>
<li>Use Svelte 5 runes (<code>\$props</code>, <code>\$state</code>, <code>\$derived</code>)</li>
</ul>
<h3>CSS</h3>
<ul class="guidelines-list">
<li>Use Canon tokens for all values (colors, spacing, typography)</li>
<li>No hardcoded colors or pixel values</li>
<li>Tailwind for structure, Canon for aesthetics</li>
<li>Include <code>:focus-visible</code> styles for interactives</li>
</ul>
<h3>Accessibility</h3>
<ul class="guidelines-list">
<li>WCAG 2.1 AA compliance required</li>
<li>Keyboard navigation must work</li>
<li>Screen reader tested</li>
<li>Include <code>prefers-reduced-motion</code> support</li>
</ul>



<h2>Commit Messages</h2>
<p>Follow conventional commits format:</p>
<div class="code-block">
<pre><code>{\`feat(components): add Tooltip component
fix(tokens): correct spacing token values
docs(canon): add Button documentation
refactor(components): simplify Card props\`}</code></pre>
</div>
<table class="spec-table">
<thead>
<tr>
<th>Type</th>
<th>Use</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>feat</code></td>
<td>New feature</td>
</tr>
<tr>
<td><code>fix</code></td>
<td>Bug fix</td>
</tr>
<tr>
<td><code>docs</code></td>
<td>Documentation</td>
</tr>
<tr>
<td><code>refactor</code></td>
<td>Code restructure</td>
</tr>
<tr>
<td><code>style</code></td>
<td>Formatting only</td>
</tr>
<tr>
<td><code>test</code></td>
<td>Tests</td>
</tr>
</tbody>
</table>



<h2>Pull Request Process</h2>
<ol class="numbered-list">
<li><strong>Create a branch</strong> from <code>main</code></li>
<li><strong>Make changes</strong> following the guidelines above</li>
<li><strong>Run checks</strong> — <code>pnpm check</code> and <code>pnpm build</code></li>
<li><strong>Create PR</strong> with clear description</li>
<li><strong>Address feedback</strong> from review</li>
</ol>
<h3>PR Checklist</h3>
<div class="checklist">
<ul>
<li>Type checks pass</li>
<li>Build succeeds</li>
<li>Documentation updated</li>
<li>Exports added to index.ts</li>
<li>Accessibility tested</li>
<li>Canon tokens used (no hardcoded values)</li>
</ul>
</div>`
  },
  {
    slug: "resources/figma",
    section: "resources",
    title: "Figma Integration",
    description: "How the Canon token files map into design tooling today.",
    content: `## Source Of Truth

Start from \`packages/canon/src/lib/styles/tokens.css\`. The additional artifacts exist to move that same token system into other tools.

## Files To Use

- \`packages/canon/src/lib/styles/tokens.figma.json\` for Tokens Studio style imports
- \`packages/canon/src/lib/styles/tokens.dtcg.json\` for standards-oriented token pipelines
- \`@create-something/canon/styles/tokens.figma.json\` and \`@create-something/canon/styles/tokens.dtcg.json\` from the packaged library surface

## Recommended Workflow

1. Change tokens in code first.
2. Treat exported JSON files as derived artifacts, not hand-edited sources.
3. Re-import the Figma-facing artifact when token values change.

## Documentation Status

The long-form walkthrough for Tokens Studio and end-to-end sync is still being rewritten. This page is live now so the Canon resources section no longer points at a 404.

## Related

- [Token Reference](/canon/resources/tokens)
- [Theming](/canon/guidelines/theming)
- [Contributing](/canon/resources/contributing)`
  },
  {
    slug: "resources/get-started",
    section: "resources",
    title: "Get Started",
    description: "Quick start guide for the Canon Design System",
    content: `<h2>Installation</h2>
<p>Install the Canon components package in your SvelteKit project.</p>
<div class="code-block">
<div class="code-header">Terminal</div>
<pre><code>pnpm add @create-something/canon</code></pre>
</div>
<div class="note">
<strong>Requirements:</strong> SvelteKit 2.0+ and Svelte 5.0+
		</div>



<h2>Import Tokens</h2>
<p>
			Import the Canon design tokens in your app's global CSS file.
			Choose the import that matches your needs.
		</p>
<h3>Option 1: Full Canon (Recommended)</h3>
<p>Includes tokens, base styles, and utility classes.</p>
<div class="code-block">
<div class="code-header">src/app.css</div>
<pre><code>{\`@import '@create-something/canon/styles/canon.css';\`}</code></pre>
</div>
<h3>Option 2: Tokens Only</h3>
<p>Just the CSS custom properties, for custom theming.</p>
<div class="code-block">
<div class="code-header">src/app.css</div>
<pre><code>{\`@import '@create-something/canon/styles/tokens.css';\`}</code></pre>
</div>
<h3>Option 3: With Tailwind</h3>
<p>For projects using Tailwind CSS alongside Canon.</p>
<div class="code-block">
<div class="code-header">src/app.css</div>
<pre><code>{\`@import '@create-something/canon/styles/tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;\`}</code></pre>
</div>



<h2>Using Components</h2>
<p>Import and use Canon components in your Svelte files.</p>
<div class="code-block">
<div class="code-header">+page.svelte</div>
<pre><code>{\`<script lang="ts">
  import { Button, TextField, Card } from '@create-something/canon';

  let email = \$state('');
</script>

<card>
  <textfield bind:value="{email}" label="Email" type="email"></textfield>
  <button>Subscribe</button>
</card>\`}</code></pre>
</div>



<h2>Using Tokens Directly</h2>
<p>
			Canon tokens are CSS custom properties. Use them anywhere you write CSS.
		</p>
<div class="code-block">
<div class="code-header">Component.svelte</div>
<pre><code>{\`<div class="custom-box">
  Custom styled element
</div>

<style>
  .custom-box {
    padding: var(--space-md);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
    color: var(--color-fg-primary);
  }
</style>\`}</code></pre>
</div>
<h3>Common Tokens</h3>
<table class="spec-table">
<thead>
<tr>
<th>Category</th>
<th>Token</th>
<th>Use</th>
</tr>
</thead>
<tbody>
<tr>
<td>Color</td>
<td><code>--color-fg-primary</code></td>
<td>Primary text</td>
</tr>
<tr>
<td>Color</td>
<td><code>--color-bg-subtle</code></td>
<td>Card backgrounds</td>
</tr>
<tr>
<td>Spacing</td>
<td><code>--space-md</code></td>
<td>Medium spacing (1.618rem)</td>
</tr>
<tr>
<td>Radius</td>
<td><code>--radius-lg</code></td>
<td>Large border radius (12px)</td>
</tr>
<tr>
<td>Typography</td>
<td><code>--text-body</code></td>
<td>Body text size (1rem)</td>
</tr>
</tbody>
</table>



<h2>Project Structure</h2>
<p>Recommended structure for Canon-based projects.</p>
<div class="code-block">
<pre><code>{\`src/
├── app.css           # Import canon.css here
├── app.html
├── routes/
│   ├── +layout.svelte
│   └── +page.svelte
└── lib/
    └── components/   # Your custom components\`}</code></pre>
</div>



<h2>What's Next?</h2>
<div class="next-grid">
<a class="next-card" href="/canon/foundations/colors">
<h3>Colors</h3>
<p>Explore the color token system</p>
</a>
<a class="next-card" href="/canon/foundations/typography">
<h3>Typography</h3>
<p>Learn the type scale</p>
</a>
<a class="next-card" href="/canon/components/button">
<h3>Components</h3>
<p>Browse all components</p>
</a>
<a class="next-card" href="/canon/resources/tokens">
<h3>Token Reference</h3>
<p>Complete token list</p>
</a>
</div>`
  },
  {
    slug: "resources/overlays",
    section: "resources",
    title: "Overlays",
    description: "Canon overlay contract for extending Canon across web, chat, app, voice, and glasses without forking primitives.",
    content: `## Source of Truth

The overlay contract lives in \`@create-something/canon/overlays\` and is mirrored for agents through \`canon://overlays\`.

Use it when a project needs local theme aliases, copy, templates, surface policy, or registry metadata without changing Canon primitives.

## Required Artifacts

Every complete project overlay declares the same artifact set:

- \`theme.css\` for project-local CSS aliases that still point back to Canon tokens
- \`tokens.json\` for token aliases without creating a parallel token scale
- \`templates/\` for surface briefs and reusable workflow templates
- \`copy-rules.md\` for project terminology and voice
- \`surface-policy.md\` for modality-specific behavior across web, chat, app, voice, and glasses
- \`registry.json\` for local registry metadata and Canon dependencies

## Overlay Rules

1. Extend Canon through named overlay artifacts, not primitive forks.
2. Route primitive, template, adapter, token, or policy promotion through Canon extension intake.
3. Keep one-surface needs project-local until repeated-surface evidence supports candidate promotion.
4. Do not mark an overlay-driven primitive stable until Canon owns export path, docs, tests, compatibility, and registry routing.

## Modalities

| Modality | Overlay owns | Canon owns |
| --- | --- | --- |
| Web | local copy, surface-specific templates, integration receipts | tokens, layout primitives, accessibility contract, registry routing |
| Chat | conversation copy, tool receipts, handoff templates | decision/proof semantics, extension intake routing, artifact metadata |
| App | workflow policy, app-specific states, domain data bindings | components, state display patterns, token and motion boundaries |
| Voice | spoken terminology, confirmation phrases, escalation scripts | decision/proof structure, state hierarchy, artifact references |
| Glasses | context labels, local task sequence, device-specific display policy | compact proof/state pattern, minimum readable metadata, routing template |

## Project Template

Start with \`overlay.project-template\`.

- Package export: \`@create-something/canon/overlays\`
- Template pack: \`@create-something/canon/overlays/project-template\`
- MCP catalog: \`canon://overlays\`
- Template resource: \`canon://overlays/overlay.project-template\`

The template pack renders eight files: \`theme.css\`, \`tokens.json\`, \`templates/README.md\`, \`templates/surface-brief.md\`, \`copy-rules.md\`, \`surface-policy.md\`, \`registry.json\`, and \`manifest.ts\`.

## Intake Inventory

Multiple projects can feed Canon without creating a second design-system fork by checking their overlay manifests into the project that owns the local surface, then running the Canon intake inventory.

\`\`\`bash
pnpm --filter @create-something/canon overlay:inventory -- --root .
\`\`\`

The inventory scans \`apps/\` and \`packages/\` for \`CANON_PROJECT_OVERLAY_MANIFEST\` exports, skips the Canon template itself, reviews every discovered manifest with \`reviewCanonProjectOverlay(...)\`, and reports:

- complete overlays that are ready for handoff
- overlays missing required artifacts
- overlays with declared artifact files that no longer exist
- overlays with source evidence paths that no longer exist
- overlays with registry dependencies that do not resolve to Canon registry items
- extension intakes that should stay project-local
- extension intakes with repeated-surface evidence for Canon candidate review

Agents can read the same inventory through \`canon://overlays/intake\` and the compact index at \`canon://overlays/intake/list\`.

Readiness now means more than a complete manifest shape. A project overlay is ready only when its required artifact set exists on disk, its evidence paths still resolve in the owning package or app, and every declared Canon dependency matches a registry item.

## Candidate Queue

Ready overlays can produce candidate intakes when they have repeated-surface evidence. Canon exposes those candidates as a read-only queue:

- Full queue: \`canon://overlays/candidates\`
- Compact list: \`canon://overlays/candidates/list\`
- Candidate detail: \`canon://overlays/candidates/<intake-id>\`
- Review packet collection: \`canon://overlays/candidates/handoffs\`
- Candidate review packet: \`canon://overlays/candidates/<intake-id>/handoff\`
- Promotion plan collection: \`canon://overlays/candidates/promotion-plans\`
- Candidate promotion plan: \`canon://overlays/candidates/<intake-id>/promotion-plan\`
- Readiness report collection: \`canon://overlays/candidates/readiness-reports\`
- Candidate readiness report: \`canon://overlays/candidates/<intake-id>/readiness\`
- Approval record collection: \`canon://overlays/candidates/approval-records\`
- Candidate approval record: \`canon://overlays/candidates/<intake-id>/approval-record\`
- Rendered handoff tool: \`canon_overlay_candidate_handoff_get\`
- Rendered promotion plan tool: \`canon_overlay_candidate_promotion_plan_get\`
- Rendered readiness tool: \`canon_overlay_candidate_promotion_readiness_get\`
- Rendered approval record tool: \`canon_overlay_candidate_promotion_approval_record_get\`
- Approval validation tool: \`canon_overlay_candidate_promotion_approval_record_validate\`
- Local CLI handoff: \`pnpm --filter @create-something/canon overlay:candidate-handoff -- --root . --intake <intake-id>\`
- Local CLI promotion plan: \`pnpm --filter @create-something/canon overlay:candidate-plan -- --root . --intake <intake-id>\`
- Local CLI readiness report: \`pnpm --filter @create-something/canon overlay:candidate-readiness -- --root . --intake <intake-id>\`
- Local CLI approval record: \`pnpm --filter @create-something/canon overlay:candidate-approval-record -- --root . --intake <intake-id>\`
- Local CLI approval validation: \`pnpm --filter @create-something/canon overlay:candidate-approval-validate -- --root . --intake <intake-id>\`

The queue is not an approval engine. It gathers overlay id, intake id, requested kind, modalities, source paths, surfaces, dependencies, required evidence, and stop-before-stable notes so Canon maintainers can decide whether to open a promotion slice.

Each queued candidate also has a review packet. The packet turns the queue entry into a stable handoff with the owning overlay manifest, source package, surfaces, evidence requirements, promotion checklist, and explicit approval boundary. Agents can use it to prepare Canon implementation work after human approval, but the packet does not create Linear issues, edit project overlays, or approve stable promotion.

Use \`canon_overlay_candidate_handoff_get\` when a maintainer needs the packet as Markdown rather than JSON. The tool accepts the intake id, packet id, or candidate id and returns the source URIs, surfaces, dependencies, required evidence, stop-before-stable notes, promotion checklist, and approval boundary.

Use \`overlay:candidate-handoff\` for the same review packet from the local repo checkout. Omitting \`--intake\` prints the packet list; adding \`--json\` prints the source packet data.

After explicit human approval, use promotion plans to scope implementation. Plans turn an approved handoff into preconditions, implementation scope, required changes, validation, documentation, compatibility, stop conditions, and the approval boundary for the next Canon slice. They are read-only artifacts: they do not create Linear issues, edit project overlays, approve implementation, or mark anything stable.

Use \`canon_overlay_candidate_promotion_plan_get\` when a maintainer needs the plan as Markdown rather than JSON. Use \`overlay:candidate-plan\` for the same plan from the local repo checkout. Omitting \`--intake\` prints the plan list; adding \`--json\` prints the source plan data.

Readiness reports sit after promotion plans and before implementation. They compare the plan with current Canon registry and public export policy snapshots, then call out human approval, registry target, export target, docs target, validation, and compatibility readiness. Related registry items and export policies are review hints only; the report does not select targets automatically.

Use \`canon_overlay_candidate_promotion_readiness_get\` when a maintainer needs the readiness report as Markdown. Use \`overlay:candidate-readiness\` for the same report from the local repo checkout. Omitting \`--intake\` prints the report list; adding \`--json\` prints the source readiness data.

Approval records sit after readiness reports and before implementation. They are fillable contracts for maintainer approval, approval evidence, registry action, selected registry item, export path, docs path, maturity target, and implementation owner. Target choices remain unset until a maintainer records them. The approval record is a read-only template: it does not approve implementation, create Linear issues, mutate Canon or project overlays, or mark candidates stable.

Use \`canon_overlay_candidate_promotion_approval_record_get\` when a maintainer needs the approval record as Markdown. Use \`overlay:candidate-approval-record\` for the same record from the local repo checkout. Omitting \`--intake\` prints the record list; adding \`--json\` prints the source approval-record data.

Validate a filled approval record before opening implementation work. Validation reports missing required fields, invalid registry action, invalid maturity target, invalid approval date, and target evidence warnings. It can return \`ready-for-implementation\`, but that is still only a gate check: validation does not approve implementation, persist approval fields, create Linear issues, mutate Canon or project overlays, or mark candidates stable.

Use \`canon_overlay_candidate_promotion_approval_record_validate\` when an agent has maintainer-supplied target fields to check in MCP. Use \`overlay:candidate-approval-validate\` for the same validation from the local repo checkout. Add \`--record <path>\` to validate a JSON approval record or target payload, and add \`--strict\` when CI should fail unless the record is ready for implementation.

Do not treat a queued candidate as stable. Stable promotion still requires Canon-owned export paths, docs, tests, compatibility notes, and registry routing.

## Related

- [Registry](/canon/resources/registry)
- [Get Started](/canon/resources/get-started)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "resources/registry",
    section: "resources",
    title: "Registry",
    description: "Machine-readable Canon manifest for components, tokens, templates, adapters, policies, and modality contracts.",
    content: `## What Ships Today

- \`@create-something/canon/registry\`
- registry item search and lookup helpers
- extension intake routing
- project overlay review helpers
- public export classification policy

## Selection Rules

1. Use registry lookup before inventing a local primitive.
2. Treat \`candidate\` as reviewable, not stable.
3. Keep project overlays local until evidence from multiple surfaces supports promotion.

## Related

- [Get Started](/canon/resources/get-started)
- [Token Reference](/canon/resources/tokens)
- [Clear Components](/canon/components/clear)`
  },
  {
    slug: "resources/tokens",
    section: "resources",
    title: "Token Reference",
    description: "Entry point for the Canon token files and the formats they ship in today.",
    content: `## Canonical Artifacts

- \`@create-something/canon/styles/tokens.css\`
- \`@create-something/canon/styles/canon.css\`
- \`@create-something/canon/styles/tokens.scss\`
- \`@create-something/canon/styles/tokens.dtcg.json\`
- \`@create-something/canon/styles/tokens.figma.json\`

In the monorepo, the source files live under \`packages/canon/src/lib/styles/\`.

## Recommended Imports

\`\`\`css
@import '@create-something/canon/styles/tokens.css';
\`\`\`

\`\`\`css
@import '@create-something/canon/styles/canon.css';
\`\`\`

## What The Token Files Cover

- core backgrounds, foregrounds, borders, and interactive states
- shell surfaces and product accent layers
- semantic status colors
- spacing, radius, shadows, z-index, and motion scales
- glass and liquid-glass surface values

## Documentation Status

The full generated token tables are still being rebuilt. This page is live now so linked documentation resolves, and it points to the stable files that already exist in the package.

## Related

- [Get Started](/canon/resources/get-started)
- [Theming](/canon/guidelines/theming)
- [Figma](/canon/resources/figma)`
  }
];
