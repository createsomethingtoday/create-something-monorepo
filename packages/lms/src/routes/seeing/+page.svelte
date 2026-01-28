<script lang="ts">
  import { Eye, Home, ArrowRight, Terminal, Code2, BookOpen, MessageCircle, CheckCircle2, Sparkles } from 'lucide-svelte';
  import TerminalDemo from '$lib/components/TerminalDemo.svelte';

  // Terminal demo commands for the installation section
  const INSTALL_DEMO_COMMANDS = [
    {
      input: 'curl -fsSL https://claude.ai/install.sh | bash',
      output: ['Downloading Claude Code...', 'Installing...', '✓ Claude Code installed successfully!']
    },
    {
      input: 'claude --version',
      output: ['claude 1.0.16']
    },
    {
      input: 'claude doctor',
      output: ['✓ Authentication valid', '✓ Network connection OK', '✓ Version up to date', '', 'All checks passed!']
    }
  ];

  // Terminal basics demo
  const BASICS_DEMO_COMMANDS = [
    {
      input: 'pwd',
      output: ['/Users/you/projects']
    },
    {
      input: 'ls',
      output: ['my-app/  notes.txt  README.md']
    },
    {
      input: 'cd my-app',
      output: []
    },
    {
      input: 'pwd',
      output: ['/Users/you/projects/my-app']
    },
    {
      input: 'ls',
      output: ['src/  package.json  tsconfig.json']
    }
  ];

  const SEEING_LESSONS = [
    {
      id: 'setting-up',
      title: 'Setting Up',
      description: 'Install Claude Code and verify your setup. Five minutes to your first practice.',
      duration: '5 min'
    },
    {
      id: 'what-is-creation',
      title: 'What Is Creation?',
      description: 'The meta-principle: creation as the discipline of removing what obscures.',
      duration: '10 min'
    },
    {
      id: 'automation-layer',
      title: 'The Automation Layer',
      description: 'What sits between intention and execution. The infrastructure you\'re learning to build.',
      duration: '15 min'
    },
    {
      id: 'subtractive-triad',
      title: 'The Subtractive Triad',
      description: 'Three questions that guide every decision: DRY, Rams, Heidegger.',
      duration: '20 min'
    },
    {
      id: 'external-memory',
      title: 'External Memory',
      description: 'How automation systems remember. Persistence patterns for agents.',
      duration: '15 min'
    },
    {
      id: 'agent-native-tools',
      title: 'Agent-Native Tools',
      description: 'Designing tools for AI agents, not humans. Different inputs, different outputs.',
      duration: '15 min'
    },
    {
      id: 'capstone',
      title: 'Capstone: Simple Loom',
      description: 'Build a Task Tracker MCP server. Apply everything you\'ve learned.',
      duration: '60 min',
      isCapstone: true
    }
  ];

  const GRADUATION_CRITERIA = [
    'Ask the three questions without prompting',
    'Identify duplication before building',
    'Question whether features earn existence',
    'Map how changes serve the whole'
  ];
</script>

<svelte:head>
  <title>Seeing — Learn to Perceive | CREATE SOMETHING</title>
  <meta name="description" content="Learn to see through the Subtractive Triad. The free entry point to CREATE SOMETHING methodology. Seeing teaches perception; Dwelling teaches execution." />
</svelte:head>

