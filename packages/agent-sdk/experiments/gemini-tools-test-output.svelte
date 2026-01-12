<script lang="ts">
  import { onMount } from 'svelte';

  let currentYear = new Date().getFullYear();

  onMount(() => {
    // Any client-side logic if needed
  });
</script>

<style lang="scss">
  :root {
    --color-bg-pure: #000000;
    --color-bg-surface: #111111;
    --color-bg-subtle: #1a1a1a;
    --color-fg-primary: #ffffff;
    --color-fg-secondary: rgba(255,255,255,0.8);
    --color-fg-muted: rgba(255,255,255,0.46);
    --color-border-default: rgba(255,255,255,0.1);
    --color-border-emphasis: rgba(255,255,255,0.2);
    --color-success: #44aa44;
    --color-error: #d44d4d;
    --color-info: #5082b9;
  }

  .paper-container {
    font-family: 'Inter', sans-serif;
    color: var(--color-fg-primary);
    background-color: var(--color-bg-pure);
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
  }

  h1, h2, h3, h4, h5, h6 {
    color: var(--color-fg-primary);
    margin-top: 1.5rem;
    margin-bottom: 0.8rem;
  }

  h1 { font-size: 2.5rem; }
  h2 { font-size: 2rem; border-bottom: 1px solid var(--color-border-default); padding-bottom: 0.5rem; }
  h3 { font-size: 1.5rem; }
  h4 { font-size: 1.2rem; }

  p {
    margin-bottom: 1rem;
    color: var(--color-fg-secondary);
  }

  a {
    color: var(--color-info);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  .abstract {
    border-left: 4px solid var(--color-info);
    padding-left: 1rem;
    margin-bottom: 2rem;
    background-color: var(--color-bg-subtle);
    padding: 1rem;
    color: var(--color-fg-secondary);
  }

  .code-block {
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 1rem;
    font-family: 'Fira Code', monospace;
    color: var(--color-fg-primary);
  }

  .table-container {
    margin-bottom: 1rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
    background-color: var(--color-bg-subtle);
  }

  th, td {
    border: 1px solid var(--color-border-default);
    padding: 0.75rem;
    text-align: left;
    color: var(--color-fg-secondary);
  }

  th {
    background-color: var(--color-bg-surface);
    color: var(--color-fg-primary);
    font-weight: bold;
  }

  .comparison-card-container {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .comparison-card {
    flex: 1;
    min-width: 250px;
    background-color: var(--color-bg-subtle);
    border: 1px solid var(--color-border-emphasis);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .comparison-card h4 {
    margin-top: 0;
    color: var(--color-info);
  }

  .references {
    margin-top: 3rem;
    border-top: 1px solid var(--color-border-default);
    padding-top: 1rem;
  }

  .footer {
    margin-top: 3rem;
    border-top: 1px solid var(--color-border-default);
    padding-top: 1rem;
    text-align: center;
    color: var(--color-fg-muted);
    font-size: 0.85rem;
  }

  .quote {
    font-style: italic;
    color: var(--color-fg-muted);
    margin-left: 1rem;
    border-left: 2px solid var(--color-border-default);
    padding-left: 0.5rem;
  }
</style>

<div class="paper-container">
  <h1>Beads Cross-Session Memory Patterns</h1>
  <p>PAPER-2026-BCMP</p>

  <div class="abstract">
    <p>
      This paper explores "Beads Cross-Session Memory Patterns," an agent-native issue tracking system designed to ensure work persistence across AI agent sessions. Beads addresses the fundamental challenge of context loss due to session restarts, context limits, and crashes by committing issue data directly to Git. It introduces a robust set of CLI commands, a flexible labeling system, and advanced workflow concepts like "Molecules" and "Wisps" to manage tasks from ephemeral experiments to long-term features. The system's design emphasizes "nondeterministic idempotence," allowing agents to achieve consistent outcomes despite varied execution paths.
    </p>
  </div>

  <h2>I. Introduction: The Challenge of Agent Memory</h2>
  <p>
    AI agents, particularly in complex development environments, frequently encounter limitations related to session longevity and context management. Traditional human-centric issue tracking systems often fall short in providing the necessary persistence and machine-readable interfaces for autonomous agents. Beads emerges as a solution specifically engineered for this paradigm, ensuring that "Work survives session restarts, context limits, even crashes" (<span class="quote">.claude/rules/beads-patterns.md, Line 5</span>). This foundational capability is critical for maintaining continuity and progress in multi-step, long-running agentic tasks.
  </p>
  <p>
    The core philosophy behind Beads is to enable "nondeterministic idempotence," meaning "different paths, same outcome" (<span class="quote">.claude/rules/beads-patterns.md, Line 133</span>). This principle allows agents to restart, re-evaluate, and re-execute tasks without losing progress or introducing inconsistencies, a vital feature for robust AI-driven development.
  </p>

  <h2>II. Architectural Foundations and Persistence Mechanisms</h2>
  <p>
    Beads achieves its cross-session memory by leveraging Git as its primary persistence layer. As stated in the Beads patterns documentation, "Issues live in Git. Any session can read them. Work survives restarts" (<span class="quote">.claude/rules/beads-patterns.md, Lines 129-130</span>). This design choice ensures that the state of work is not tied to a specific agent instance or ephemeral memory, but rather to a version-controlled, shared repository.
  </p>
  <p>
    The primary file for issue storage is <code>.beads/issues.jsonl</code>, which is explicitly "committed to Git" (<span class="quote">.claude/rules/beads-patterns.md, Line 100</span>). Complementing this, Beads utilizes a local cache, <code>.beads/beads.db</code>, which is ".gitignored" (<span class="quote">.claude/rules/beads-patterns.md, Line 101</span>), and a configuration file, <code>.beads/config.yaml</code> (<span class="quote">.claude/rules/beads-patterns.md, Line 102</span>). For temporary, throwaway work, a separate directory, <code>.beads-wisp/</code>, is used and also ".gitignored" (<span class="quote">.claude/rules/beads-patterns.md, Line 104</span>), preventing clutter in the main repository.
  </p>
  <p>
    The <code>packages/harness/src/beads.ts</code> implementation confirms this, attempting to read issues via <code>bd list --json</code> first, and falling back to parsing the <code>.beads/issues.jsonl</code> file directly if the CLI fails (<span class="quote">packages/harness/src/beads.ts, Lines 49-62</span>). This dual approach enhances reliability and ensures data accessibility.
  </p>

  <h2>III. Core Commands and Agent Interaction</h2>
  <p>
    Beads provides a comprehensive set of command-line interface (CLI) tools, primarily through the <code>bd</code> and <code>bv</code> commands, designed for both human and agent interaction. The <code>packages/agent-sdk/src/create_something_agents/tools/beads.py</code> file defines a Python tool wrapper for these actions, exposing functionalities like <code>create</code>, <code>update</code>, <code>close</code>, <code>list</code>, <code>show</code>, and <code>ready</code> (<span class="quote">packages/agent-sdk/src/create_something_agents/tools/beads.py, Lines 20-24</span>).
  </p>

  <h3>Table 1: Essential Beads Commands for Agents</h3>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Command</th>
          <th>Description</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>bv --robot-priority</code></td>
          <td>AI-optimized ranking of issues, using PageRank + Critical Path ranking.</td>
          <td><span class="quote">.claude/rules/beads-patterns.md, Line 30</span>, <span class="quote">packages/harness/src/beads.ts, Line 249</span></td>
        </tr>
        <tr>
          <td><code>bd create "Title"</code></td>
          <td>Captures a new task or issue. Supports <code>--dry-run</code> for preview.</td>
          <td><span class="quote">.claude/rules/beads-patterns.md, Line 33</span>, <span class="quote">packages/harness/src/beads.ts, Line 120</span></td>
        </tr>
        <tr>
          <td><code>bd update cs-abc --status in-progress</code></td>
          <td>Changes the status of an issue. Statuses include <code>open</code>, <code>in-progress</code>, <code>code-complete</code>, <code>verified</code>.</td>
          <td><span class="quote">.claude/rules/beads-patterns.md, Line 37</span>, <span class="quote">packages/agent-sdk/src/create_something_agents/tools/beads.py, Line 47</span></td>
        </tr>
        <tr>
          <td><code>bd close cs-abc</code></td>
          <td>Marks an issue as completed. Triggers an immediate <code>bd sync</code> in harness.</td>
          <td><span class="quote">.claude/rules/beads-patterns.md, Line 38</span>, <span class="quote">packages/harness/src/beads.ts, Lines 190-193</span></td>
        </tr>
        <tr>
          <td><code>bd sync</code></td>
          <td>Pushes local changes to Git and pulls remote updates.</td>
          <td><span class="quote">.claude/rules/beads-patterns.md, Line 14</span></td>
        </tr>
        <tr>
          <td><code>bd ready</code></td>
          <td>Lists only unblocked issues ready for work.</td>
          <td><span class="quote">.claude/rules/beads-patterns.md, Line 28</span></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p>
    The <code>bv --robot-priority</code> command is particularly noteworthy, as it provides an "AI-optimized ranking" of tasks, leveraging "PageRank + Critical Path ranking" (<span class="quote">packages/harness/src/beads.ts, Line 249</span>). This feature is explicitly designed for AI agents, distinguishing Beads from human-first task management systems like Taskwarrior (<span class="quote">CLAUDE.md, Lines 70-71</span>).
  </p>

  <h2>IV. Advanced Workflow Patterns: Molecules and Wisps</h2>
  <p>
    Beads extends basic issue tracking with advanced workflow patterns, referred to as "Molecules." These are "reusable work templates" or "workflow recipes" (<span class="quote">.claude/rules/beads-patterns.md, Line 90</span>), enabling agents to instantiate complex, multi-step processes from predefined structures. The metaphor used is "Chemistry phases," categorizing workflows into three states:
  </p>

  <h3>Figure 1: Molecule Workflow Phases</h3>
  <div class="comparison-card-container">
    <div class="comparison-card">
      <h4>Solid (Proto)</h4>
      <p><strong>What It Is:</strong> Template you can reuse</p>
      <p><strong>Use For:</strong> Standard workflows</p>
      <p class="quote">.claude/rules/beads-patterns.md, Line 94</p>
    </div>
    <div class="comparison-card">
      <h4>Liquid (Mol)</h4>
      <p><strong>What It Is:</strong> Active work, saved to Git</p>
      <p><strong>Use For:</strong> Real features</p>
      <p class="quote">.claude/rules/beads-patterns.md, Line 95</p>
    </div>
    <div class="comparison-card">
      <h4>Vapor (Wisp)</h4>
      <p><strong>What It Is:</strong> Throwaway work, not saved</p>
      <p><strong>Use For:</strong> Experiments, scratch</p>
      <p class="quote">.claude/rules/beads-patterns.md, Line 96</p>
    </div>
  </div>
  <p>
    "Wisps" represent the "Vapor" phase, specifically designed for "Throwaway work, not saved" to Git (<span class="quote">.claude/rules/beads-patterns.md, Line 96</span>). This is crucial for AI agents conducting experiments or scratchpad operations without polluting the main issue history. Commands like <code>bd wisp create</code>, <code>bd wisp list</code>, and <code>bd wisp gc</code> facilitate the management of these temporary work units (<span class="quote">.claude/rules/beads-patterns.md, Lines 112-114</span>).
  </p>

  <h2>V. Integration and Cross-Session Context</h2>
  <p>
    Beads is not an isolated system; it integrates deeply within the CREATE SOMETHING monorepo's agent orchestration framework. The <code>packages/orchestration/src/integration/beads.ts</code> module demonstrates its role in multi-agent coordination, particularly with Gastown. It enables labeling issues with convoy membership (e.g., <code>convoy:{id}</code>) (<span class="quote">packages/orchestration/src/integration/beads.ts, Lines 17-25</span>) and updating issue statuses based on worker outcomes (<span class="quote">packages/orchestration/src/integration/beads.ts, Lines 46-55</span>).
  </p>
  <p>
    A critical aspect of cross-session memory is the handling of failures. When a worker agent fails, Beads facilitates the creation of "blocker" issues, automatically assigned a <code>P0</code> priority and labeled with <code>convoy:{id}</code> and <code>harness:blocker</code> (<span class="quote">packages/orchestration/src/integration/beads.ts, Lines 66-82</span>). This ensures that critical failures are immediately tracked and visible, allowing for human intervention or re-prioritization by other agents.
  </p>
  <p>
    The <code>packages/harness/src/beads.ts</code> also shows how Beads is used to create "harness state issues" (type <code>epic</code>, label <code>harness</code>) and "checkpoint issues" (type <code>task</code>, labels <code>checkpoint</code>, <code>harness:{id}</code>) (<span class="quote">packages/harness/src/beads.ts, Lines 309, 340</span>). These specialized issues are vital for tracking the progress and state of complex, multi-session harness runs, effectively serving as persistent memory for the overall agent workflow.
  </p>

  <h3>Figure 2: Example Beads Workflow for an Agent Session</h3>
  <div class="code-block">
    <pre><code># Morning: What should I work on?
bv --robot-priority

# Found something while working
bd create "Add rate limiting to API" --priority P1 --label io

# Starting the auth work
bd update cs-a1b2 --status in-progress

# Done with auth
bd close cs-a1b2

# End of day
bd sync</code></pre>
    <p class="quote">.claude/rules/beads-patterns.md, Lines 17-26</p>
  </div>

  <h2>VI. Conclusion</h2>
  <p>
    Beads stands as a cornerstone of the CREATE SOMETHING agent ecosystem, providing a robust and agent-native solution for cross-session memory and task management. By leveraging Git for persistence, offering a rich set of CLI commands, and introducing advanced workflow concepts like Molecules and Wisps, Beads effectively mitigates the challenges of context loss and session volatility inherent in AI agent operations. Its design, rooted in "nondeterministic idempotence," ensures that complex, multi-step tasks can be reliably executed and completed, fostering a more resilient and autonomous agent development environment.
  </p>

  <div class="references">
    <h2>References</h2>
    <ul>
      <li><code>.claude/rules/beads-patterns.md</code></li>
      <li><code>CLAUDE.md</code></li>
      <li><code>packages/agent-sdk/src/create_something_agents/tools/beads.py</code></li>
      <li><code>packages/harness/src/beads.ts</code></li>
      <li><code>packages/orchestration/src/integration/beads.ts</code></li>
    </ul>
  </div>

  <footer class="footer">
    <p>CREATE SOMETHING Research Paper | Beads Cross-Session Memory Patterns | {currentYear}</p>
    <p>
      <a href="/">Home</a> |
      <a href="/papers">Papers</a> |
      <a href="/learn">Learn</a>
    </p>
  </footer>
</div>
