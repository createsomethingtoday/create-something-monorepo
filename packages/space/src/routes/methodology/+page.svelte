<script lang="ts">
  import { Footer } from '@create-something/components';

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'Experiments', href: '/experiments' },
    { label: 'Methodology', href: '/methodology' }
  ];
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
  <section class="relative pt-32 pb-16 px-6">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8 animate-reveal">
        <h1 class="hero-title mb-8">
          Research Methodology
        </h1>

        <p class="intro-text">
          What makes CREATE SOMETHING different from AI blogs: we don't just document results—we document the <strong>process</strong> of building with AI agents.
        </p>

        <p class="body-text">
          Every experiment is tracked with automated logging, real costs from APIs, precise time measurements, and intervention documentation. This transforms anecdotes into reproducible experiments.
        </p>
      </div>
    </div>
  </section>

  <!-- The Process Visual -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-6xl mx-auto">
      <div>
        <h2 class="section-title mb-12 text-center">
          How We Work
        </h2>

        <!-- Pipeline Visual -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
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
              class="card relative p-6 animate-reveal"
              style="--delay: {index + 1}"
            >
              <div class="icon mb-4">
                <svg class="w-10 h-10" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d={item.icon} stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="metric-label mb-2">{item.step}</div>
              <h3 class="subsection-title mb-2">
                {item.title}
              </h3>
              <p class="list-item">
                {item.description}
              </p>

              <!-- Arrow -->
              {#if index < 3}
                <div class="arrow-icon hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2">
                  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="text-center">
          <p class="intro-text font-medium">
            This is research, not blogging.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- What We Track -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8">
        <h2 class="section-title mb-8">
          Every Experiment Tracked With
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              class="card p-6 animate-reveal"
              style="--delay: {index}"
            >
              <h3 class="subsection-title mb-2">
                {item.metric}
              </h3>
              <p class="list-item mb-3">
                {item.description}
              </p>
              <code class="code-sample px-2 py-1">
                {item.example}
              </code>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Three Tracking Modes -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8">
        <h2 class="section-title mb-8">
          Three Tracking Modes
        </h2>

        <div class="space-y-6">
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
              class="card p-6 animate-reveal"
              style="--delay: {index + 1}"
            >
              <div class="flex items-start justify-between mb-3">
                <h3 class="text-xl font-semibold text-white">
                  {item.mode}
                </h3>
                <span class="tag px-2 py-1">
                  {item.tag}
                </span>
              </div>
              <p class="text-white/70 mb-4">
                {item.description}
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="metric-label">Data Quality:</span>
                  <p class="list-item">{item.dataQuality}</p>
                </div>
                <div>
                  <span class="metric-label">Use Case:</span>
                  <p class="list-item">{item.useCase}</p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Why This Matters -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8">
        <h2 class="section-title mb-8">
          Why This Matters
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <h3 class="text-xl font-semibold text-white">
              Without Tracking
            </h3>
            <ul class="space-y-3 text-white/60">
              {#each [
                '"I built X with AI" (anecdote)',
                'No reproducibility',
                "Can't verify claims",
                'Just another AI blog'
              ] as item}
                <li class="flex items-start gap-3">
                  <svg class="check-icon w-5 h-5 flex-shrink-0 mt-0.5" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
          </div>

          <div class="space-y-4">
            <h3 class="text-xl font-semibold text-white">
              With Tracking
            </h3>
            <ul class="space-y-3 text-white/60">
              {#each [
                '"I built X: 26 hrs, $27, 78% savings" (data)',
                'Others can replicate experiments',
                'Transparent methodology',
                'Scientific research platform'
              ] as item}
                <li class="flex items-start gap-3">
                  <svg class="check-icon w-5 h-5 flex-shrink-0 mt-0.5" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>

        <div class="highlight-box p-6 mt-8">
          <p class="intro-text leading-relaxed">
            The tracking methodology transforms "prompting and hoping" into <strong>systematic evaluation with reproducible results</strong>. This is what separates research from blogging.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- For Researchers -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8">
        <h2 class="section-title mb-8">
          For Researchers: Use This Methodology
        </h2>

        <p class="text-lg text-white/70 leading-relaxed">
          Want to adopt this approach for your own AI-native development research? The experiment tracking system is available as a Claude Code Skill.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              class="researcher-card p-6 text-center animate-reveal"
              style="--delay: {index + 1}"
            >
              <div class="text-3xl font-bold text-white/20 mb-3">{item.step}</div>
              <h3 class="text-lg font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p class="list-item">
                {item.description}
              </p>
            </div>
          {/each}
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <a
            href="https://github.com/createsomethingtoday/create-something-experiments"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-button inline-flex items-center justify-center gap-2 px-6 py-3"
          >
            <span>View on GitHub</span>
            <svg class="w-4 h-4" stroke-width="2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>

          <a
            href="/experiments/zoom-transcript-automation-experiment"
            class="secondary-button inline-flex items-center justify-center gap-2 px-6 py-3"
          >
            <span>See Example Experiment</span>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Example from Experiment #1 -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8">
        <h2 class="section-title mb-8">
          Methodology in Action
        </h2>

        <p class="text-lg text-white/70 leading-relaxed">
          Example from <a href="/experiments/zoom-transcript-automation-experiment" class="link-text hover:underline">Experiment #1: Zoom Transcript Automation</a>
        </p>

        <div class="card p-6">
          <div class="space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div class="metric-card p-4">
                <div class="metric-value">26</div>
                <div class="metric-caption">Hours</div>
              </div>
              <div class="metric-card p-4">
                <div class="metric-value">47</div>
                <div class="metric-caption">Errors</div>
              </div>
              <div class="metric-card p-4">
                <div class="metric-value">12</div>
                <div class="metric-caption">Interventions</div>
              </div>
              <div class="metric-card p-4">
                <div class="metric-value">78%</div>
                <div class="metric-caption">Time Savings</div>
              </div>
            </div>

            <div class="pt-4 border-t border-white/10">
              <p class="list-item">
                <strong class="link-text">Data sources:</strong> Real-time prompt logging via hooks, Claude Code Analytics API, Cloudflare billing API, git commit history
              </p>
            </div>

            <div class="pt-2">
              <p class="list-item">
                <strong class="link-text">Reproducibility:</strong> Starting prompt, tracking logs, and architecture decisions documented
              </p>
            </div>
          </div>
        </div>

        <div class="text-center">
          <a
            href="/experiments/zoom-transcript-automation-experiment"
            class="inline-flex items-center gap-2 text-white hover:underline"
          >
            Read the full experiment
            <svg class="w-4 h-4" stroke-width="2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>

  <Footer
    mode="space"
    showNewsletter={false}
    aboutText="Community playground for AI-native development experiments. Fork experiments, break things, learn in public."
    quickLinks={quickLinks}
    showSocial={true}
  />

