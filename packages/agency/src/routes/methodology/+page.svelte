<script lang="ts">
  // Footer is provided by layout
</script>

<svelte:head>
  <title>Research Methodology | CREATE SOMETHING</title>
  <meta name="description" content="How CREATE SOMETHING produces credible knowledge about AI-native development through rigorous experiment tracking, real-time logging, and reproducible results." />
  <meta name="keywords" content="research methodology, experiment tracking, AI-native development, reproducible research, scientific method, Claude Code, systems thinking" />

  <!-- Open Graph -->
  <meta property="og:title" content="Research Methodology | CREATE SOMETHING" />
  <meta property="og:description" content="The systematic approach that transforms blog posts into experiments—real-time tracking, precise costs, honest results." />
  <meta property="og:url" content="https://createsomething.io/methodology" />

  <!-- Twitter -->
  <meta name="twitter:title" content="Research Methodology | CREATE SOMETHING" />
  <meta name="twitter:description" content="How we transform AI development from 'prompting and hoping' into systematic evaluation with reproducible results." />

  <link rel="canonical" href="https://createsomething.io/methodology" />
</svelte:head>

<!-- Hero Section -->
  <section class="section-hero relative px-6">
    <div class="max-w-4xl mx-auto">
      <div class="content-stack animate-reveal">
        <h1 class="hero-title font-bold section-heading-sm">
          Research Methodology
        </h1>

        <p class="heading-3 body-xl leading-relaxed">
          What makes CREATE SOMETHING different from AI blogs: we don't just document results—we document the <strong>process</strong> of building with AI agents.
        </p>

        <p class="body-lg body-secondary leading-relaxed">
          Every experiment is tracked with automated logging, real costs from APIs, precise time measurements, and intervention documentation. This transforms anecdotes into reproducible experiments.
        </p>
      </div>
    </div>
  </section>

  <!-- The Process Visual -->
  <section class="section-content px-6 section-border">
    <div class="max-w-6xl mx-auto">
      <div>
        <h2 class="heading-2 font-bold section-heading text-center">
          How We Work
        </h2>

        <!-- Pipeline Visual -->
        <div class="grid grid-cols-1 md:grid-cols-4 cards-grid section-heading">
          {#each [
            {
              step: '1. Build',
              title: 'Claude Code',
              description: 'Work with AI agents as development partners',
              icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'
            },
            {
              step: '2. Track',
              title: 'Auto-Log',
              description: 'Hooks capture every prompt, error, intervention',
              icon: 'M22 12h-4l-3 9L9 3l-3 9H2'
            },
            {
              step: '3. Analyze',
              title: 'Real Data',
              description: 'Actual costs, time, errors from APIs',
              icon: 'M22 7l-8.5 8.5-5-5L1 18'
            },
            {
              step: '4. Publish',
              title: 'Honest Results',
              description: "What worked, what didn't, and why",
              icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM4 2v20M20 8h-6V2'
            }
          ] as item, index}
            <div
              class="relative p-6 bg-elevated card-border rounded animate-reveal"
              style="--delay: {index + 1}"
            >
              <div class="mb-4 body-secondary">
                <svg class="w-10 h-10" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d={item.icon} stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="body-sm body-muted mb-2">{item.step}</div>
              <h3 class="heading-3 font-semibold mb-2">
                {item.title}
              </h3>
              <p class="body-tertiary body-sm">
                {item.description}
              </p>

              <!-- Arrow -->
              {#if index < 3}
                <div class="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2/20">
                  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="text-center">
          <p class="heading-3 body-secondary font-medium">
            This is research, not blogging.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- What We Track -->
  <section class="section-content px-6 section-border">
    <div class="max-w-4xl mx-auto">
      <div class="content-stack">
        <h2 class="heading-2 font-bold section-heading-sm">
          Every Experiment Tracked With
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 cards-grid">
          {#each [
            {
              metric: 'Prompts',
              description: 'Real-time logging via Claude Code hooks',
              example: '47 iterations logged'
            },
            {
              metric: 'Errors',
              description: 'Precise counts & resolution times',
              example: '23 errors, avg fix: 8 min'
            },
            {
              metric: 'Costs',
              description: 'Token usage + infrastructure from APIs',
              example: '$18.50 Claude + $8.30 Cloudflare'
            },
            {
              metric: 'Interventions',
              description: 'When AI needed human help, and why',
              example: '12 manual fixes documented'
            },
            {
              metric: 'Time',
              description: 'Session duration, not guesswork',
              example: '26 hours actual vs 120 estimated'
            },
            {
              metric: 'Architecture',
              description: 'Decisions made, alternatives considered',
              example: 'Workflows over Workers (why)'
            }
          ] as item, index}
            <div
              class="p-6 bg-elevated card-border rounded animate-reveal"
              style="--delay: {index + 1}"
            >
              <h3 class="heading-3 font-semibold mb-2">
                {item.metric}
              </h3>
              <p class="body-tertiary body-sm mb-3">
                {item.description}
              </p>
              <code class="body-xs body-muted bg-surface px-2 py-1 rounded">
                {item.example}
              </code>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Three Tracking Modes -->
  <section class="section-content px-6 section-border">
    <div class="max-w-4xl mx-auto">
      <div class="content-stack">
        <h2 class="heading-2 font-bold section-heading-sm">
          Three Tracking Modes
        </h2>

        <div class="cards-stack">
          {#each [
            {
              mode: 'Real-Time Tracking',
              tag: 'Ideal',
              description: 'Start tracking from day one. Get complete data on every iteration, error, and decision.',
              dataQuality: 'High confidence, precise metrics',
              useCase: 'New experiments starting from scratch'
            },
            {
              mode: 'Mid-Flight Tracking',
              tag: 'Practical',
              description: 'Start tracking on an in-progress project. Combine real-time data with git history reconstruction.',
              dataQuality: 'Mixed: estimates for past work, precise for future',
              useCase: 'Active projects you realize are experiment-worthy'
            },
            {
              mode: 'Retroactive Documentation',
              tag: 'Still Valuable',
              description: 'Document already-deployed projects. Reconstruct from git, APIs, and memory.',
              dataQuality: 'Lower confidence, acknowledged limitations',
              useCase: 'Completed projects with production data'
            }
          ] as item, index}
            <div
              class="p-6 bg-elevated card-border rounded animate-reveal"
              style="--delay: {index + 1}"
            >
              <div class="flex items-start justify-between mb-3">
                <h3 class="heading-3 font-semibold">
                  {item.mode}
                </h3>
                <span class="body-xs px-2 py-1 bg-subtle body-tertiary rounded">
                  {item.tag}
                </span>
              </div>
              <p class="body-secondary mb-4">
                {item.description}
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 body-sm">
                <div>
                  <span class="body-muted">Data Quality:</span>
                  <p class="body-tertiary">{item.dataQuality}</p>
                </div>
                <div>
                  <span class="body-muted">Use Case:</span>
                  <p class="body-tertiary">{item.useCase}</p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Why This Matters -->
  <section class="section-content px-6 section-border">
    <div class="max-w-4xl mx-auto">
      <div class="content-stack">
        <h2 class="heading-2 font-bold section-heading-sm">
          Why This Matters
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 content-gap">
          <div class="space-y-4">
            <h3 class="heading-3 font-semibold">
              Without Tracking
            </h3>
            <ul class="space-y-3 body-tertiary">
              {#each [
                '"I built X with AI" (anecdote)',
                'No reproducibility',
                "Can't verify claims",
                'Just another AI blog'
              ] as item}
                <li class="flex items-start gap-3">
                  <svg class="w-5 h-5 body-muted flex-shrink-0 mt-0.5" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
          </div>

          <div class="space-y-4">
            <h3 class="heading-3 font-semibold">
              With Tracking
            </h3>
            <ul class="space-y-3 body-tertiary">
              {#each [
                '"I built X: 26 hrs, $27, 78% savings" (data)',
                'Others can replicate experiments',
                'Transparent methodology',
                'Scientific research platform'
              ] as item}
                <li class="flex items-start gap-3">
                  <svg class="w-5 h-5 body-muted flex-shrink-0 mt-0.5" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>

        <div class="p-6 bg-surface card-border rounded callout-margin">
          <p class="body-lg body-secondary leading-relaxed">
            The tracking methodology transforms "prompting and hoping" into <strong>systematic evaluation with reproducible results</strong>. This is what separates research from blogging.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- For Researchers -->
  <section class="section-content px-6 section-border">
    <div class="max-w-4xl mx-auto">
      <div class="content-stack">
        <h2 class="heading-2 font-bold section-heading-sm">
          For Researchers: Use This Methodology
        </h2>

        <p class="body-lg body-secondary leading-relaxed">
          Want to adopt this approach for your own AI-native development research? The experiment tracking system is available as a Claude Code Skill.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 cards-grid">
          {#each [
            {
              step: '1',
              title: 'Install the Skill',
              description: 'Add experiment tracking to your Claude Code setup'
            },
            {
              step: '2',
              title: 'Build & Track',
              description: 'Work with Claude Code while automatic logging captures everything'
            },
            {
              step: '3',
              title: 'Generate Papers',
              description: 'Transform tracked data into reproducible research'
            }
          ] as item, index}
            <div
              class="p-6 bg-elevated card-border rounded text-center animate-reveal"
              style="--delay: {index + 1}"
            >
              <div class="heading-2 font-bold/20 mb-3">{item.step}</div>
              <h3 class="body-lg font-semibold mb-2">
                {item.title}
              </h3>
              <p class="body-tertiary body-sm">
                {item.description}
              </p>
            </div>
          {/each}
        </div>

        <div class="flex flex-col sm:flex-row justify-center cta-group">
          <a
            href="https://github.com/createsomethingtoday/create-something-experiments"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 cta-button-primary"
          >
            <span>View on GitHub</span>
            <svg class="w-4 h-4" stroke-width="2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>

          <a
            href="/experiments/zoom-transcript-automation-experiment"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 cta-button"
          >
            <span>See Example Experiment</span>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Example from Experiment #1 -->
  <section class="section-content px-6 section-border">
    <div class="max-w-4xl mx-auto">
      <div class="content-stack">
        <h2 class="heading-2 font-bold section-heading-sm">
          Methodology in Action
        </h2>

        <p class="body-lg body-secondary leading-relaxed">
          Example from <a href="/experiments/zoom-transcript-automation-experiment" class="hover:underline">Experiment #1: Zoom Transcript Automation</a>
        </p>

        <div class="p-6 bg-elevated card-border rounded">
          <div class="space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div class="p-4 bg-surface rounded">
                <div class="heading-2 font-bold">26</div>
                <div class="body-xs body-muted">Hours</div>
              </div>
              <div class="p-4 bg-surface rounded">
                <div class="heading-2 font-bold">47</div>
                <div class="body-xs body-muted">Errors</div>
              </div>
              <div class="p-4 bg-surface rounded">
                <div class="heading-2 font-bold">12</div>
                <div class="body-xs body-muted">Interventions</div>
              </div>
              <div class="p-4 bg-surface rounded">
                <div class="heading-2 font-bold">78%</div>
                <div class="body-xs body-muted">Time Savings</div>
              </div>
            </div>

            <div class="pt-4 section-border">
              <p class="body-sm body-tertiary">
                <strong class="strong-text">Data sources:</strong> Real-time prompt logging via hooks, Claude Code Analytics API, Cloudflare billing API, git commit history
              </p>
            </div>

            <div class="pt-2">
              <p class="body-sm body-tertiary">
                <strong class="strong-text">Reproducibility:</strong> Starting prompt, tracking logs, and architecture decisions documented
              </p>
            </div>
          </div>
        </div>

        <div class="text-center">
          <a
            href="/experiments/zoom-transcript-automation-experiment"
            class="inline-flex items-center gap-2 hover:underline"
          >
            Read the full experiment
            <svg class="w-4 h-4" stroke-width="2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    

