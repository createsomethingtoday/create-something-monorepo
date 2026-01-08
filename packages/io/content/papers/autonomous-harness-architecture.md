---
title: "The Autonomous Harness"
subtitle: "Agent Orchestration with Human Agency"
authors: ["Micah Johnson"]
category: "Architecture"
abstract: "Traditional agent orchestration requires constant human oversight. This paper presents an alternative: the autonomous harness. Drawing on Heidegger's concepts of dwelling and tool-being, we argue that effective human-agent collaboration requires the harness to recede into transparent operation. Humans engage through progress reports—reactive steering rather than proactive management."
keywords: ["agent orchestration", "autonomy", "Heidegger", "dwelling", "tool-being", "Beads", "harness"]
publishedAt: "2025-12-18"
readingTime: 15
difficulty: "advanced"
published: true
---

# The Autonomous Harness

Agent Orchestration with Human Agency—how progress reports enable reactive steering without proactive management.

**Category:** Architecture
**Reading Time:** 15 min read
**Difficulty:** Advanced
**Paper ID:** PAPER-2025-008

## Abstract

Traditional agent orchestration requires constant human oversight—approving each action, reviewing each output, managing each session. This paper presents an alternative architecture: the autonomous harness. Drawing on Heidegger's concepts of dwelling and tool-being, we argue that effective human-agent collaboration requires the harness to *recede into transparent operation*. Humans engage through progress reports—reactive steering rather than proactive management. The harness runs autonomously; humans redirect when needed. This preserves agency without ceremony, enabling both machine efficiency and human control.

> "The harness recedes into transparent operation. When working, you don't think about the harness—you review progress and redirect when needed."
> — CREATE SOMETHING Harness Philosophy

## I. Introduction: The Orchestration Problem

As AI agents become more capable, a fundamental question emerges: how do humans maintain meaningful control over autonomous systems without becoming bottlenecks?

You might find yourself reaching for one of two extremes:

| You might try... | What happens |
|-----------------|--------------|
| Full autonomy: "Let the agent handle everything" | Errors compound silently. You lose agency. |
| Full oversight: "I'll approve every action" | You become the bottleneck. Automation's purpose is defeated. |

When you catch yourself at either extreme, you've found the tension this paper addresses: **what is the minimum oversight that preserves meaningful human control?**

This paper argues that the answer is *progress reports*—periodic checkpoints that enable reactive steering. The harness runs autonomously; humans engage only when they choose to. This is not abdication of control but a different *mode* of control.

## II. Philosophical Foundation: Dwelling and Tool-Being

### Heidegger's Tool Analysis

In *Being and Time*, Heidegger distinguishes two modes of encountering equipment. In *Zuhandenheit* (ready-to-hand), tools recede into transparent use—the hammer disappears when hammering. In *Vorhandenheit* (present-at-hand), tools become objects of contemplation—we notice the hammer when it breaks.

> "The peculiarity of what is proximally ready-to-hand is that, in its readiness-to-hand, it must, as it were, withdraw in order to be ready-to-hand quite authentically."

A well-functioning harness should exhibit Zuhandenheit: it should recede into the background, enabling work without demanding attention. When humans must constantly approve, review, or manage the harness, it becomes present-at-hand—an obstacle rather than an aid.

### Dwelling as Mode of Being

Heidegger's concept of *dwelling* extends this analysis. To dwell is not merely to reside in a location but to be at home, to care for a place, to let things be what they are. Applied to agent orchestration:

- **The agent dwells in the codebase**—working within it, caring for it
- **The human dwells in oversight**—reviewing progress, redirecting when needed
- **The harness enables both dwellings**—without capturing either

The key insight: the harness must not demand the human's dwelling. The human should be able to walk away, return when ready, and find coherent progress reports waiting.

## III. The Gestell Warning: Automation Without Invasion

Heidegger's later work warns of *Gestell*—the technological enframing that reduces everything to standing-reserve, resources to be optimized. A naive harness implementation risks Gestell: automation that fills every gap, leaving no space for human judgment.

