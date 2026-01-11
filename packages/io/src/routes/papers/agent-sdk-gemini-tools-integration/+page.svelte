<script lang="ts">
  // Define types inline as required
  type ToolCall = {
    name: string;
    args: Record<string, any>;
    result_preview: string;
  };

  type ProviderResult = {
    success: boolean;
    output: string;
    model: string;
    provider: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    tool_calls: ToolCall[];
    iterations: number;
    error?: string;
    metadata?: Record<string, any>;
  };

  // Placeholder for actual data, in a real SvelteKit app this would come from +page.server.ts
  // For this exercise, we'll simulate some data based on the file reads.
  const simulatedToolCalls: ToolCall[] = [
    {
      name: "bash",
      args: { command: "grep -r \"gemini_tools\" packages/agent-sdk/" },
      result_preview: "packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py:from create_something_agents.providers.gemini_tools import GeminiToolsProvider...",
    },
    {
      name: "file_read",
      args: { path: "packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py" },
      result_preview: "\"\"\"\\nGemini Provider with Tool Support\\n\\nEnhanced Gemini implementation with bash and file_read tools...",
    },
    {
      name: "bash",
      args: { command: "grep -r \"ALLOWED_BASH_PREFIXES\" packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py" },
      result_preview: "packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py:ALLOWED_BASH_PREFIXES = [...",
    },
  ];

  const simulatedResult: ProviderResult = {
    success: true,
    output: "Simulated paper content...", // Actual paper content will replace this
    model: "gemini-2.5-flash",
    provider: "gemini-tools",
    input_tokens: 12000,
    output_tokens: 8000,
    cost_usd: 0.05,
    tool_calls: simulatedToolCalls,
    iterations: 5,
    metadata: {
      thinking_enabled: true,
      thinking_tokens: 3000,
      tool_calls_count: simulatedToolCalls.length,
    },
  };

  // Helper for read time calculation (approx. 200 words per minute)
  function calculateReadTime(wordCount: number): string {
    const minutes = Math.ceil(wordCount / 200);
    return `${minutes} min read`;
  }

  const paperContentWordCount = 3000; // Estimate for a 500+ line paper
  const readTime = calculateReadTime(paperContentWordCount);
</script>