<style>
	/* Golden Ratio Spacing (φ = 1.618) */
	.section-hero {
		padding-top: var(--space-2xl);  /* φ⁴ = 6.854rem */
		padding-bottom: var(--space-xl); /* φ³ = 4.236rem */
	}

	.section-content {
		padding-top: var(--space-xl);    /* φ³ = 4.236rem */
		padding-bottom: var(--space-xl);
	}

	.section-heading {
		margin-bottom: var(--space-lg);  /* φ² = 2.618rem */
	}

	.section-heading-sm {
		margin-bottom: var(--space-md);  /* φ = 1.618rem */
	}

	.content-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);            /* φ² = 2.618rem */
	}

	.cards-grid {
		gap: var(--space-md);            /* φ = 1.618rem */
	}

	.cards-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);            /* φ = 1.618rem */
	}

	.content-gap {
		gap: var(--space-lg);            /* φ² = 2.618rem */
	}

	.cta-group {
		gap: var(--space-sm);            /* 1rem base */
		margin-top: var(--space-lg);     /* φ² = 2.618rem */
	}

	.callout-margin {
		margin-top: var(--space-lg);     /* φ² = 2.618rem */
	}

	/* Primary CTA button */
	.cta-button-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-full);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.cta-button-primary:hover {
		background: var(--color-fg-secondary);
	}

	/* Secondary CTA button */
	.cta-button {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-full);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.cta-button:hover {
		background: var(--color-active);
		border-color: var(--color-border-strong);
	}

	/* Strong text */
	.strong-text {
		color: var(--color-fg-primary);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.heading-2 {
		font-size: var(--text-h2);
		font-weight: bold;
		color: var(--color-fg-primary);
	}

	.heading-3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.body-xl {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body-lg {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.body {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
	}

	.body-sm {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.body-xs {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.body-secondary {
		color: var(--color-fg-secondary);
	}

	.body-tertiary {
		color: var(--color-fg-tertiary);
	}

	.body-muted {
		color: var(--color-fg-muted);
	}

	.link {
		color: var(--color-fg-primary);
	}

	.link:hover {
		text-decoration: underline;
	}

	.card-surface {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-elevated {
		padding: var(--space-md);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.section-border {
		border-top: 1px solid var(--color-border-default);
	}

	.btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-full);
	}

	.btn-primary:hover {
		background: var(--color-fg-secondary);
	}

	.input {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
	}

	.input:focus {
		border-color: var(--color-border-emphasis);
	}

	.animate-reveal {
		opacity: 0;
		transform: translateY(20px);
		animation: reveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		animation-delay: calc(var(--delay, 0) * 100ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>

</div>
  </section>
