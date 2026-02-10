<script lang="ts">
	/**
	 * From Notion to Substrate: A Live Migration Diary
	 *
	 * A practitioner diary of migrating CREATE SOMETHING's content calendar
	 * to an agent-native data layer — written, tracked, and reviewed
	 * inside the system it describes.
	 *
	 * "The UI becomes the conversation."
	 */

	import { SEO } from '@create-something/canon';

	const dashboardUrl = 'https://substrate.mcp.createsomething.agency/dashboard';
	const mcpUrl = 'https://substrate.mcp.createsomething.agency';
</script>

<SEO
	title="From Notion to Substrate: A Live Migration Diary"
	description="A practitioner diary of migrating our content calendar to an agent-native data layer — written, tracked, and reviewed inside the system it describes."
	keywords="substrate, MCP, agent-native, Cloudflare D1, Notion alternative, content calendar, model context protocol"
	propertyName="space"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.space' },
		{ name: 'Experiments', url: 'https://createsomething.space/experiments' },
		{ name: 'Notion to Substrate', url: 'https://createsomething.space/experiments/notion-to-substrate' }
	]}
/>

<!-- ASCII Art Hero -->
<section class="relative pt-24 pb-8 px-6">
	<div class="max-w-4xl mx-auto">
		<div class="ascii-container overflow-hidden">
			<div class="aspect-[21/9] flex items-center justify-center p-8">
				<pre class="ascii-art leading-[1.3] font-mono select-none">{`
    +-------------------------------------------------+
    |   FROM NOTION TO SUBSTRATE                      |
    |                                                 |
    |   Notion (UI-first)     Substrate (agent-first) |
    |                                                 |
    |   [Kanban] ──►          find_records            |
    |   [Filter] ──►          filters + sorts         |
    |   [Click]  ──►          update_record           |
    |                                                 |
    |   Human opens app       Agent calls tool        |
    |                                                 |
    |   This article is tracked in the system         |
    |   it describes. Record: 0301fb7c                |
    +-------------------------------------------------+
`}</pre>
			</div>
		</div>
	</div>
</section>

<!-- Hero -->
<section class="relative pb-12 px-6">
	<div class="max-w-4xl mx-auto text-center space-y-4">
		<h1 class="hero-title">From Notion to Substrate</h1>
		<p class="hero-subtitle italic">A Live Migration Diary</p>
		<p class="hero-description max-w-2xl mx-auto">
			A practitioner diary of migrating our content calendar to an agent-native data layer —
			written, tracked, and reviewed inside the system it describes.
		</p>
		<div class="flex items-center justify-center gap-4 pt-2">
			<span class="meta-badge">experiment</span>
			<span class="meta-date">February 10, 2026</span>
			<span class="meta-reading">~8 min read</span>
		</div>
	</div>
</section>

<!-- Self-Reference -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto">
		<div class="self-ref-card p-6">
			<p class="body-text leading-relaxed">
				This article is tracked in the system it describes. The record you'd find by calling
				<code class="code-text">find_records</code> on the Content table — with
				<code class="code-text">publish_date: 2026-02-10</code> and
				<code class="code-text">status: published</code> — is this article.
				That's not a gimmick. It's the whole point.
			</p>
		</div>
	</div>
</section>