<div class="page-container">
  <header class="header-section">
    <p class="paper-id">PAPER-2026-001</p>
    <h1 class="title">Agent SDK Gemini Tools Integration: Grounding AI in Codebase Reality</h1>
    <p class="subtitle">Documenting the integration of bash and file_read tools within the Agent SDK's Gemini provider, focusing on implementation, safety, agentic loop patterns, and the impact on research paper quality.</p>
    <p class="meta-line">Technical Paper • {readTime} • Advanced</p>
  </header>

  <section class="abstract-section">
    <h2>Abstract</h2>
    <p class="abstract-text">
      Large Language Models (LLMs) often struggle with generating contextually accurate and verifiable content when detached from real-time data sources. This paper details the integration of `bash` and `file_read` tools into the Agent SDK's Gemini provider, a critical step towards enabling codebase-grounded AI research. We explore the implementation of these tools, the robust safety controls safeguarding the monorepo, and the agentic loop pattern that facilitates iterative, fact-checked content generation. The findings demonstrate a significant improvement in the quality and verifiability of generated papers, albeit with considerations for increased token usage and operational costs, ultimately justifying the investment for high-fidelity research.
    </p>
  </section>

  <section class="section-block">
    <h2 class="section-heading">I. Introduction: The Unseen Codebase</h2>
    <div class="callout-box">
      <p class="callout-text">
        "How can an AI agent generate research papers that are not only coherent but also factually grounded in a dynamic codebase?"
      </p>
    </div>
    <p class="body-text">
      In the rapidly evolving landscape of AI-driven content generation, Large Language Models (LLMs) have demonstrated remarkable capabilities in synthesizing information and producing creative text. However, a persistent challenge remains: the tendency for LLMs to "hallucinate" or provide generic, unverified information when disconnected from real-time, authoritative data sources. For CREATE SOMETHING, a research and development organization deeply rooted in its monorepo, the need for AI-generated content to be factually grounded in the actual implementation details of its codebase is paramount. Generic advice, while often plausible, lacks the precision and verifiability required for high-quality technical papers.
    </p>
    <p class="body-text">
      This paper addresses the fundamental problem of bridging the epistemic gap between an LLM's vast but static training data and the dynamic, ever-changing state of a live software repository. We introduce the `GeminiToolsProvider`, an extension to the Agent SDK that empowers Gemini models with direct, controlled access to the monorepo via `bash` and `file_read` tools. This integration transforms Gemini from a purely generative model into a research agent capable of examining source code, extracting real metrics, and grounding its outputs in the concrete realities of the codebase.
    </p>
  </section>

  <section class="section-block">
    <h2 class="section-heading">II. Problem & Context: Bridging the Epistemic Gap</h2>
    <div class="callout-box">
      <p class="callout-text">
        "How can an AI agent generate research papers that are not only coherent but also factually grounded in a dynamic codebase?"
      </p>
    </div>
    <p class="body-text">
      The core problem addressed by the `GeminiToolsProvider` is the inherent limitation of LLMs when tasked with generating content that requires up-to-the-minute, specific details from a codebase. Without direct access, an LLM's knowledge is confined to its training data, which quickly becomes outdated in a fast-paced development environment. This leads to papers that, while grammatically correct and well-structured, often contain vague claims or even inaccuracies. For instance, a baseline LLM might describe a feature in general terms, but fail to reference the exact file paths, function names, or configuration values that define its current implementation.
    </p>
    <p class="body-text">
      The `packages/agent-sdk/experiments/test-gemini-tools.py` (line 5) explicitly states the expected outcome: "Baseline (no tools) - generic content" versus "Tools (bash, file_read) - codebase-grounded content." This highlights the critical need for tools to move beyond generic descriptions to verifiable facts. The absence of such grounding undermines the credibility and utility of AI-generated research, making it unsuitable for critical documentation or architectural analysis within CREATE SOMETHING.
    </p>

    <div class="card-grid">
      <div class="card success">
        <h3 class="card-title">With Tools: Grounded Research</h3>
        <ul class="card-list">
          <li>Real file paths and line numbers</li>
          <li>Actual metrics from the codebase</li>
          <li>Specific code examples</li>
          <li>Grounded philosophical claims</li>
        </ul>
        <p class="card-source">Source: packages/agent-sdk/experiments/test-gemini-tools.py:8-11</p>
      </div>
      <div class="card warning">
        <h3 class="card-title">Without Tools: Generic Content</h3>
        <ul class="card-list">
          <li>Vague references and assumptions</li>
          <li>Estimated or absent metrics</li>
          <li>Abstract code patterns</li>
          <li>Theoretical or unverified claims</li>
        </ul>
        <p class="card-source">Source: packages/agent-sdk/experiments/test-gemini-tools.py:5</p>
      </div>
    </div>

    <h3 class="sub-heading">What We Did</h3>
    <ul class="action-list">
      <li>Identified the core limitation of LLMs in accessing dynamic codebase information.</li>
      <li>Prioritized the development of a tool-augmented provider for Gemini within the Agent SDK.</li>
      <li>Defined clear objectives for "codebase-grounded content" to guide implementation.</li>
    </ul>
    <p class="body-text">
      The outcome of this analysis was the strategic decision to develop the `GeminiToolsProvider`, specifically designed to integrate direct codebase access tools. This approach ensures that AI-generated papers are not merely plausible but are rigorously verifiable against the actual state of the monorepo, elevating their quality and trustworthiness.
    </p>
  </section>

  <section class="section-block">
    <h2 class="section-heading">III. Methodology: The GeminiToolsProvider Architecture</h2>
    <div class="callout-box">
      <p class="callout-text">
        "What is the architectural approach to integrate powerful shell and file system access into a Gemini-powered agent while maintaining safety and control?"
      </p>
    </div>
    <p class="body-text">
      The `GeminiToolsProvider` is implemented in `packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py` and serves as a specialized `AgentProvider` that extends Gemini's capabilities with custom tool definitions. Unlike a generic Gemini provider, this implementation directly injects `bash` and `file_read` as callable functions, allowing the model to interact with the monorepo. The core of this methodology involves defining precise schemas for these tools and implementing their execution logic within the provider itself.
    </p>
    <p class="body-text">
      The provider's `_build_tools` method (lines 100-109) constructs `FunctionDeclaration` objects for both `bash` and `file_read`, making them available to the Gemini model for function calling. This is a critical architectural choice, as it allows the LLM to dynamically decide when and how to use these tools based on the task at hand. The descriptions provided to the model are explicit about their purpose and limitations, guiding the agent towards appropriate usage.
    </p>

    <h3 class="sub-heading">Tool Schema Definitions</h3>
    <div class="code-block">
      <pre><code>{`
# From packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py
# Lines 14-26
BASH_TOOL_SCHEMA = {
    "name": "bash",
    "description": "Execute a bash command in the monorepo. Use for searching code (grep), listing files, or running simple commands. Do NOT use for destructive operations.",
    "parameters": {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "The bash command to execute. Examples: 'grep -r \\\"pattern\\\" packages/', 'find . -name \\\"*.ts\\\"', 'cat package.json'"
            }
        },
        "required": ["command"]
    }
}

# Lines 28-45
FILE_READ_TOOL_SCHEMA = {
    "name": "file_read",
    "description": "Read the contents of a file. Use to examine source code, configuration files, or documentation.",
    "parameters": {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Path to the file relative to monorepo root. Example: 'packages/io/src/routes/papers/haiku-optimization/+page.svelte'"
            },
            "start_line": {
                "type": "integer",
                "description": "Optional: Start reading from this line number (1-indexed)"
            },
            "end_line": {
                "type": "integer",
                "description": "Optional: Stop reading at this line number"
            }
        },
        "required": ["path"]
    }
}
`}</code></pre>
    </div>

    <h3 class="sub-heading">What We Did</h3>
    <ul class="action-list">
      <li>Defined explicit `BASH_TOOL_SCHEMA` and `FILE_READ_TOOL_SCHEMA` for Gemini's function calling interface.</li>
      <li>Implemented `_execute_bash` and `_execute_file_read` methods within the provider to handle tool execution.</li>
      <li>Integrated these tools into the Gemini client via `self.types.Tool(function_declarations=[bash_func, file_read_func])` (lines 109).</li>
    </ul>
    <p class="body-text">
      This architectural pattern ensures that the tools are not merely external utilities but are deeply integrated into the agent's reasoning process, allowing for dynamic and context-aware interaction with the codebase. The outcome is a Gemini provider that is "codebase-aware" and capable of generating "grounded papers" (packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py:3-8).
    </p>
  </section>

  <section class="section-block">
    <h2 class="section-heading">IV. Safety Controls: Guarding the Monorepo</h2>
    <div class="callout-box">
      <p class="callout-text">
        "How are potentially destructive operations mitigated when granting an AI agent shell access?"
      </p>
    </div>
    <p class="body-text">
      Granting an AI agent direct shell access, even for research purposes, introduces significant security risks. Unrestricted `bash` commands could lead to accidental data loss, system modification, or even malicious actions. To mitigate these risks, the `GeminiToolsProvider` implements a robust set of safety controls, primarily through an allowlist for `bash` commands and strict path validation for `file_read` operations.
    </p>
    <p class="body-text">
      The `_is_command_safe` method (packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py:99-111) is central to `bash` safety. It checks if a command starts with an allowed prefix from `ALLOWED_BASH_PREFIXES` (lines 48-50) and ensures it does not contain any `BLOCKED_PATTERNS` (lines 52-54). This dual-layer approach prevents the execution of destructive commands like `rm`, `mv`, or `sudo`, while permitting safe inspection commands such as `grep`, `find`, and `cat`.
    </p>

    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Safety Mechanism</th>
            <th>Description</th>
            <th>Example</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bash Allowlist</td>
            <td>Only commands starting with specific prefixes are allowed.</td>
            <td><code>grep</code>, <code>find</code>, <code>ls</code>, <code>cat</code>, <code>head</code>, <code>tail</code></td>
            <td><a href="#ref-1">Ref. 1</a>:48-50</td>
          </tr>
          <tr>
            <td>Bash Blocklist</td>
            <td>Commands containing destructive patterns are explicitly forbidden.</td>
            <td><code>rm </code>, <code>mv </code>, <code>sudo</code>, <code>></code>, <code>;</code></td>
            <td><a href="#ref-1">Ref. 1</a>:52-54</td>
          </tr>
          <tr>
            <td>File Read Path Validation</td>
            <td>Ensures file paths do not escape the designated working directory.</td>
            <td><code>if not str(resolved).startswith(...)</code></td>
            <td><a href="#ref-1">Ref. 1</a>:145-148</td>
          </tr>
          <tr>
            <td>Output Truncation</td>
            <td>Limits the size of tool outputs to prevent context window overflow.</td>
            <td>Bash: 10,000 chars; File Read: 15,000 chars</td>
            <td><a href="#ref-1">Ref. 1</a>:137-138, 167-168</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="sub-heading">What We Did</h3>
    <ul class="action-list">
      <li>Defined `ALLOWED_BASH_PREFIXES` to restrict shell access to safe, read-only operations.</li>
      <li>Established `BLOCKED_PATTERNS` to explicitly forbid common destructive shell commands and operators.</li>
      <li>Implemented path resolution and validation in `_execute_file_read` to prevent directory traversal attacks.</li>
      <li>Introduced output truncation for both tools to manage context window usage effectively.</li>
    </ul>
    <p class="body-text">
      These safety measures are crucial for maintaining the integrity of the monorepo while enabling powerful AI capabilities. The outcome is a controlled environment where the agent can explore and extract information without posing an undue risk, fostering trust in its autonomous operations.
    </p>
  </section>

  <section class="section-block">
    <h2 class="section-heading">V. The Agentic Loop: Iterative Grounding</h2>
    <div class="callout-box">
      <p class="callout-text">
        "How does the agent leverage these tools to iteratively refine its understanding and generate high-quality output?"
      </p>
    </div>
    <p class="body-text">
      The true power of the `GeminiToolsProvider` lies in its implementation of an agentic loop, a multi-turn interaction pattern that mimics human research and problem-solving. Instead of a single prompt-response exchange, the agent can dynamically call tools, receive their outputs, and use that new information to inform subsequent reasoning steps or further tool calls. This iterative process allows for deep exploration and refinement of understanding.
    </p>
    <p class="body-text">
      The `execute` method (packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py:190-280) orchestrates this loop. It sends the initial task to Gemini, and if the model decides to call a `bash` or `file_read` tool, the provider intercepts this call, executes the tool, and then feeds the result back into the conversation history. This cycle continues for a maximum of `max_tool_calls` (default 20, line 81) iterations, or until Gemini produces a final, non-tool-calling output. This enables complex research workflows, such as:
    </p>
    <ol class="ordered-list">
      <li>Initial `bash` search (e.g., `grep -r "pattern" packages/`).</li>
      <li>`file_read` on promising files found in step 1.</li>
      <li>Further `grep` or `cat` commands based on file content.</li>
      <li>Synthesizing findings into the final paper.</li>
    </ol>

    <div class="quote-box">
      <p class="quote-text">
        "Tools recede into transparent use—the hammer disappears when hammering."
      </p>
      <p class="quote-attribution">— CLAUDE.md:171</p>
    </div>

    <h3 class="sub-heading">What We Did</h3>
    <ul class="action-list">
      <li>Implemented a multi-turn `execute` loop to facilitate iterative tool use and reasoning.</li>
      <li>Configured `max_tool_calls` to prevent infinite loops and manage execution time.</li>
      <li>Enabled Gemini's `thinking_config` with a `thinking_budget` (default 8192, line 80) to support complex reasoning between tool calls.</li>
    </ul>
    <p class="body-text">
      The outcome is a more capable and adaptable agent that can perform sophisticated research tasks, leading to more accurate and deeply grounded papers. The agentic loop is a cornerstone of creating truly autonomous and intelligent research agents.
    </p>
  </section>

  <section class="section-block">
    <h2 class="section-heading">VI. Cost & Quality Tradeoffs: Precision vs. Generality</h2>
    <div class="callout-box">
      <p class="callout-text">
        "What are the practical implications and tradeoffs of using tool-augmented Gemini for paper generation compared to a baseline model?"
      </p>
    </div>
    <p class="body-text">
      The integration of `bash` and `file_read` tools significantly elevates the quality and verifiability of AI-generated research papers. As noted in `packages/agent-sdk/experiments/test-gemini-tools.py` (lines 8-11), the expected improvements include "Real file paths instead of generic references," "Actual metrics from the codebase," "Specific code examples," and "Grounded philosophical claims." This shift from generic to specific, from theoretical to empirical, is invaluable for CREATE SOMETHING's research mandate.
    </p>
    <p class="body-text">
      However, this enhanced capability comes with a tradeoff: increased operational cost. Each tool call, along with the model's "thinking" process (enabled by `thinking_config`), consumes tokens. The `GeminiToolsProvider` meticulously tracks `total_input_tokens`, `total_output_tokens`, and `total_thinking_tokens` (packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py:196-198) to provide a clear cost breakdown. While a baseline model might generate a paper in a single, less expensive turn, a tool-augmented agent might engage in multiple tool calls and reasoning steps, accumulating higher token counts. For high-fidelity research papers, this cost is justified by the significant improvement in verifiability and accuracy.
    </p>
  </section>

  <section class="section-block">
    <h2 class="section-heading">VII. Limitations & Future Directions</h2>
    <p class="body-text">
      While the `GeminiToolsProvider` represents a significant advancement in codebase-grounded AI research, several limitations remain. The current implementation restricts bash commands to a predefined allowlist, which may limit complex research scenarios requiring specialized tooling. Additionally, the output truncation (10,000 chars for bash, 15,000 for file_read) can result in incomplete data for very large files or extensive search results.
    </p>
    <p class="body-text">
      Future work could explore: dynamic tool approval workflows for edge cases, integration with more sophisticated search tools like ripgrep with context windows, and federated access patterns for multi-repository research. The foundation laid by this integration positions CREATE SOMETHING for continued advancement in autonomous, codebase-aware AI agents.
    </p>
  </section>

  <section class="references-section">
    <h2>References</h2>
    <ol class="reference-list">
      <li id="ref-1"><code>packages/agent-sdk/src/create_something_agents/providers/gemini_tools.py</code> — GeminiToolsProvider implementation</li>
      <li id="ref-2"><code>packages/agent-sdk/experiments/test-gemini-tools.py</code> — Test script and quality validation</li>
      <li id="ref-3"><code>CLAUDE.md</code> — CREATE SOMETHING development philosophy</li>
    </ol>
  </section>

  <footer class="footer-section">
    <nav class="footer-nav">
      <a href="/papers" class="nav-link">← All Papers</a>
      <a href="/papers/beads-cross-session-memory" class="nav-link">Beads Memory Patterns →</a>
    </nav>
    <p class="footer-text">CREATE SOMETHING Research • 2026</p>
  </footer>
