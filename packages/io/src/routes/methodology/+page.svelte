<script lang="ts">
  import { fly } from 'svelte/transition';
  import { SEO } from '@create-something/components';

  const faqItems = [
    {
      question: "How do you track AI development experiments?",
      answer: "Every experiment uses automated logging to capture real-time data: API costs, time measurements, errors, and human interventions. This transforms subjective blog posts into reproducible experiments with precise metrics."
    },
    {
      question: "What makes this different from AI development blogs?",
      answer: "We document the process, not just results. Every experiment includes tracked metrics (time, costs, errors), methodology details, and intervention documentation. This provides reproducible, credible knowledge instead of anecdotes."
    },
    {
      question: "Why focus on AI-native development?",
      answer: "Traditional development practices don't account for AI agents that generate code, make architectural decisions, and require human oversight. AI-native development requires new methodologies for evaluation and reproducibility."
    },
    {
      question: "How do you measure experiment success?",
      answer: "Success is measured across multiple dimensions: completion time, API costs, error rates, human intervention frequency, and quality of final output. We track both objective metrics and qualitative learnings."
    },
    {
      question: "Can I reproduce your experiments?",
      answer: "Yes. Each experiment documents the exact process, tools used, prompts given, and interventions made. We provide enough detail for others to reproduce our work and validate our findings."
    }
  ];
</script>

<SEO
  title="Research Methodology"
  description="How CREATE SOMETHING produces credible knowledge about AI-native development through rigorous experiment tracking, real-time logging, and reproducible results."
  keywords="research methodology, experiment tracking, AI-native development, reproducible research, scientific method, Claude Code, systems thinking"
  canonical="https://createsomething.io/methodology"
  propertyName="io"
  faqItems={faqItems}
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.io/' },
    { name: 'Methodology', url: 'https://createsomething.io/methodology' }
  ]}