\`\`\`
// Gestell: Technology as total capture
while (true) {
  const task = await getNextTask();
  await executeWithoutOversight(task);  // No checkpoint
  await markComplete(task);              // No review
  // Human has no entry point
}
\`\`\`

The danger is not automation itself but automation that *forecloses human agency*. The harness must create space for human engagement without requiring it. This is *Gelassenheit*—releasement toward things. Neither rejection nor submission; full engagement without capture.

### Checkpoint as Clearing

The solution is the *checkpoint*—a periodic clearing where humans can engage. Checkpoints create structured opportunities for oversight without demanding it:

\`\`\`
// Gelassenheit: Automation with clearing
while (!complete && !paused) {
  const task = await selectHighestPriority();
  const result = await runSession(task);

  if (shouldCheckpoint(result)) {
    await createProgressReport();      // Human CAN engage
    await checkForRedirects();         // Human CAN redirect
  }
  // Human agency preserved without ceremony
}
\`\`\`

## IV. Architecture: The Autonomous Harness

The CREATE SOMETHING harness implements these philosophical principles in concrete architecture. The design follows the Subtractive Triad:

- **DRY**: One system (Beads) for all tracking—no parallel infrastructure
- **Rams**: Only essential components—runner, checkpoints, redirects
- **Heidegger**: Serves the work, not itself—transparent operation

### Core Components

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     HARNESS RUNNER                          │
│                                                             │
│   Session 1 ──► Session 2 ──► Session 3 ──► ...            │
│       │             │             │                         │
│       ▼             ▼             ▼                         │
│   Checkpoint    Checkpoint    Checkpoint                    │
└───────┬─────────────┬─────────────┬─────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                BEADS (Human Interface)                      │
│                                                             │
│   bd progress  - Review checkpoints                         │
│   bd update    - Redirect priorities                        │
│   bd create    - Inject urgent work                         │
└─────────────────────────────────────────────────────────────┘
\`\`\`

### Everything is a Beads Issue

The harness uses Beads—CREATE SOMETHING's agent-native issue tracker—for all state. No new file formats, no separate databases. The tool recedes:

| Concept | Implementation |
|---------|---------------|
| Work items | \`issue_type: feature\` |
| Progress reports | \`label: checkpoint\` |
| Harness state | \`issue_type: epic\` with \`label: harness\` |
| Redirects | Priority changes on existing issues |

## V. The Session Loop: Autonomous Execution

Each harness run follows a predictable loop. The agent spawns Claude Code sessions, each primed with context about recent progress, current task, and any redirect notes.

### Session Priming

Before each session, the harness generates a priming prompt:

\`\`\`
# Harness Session Context

## Current Task
**Issue**: cs-xyz - Implement user dashboard
**Priority**: P1
**Blocked by**: Nothing
**Blocks**: cs-abc (dashboard tests)

## Recent Git Commits
- abc123: Add login endpoint
- def456: Add session management

## Last Checkpoint Summary
Completed auth flow. 8/42 features done.

## Redirect Notes
Human updated cs-ghi from P2 → P0.

## Session Goal
Complete the dashboard layout. Commit if tests pass.
\`\`\`

### Session Outcomes

Each session produces one of four outcomes:

- **Success**: Task completed. Issue marked closed. Git commit created.
- **Partial**: Some progress. Issue remains open. Progress noted.
- **Failed**: Task could not be completed. Checkpoint triggered.
- **Context Overflow**: Session hit context limit. Auto-continues in new session.

## VI. Checkpoints: The Human Interface

Checkpoints are progress reports created as Beads issues. They summarize what happened, what's next, and whether human attention is needed.

### Checkpoint Policy

| Trigger | Default | Description |
|---------|---------|-------------|
| \`afterSessions\` | 3 | Checkpoint every N sessions |
| \`afterHours\` | 4 | Checkpoint every M hours |
| \`onError\` | true | Checkpoint on task failure |
| \`onConfidenceBelow\` | 0.7 | Pause if confidence drops |

### Checkpoint Content

\`\`\`
═══════════════════════════════════════════════════════════════
  CHECKPOINT #12
  2025-12-18T14:00:00Z
═══════════════════════════════════════════════════════════════

Completed 5 of 6 tasks in this checkpoint period.
1 task(s) failed and may need attention.

Overall progress: 35/42 features.

✓ Completed: cs-a1b2, cs-c3d4, cs-e5f6, cs-g7h8, cs-i9j0
✗ Failed: cs-k1l2
◐ In Progress: cs-m3n4

Confidence: 85%
Git Commit: abc123def
═══════════════════════════════════════════════════════════════
\`\`\`

Humans review checkpoints when they choose—\`bd progress\`. The harness doesn't push notifications; it creates artifacts for pull-based review.

## VII. Redirects: Reactive Steering

The harness watches Beads for changes between sessions. When humans modify priorities or create urgent issues, the harness detects and responds:

| Human Action | Harness Response |
|--------------|------------------|
| \`bd update cs-xyz --priority P0\` | Issue jumps to front of queue |
| \`bd create "Urgent fix" --priority P0\` | New work added at top priority |
| \`bd close cs-abc\` | Harness stops working on issue |
| Create issue with \`pause\` label | Harness pauses for review |

This is *reactive steering*: humans don't manage the harness; they redirect it when their priorities change. The harness handles the mechanics; humans provide direction.

### Redirect Detection

\`\`\`typescript
async function checkForRedirects(snapshot: IssueSnapshot): Redirect[] {
  const current = await readAllIssues();
  const redirects: Redirect[] = [];

  for (const issue of current) {
    const prev = snapshot.get(issue.id);

    // Detect priority changes
    if (prev && prev.priority !== issue.priority) {
      redirects.push({
        type: 'priority_change',
        issueId: issue.id,
        from: prev.priority,
        to: issue.priority
      });
    }

    // Detect new urgent issues
    if (!prev && issue.priority === 0) {
      redirects.push({
        type: 'urgent_injection',
        issueId: issue.id
      });
    }
  }

  return redirects;
}
\`\`\`

## VIII. Human Workflow: Agency Without Ceremony

The harness workflow optimizes for human agency without ceremony:

### Starting Work

\`\`\`bash
# 1. Write a spec (markdown PRD)
vim specs/my-project.md

# 2. Start the harness
harness start specs/my-project.md

# 3. Walk away—work continues autonomously
\`\`\`

### Monitoring Progress

\`\`\`bash
# Check progress when ready
bd progress

# Output:
# Harness: cs-harness-xyz (running)
# Sessions: 12 | Features: 8/42 | Failed: 1
#
# Recent Checkpoints:
# - cs-cp-003 (2h ago): Dashboard 60% complete
# - cs-cp-002 (6h ago): Auth flow complete
# - cs-cp-001 (10h ago): Initial scaffolding

# Deep dive into a checkpoint
bd show cs-cp-003
\`\`\`

### Redirecting

\`\`\`bash
# "I need payments before dashboard"
bd update cs-payments --priority P0

# "Stop working on the old API"
bd close cs-old-api --reason "Deprecated"

# "Add this urgent fix"
bd create "Fix: Login broken on Safari" --priority P0

# Next session automatically picks up the redirect
\`\`\`

Notice what's missing: no approval dialogs, no status meetings, no context switches. The human engages when they choose, using commands they already know.

## IX. Implementation: The CREATE SOMETHING Harness

The harness is implemented as a TypeScript package in the CREATE SOMETHING monorepo:

\`\`\`
packages/harness/
├── src/
│   ├── types.ts          # Type definitions
│   ├── spec-parser.ts    # Markdown PRD parsing
│   ├── beads.ts          # Beads CLI integration
│   ├── session.ts        # Claude Code spawning
│   ├── checkpoint.ts     # Progress report generation
│   ├── redirect.ts       # Change detection
│   ├── runner.ts         # Main orchestration loop
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Exports
├── package.json
└── README.md
\`\`\`

### Spec Parser

The harness parses markdown PRDs into structured features with dependencies.

### Session Spawning

\`\`\`typescript
export async function runSession(
  context: PrimingContext,
  options: SessionOptions
): Promise<SessionResult> {
  const primingPrompt = generatePrimingPrompt(context);

  const process = spawn('claude', [
    '--dangerously-skip-permissions',
    '--print', primingPrompt
  ], {
    cwd: options.workDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Monitor for completion, errors, or context overflow
  return monitorSession(process, options);
}
\`\`\`

## X. Evaluation: Canon Alignment in Practice

The harness is currently being evaluated on the Canon Alignment spec—a 26-feature project to ensure CSS design consistency across all CREATE SOMETHING properties.

| Metric | Value |
|--------|-------|
| Total Features | 26 |
| Feature Sections | 8 |
| Dependencies | 18 (intra-section) |
| Checkpoint Policy | Every 3 sessions or 4 hours |

The evaluation tests the harness's ability to:
- Parse complex specs with multiple sections
- Create issues with proper dependencies
- Spawn Claude Code sessions with context
- Generate meaningful checkpoints
- Detect and respond to redirects

Results will be published in a follow-up paper once the Canon Alignment run completes.

## XI. Conclusion: The Tool Recedes

The autonomous harness represents a different philosophy of human-agent collaboration. Rather than requiring constant oversight, it creates space for human agency through structured checkpoints. Rather than demanding attention, it waits for engagement.

This is Heidegger's tool-being applied to orchestration: the harness recedes into transparent operation. When it works well, you don't think about it—you review progress and redirect when needed.

> "The hammer disappears when hammering. The harness disappears when working."

The goal is not automation for its own sake but automation that preserves what matters: human judgment, human priorities, human agency. The harness handles the mechanics; humans provide the direction. This is Gelassenheit—neither rejection nor submission, but full engagement without capture.

The infrastructure disappears; only the work remains.

## References

1. Heidegger, M. (1927). *Being and Time*. Trans. Macquarrie & Robinson.
2. Heidegger, M. (1954). *The Question Concerning Technology*.
3. Anthropic. (2025). "Building Effective Agents." anthropic.com/research/building-effective-agents
4. Anthropic. (2025). "Claude Code Documentation."
5. CREATE SOMETHING. (2025). "Beads: Agent-Native Issue Tracking."
6. CREATE SOMETHING. (2025). "The Subtractive Triad." createsomething.ltd/principles
`.trim();
</script>