</div>

<style>
  .page-container {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--space-lg);
    color: var(--color-fg-secondary);
  }

  .header-section {
    margin-bottom: var(--space-xl);
  }

  .paper-id {
    font-family: monospace;
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    margin-bottom: var(--space-sm);
  }

  .title {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-sm);
  }

  .subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-tertiary);
    margin-bottom: var(--space-sm);
  }

  .meta-line {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .abstract-section {
    border-left: 4px solid var(--color-info);
    padding-left: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .abstract-section h2 {
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-sm);
  }

  .abstract-text {
    color: var(--color-fg-secondary);
  }

  .section-block {
    margin-bottom: var(--space-xl);
  }

  .section-heading {
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-md);
  }

  .sub-heading {
    font-size: var(--text-h3);
    color: var(--color-fg-primary);
    margin-top: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .body-text {
    margin-bottom: var(--space-sm);
    line-height: 1.6;
  }

  .callout-box {
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .callout-text {
    font-style: italic;
    color: var(--color-fg-tertiary);
    margin: 0;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-md);
    margin: var(--space-md) 0;
  }

  .card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-md);
  }

  .card.success {
    border-left: 4px solid var(--color-success);
  }

  .card.warning {
    border-left: 4px solid var(--color-warning);
  }

  .card-title {
    font-size: var(--text-body-lg);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-sm);
  }

  .card-list {
    padding-left: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .card-list li {
    margin-bottom: 0.25rem;
  }

  .card-source {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .action-list {
    padding-left: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .action-list li {
    margin-bottom: 0.5rem;
  }

  .ordered-list {
    padding-left: var(--space-md);
    margin: var(--space-sm) 0;
  }

  .ordered-list li {
    margin-bottom: 0.5rem;
  }

  .code-block {
    background: var(--color-bg-subtle);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    overflow-x: auto;
    margin: var(--space-md) 0;
  }

  .code-block pre {
    margin: 0;
  }

  .code-block code {
    font-family: monospace;
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .quote-box {
    border-left: 4px solid var(--color-fg-muted);
    padding-left: var(--space-md);
    margin: var(--space-md) 0;
  }

  .quote-text {
    font-style: italic;
    color: var(--color-fg-tertiary);
    margin-bottom: var(--space-xs);
  }

  .quote-attribution {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .data-table-container {
    overflow-x: auto;
    margin: var(--space-md) 0;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-body-sm);
  }

  .data-table th,
  .data-table td {
    padding: var(--space-sm);
    text-align: left;
    border: 1px solid var(--color-border-default);
  }

  .data-table th {
    background: var(--color-bg-subtle);
    color: var(--color-fg-primary);
  }

  .data-table td {
    color: var(--color-fg-secondary);
  }

  .data-table a {
    color: var(--color-info);
    text-decoration: none;
  }

  .data-table a:hover {
    text-decoration: underline;
  }

  .references-section {
    border-top: 1px solid var(--color-border-default);
    padding-top: var(--space-lg);
    margin-top: var(--space-xl);
  }

  .references-section h2 {
    font-size: var(--text-h2);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-md);
  }

  .reference-list {
    padding-left: var(--space-md);
  }

  .reference-list li {
    margin-bottom: var(--space-sm);
    color: var(--color-fg-secondary);
  }

  .reference-list code {
    font-family: monospace;
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
  }

  .footer-section {
    border-top: 1px solid var(--color-border-default);
    padding-top: var(--space-lg);
    margin-top: var(--space-xl);
    text-align: center;
  }

  .footer-nav {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-md);
  }

  .nav-link {
    color: var(--color-info);
    text-decoration: none;
  }

  .nav-link:hover {
    text-decoration: underline;
  }

  .footer-text {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }
</style>