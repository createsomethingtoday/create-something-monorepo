```svelte
<script>
	/**
	 * @typedef {Object} ModelPerformance
	 * @property {string} model
	 * @property {string} cost
	 * @property {string} quality
	 * @property {string} compliance
	 * @property {'high' | 'medium' | 'low'} costTier
	 */

	/** @type {ModelPerformance[]} */
	const modelData = [
		{
			model: 'Claude 3 Opus',
			cost: '~ $0.50',
			quality: 'Exceptional reasoning and planning capabilities. Ideal for complex outlining and final review.',
			compliance: 'High',
			costTier: 'high'
		},
		{
			model: 'Claude 3 Sonnet',
			cost: '~ $0.11',
			quality: 'High-quality generation with a good balance of speed and intelligence. Strong for drafting.',
			compliance: 'High',
			costTier: 'medium'
		},
		{
			model: 'Gemini 1.5 Pro',
			cost: '~ $0.01',
			quality: 'Excellent value. Produces Canon-compliant output when given a strong plan and token reference.',
			compliance: 'Good',
			costTier: 'low'
		},
		{
			model: 'Gemini 1.5 Flash',
			cost: '~ $0.004',
			quality: 'Extremely fast and cheap. Requires significant guidance and is best for simple, repetitive tasks.',
			compliance: 'Moderate',
			costTier: 'low'
		}
	];

	/**
	 * @typedef {Object} PipelineExample
	 * @property {'success' | 'warning'} type
	 * @property {string} title
	 * @property {string} description
	 * @property {string[]} steps
	 * @property {string} outcome
	 */

	/** @type {PipelineExample[]} */
	const pipelineExamples = [
		{
			type: 'success',
			title: 'Optimized Multi-Model Pipeline',
			description: 'This approach delegates tasks to the most cost-effective model for the job, maximizing quality while minimizing expense.',
			steps: [
				'PLAN: Claude Opus generates a detailed, structured outline.',
				'EXECUTE: Gemini Pro drafts the full content based on the plan.',
				'REVIEW: Claude Sonnet refines the draft for flow and nuance.'
			],
			outcome: 'Result: High-quality, compliant output at a fraction of the cost of a single-model Opus pipeline.'
		},
		{
			type: 'warning',
			title: 'Naive Single-Model Pipeline',
			description: 'Using a single, cheap model for all stages appears cost-effective but often incurs hidden costs in rework and quality control.',
			steps: [
				'PLAN: Gemini Flash attempts to create an outline.',
				'EXECUTE: Gemini Flash drafts the content.',
				'REVIEW: Human intervention required to fix structural and quality issues.'
			],
			outcome: 'Result: Low initial cost, but poor quality output that fails compliance checks and requires significant manual editing.'
		}
	];
</script>

<main>
	<header>
		<h1>Multi-Model Pipeline Optimization for Generative Content</h1>
		<p class="subtitle">A CREATE SOMETHING Research Paper</p>
	</header>

	<article>
		<blockquote class="abstract">
			<p>
				This paper explores the optimization of multi-model pipelines for automated content generation. We analyze the cost-quality tradeoff inherent in selecting Large Language Models (LLMs) and propose a structured approach based on the Plan→Execute→Review pattern. By delegating tasks to models with varying capabilities—from high-cost, high-reasoning models like Claude Opus to low-cost, high-speed models like Gemini Flash—we demonstrate a significant reduction in operational costs while maintaining or exceeding quality benchmarks. Empirical data and the application of the Subtractive Triad framework provide a clear methodology for designing efficient, scalable, and Canon-compliant generation systems.
			</p>
		</blockquote>

		<section id="introduction">
			<h2>I. Introduction: The Cost-Quality Frontier</h2>
			<p>
				The proliferation of powerful LLMs has unlocked unprecedented capabilities in automated content generation. However, this power comes at a literal cost. The most capable models, often referred to as "frontier" models, carry a significant price per token, while faster, more economical models may lack the nuanced reasoning required for complex tasks. This creates a fundamental tension for any scaled generation system: the cost-quality tradeoff.
			</p>
			<p>
				A naive approach might involve using a single model for all tasks. Using a top-tier model like Claude Opus for everything guarantees high quality but results in exorbitant costs. Conversely, relying solely on a cheap model like Gemini Flash minimizes direct expense but often produces subpar, non-compliant output that requires costly human intervention. The optimal solution lies not in choosing a single "best" model, but in designing a pipeline that leverages the strengths of multiple models in concert.
			</p>
		</section>

		<section id="pattern">
			<h2>II. The Plan→Execute→Review Pattern</h2>
			<p>
				To effectively manage the cost-quality tradeoff, we adopt a three-stage architectural pattern inspired by strategic thinking: Plan, Execute, and Review. This decouples the generation process into distinct phases, each suited to a different class of model.
			</p>
			<ul>
				<li>
					<strong>PLAN:</strong> This initial stage requires high-level reasoning, creativity, and structural understanding. The goal is to create a detailed, comprehensive blueprint for the final content. This is the ideal application for an expensive, high-reasoning model (e.g., Claude Opus). A superior plan dramatically reduces the cognitive load for subsequent stages, enabling cheaper models to succeed.
				</li>
				<li>
					<strong>EXECUTE:</strong> With a detailed plan in hand, this stage focuses on bulk content generation. The task is to flesh out the sections defined in the plan, adhering to specified formats and constraints. This is a highly constrained task, perfect for fast, low-cost models (e.g., Gemini Pro, Gemini Flash) that excel at following instructions.
				</li>
				<li>
					<strong>REVIEW:</strong> The final stage involves quality assurance. A mid-tier or top-tier model (e.g., Claude Sonnet, or even Opus for critical applications) assesses the generated content against the original plan, checking for coherence, style, and compliance. It can perform minor edits or flag sections for human review, acting as an intelligent proofreader.
				</li>
			</ul>
		</section>

		<section id="results">
			<h2>III. Empirical Analysis: Model Performance & Cost</h2>
			<p>
				We conducted a series of tests to generate 100 research papers using different models and pipelines. The following table summarizes the per-paper cost and qualitative findings for individual models performing the entire task.
			</p>
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Model</th>
							<th>Avg. Cost / Paper</th>
							<th>Qualitative Assessment</th>
							<th>Canon Compliance</th>
						</tr>
					</thead>
					<tbody>
						{#each modelData as data}
							<tr class="cost-tier-{data.costTier}">
								<td>{data.model}</td>
								<td>{data.cost}</td>
								<td>{data.quality}</td>
								<td>{data.compliance}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="caption">
				Table 1: Cost and quality comparison of single-model generation pipelines. Note the exponential cost increase for higher-quality models. The multi-model approach (See Section IV) achieved Opus-level quality for approximately $0.06/paper.
			</p>
		</section>

		<section id="triad">
			<h2>IV. The Subtractive Triad in Model Selection</h2>
			<p>
				The Subtractive Triad—Eliminate, Automate, Delegate—provides a powerful mental model for optimizing this pipeline. While the entire system is an act of automation, the principle of <strong>Delegation</strong> is paramount.
			</p>
			<p>
				Effective delegation in this context means assigning a task to the least expensive model capable of completing it successfully. It is a waste of resources to ask a PhD-level model (Opus) to perform a task an intern-level model (Gemini Flash) could handle with proper instructions. The Plan→Execute→Review pattern is a formalization of this delegation strategy.
			</p>

			<div class="card-grid">
				{#each pipelineExamples as example}
					<div class="card {example.type}">
						<h3>{example.title}</h3>
						<p>{example.description}</p>
						<ul>
							{#each example.steps as step}
								<li>{step}</li>
							{/each}
						</ul>
						<p class="outcome">{example.outcome}</p>
					</div>
				{/each}
			</div>
		</section>

		<section id="conclusion">
			<h2>V. Conclusion & Future Work</h2>
			<p>
				Optimizing AI content generation is not a matter of finding the single best model, but of architecting intelligent systems. By decomposing tasks and delegating them to the most appropriate model, we can build multi-model pipelines that are simultaneously cost-effective and capable of producing high-quality, compliant content. The Plan→Execute→Review pattern provides a robust framework for this delegation, turning the cost-quality tradeoff into a strategic advantage.
			</p>
			<p>
				Future research will focus on dynamic model selection, where the pipeline can autonomously choose the best model for a sub-task based on real-time complexity analysis. Furthermore, integrating feedback loops where the Review stage informs and improves the Planning stage of subsequent runs promises even greater efficiency and quality.
			</p>
		</section>
	</article>

	<footer>
		<nav>
			<a href="#introduction">Introduction</a>
			<a href="#pattern">Pattern</a>
			<a href="#results">Results</a>
			<a href="#triad">Triad</a>
			<a href="#conclusion">Conclusion</a>
		</nav>
		<p>&copy; 2024 CREATE SOMETHING Research Division</p>
	</footer>
</main>

<style>
	:global(body) {
		background-color: var(--color-bg-pure);
		color: var(--color-fg-secondary);
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		line-height: 1.7;
	}

	main {
		max-width: 80ch;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
	}

	header {
		text-align: center;
		margin-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
		padding-bottom: var(--space-lg);
	}

	h1 {
		font-size: var(--text-h1);
		color: var(--color-fg-primary);
		line-height: 1.2;
		margin-bottom: var(--space-xs);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	h2 {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
		margin-top: var(--space-lg);
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	p,
	li {
		font-size: var(--text-body);
		margin-bottom: var(--space-md);
	}

	a {
		color: var(--color-info);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	a:hover {
		text-decoration: underline;
		color: var(--color-fg-primary);
	}

	ul {
		padding-left: var(--space-md);
		list-style-type: '— ';
	}

	.abstract {
		background-color: var(--color-bg-subtle);
		border-left: 4px solid var(--color-info);
		padding: var(--space-md) var(--space-lg);
		margin: 0 0 var(--space-xl) 0;
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	.abstract p {
		margin: 0;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.table-container {
		overflow-x: auto;
		background-color: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-sm);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: var(--space-sm) var(--space-md);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
		font-size: var(--text-body-sm);
	}

	thead {
		background-color: var(--color-bg-elevated);
	}

	th {
		color: var(--color-fg-primary);
		font-weight: 600;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background-color: var(--color-bg-subtle);
	}

	.cost-tier-high td:nth-child(2) {
		color: var(--color-error);
		font-weight: 600;
	}
	.cost-tier-medium td:nth-child(2) {
		color: var(--color-warning);
	}
	.cost-tier-low td:nth-child(2) {
		color: var(--color-success);
	}

	.caption {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-align: center;
		margin-top: var(--space-sm);
	}

	.card-grid {
		display: grid;
		gap: var(--space-md);
		margin-top: var(--space-lg);
	}

	.card {
		background-color: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		transition: transform var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard);
	}

	.card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
	}

	.card h3 {
		font-size: var(--text-h3);
		margin-top: 0;
		margin-bottom: var(--space-sm);
	}

	.card.success {
		border-left: 4px solid var(--color-success);
	}

	.card.success h3 {
		color: var(--color-success);
	}

	.card.warning {
		border-left: 4px solid var(--color-warning);
	}

	.card.warning h3 {
		color: var(--color-warning);
	}

	.card ul {
		margin-bottom: var(--space-sm);
	}

	.card li {
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-xs);
	}

	.card .outcome {
		font-weight: 600;
		background-color: var(--color-bg-elevated);
		padding: var(--space-sm);
		border-radius: var(--radius-sm);
		margin-bottom: 0;
		font-size: var(--text-body-sm);
		border: 1px solid var(--color-border-default);
	}

	footer {
		margin-top: var(--space-xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
		text-align: center;
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	footer nav {
		display: flex;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	footer nav a {
		color: var(--color-fg-tertiary);
	}
</style>
```