<style>
  .hero-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .intro-text {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: 1.6;
  }

  .body-text {
    font-size: var(--text-body);
    color: var(--color-fg-tertiary);
    line-height: 1.6;
  }

  .section-title {
    font-size: var(--text-h2);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .subsection-title {
    font-size: var(--text-h3);
    font-weight: 600;
    color: var(--color-fg-primary);
  }

  .card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .card:hover {
    border-color: var(--color-border-emphasis);
  }

  .metric-card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
  }

  .tag {
    font-size: var(--text-caption);
    background: var(--color-active);
    color: var(--color-fg-secondary);
    border-radius: var(--radius-sm);
  }

  .icon {
    color: var(--color-fg-tertiary);
  }

  .arrow-icon {
    color: var(--color-fg-subtle);
  }

  .code-sample {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    background: var(--color-hover);
    border-radius: var(--radius-sm);
  }

  .metric-label {
    color: var(--color-fg-muted);
  }

  .metric-value {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .metric-caption {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .cta-button {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
    font-weight: 600;
    border-radius: var(--radius-full);
    transition: background var(--duration-micro) var(--ease-standard);
  }

  .cta-button:hover {
    opacity: 0.9;
  }

  .secondary-button {
    background: var(--color-active);
    color: var(--color-fg-primary);
    border: 1px solid var(--color-border-emphasis);
    font-weight: 600;
    border-radius: var(--radius-full);
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .secondary-button:hover {
    background: var(--color-hover);
    border-color: var(--color-border-emphasis);
  }

  .highlight-box {
    background: var(--color-hover);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .list-item {
    color: var(--color-fg-secondary);
  }

  .check-icon {
    color: var(--color-fg-muted);
  }

  .x-icon {
    color: var(--color-fg-muted);
  }

  .link-text {
    color: var(--color-fg-primary);
  }

  .link-text:hover {
    text-decoration: underline;
  }

  .researcher-card {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
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