<svelte:head>
	<title>The Autonomous Harness | CREATE SOMETHING.io</title>
	<meta name="description" content="How autonomous agent harnesses can preserve human agency through reactive oversight. Progress reports as the interface between machine autonomy and human direction." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-008</div>
			<h1 class="mb-3 paper-title">The Autonomous Harness</h1>
			<p class="max-w-3xl paper-subtitle">
				Agent Orchestration with Human Agency—how progress reports enable reactive steering
				without proactive management.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Architecture</span>
				<span>•</span>
				<span>15 min read</span>
				<span>•</span>
				<span>Advanced</span>
			</div>
			<PageActions
				title="The Autonomous Harness: Agent Orchestration with Human Agency"
				content={paperContent}
				metadata={{
					category: 'Architecture',
					sourceUrl: fullUrl,
					keywords: ['agent-orchestration', 'harness', 'heidegger', 'autonomous-agents', 'zuhandenheit']
				}}
				claudePrompt="Help me understand this research paper on autonomous agent orchestration and how to apply the harness pattern."
				onpreview={handlePreview}
			/>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				Traditional agent orchestration requires constant human oversight—approving each action,
				reviewing each output, managing each session. This paper presents an alternative architecture:
				the autonomous harness. Drawing on Heidegger's concepts of dwelling and tool-being, we argue
				that effective human-agent collaboration requires the harness to <em>recede into transparent
				operation</em>. Humans engage through progress reports—reactive steering rather than proactive
				management. The harness runs autonomously; humans redirect when needed. This preserves agency
				without ceremony, enabling both machine efficiency and human control.
			</p>
		</section>

		<!-- The Insight -->
		<section class="p-6 quote-box">
			<div class="text-center">
				<p class="italic quote-text">
					"The harness recedes into transparent operation. When working, you don't think about
					the harness—you review progress and redirect when needed."
				</p>
				<p class="mt-2 quote-attribution">— CREATE SOMETHING Harness Philosophy</p>
			</div>
		</section>

		<!-- Section 1: Introduction -->
		<section class="space-y-6">
			<h2 class="section-heading">I. Introduction: The Orchestration Problem</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					As AI agents become more capable, a fundamental question emerges: how do humans maintain
					meaningful control over autonomous systems without becoming bottlenecks?
				</p>

				<p>
					You might find yourself reaching for one of two extremes:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">You might try...</th>
								<th class="table-cell">What happens</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Full autonomy: "Let the agent handle everything"</td>
								<td class="table-cell">Errors compound silently. You lose agency.</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Full oversight: "I'll approve every action"</td>
								<td class="table-cell">You become the bottleneck. Automation's purpose is defeated.</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					When you catch yourself at either extreme, you've found the tension this paper addresses:
					<strong>what is the minimum oversight that preserves meaningful human control?</strong>
				</p>

				<p>
					This paper argues that the answer is <em>progress reports</em>—periodic checkpoints that
					enable reactive steering. The harness runs autonomously; humans engage only when they
					choose to. This is not abdication of control but a different <em>mode</em> of control.
				</p>
			</div>
		</section>

		<!-- Section 2: Philosophical Foundation -->
		<section class="space-y-6">
			<h2 class="section-heading">II. Philosophical Foundation: Dwelling and Tool-Being</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Heidegger's Tool Analysis</h3>

				<p>
					In <em>Being and Time</em>, Heidegger distinguishes two modes of encountering equipment.
					In <em>Zuhandenheit</em> (ready-to-hand), tools recede into transparent use—the hammer
					disappears when hammering. In <em>Vorhandenheit</em> (present-at-hand), tools become
					objects of contemplation—we notice the hammer when it breaks.
				</p>

				<blockquote class="pl-4 italic my-4 blockquote">
					"The peculiarity of what is proximally ready-to-hand is that, in its readiness-to-hand,
					it must, as it were, withdraw in order to be ready-to-hand quite authentically."
				</blockquote>

				<p>
					A well-functioning harness should exhibit Zuhandenheit: it should recede into the
					background, enabling work without demanding attention. When humans must constantly
					approve, review, or manage the harness, it becomes present-at-hand—an obstacle rather
					than an aid.
				</p>

				<h3 class="mt-6 subsection-heading">Dwelling as Mode of Being</h3>

				<p>
					Heidegger's concept of <em>dwelling</em> extends this analysis. To dwell is not merely
					to reside in a location but to be at home, to care for a place, to let things be what
					they are. Applied to agent orchestration:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>The agent dwells in the codebase</strong>—working within it, caring for it</li>
					<li><strong>The human dwells in oversight</strong>—reviewing progress, redirecting when needed</li>
					<li><strong>The harness enables both dwellings</strong>—without capturing either</li>
				</ul>

				<p class="mt-4">
					The key insight: the harness must not demand the human's dwelling. The human should be
					able to walk away, return when ready, and find coherent progress reports waiting.
				</p>
			</div>
		</section>

		<!-- Section 3: The Gestell Warning -->
		<section class="space-y-6">
			<h2 class="section-heading">III. The Gestell Warning: Automation Without Invasion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Heidegger's later work warns of <em>Gestell</em>—the technological enframing that reduces
					everything to standing-reserve, resources to be optimized. A naive harness implementation
					risks Gestell: automation that fills every gap, leaving no space for human judgment.
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<p class="mb-2 code-primary">// Gestell: Technology as total capture</p>
					<pre class="code-warning">{`while (true) {
  const task = await getNextTask();
  await executeWithoutOversight(task);  // No checkpoint
  await markComplete(task);              // No review
  // Human has no entry point
}`}</pre>
				</div>

				<p class="mt-4">
					The danger is not automation itself but automation that <em>forecloses human agency</em>.
					The harness must create space for human engagement without requiring it. This is
					<em>Gelassenheit</em>—releasement toward things. Neither rejection nor submission;
					full engagement without capture.
				</p>

				<h3 class="mt-6 subsection-heading">Checkpoint as Clearing</h3>

				<p>
					The solution is the <em>checkpoint</em>—a periodic clearing where humans can engage.
					Checkpoints create structured opportunities for oversight without demanding it:
				</p>

				<div class="p-4 mt-4 font-mono code-block-success">
					<p class="mb-2 code-success-heading">// Gelassenheit: Automation with clearing</p>
					<pre class="code-secondary">{`while (!complete && !paused) {
  const task = await selectHighestPriority();
  const result = await runSession(task);

  if (shouldCheckpoint(result)) {
    await createProgressReport();      // Human CAN engage
    await checkForRedirects();         // Human CAN redirect
  }
  // Human agency preserved without ceremony
}`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 4: Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. Architecture: The Autonomous Harness</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The CREATE SOMETHING harness implements these philosophical principles in concrete
					architecture. The design follows the Subtractive Triad:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>DRY</strong>: One system (Beads) for all tracking—no parallel infrastructure</li>
					<li><strong>Rams</strong>: Only essential components—runner, checkpoints, redirects</li>
					<li><strong>Heidegger</strong>: Serves the work, not itself—transparent operation</li>
				</ul>

				<h3 class="mt-6 subsection-heading">Core Components</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{`┌─────────────────────────────────────────────────────────────┐
│                     HARNESS RUNNER                          │
│                                                             │
│   Session 1 ──► Session 2 ──► Session 3 ──► ...            │
│       │             │             │                         │
│       ▼             ▼             ▼                         │
│   Checkpoint    Checkpoint    Checkpoint                    │
└───────┬─────────────┬─────────────┬─────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                BEADS (Human Interface)                      │
│                                                             │
│   bd progress  - Review checkpoints                         │
│   bd update    - Redirect priorities                        │
│   bd create    - Inject urgent work                         │
└─────────────────────────────────────────────────────────────┘`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Everything is a Beads Issue</h3>

				<p>
					The harness uses Beads—CREATE SOMETHING's agent-native issue tracker—for all state.
					No new file formats, no separate databases. The tool recedes:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Concept</th>
								<th class="table-cell">Implementation</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Work items</td>
								<td class="table-cell"><code class="inline-code">issue_type: feature</code></td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Progress reports</td>
								<td class="table-cell"><code class="inline-code">label: checkpoint</code></td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Harness state</td>
								<td class="table-cell"><code class="inline-code">issue_type: epic</code> with <code class="inline-code">label: harness</code></td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Redirects</td>
								<td class="table-cell">Priority changes on existing issues</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 5: The Session Loop -->
		<section class="space-y-6">
			<h2 class="section-heading">V. The Session Loop: Autonomous Execution</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Each harness run follows a predictable loop. The agent spawns Claude Code sessions,
					each primed with context about recent progress, current task, and any redirect notes.
				</p>

				<h3 class="subsection-heading">Session Priming</h3>

				<p>
					Before each session, the harness generates a priming prompt:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`# Harness Session Context

## Current Task
**Issue**: cs-xyz - Implement user dashboard
**Priority**: P1
**Blocked by**: Nothing
**Blocks**: cs-abc (dashboard tests)

## Recent Git Commits
- abc123: Add login endpoint
- def456: Add session management

## Last Checkpoint Summary
Completed auth flow. 8/42 features done.

## Redirect Notes
Human updated cs-ghi from P2 → P0.

## Session Goal
Complete the dashboard layout. Commit if tests pass.`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Session Outcomes</h3>

				<p>
					Each session produces one of four outcomes:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Success</h4>
						<p class="comparison-list">Task completed. Issue marked closed. Git commit created.</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Partial</h4>
						<p class="card-text">Some progress. Issue remains open. Progress noted.</p>
					</div>

					<div class="p-4 comparison-warning">
						<h4 class="mb-2 comparison-heading comparison-warning-heading">Failed</h4>
						<p class="comparison-list">Task could not be completed. Checkpoint triggered.</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Context Overflow</h4>
						<p class="card-text">Session hit context limit. Auto-continues in new session.</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 6: Checkpoints -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Checkpoints: The Human Interface</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Checkpoints are progress reports created as Beads issues. They summarize what happened,
					what's next, and whether human attention is needed.
				</p>

				<h3 class="subsection-heading">Checkpoint Policy</h3>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Trigger</th>
								<th class="table-cell">Default</th>
								<th class="table-cell">Description</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">afterSessions</code></td>
								<td class="table-cell">3</td>
								<td class="table-cell">Checkpoint every N sessions</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">afterHours</code></td>
								<td class="table-cell">4</td>
								<td class="table-cell">Checkpoint every M hours</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">onError</code></td>
								<td class="table-cell">true</td>
								<td class="table-cell">Checkpoint on task failure</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">onConfidenceBelow</code></td>
								<td class="table-cell">0.7</td>
								<td class="table-cell">Pause if confidence drops</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">Checkpoint Content</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-primary">{`═══════════════════════════════════════════════════════════════
  CHECKPOINT #12
  2025-12-18T14:00:00Z
═══════════════════════════════════════════════════════════════

Completed 5 of 6 tasks in this checkpoint period.
1 task(s) failed and may need attention.

Overall progress: 35/42 features.

✓ Completed: cs-a1b2, cs-c3d4, cs-e5f6, cs-g7h8, cs-i9j0
✗ Failed: cs-k1l2
◐ In Progress: cs-m3n4

Confidence: 85%
Git Commit: abc123def
═══════════════════════════════════════════════════════════════`}</pre>
				</div>

				<p class="mt-4">
					Humans review checkpoints when they choose—<code class="inline-code">bd progress</code>.
					The harness doesn't push notifications; it creates artifacts for pull-based review.
				</p>
			</div>
		</section>

		<!-- Section 7: Redirects -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Redirects: Reactive Steering</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness watches Beads for changes between sessions. When humans modify priorities
					or create urgent issues, the harness detects and responds:
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Human Action</th>
								<th class="table-cell">Harness Response</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">bd update cs-xyz --priority P0</code></td>
								<td class="table-cell">Issue jumps to front of queue</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">bd create "Urgent fix" --priority P0</code></td>
								<td class="table-cell">New work added at top priority</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell"><code class="inline-code">bd close cs-abc</code></td>
								<td class="table-cell">Harness stops working on issue</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Create issue with <code class="inline-code">pause</code> label</td>
								<td class="table-cell">Harness pauses for review</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					This is <em>reactive steering</em>: humans don't manage the harness; they redirect it
					when their priorities change. The harness handles the mechanics; humans provide direction.
				</p>

				<h3 class="mt-6 subsection-heading">Redirect Detection</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`async function checkForRedirects(snapshot: IssueSnapshot): Redirect[] {
  const current = await readAllIssues();
  const redirects: Redirect[] = [];

  for (const issue of current) {
    const prev = snapshot.get(issue.id);

    // Detect priority changes
    if (prev && prev.priority !== issue.priority) {
      redirects.push({
        type: 'priority_change',
        issueId: issue.id,
        from: prev.priority,
        to: issue.priority
      });
    }

    // Detect new urgent issues
    if (!prev && issue.priority === 0) {
      redirects.push({
        type: 'urgent_injection',
        issueId: issue.id
      });
    }
  }

  return redirects;
}`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 8: Human Workflow -->
		<section class="space-y-6">
			<h2 class="section-heading">VIII. Human Workflow: Agency Without Ceremony</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness workflow optimizes for human agency without ceremony:
				</p>

				<h3 class="subsection-heading">Starting Work</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`# 1. Write a spec (markdown PRD)
vim specs/my-project.md

# 2. Start the harness
harness start specs/my-project.md

# 3. Walk away—work continues autonomously`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Monitoring Progress</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`# Check progress when ready
bd progress

# Output:
# Harness: cs-harness-xyz (running)
# Sessions: 12 | Features: 8/42 | Failed: 1
#
# Recent Checkpoints:
# - cs-cp-003 (2h ago): Dashboard 60% complete
# - cs-cp-002 (6h ago): Auth flow complete
# - cs-cp-001 (10h ago): Initial scaffolding

# Deep dive into a checkpoint
bd show cs-cp-003`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Redirecting</h3>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`# "I need payments before dashboard"
bd update cs-payments --priority P0

# "Stop working on the old API"
bd close cs-old-api --reason "Deprecated"

# "Add this urgent fix"
bd create "Fix: Login broken on Safari" --priority P0

# Next session automatically picks up the redirect`}</pre>
				</div>

				<p class="mt-4">
					Notice what's missing: no approval dialogs, no status meetings, no context switches.
					The human engages when they choose, using commands they already know.
				</p>
			</div>
		</section>

		<!-- Section 9: Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">IX. Implementation: The CREATE SOMETHING Harness</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness is implemented as a TypeScript package in the CREATE SOMETHING monorepo:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`packages/harness/
├── src/
│   ├── types.ts          # Type definitions
│   ├── spec-parser.ts    # Markdown PRD parsing
│   ├── beads.ts          # Beads CLI integration
│   ├── session.ts        # Claude Code spawning
│   ├── checkpoint.ts     # Progress report generation
│   ├── redirect.ts       # Change detection
│   ├── runner.ts         # Main orchestration loop
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Exports
├── package.json
└── README.md`}</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Spec Parser</h3>

				<p>
					The harness parses markdown PRDs into structured features with dependencies:
				</p>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="mb-2 card-heading">Input: Markdown PRD</h4>
						<pre class="code-secondary code-small">{`## Features

### Authentication
- Login with email/password
- Magic link option
- Session management`}</pre>
					</div>

					<div class="p-4 comparison-success">
						<h4 class="mb-2 comparison-heading comparison-success-heading">Output: Beads Issues</h4>
						<pre class="code-secondary code-small">{`cs-001: Login with email/password
cs-002: Magic link option
  → depends on cs-001
cs-003: Session management
  → depends on cs-001`}</pre>
					</div>
				</div>

				<h3 class="mt-6 subsection-heading">Session Spawning</h3>

				<p>
					Each session spawns a Claude Code process with priming context:
				</p>

				<div class="p-4 mt-4 font-mono code-block">
					<pre class="code-secondary">{`export async function runSession(
  context: PrimingContext,
  options: SessionOptions
): Promise<SessionResult> {
  const primingPrompt = generatePrimingPrompt(context);

  const process = spawn('claude', [
    '--dangerously-skip-permissions',
    '--print', primingPrompt
  ], {
    cwd: options.workDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Monitor for completion, errors, or context overflow
  return monitorSession(process, options);
}`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 10: Evaluation -->
		<section class="space-y-6">
			<h2 class="section-heading">X. Evaluation: Canon Alignment in Practice</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The harness is currently being evaluated on the Canon Alignment spec—a 26-feature
					project to ensure CSS design consistency across all CREATE SOMETHING properties.
				</p>

				<div class="responsive-table-scroll mt-4">
					<table class="w-full table-auto">
						<thead>
							<tr class="table-header">
								<th class="table-cell">Metric</th>
								<th class="table-cell">Value</th>
							</tr>
						</thead>
						<tbody>
							<tr class="table-row">
								<td class="table-cell">Total Features</td>
								<td class="table-cell">26</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Feature Sections</td>
								<td class="table-cell">8</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Dependencies</td>
								<td class="table-cell">18 (intra-section)</td>
							</tr>
							<tr class="table-row">
								<td class="table-cell">Checkpoint Policy</td>
								<td class="table-cell">Every 3 sessions or 4 hours</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p class="mt-4">
					The evaluation tests the harness's ability to:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Parse complex specs with multiple sections</li>
					<li>Create issues with proper dependencies</li>
					<li>Spawn Claude Code sessions with context</li>
					<li>Generate meaningful checkpoints</li>
					<li>Detect and respond to redirects</li>
				</ul>

				<p class="mt-4">
					Results will be published in a follow-up paper once the Canon Alignment run completes.
				</p>
			</div>
		</section>

		<!-- Section 11: Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">XI. Conclusion: The Tool Recedes</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The autonomous harness represents a different philosophy of human-agent collaboration.
					Rather than requiring constant oversight, it creates space for human agency through
					structured checkpoints. Rather than demanding attention, it waits for engagement.
				</p>

				<p>
					This is Heidegger's tool-being applied to orchestration: the harness recedes into
					transparent operation. When it works well, you don't think about it—you review progress
					and redirect when needed.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center italic quote-text">
						"The hammer disappears when hammering. The harness disappears when working."
					</p>
				</div>

				<p class="mt-6">
					The goal is not automation for its own sake but automation that preserves what matters:
					human judgment, human priorities, human agency. The harness handles the mechanics;
					humans provide the direction. This is Gelassenheit—neither rejection nor submission,
					but full engagement without capture.
				</p>

				<p>
					The infrastructure disappears; only the work remains.
				</p>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>
			<ol class="space-y-2 pl-6 list-decimal references-list">
				<li>Heidegger, M. (1927). <em>Being and Time</em>. Trans. Macquarrie & Robinson.</li>
				<li>Heidegger, M. (1954). <em>The Question Concerning Technology</em>.</li>
				<li>Anthropic. (2025). "Building Effective Agents." <a href="https://www.anthropic.com/research/building-effective-agents" class="text-link">anthropic.com/research/building-effective-agents</a></li>
				<li>Anthropic. (2025). "Claude Code Documentation."</li>
				<li>CREATE SOMETHING. (2025). "Beads: Agent-Native Issue Tracking."</li>
				<li>CREATE SOMETHING. (2025). "The Subtractive Triad." <a href="https://createsomething.ltd/principles" class="text-link">createsomething.ltd/principles</a></li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This paper documents the CREATE SOMETHING harness architecture, implemented in
				<code class="inline-code">packages/harness/</code> of the monorepo.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">&larr; All Papers</a>
				<a href="/experiments" class="footer-link">View Experiments &rarr;</a>
			</div>
		</div>
	</div>
</div>

<MarkdownPreviewModal
	bind:open={showMarkdownPreview}
	content={markdownContent}
	title="Paper Markdown"
/>

<style>
	/* Structure: Tailwind | Design: Canon */

	/* Container */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	/* Header */
	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Abstract */
	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	/* Typography */
	.section-heading {
		font-size: var(--text-h2);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	/* Quote Box */
	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.quote-attribution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Blockquote */
	.blockquote {
		border-left: 4px solid var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
	}

	/* Code Blocks */
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-block-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
	}

	.code-primary {
		color: var(--color-fg-primary);
	}

	.code-secondary {
		color: var(--color-fg-secondary);
	}

	.code-warning {
		color: var(--color-warning);
	}

	.code-success {
		color: var(--color-data-2);
	}

	.code-success-heading {
		color: var(--color-success);
	}

	.code-small {
		font-size: var(--text-body-sm);
	}

	.inline-code {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		font-family: monospace;
	}

	/* Comparison Cards */
	.comparison-success {
		background: var(--color-success-muted);
		border: 1px solid var(--color-success-border);
		border-radius: var(--radius-lg);
	}

	.comparison-warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-lg);
	}

	.comparison-heading {
		font-size: var(--text-body-lg);
	}

	.comparison-success-heading {
		color: var(--color-success);
	}

	.comparison-warning-heading {
		color: var(--color-warning);
	}

	.comparison-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Info Cards */
	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-weight: 600;
		color: var(--color-fg-secondary);
	}

	.card-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Tables */
	.table-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-cell {
		padding: 0.75rem 1rem;
		text-align: left;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.table-row {
		border-bottom: 1px solid var(--color-border-default);
	}

	/* References */
	.references-list {
		color: var(--color-fg-tertiary);
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	/* Links */
	.text-link {
		text-decoration: underline;
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.text-link:hover {
		color: var(--color-fg-primary);
	}