/>


  <!-- Hero Section -->
  <section class="relative pt-32 pb-16 px-6">
    <div class="max-w-4xl mx-auto">
      <div in:fly={{ y: 20, duration: 600 }} class="space-y-8">
        <h1 class="text-4xl md:text-6xl font-bold text-white mb-8">
          Research Methodology
        </h1>

        <p class="text-xl text-white/90 leading-relaxed">
          What makes CREATE SOMETHING different from AI blogs: we don't just document results—we document the <strong>process</strong> of building with AI agents.
        </p>

        <p class="text-lg text-white/70 leading-relaxed">
          Every experiment is tracked with automated logging, real costs from APIs, precise time measurements, and intervention documentation. This transforms anecdotes into reproducible experiments.
        </p>
      </div>
    </div>
  </section>

  <!-- The Process Visual -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-6xl mx-auto">
      <div>
        <h2 class="text-3xl font-bold text-white mb-12 text-center">
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
              in:fly={{ y: 20, duration: 500, delay: index * 100 }}
              class="relative p-6 bg-[#111111] border border-white/10 rounded-lg"
            >
              <div class="mb-4 text-white/70">
                <svg class="w-10 h-10" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d={item.icon} stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="text-sm text-white/40 mb-2">{item.step}</div>
              <h3 class="text-xl font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p class="text-white/60 text-sm">
                {item.description}
              </p>

              <!-- Arrow -->
              {#if index < 3}
                <div class="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 text-white/20">
                  <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="text-center">
          <p class="text-xl text-white/80 font-medium">
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
        <h2 class="text-3xl font-bold text-white mb-8">
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
              in:fly={{ y: 20, duration: 500, delay: index * 50 }}
              class="p-6 bg-[#111111] border border-white/10 rounded-lg"
            >
              <h3 class="text-xl font-semibold text-white mb-2">
                {item.metric}
              </h3>
              <p class="text-white/60 text-sm mb-3">
                {item.description}
              </p>
              <code class="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                {item.example}
              </code>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Displaying Evidence (Tufte Section) -->
  <section class="py-16 px-6 border-t border-white/10 bg-[#0a0a0a]">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-white mb-8">
          Displaying Evidence
        </h2>

        <p class="text-lg text-white/80 leading-relaxed">
          Tracking data isn't enough—how you <strong>display</strong> that data determines whether your research is credible or dismissed. We follow Edward Tufte's principles for quantitative information design.
        </p>

        <div class="p-6 bg-white/5 border border-white/20 rounded-lg">
          <p class="text-white/70 leading-relaxed italic">
            "Excellence in statistical graphics consists of complex ideas communicated with clarity, precision, and efficiency."
            <span class="block mt-2 text-white/40 text-sm">— Edward Tufte, The Visual Display of Quantitative Information</span>
          </p>
        </div>

        <!-- Tufte's Principles Applied -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {#each [
            {
              principle: 'Maximize Data-Ink Ratio',
              description: 'Every pixel should convey information. Remove decoration that obscures data.',
              application: 'Sparklines show trends in 12 pixels instead of full charts with axes and labels.'
            },
            {
              principle: 'Show Data Variation',
              description: 'Display change and patterns, not just static numbers.',
              application: 'Inline trends on metrics show movement over time, not just current values.'
            },
            {
              principle: 'High Data Density',
              description: 'Maximize meaningful information per unit area.',
              application: 'Tables show 10 experiments with counts + percentages instead of 3 with decoration.'
            },
            {
              principle: 'Integrate Text & Data',
              description: 'Labels, numbers, and context should appear together.',
              application: 'Property stats show count, percentage, and trend inline—no separate legend needed.'
            },
            {
              principle: 'Small Multiples',
              description: 'Show multiple dimensions side-by-side for comparison.',
              application: '7-day grid lets you spot patterns across the week at a glance.'
            },
            {
              principle: 'Remove Chartjunk',
              description: 'Eliminate visual noise that distracts from data.',
              application: 'Subtle borders and minimal backgrounds—data stands out, not design.'
            }
          ] as item, index}
            <div
              in:fly={{ y: 20, duration: 500, delay: index * 50 }}
              class="p-5 bg-[#111111] border border-white/10 rounded-lg"
            >
              <h3 class="text-lg font-semibold text-white mb-2">
                {item.principle}
              </h3>
              <p class="text-white/60 text-sm mb-3">
                {item.description}
              </p>
              <div class="pt-3 border-t border-white/5">
                <p class="text-xs text-white/40">
                  <strong class="text-white/60">In our analytics:</strong> {item.application}
                </p>
              </div>
            </div>
          {/each}
        </div>

        <!-- Why This Matters for Research -->
        <div class="mt-8 p-6 bg-[#111111] border border-white/10 rounded-lg">
          <h3 class="text-xl font-semibold text-white mb-4">
            Why Visualization Standards Matter
          </h3>
          <div class="space-y-4 text-white/70">
            <p>
              <strong class="text-white">Credibility:</strong> Poor visualization makes readers question your data.
              If metrics are buried under decoration, they assume you're hiding something.
            </p>
            <p>
              <strong class="text-white">Reproducibility:</strong> Clear presentation lets others verify your work.
              Sparklines and small multiples make patterns obvious without interpretation.
            </p>
            <p>
              <strong class="text-white">Efficiency:</strong> Researchers need to extract insights quickly.
              High data density means less scrolling, more understanding.
            </p>
          </div>
        </div>

        <!-- See It In Action -->
        <div class="text-center mt-8">
          <p class="text-white/60 mb-4">
            These principles are applied throughout our analytics dashboard and experiment results.
          </p>
          <a
            href="/admin/analytics"
            class="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 font-semibold rounded-full hover:bg-white/20 hover:border-white/30 transition-all"
          >
            <span>View Analytics Dashboard</span>
            <svg class="w-4 h-4" stroke-width="2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Three Tracking Modes -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-white mb-8">
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
              in:fly={{ y: 20, duration: 500, delay: index * 100 }}
              class="p-6 bg-[#111111] border border-white/10 rounded-lg"
            >
              <div class="flex items-start justify-between mb-3">
                <h3 class="text-xl font-semibold text-white">
                  {item.mode}
                </h3>
                <span class="text-xs px-2 py-1 bg-white/10 text-white/60 rounded">
                  {item.tag}
                </span>
              </div>
              <p class="text-white/70 mb-4">
                {item.description}
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-white/40">Data Quality:</span>
                  <p class="text-white/60">{item.dataQuality}</p>
                </div>
                <div>
                  <span class="text-white/40">Use Case:</span>
                  <p class="text-white/60">{item.useCase}</p>
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
        <h2 class="text-3xl font-bold text-white mb-8">
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
                  <svg class="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                  <svg class="w-5 h-5 text-white/40 flex-shrink-0 mt-0.5" stroke-width="1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span>{item}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>

        <div class="p-6 bg-white/5 border border-white/10 rounded-lg mt-8">
          <p class="text-lg text-white/80 leading-relaxed">
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
        <h2 class="text-3xl font-bold text-white mb-8">
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
              in:fly={{ y: 20, duration: 500, delay: index * 100 }}
              class="p-6 bg-[#111111] border border-white/10 rounded-lg text-center"
            >
              <div class="text-3xl font-bold text-white/20 mb-3">{item.step}</div>
              <h3 class="text-lg font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p class="text-white/60 text-sm">
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
            class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all"
          >
            <span>View on GitHub</span>
            <svg class="w-4 h-4" stroke-width="2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>

          <a
            href="/experiments/zoom-transcript-automation-experiment"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white border border-white/20 font-semibold rounded-full hover:bg-white/20 hover:border-white/30 transition-all"
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
        <h2 class="text-3xl font-bold text-white mb-8">
          Methodology in Action
        </h2>

        <p class="text-lg text-white/70 leading-relaxed">
          Example from <a href="/experiments/zoom-transcript-automation-experiment" class="text-white hover:underline">Experiment #1: Zoom Transcript Automation</a>
        </p>

        <div class="p-6 bg-[#111111] border border-white/10 rounded-lg">
          <div class="space-y-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div class="p-4 bg-white/5 rounded">
                <div class="text-2xl font-bold text-white">26</div>
                <div class="text-xs text-white/40">Hours</div>
              </div>
              <div class="p-4 bg-white/5 rounded">
                <div class="text-2xl font-bold text-white">47</div>
                <div class="text-xs text-white/40">Errors</div>
              </div>
              <div class="p-4 bg-white/5 rounded">
                <div class="text-2xl font-bold text-white">12</div>
                <div class="text-xs text-white/40">Interventions</div>
              </div>
              <div class="p-4 bg-white/5 rounded">
                <div class="text-2xl font-bold text-white">78%</div>
                <div class="text-xs text-white/40">Time Savings</div>
              </div>
            </div>

            <div class="pt-4 border-t border-white/10">
              <p class="text-sm text-white/60">
                <strong class="text-white">Data sources:</strong> Real-time prompt logging via hooks, Claude Code Analytics API, Cloudflare billing API, git commit history
              </p>
            </div>

            <div class="pt-2">
              <p class="text-sm text-white/60">
                <strong class="text-white">Reproducibility:</strong> Starting prompt, tracking logs, and architecture decisions documented
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

  <!-- Canon & Influences -->
  <section class="py-16 px-6 border-t border-white/10">
    <div class="max-w-4xl mx-auto">
      <div class="space-y-8">
        <h2 class="text-3xl font-bold text-white mb-8">
          Canon & Influences
        </h2>

        <p class="text-lg text-white/70 leading-relaxed">
          CREATE SOMETHING's methodology doesn't exist in isolation. We build on foundational work from researchers, practitioners, and thinkers who established standards for rigorous knowledge production.
        </p>

        <!-- Masters -->
        <div class="mt-8">
          <h3 class="text-2xl font-semibold text-white mb-6">Masters</h3>

          <!-- Edward Tufte -->
          <div class="p-6 bg-[#111111] border border-white/10 rounded-lg">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h4 class="text-xl font-semibold text-white">Edward R. Tufte</h4>
                <p class="text-sm text-white/40 mt-1">Professor Emeritus, Yale University</p>
              </div>
              <div class="text-xs px-3 py-1 bg-white/10 text-white/60 rounded-full">
                Data Visualization
              </div>
            </div>

            <div class="space-y-4 text-white/70">
              <p>
                <strong class="text-white">Work:</strong> <em>The Visual Display of Quantitative Information</em> (1983)
              </p>

              <p>
                <strong class="text-white">Influence on CREATE SOMETHING:</strong>
                Tufte's principles for displaying quantitative data define how we present experiment results, analytics dashboards, and research findings. His concept of the data-ink ratio—maximizing information while minimizing decoration—is fundamental to our visualization standards.
              </p>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <p class="text-sm text-white/60 mb-2"><strong>Core Principles We Apply:</strong></p>
                  <ul class="text-sm text-white/60 space-y-1 list-disc list-inside">
                    <li>Maximize data-ink ratio</li>
                    <li>Show data variation, not design variation</li>
                    <li>Remove chartjunk</li>
                  </ul>
                </div>
                <div>
                  <p class="text-sm text-white/60 mb-2"><strong>Implemented In:</strong></p>
                  <ul class="text-sm text-white/60 space-y-1 list-disc list-inside">
                    <li>Analytics dashboard design</li>
                    <li>Experiment metrics visualization</li>
                    <li>Research paper data presentation</li>
                  </ul>
                </div>
              </div>

              <div class="pt-4 border-t border-white/5 flex gap-4 text-sm">
                <a
                  href="https://www.edwardtufte.com/tufte/"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>Official Site</span>
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- How We Build Canon -->
        <div class="mt-8 p-6 bg-white/5 border border-white/20 rounded-lg">
          <h4 class="text-lg font-semibold text-white mb-3">How Work Enters the Canon</h4>
          <div class="text-white/70 space-y-3 text-sm">
            <p>
              A "Master" in the CREATE SOMETHING canon represents someone whose work has:
            </p>
            <ul class="space-y-2 list-disc list-inside ml-2">
              <li><strong class="text-white">Foundational impact</strong> — Established principles we build upon</li>
              <li><strong class="text-white">Practical application</strong> — Not just theory; implemented in our work</li>
              <li><strong class="text-white">Evidence-based approach</strong> — Research-backed, not opinion</li>
              <li><strong class="text-white">Timeless relevance</strong> — Principles that withstand technological change</li>
            </ul>
            <p class="pt-3 border-t border-white/10 mt-4">
              The canon grows through practice, not planning. We don't add influences speculatively—only after we've applied their work and proven its value in our methodology.
            </p>
          </div>
        </div>

        <!-- Future Additions -->
        <div class="mt-6 text-center">
          <p class="text-sm text-white/40">
            This canon expands as CREATE SOMETHING's methodology evolves. Check back as we document additional influences.
          </p>
        </div>
      </div>
    </div>
  </section>