<!-- The Before -->
<section class="px-6 pb-12">
	<div class="max-w-4xl mx-auto space-y-12">
		<div class="content-card p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="section-title">The Before</h2>
				<span class="label-text">NOTION</span>
			</div>
			<p class="body-text leading-relaxed">
				Our content calendar lived in Notion for over a year. A database view with columns for
				title, status, property (.io, .space, .ltd, .agency), publish date, and author. We had a
				Kanban board for pipeline visualization: Draft → In Progress → Review → Scheduled →
				Published. It worked. Notion is genuinely good at this.
			</p>
			<p class="body-text leading-relaxed">
				Here's what the daily workflow looked like: open Notion, scan the Kanban board, drag a
				card from Draft to In Progress, write in the embedded page, toggle the status dropdown,
				assign a person. The whole loop was visual, manual, and human-mediated. Every interaction
				required a human opening the app and clicking.
			</p>
			<p class="caption-text leading-relaxed">
				That's fine when humans are the primary workers. But our content pipeline changed. Agents
				started drafting pieces, claiming work from task queues, submitting bodies for review. The
				human role shifted from <em>writing in the tool</em> to <em>reviewing what agents wrote</em>.
				Notion became a bottleneck — not because it was slow, but because it was designed for
				humans to operate, and the operators were increasingly not human.
			</p>
		</div>

		<!-- The Migration -->
		<div class="content-card p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="section-title">The Migration</h2>
				<span class="label-text">SCHEMA DESIGN</span>
			</div>
			<p class="body-text leading-relaxed">
				The first design decision was schema. Notion databases have a fixed set of column types:
				text, select, multi-select, date, URL, etc. Substrate's <code class="code-text">define_table</code>
				tool accepts the same vocabulary — <code class="code-text">text</code>,
				<code class="code-text">select</code>, <code class="code-text">multi_select</code>,
				<code class="code-text">date</code>, <code class="code-text">url</code>,
				<code class="code-text">json</code> — because the abstraction is the same. A column is a column.
			</p>

			<div class="schema-block p-4">
				<div class="schema-header">Content Table — 14 columns</div>
				<div class="schema-grid">
					{#each [
						{ name: 'title', type: 'text', note: 'required' },
						{ name: 'status', type: 'select', note: '7 states' },
						{ name: 'type', type: 'select', note: '7 types' },
						{ name: 'property', type: 'select', note: '4 properties' },
						{ name: 'publish_date', type: 'date', note: '' },
						{ name: 'author', type: 'text', note: '' },
						{ name: 'summary', type: 'text', note: '' },
						{ name: 'tags', type: 'multi_select', note: '13 tags' },
						{ name: 'url', type: 'url', note: '' },
						{ name: 'sources', type: 'json', note: 'citations by tier' },
						{ name: 'assigned_agent', type: 'text', note: 'agent-native' },
						{ name: 'claimed_at', type: 'datetime', note: 'agent-native' },
						{ name: 'body', type: 'text', note: 'agent-native' },
						{ name: 'review_notes', type: 'text', note: '' }
					] as col}
						<div class="schema-row" class:agent-native={col.note === 'agent-native'}>
							<span class="schema-name">{col.name}</span>
							<span class="schema-type">{col.type}</span>
							{#if col.note}
								<span class="schema-note">{col.note}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<p class="caption-text leading-relaxed">
				Three of those columns — <strong class="emphasis-text">assigned_agent</strong>,
				<strong class="emphasis-text">claimed_at</strong>,
				<strong class="emphasis-text">body</strong> — don't exist in our old Notion database.
				They're agent-native fields: who claimed the work, when, and what they wrote. In Notion,
				agents couldn't claim work. In Substrate, claiming is a tool call.
			</p>

			<p class="body-text leading-relaxed">
				The second design decision was supporting tables. Notion had related databases for series
				and topics. Substrate has the same: <strong class="emphasis-text">Series</strong> for
				recurring publication tracks, <strong class="emphasis-text">Topics</strong> for taxonomy
				that spans properties. Bidirectional relations link content to series and topics, same as
				Notion's relation columns. The difference: agents can <code class="code-text">create_relation</code>
				and <code class="code-text">find_records</code> across these links in a single tool call,
				without navigating a UI.
			</p>

			<p class="body-text leading-relaxed">
				The third decision was what <em>not</em> to migrate. We didn't bring over archived
				content, comment threads, or Notion-specific integrations. Substrate doesn't try to
				replicate Notion's feature surface. It provides the data layer and lets the agent
				conversation be the interface.
			</p>
		</div>

		<!-- The After -->
		<div class="content-card p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="section-title">The After</h2>
				<span class="label-text">AGENT WORKFLOW</span>
			</div>
			<p class="body-text leading-relaxed">
				The daily workflow now: an agent calls <code class="code-text">list_workspaces</code> and
				gets back the full schema — every table, every column, every option value. No guessing, no
				hallucinating column names. The response is structured JSON, not a screenshot of a Kanban board.
			</p>

			<div class="code-block p-4">
				<div class="code-header">Finding this week's content</div>
				<pre class="code-content"><code>find_records:
  workspace_name: "CREATE SOMETHING Content"
  table_name: "Content"
  filters:
    - column: "status"
      operator: "in"
      value: ["draft", "claimed", "in_progress"]
  sorts:
    - column: "publish_date"
      direction: "asc"</code></pre>
			</div>

			<p class="body-text leading-relaxed">
				One call. Filtered, sorted, paginated. The agent gets back records with all fields, sees
				what needs writing, and can claim a piece by calling <code class="code-text">update_record</code>
				to set <code class="code-text">assigned_agent</code> and
				<code class="code-text">status: claimed</code>.
			</p>

			<p class="body-text leading-relaxed">
				When the agent finishes writing, it calls <code class="code-text">update_record</code>
				again to set the <code class="code-text">body</code> field and advance the status to
				<code class="code-text">in_review</code>. The audit log captures every mutation — who
				changed what, when, with before/after snapshots. That's the trust layer.
			</p>

			<p class="body-text leading-relaxed">
				The human review happens in two places: the conversation (an agent summarizes what it wrote
				and asks for feedback) and the
				<a href={dashboardUrl} target="_blank" rel="noopener noreferrer" class="link-text">dashboard</a>.
				The dashboard is a read-only HTML view — no login, no editing, just a pipeline visualization
				with status badges, an 8-day timeline showing gaps, and an activity feed. It auto-refreshes
				every 60 seconds.
			</p>

			<div class="insight-card p-4">
				<p class="caption-text">
					The dashboard exists because trust requires visibility. Agents manage the data; the
					dashboard lets humans verify it. <strong class="emphasis-text">The UI is optional, but
					the data is real.</strong>
				</p>
			</div>
		</div>

		<!-- Trade-offs -->
		<div class="content-card p-6 space-y-6">
			<h2 class="section-title">The Trade-offs</h2>

			<div class="grid md:grid-cols-2 gap-6">
				<!-- Notion Wins -->
				<div class="tradeoff-block p-4 space-y-3">
					<h3 class="tradeoff-title">What Notion does better</h3>
					{#each [
						{ label: 'Bulk entry', detail: 'Typing five rows into a table view takes 30 seconds. In Substrate, that\'s five add_record calls or one bulk_create_records.' },
						{ label: 'Visual Kanban', detail: 'Dragging a card from "Draft" to "In Progress" is instant spatial reasoning. The dashboard is read-only — no drag-and-drop.' },
						{ label: 'Real-time collaboration', detail: 'Two humans editing the same page simultaneously. Substrate has optimistic locking — conflict detection, not collaborative editing.' },
						{ label: 'Low barrier', detail: 'Anyone can use Notion. Substrate requires an MCP client or API knowledge.' }
					] as item}
						<div class="tradeoff-item">
							<span class="tradeoff-label">{item.label}</span>
							<p class="tradeoff-detail">{item.detail}</p>
						</div>
					{/each}
				</div>

				<!-- Substrate Wins -->
				<div class="tradeoff-block tradeoff-wins p-4 space-y-3">
					<h3 class="tradeoff-title">What Substrate does better</h3>
					{#each [
						{ label: 'Agent-first queries', detail: 'No human opens a database UI. The agent calls find_records, gets structured JSON, reasons over it, and acts.' },
						{ label: 'Full audit trail', detail: 'Every create, update, archive, and restore is logged with actor, timestamp, and change diff. Queryable, not buried in page history.' },
						{ label: 'Role-based prompts', detail: 'Four MCP prompts: workspace_setup, data_modeling, role_perspective, data_audit. Different agents see the same data through different lenses.' },
						{ label: 'Edge-deployed', detail: 'D1 at the edge, Workers with Durable Objects. Latency in milliseconds, not the seconds Notion\'s API takes.' },
						{ label: 'Trust boundaries', detail: 'Access tokens with role-based scoping, sensitive field redaction, a separate Reader endpoint with only 4 tools.' }
					] as item}
						<div class="tradeoff-item">
							<span class="tradeoff-label">{item.label}</span>
							<p class="tradeoff-detail">{item.detail}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- What This Sets Up -->
		<div class="content-card p-6 space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="section-title">What This Sets Up</h2>
				<span class="label-text">SERIES</span>
			</div>
			<p class="body-text leading-relaxed">
				This migration diary is the first in a five-part series running through February 17th:
			</p>

			<div class="series-list space-y-2">
				{#each [
					{ date: 'Feb 10', title: 'From Notion to Substrate', note: 'You are here', active: true },
					{ date: 'Feb 12', title: 'MCP Apps + Substrate', note: 'When the data layer gets a UI', active: false },
					{ date: 'Feb 14', title: 'We Reduced MCP Tool Tokens by 60%', note: 'Token optimization lessons', active: false },
					{ date: 'Feb 15', title: 'Substrate: The Agent-Native Data Layer', note: 'Architecture deep-dive', active: false },
					{ date: 'Feb 17', title: 'The Hermeneutic Circle Closes at the Agent', note: 'Philosophical grounding', active: false }
				] as item}
					<div class="series-item" class:series-active={item.active}>
						<span class="series-date">{item.date}</span>
						<span class="series-title">{item.title}</span>
						<span class="series-note">{item.note}</span>
					</div>
				{/each}
			</div>

			<p class="caption-text leading-relaxed pt-4">
				The Notion database served us well. But when the primary operators of your data layer
				become agents, the interface should speak their language. That language is MCP.
			</p>
		</div>

		<!-- Provenance -->
		<div class="provenance p-4">
			<p class="caption-text text-center">
				This article was written by an agent, tracked in
				<a href={mcpUrl} target="_blank" rel="noopener noreferrer" class="link-text">Substrate</a>,
				and reviewed by a human. Record ID: <code class="code-text">0301fb7c</code>. Verify it at the
				<a href={dashboardUrl} target="_blank" rel="noopener noreferrer" class="link-text">dashboard</a>.
			</p>
		</div>

		<!-- Navigation -->
		<div class="flex flex-wrap gap-4 justify-center">
			<a
				href={dashboardUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="cta-button px-6 py-3 font-medium transition-colors"
			>
				View Dashboard
			</a>
			<a
				href="/experiments"
				class="secondary-button px-6 py-3 font-medium transition-colors"
			>
				All Experiments
			</a>
		</div>
	</div>
</section>

<style>
	.ascii-container {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.ascii-art {
		color: var(--color-fg-secondary);
		font-size: clamp(0.55rem, 1.4vw, 0.8rem);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.hero-description {
		color: var(--color-fg-muted);
	}

	.meta-badge {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-hover);
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border-default);
	}

	.meta-date, .meta-reading {
		font-size: var(--text-caption);
		color: var(--color-fg-subtle);
	}

	.self-ref-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-emphasis);
		border-left: 3px solid var(--color-fg-secondary);
		border-radius: var(--radius-lg);
	}

	.content-card {
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
	}

	.section-title {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.label-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		letter-spacing: 0.05em;
	}

	.body-text {
		color: var(--color-fg-tertiary);
	}

	.caption-text {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.emphasis-text {
		color: var(--color-fg-primary);
	}

	.code-text {
		font-family: monospace;
		font-size: 0.875em;
		color: var(--color-fg-secondary);
		background: var(--color-bg-pure);
		padding: 0.1em 0.3em;
		border-radius: 3px;
	}

	.link-text {
		color: var(--color-fg-secondary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.link-text:hover {
		color: var(--color-fg-primary);
	}

	.insight-card {
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
		border-left: 2px solid var(--color-fg-muted);
	}

	/* Schema Block */
	.schema-block {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.schema-header {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.schema-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.25rem;
	}

	.schema-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-body-sm);
	}

	.schema-row.agent-native {
		background: var(--color-hover);
	}

	.schema-name {
		font-family: monospace;
		color: var(--color-fg-primary);
		font-size: 0.8rem;
	}

	.schema-type {
		color: var(--color-fg-muted);
		font-size: var(--text-caption);
	}

	.schema-note {
		color: var(--color-fg-subtle);
		font-size: var(--text-caption);
		font-style: italic;
	}

	/* Code Block */
	.code-block {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.code-header {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-bottom: 0.5rem;
		letter-spacing: 0.03em;
	}

	.code-content {
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--color-fg-secondary);
		overflow-x: auto;
	}

	/* Trade-offs */
	.tradeoff-block {
		background: var(--color-bg-pure);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.tradeoff-wins {
		border-color: var(--color-border-emphasis);
	}

	.tradeoff-title {
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-fg-primary);
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border-default);
	}

	.tradeoff-item {
		padding-top: 0.5rem;
	}

	.tradeoff-label {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-primary);
	}

	.tradeoff-detail {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-top: 0.125rem;
		line-height: 1.4;
	}

	/* Series */
	.series-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-bg-pure);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
	}

	.series-active {
		border: 1px solid var(--color-border-emphasis);
	}

	.series-date {
		color: var(--color-fg-muted);
		min-width: 3.5rem;
		font-family: monospace;
		font-size: var(--text-caption);
	}

	.series-title {
		color: var(--color-fg-primary);
		font-weight: 500;
		flex: 1;
	}

	.series-note {
		color: var(--color-fg-subtle);
		font-size: var(--text-caption);
		font-style: italic;
	}

	/* Provenance */
	.provenance {
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
	}

	/* Buttons */
	.cta-button {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-md);
	}

	.cta-button:hover {
		opacity: 0.9;
	}

	.secondary-button {
		border: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
		border-radius: var(--radius-md);
	}

	.secondary-button:hover {
		background: var(--color-active);
	}
</style>