<div class="max-w-5xl mx-auto px-6 py-16">
  <!-- Hero -->
  <section class="hero-section">
    <div class="tier-badge">
      <Eye size={16} />
      <span>Seeing</span>
      <span class="tier-free">Free</span>
    </div>
    
    <h1 class="hero-title">Learn to See</h1>
    <p class="hero-subtitle">
      Most developers add features without asking if they should.
    </p>
    <p class="hero-description">
      They ship code that obscures more than it reveals. More options, more complexity, more noise.
      This course teaches you to see differently — to spot duplication, excess, and disconnection 
      before you write a single line. Free. In your terminal. About two hours total.
    </p>

    <div class="hero-cta">
      <a href="#install" class="btn btn-primary">
        <Terminal size={18} />
        Get Started (5 min setup)
      </a>
      <a href="#curriculum" class="btn btn-secondary">
        See What You'll Learn
        <ArrowRight size={16} />
      </a>
    </div>
  </section>

  <!-- The Journey -->
  <section id="journey" class="journey-section">
    <h2 class="section-title center">Two Stages, One Philosophy</h2>
    <p class="section-intro">
      Seeing teaches you to perceive. Once the questions become automatic, you're ready for tools that execute what you now see. 
      There's no rush — stay in Seeing as long as you need.
    </p>

    <div class="journey-cards">
      <!-- Seeing Card -->
      <div class="journey-card seeing-card">
        <div class="journey-header">
          <div class="journey-icon">
            <Eye size={32} />
          </div>
          <div>
            <h3 class="journey-title">Seeing</h3>
            <span class="journey-tier">You are here</span>
          </div>
          <span class="journey-price">Free</span>
        </div>

        <p class="journey-philosophy">
          You're learning to notice. The tools are visible, the patterns are new, and that's exactly right. 
          You can't skip perception — it's what makes the next stage work.
        </p>

        <ul class="journey-features">
          <li><CheckCircle2 size={16} /> Seven philosophy lessons (~2 hours)</li>
          <li><CheckCircle2 size={16} /> Systems thinking patterns</li>
          <li><CheckCircle2 size={16} /> Build a real MCP server (capstone)</li>
          <li><CheckCircle2 size={16} /> Claude Pro ($20/month) includes Claude Code</li>
        </ul>

        <div class="journey-tool">
          <Terminal size={20} />
          <span>Runs in Claude Code</span>
        </div>
      </div>

      <!-- Arrow -->
      <div class="journey-arrow">
        <ArrowRight size={32} />
        <span>When ready</span>
      </div>

      <!-- Dwelling Card -->
      <div class="journey-card dwelling-card">
        <div class="journey-header">
          <div class="journey-icon">
            <Home size={32} />
          </div>
          <div>
            <h3 class="journey-title">Dwelling</h3>
            <span class="journey-tier">Next stage</span>
          </div>
          <span class="journey-price">Max</span>
        </div>

        <p class="journey-philosophy">
          The tools disappear. You stop thinking about the framework and just do the work.
          This is where perception becomes execution — automated audits, production patterns, real infrastructure.
        </p>

        <ul class="journey-features">
          <li><CheckCircle2 size={16} /> Everything in Seeing, plus:</li>
          <li><CheckCircle2 size={16} /> Automated code audits (Triad enforcement)</li>
          <li><CheckCircle2 size={16} /> Production workflow patterns</li>
          <li><CheckCircle2 size={16} /> Full MCP tooling ecosystem</li>
        </ul>

        <div class="journey-tool">
          <Code2 size={20} />
          <span>Higher usage limits for production work</span>
        </div>
      </div>
    </div>
  </section>

  <!-- The Triad -->
  <section class="triad-section">
    <h2 class="section-title center">The Subtractive Triad</h2>
    <p class="section-intro">
      Three questions. Ask them in order. They reveal what's hiding in your code — 
      duplication you didn't notice, features that don't earn their place, pieces that don't fit the whole.
    </p>

    <div class="triad-cards">
      <div class="triad-card">
        <div class="triad-level">Ask first</div>
        <h3 class="triad-title">DRY</h3>
        <p class="triad-question">"Have I built this before?"</p>
        <p class="triad-action">If yes: <strong>Unify</strong></p>
        <p class="triad-description">
          Two functions that do the same thing? That's two places to maintain, two places for bugs. 
          Find the duplication, merge it, and the real abstraction appears.
        </p>
      </div>

      <div class="triad-card">
        <div class="triad-level">Ask second</div>
        <h3 class="triad-title">Rams</h3>
        <p class="triad-question">"Does this earn its existence?"</p>
        <p class="triad-action">If no: <strong>Remove</strong></p>
        <p class="triad-description">
          Named for Dieter Rams: "Less, but better." That settings panel nobody uses? 
          That edge case nobody hits? Cut it. What remains is stronger.
        </p>
      </div>

      <div class="triad-card">
        <div class="triad-level">Ask third</div>
        <h3 class="triad-title">Heidegger</h3>
        <p class="triad-question">"Does this serve the whole?"</p>
        <p class="triad-action">If disconnected: <strong>Reconnect</strong></p>
        <p class="triad-description">
          Zoom out. Does this feature serve the system's purpose? Does the naming match? 
          Does it belong here at all? Reconnect what fragments.
        </p>
      </div>
    </div>
  </section>

  <!-- Lessons Preview -->
  <section id="curriculum" class="lessons-section">
    <h2 class="section-title">What You'll Learn</h2>
    <p class="section-intro-left">
      Seven lessons. Philosophy first, then patterns, then you build something real. 
      Total time: about two hours, spread however you like.
    </p>

    <div class="lessons-list">
      {#each SEEING_LESSONS as lesson, index}
        <a href="/seeing/{lesson.id}" class="lesson-row">
          <div class="lesson-number">{String(index + 1).padStart(2, '0')}</div>
          <div class="lesson-content">
            <h3 class="lesson-title">{lesson.title}</h3>
            <p class="lesson-description">{lesson.description}</p>
          </div>
          <div class="lesson-meta">
            <BookOpen size={16} />
            <span>{lesson.duration}</span>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- Cost Clarity -->
  <section class="cost-section">
    <h2 class="section-title center">What It Costs</h2>
    <p class="section-intro">
      Both courses use Claude Code. The difference is how much you use it.
      Here's the honest breakdown.
    </p>

    <div class="cost-comparison">
      <div class="cost-card cost-free">
        <div class="cost-header">
          <Eye size={24} />
          <h3>Seeing</h3>
        </div>
        <div class="cost-price">
          <span class="price-amount">$20</span>
          <span class="price-period">/month</span>
        </div>
        <ul class="cost-features">
          <li>Claude Pro subscription</li>
          <li>Claude Code included</li>
          <li>~45 messages every 5 hours</li>
          <li>More than enough for learning</li>
        </ul>
        <p class="cost-note">Complete the entire curriculum with plenty of headroom</p>
      </div>

      <div class="cost-card cost-pro">
        <div class="cost-header">
          <Home size={24} />
          <h3>Dwelling</h3>
        </div>
        <div class="cost-price">
          <span class="price-amount">$100</span>
          <span class="price-period">/month</span>
        </div>
        <ul class="cost-features">
          <li>Claude Max subscription</li>
          <li>5x Pro usage limits</li>
          <li>Extended thinking for complex work</li>
          <li>Production workflow capacity</li>
        </ul>
        <p class="cost-note">For when you're building real automation infrastructure</p>
      </div>
    </div>

    <p class="cost-philosophy">
      <em>Learn the philosophy with Pro. Scale up to Max when your automation work demands it. No switching tools — just more capacity.</em>
    </p>
  </section>

  <!-- Installation -->
  <section id="install" class="install-section">
    <h2 class="section-title center">Get Set Up in 5 Minutes</h2>
    <p class="section-intro">
      Three commands. That's all it takes.
    </p>

    <!-- Installation Demo -->
    <div class="install-demo-container">
      <TerminalDemo 
        commands={INSTALL_DEMO_COMMANDS} 
        title="Installing Claude Code"
        typingSpeed={40}
        pauseBetweenCommands={2000}
      />
    </div>

    <!-- Prerequisites -->
    <div class="install-prereq">
      <h3>Before you start</h3>
      <p>You need a Claude Pro subscription ($20/month). <a href="https://claude.ai/upgrade" target="_blank" rel="noopener">Subscribe here</a> if you haven't already.</p>
      <p class="install-note">Pro includes Claude Code — no separate purchase needed.</p>
    </div>

    <!-- Terminal Basics -->
    <div class="terminal-basics">
      <h3>New to the terminal?</h3>
      <p class="basics-intro">
        The terminal is just a text-based way to talk to your computer. 
        Here's what navigating looks like:
      </p>
      
      <div class="basics-demo-container">
        <TerminalDemo 
          commands={BASICS_DEMO_COMMANDS} 
          title="Basic Navigation"
          typingSpeed={60}
          pauseBetweenCommands={1200}
        />
      </div>

      <div class="basics-grid">
        <div class="basics-card">
          <h4>Open Terminal</h4>
          <ul>
            <li><strong>macOS:</strong> Cmd + Space → "Terminal"</li>
            <li><strong>Windows:</strong> Win + X → Terminal</li>
            <li><strong>Linux:</strong> Ctrl + Alt + T</li>
          </ul>
        </div>

        <div class="basics-card">
          <h4>Essential Commands</h4>
          <ul>
            <li><code>pwd</code> — where am I?</li>
            <li><code>ls</code> — what's here?</li>
            <li><code>cd folder</code> — go into folder</li>
            <li><code>cd ..</code> — go back up</li>
          </ul>
        </div>

        <div class="basics-card">
          <h4>Paste Commands</h4>
          <ul>
            <li><strong>macOS:</strong> Cmd + V</li>
            <li><strong>Windows:</strong> Right-click</li>
            <li><strong>Linux:</strong> Ctrl + Shift + V</li>
          </ul>
        </div>
      </div>

      <p class="basics-resources">
        Want more? Check out <a href="https://www.codecademy.com/learn/learn-the-command-line" target="_blank" rel="noopener">Codecademy's free course</a> or 
        <a href="/seeing/setting-up">our detailed setup guide</a>.
      </p>
    </div>

    <!-- Step by step -->
    <div class="install-steps">
      <h3>The Three Commands</h3>
      
      <div class="install-step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h4>Install Claude Code</h4>
          <div class="step-commands">
            <div class="command-option">
              <span class="command-label">macOS / Linux:</span>
              <code>curl -fsSL https://claude.ai/install.sh | bash</code>
            </div>
            <div class="command-option">
              <span class="command-label">Windows:</span>
              <code>irm https://claude.ai/install.ps1 | iex</code>
            </div>
          </div>
          <details class="step-trouble">
            <summary>"claude" not found?</summary>
            <p>Close and reopen your terminal. The installer adds Claude to your PATH.</p>
          </details>
        </div>
      </div>

      <div class="install-step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h4>Sign In</h4>
          <code>claude</code>
          <p class="step-note">Opens browser → sign in with Claude Pro account → return to terminal</p>
        </div>
      </div>

      <div class="install-step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h4>Verify</h4>
          <code>claude doctor</code>
          <p class="step-note">All checks should pass. You're ready!</p>
        </div>
      </div>
    </div>

    <div class="install-success">
      <CheckCircle2 size={20} />
      <p><strong>That's it.</strong> Jump into <a href="/seeing/what-is-creation">Lesson 1: What Is Creation?</a></p>
    </div>
  </section>

  <!-- Graduation -->
  <section class="graduation-section">
    <h2 class="section-title center">How You'll Know You're Ready</h2>
    <p class="section-intro">
      There's no test. No certificate. You're ready when the questions become reflexive — 
      when you catch yourself asking them without trying.
    </p>

    <div class="graduation-criteria">
      {#each GRADUATION_CRITERIA as criterion}
        <div class="criterion">
          <Sparkles size={18} />
          <span>{criterion}</span>
        </div>
      {/each}
    </div>

    <div class="graduation-quote">
      <blockquote>
        "You've learned to see. Now learn to dwell."
      </blockquote>
      <p class="graduation-instruction">
        When you're ready to move on, you'll know. The questions become automatic.
        You'll find yourself asking them without thinking.
      </p>
    </div>
  </section>
</div>

<style>
  /* Hero */
  .hero-section {
    text-align: center;
    margin-bottom: var(--space-2xl);
  }

  .tier-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-full);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-md);
  }

  .tier-free {
    background: var(--color-accent-subtle);
    color: var(--color-accent-fg);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
  }

  .hero-title {
    font-size: var(--text-display);
    margin-bottom: var(--space-sm);
  }

  .hero-subtitle {
    font-size: var(--text-h3);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-sm);
  }

  .hero-description {
    color: var(--color-fg-tertiary);
    max-width: 36rem;
    margin: 0 auto var(--space-lg);
  }

  .hero-cta {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  /* Journey */
  .journey-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .section-title {
    font-size: var(--text-h2);
    margin-bottom: var(--space-sm);
  }

  .section-title.center {
    text-align: center;
  }

  .section-intro {
    text-align: center;
    color: var(--color-fg-secondary);
    max-width: 36rem;
    margin: 0 auto var(--space-xl);
  }

  .section-intro-left {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-lg);
  }

  .journey-cards {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-lg);
    flex-wrap: wrap;
  }

  .journey-card {
    flex: 1;
    min-width: 280px;
    max-width: 360px;
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .seeing-card {
    border-color: var(--color-accent-emphasis);
  }

  .journey-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  .journey-icon {
    color: var(--color-fg-secondary);
  }

  .journey-title {
    font-size: var(--text-h3);
    margin: 0;
  }

  .journey-tier {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .journey-price {
    margin-left: auto;
    padding: 4px 12px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .journey-philosophy {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    font-style: italic;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--color-border-default);
  }

  .journey-features {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-md) 0;
  }

  .journey-features li {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  .journey-tool {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .journey-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
  }

  /* Triad */
  .triad-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .triad-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-md);
  }

  .triad-card {
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .triad-level {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--space-xs);
  }

  .triad-title {
    font-size: var(--text-h3);
    margin-bottom: var(--space-xs);
  }

  .triad-question {
    font-style: italic;
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  .triad-action {
    font-size: var(--text-body-sm);
    color: var(--color-accent-fg);
    margin-bottom: var(--space-sm);
  }

  .triad-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  /* Lessons */
  .lessons-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .lessons-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .lesson-row {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .lesson-row:hover {
    border-color: var(--color-border-emphasis);
  }

  .lesson-number {
    font-size: var(--text-h2);
    font-weight: var(--font-light);
    color: var(--color-fg-muted);
    width: 3rem;
  }

  .lesson-content {
    flex: 1;
  }

  .lesson-title {
    font-size: var(--text-body-lg);
    margin-bottom: 2px;
  }

  .lesson-description {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  .lesson-meta {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  /* Cost */
  .cost-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .cost-comparison {
    display: flex;
    justify-content: center;
    gap: var(--space-lg);
    flex-wrap: wrap;
    margin-bottom: var(--space-lg);
  }

  .cost-card {
    flex: 1;
    min-width: 240px;
    max-width: 300px;
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
    text-align: center;
  }

  .cost-free {
    border-color: var(--color-accent-emphasis);
  }

  .cost-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    color: var(--color-fg-secondary);
  }

  .cost-header h3 {
    font-size: var(--text-h3);
    margin: 0;
  }

  .cost-price {
    margin-bottom: var(--space-md);
  }

  .price-amount {
    font-size: var(--text-display);
    font-weight: var(--font-semibold);
  }

  .price-period {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .cost-features {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-md) 0;
    text-align: left;
  }

  .cost-features li {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    padding: var(--space-xs) 0;
    border-bottom: 1px solid var(--color-border-default);
  }

  .cost-features li:last-child {
    border-bottom: none;
  }

  .cost-note {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    font-style: italic;
  }

  .cost-philosophy {
    text-align: center;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  /* Install */
  .install-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .install-prereq {
    max-width: 32rem;
    margin: 0 auto var(--space-lg);
    padding: var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .install-prereq h3 {
    font-size: var(--text-body-lg);
    margin-bottom: var(--space-xs);
  }

  .install-prereq p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  .install-prereq code {
    display: block;
    padding: var(--space-sm);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    margin-bottom: var(--space-xs);
  }

  .install-note {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .install-note a {
    color: var(--color-accent-fg);
  }

  .prereq-details {
    margin-top: var(--space-sm);
    font-size: var(--text-body-sm);
  }

  .prereq-details summary {
    color: var(--color-fg-secondary);
    cursor: pointer;
    padding: var(--space-xs) 0;
  }

  .prereq-details summary:hover {
    color: var(--color-fg-primary);
  }

  .prereq-details p {
    color: var(--color-fg-tertiary);
    margin: var(--space-xs) 0;
  }

  .prereq-details ul {
    list-style: none;
    padding: 0;
    margin: var(--space-xs) 0;
  }

  .prereq-details li {
    color: var(--color-fg-tertiary);
    padding: var(--space-xs) 0;
    padding-left: var(--space-md);
  }

  .prereq-details a {
    color: var(--color-accent-fg);
  }

  /* Terminal Demo Container */
  .install-demo-container {
    max-width: 32rem;
    margin: 0 auto var(--space-xl);
  }

  /* Terminal Basics Section */
  .terminal-basics {
    max-width: 48rem;
    margin: var(--space-xl) auto;
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .terminal-basics h3 {
    font-size: var(--text-h3);
    margin-bottom: var(--space-sm);
  }

  .basics-intro {
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-md);
  }

  .basics-demo-container {
    margin-bottom: var(--space-lg);
  }

  .basics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .basics-card {
    padding: var(--space-md);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
  }

  .basics-card h4 {
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-sm);
    color: var(--color-fg-primary);
  }

  .basics-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .basics-card li {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    padding: var(--space-xs) 0;
  }

  .basics-card code {
    background: var(--color-bg-pure);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.85em;
  }

  .basics-resources {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    text-align: center;
  }

  .basics-resources a {
    color: var(--color-accent-fg);
  }

  /* Install Steps */
  .install-steps {
    max-width: 32rem;
    margin: 0 auto var(--space-lg);
  }

  .install-steps h3 {
    font-size: var(--text-body-lg);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-md);
    text-align: center;
  }

  .step-commands {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .command-option {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .command-label {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .step-content h4 {
    font-size: var(--text-body-lg);
    margin-bottom: var(--space-xs);
  }

  .step-note {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    margin-top: var(--space-xs);
  }

  .install-card {
    max-width: 32rem;
    margin: 0 auto var(--space-lg);
    padding: var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-xl);
  }

  .install-step {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
  }

  .install-step:last-child {
    margin-bottom: 0;
  }

  .step-number {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-accent-subtle);
    color: var(--color-accent-fg);
    border-radius: var(--radius-full);
    font-weight: var(--font-medium);
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
  }

  .step-content h3 {
    font-size: var(--text-body-lg);
    margin-bottom: var(--space-xs);
  }

  .step-content code {
    display: block;
    padding: var(--space-sm);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
  }

  .step-content pre.step-code {
    padding: var(--space-sm);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--text-body-sm);
    overflow-x: auto;
    white-space: pre;
  }

  .step-instruction {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-xs);
  }

  .step-expect {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    margin-top: var(--space-sm);
  }

  .inline-code {
    display: inline;
    padding: 2px 6px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  .step-trouble {
    margin-top: var(--space-sm);
    font-size: var(--text-body-sm);
  }

  .step-trouble summary {
    color: var(--color-fg-muted);
    cursor: pointer;
    padding: var(--space-xs) 0;
  }

  .step-trouble summary:hover {
    color: var(--color-fg-secondary);
  }

  .step-trouble p {
    color: var(--color-fg-tertiary);
    margin-top: var(--space-xs);
    padding-left: var(--space-md);
  }

  .step-trouble a {
    color: var(--color-accent-fg);
  }

  .install-success {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    max-width: 32rem;
    margin: 0 auto;
    padding: var(--space-md);
    background: var(--color-accent-subtle);
    border: 1px solid var(--color-accent-emphasis);
    border-radius: var(--radius-lg);
    color: var(--color-accent-fg);
  }

  .install-success p {
    font-size: var(--text-body-sm);
  }

  .install-success a {
    color: var(--color-accent-fg);
    text-decoration: underline;
  }


  /* Graduation */
  .graduation-section {
    padding: var(--space-2xl) 0;
    border-top: 1px solid var(--color-border-default);
  }

  .graduation-criteria {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-sm);
    max-width: 42rem;
    margin: 0 auto var(--space-xl);
  }

  .criterion {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .graduation-quote {
    text-align: center;
    max-width: 28rem;
    margin: 0 auto;
  }

  .graduation-quote blockquote {
    font-size: var(--text-h3);
    font-style: italic;
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-md);
  }

  .graduation-instruction {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-sm);
  }

  .graduation-command {
    display: inline-block;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
  }
</style>
