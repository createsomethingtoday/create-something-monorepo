<script lang="ts">
  const root =
    'https://github.com/createsomethingtoday/create-something-monorepo/blob/914cd4ef8ce7204c33113ce082264f7f837da5ea/packages/pi-policy-os/';
  const files = [
    {
      title: 'Instructions',
      file: 'README.md',
      path: 'README.md#L5-L33',
      excerpt: 'pi install npm:@createsomething/pi-policy-os',
      detail:
        'The actual installation command, followed by the available commands, skills and prompt templates. A starting point someone else can follow.'
    },
    {
      title: 'Tests',
      file: 'policy-os-starter.test.ts',
      path: 'test/policy-os-starter.test.ts#L7-L24',
      excerpt: "assert.ok(events.has('session_start'));\nassert.ok(commands.has('policy-check'));",
      detail:
        'Two assertions from the repository test. They check that the extension registers its session event and public command. This excerpt is test source, not a claim about a test run.'
    },
    {
      title: 'Ownership',
      file: 'LICENSE',
      path: 'LICENSE',
      excerpt: 'MIT License\nCopyright (c) 2025 Create Something',
      detail:
        'The published MIT license permits use, modification and redistribution with its notice retained. CREATE SOMETHING retains copyright. Your commissioned deliverables follow your own agreement.'
    },
    {
      title: 'Recovery notes',
      file: 'debug-feedback-loop/SKILL.md',
      path: 'skills/debug-feedback-loop/SKILL.md#L60-L111',
      excerpt: 'Reproduce → minimize → fix → verify → record',
      detail:
        'A summary of the published debugging procedure: capture the symptom, reproduce the failure, make a regression check, rerun the original check and record evidence and rollback notes. This is a method, not an application-specific rollback runbook.'
    }
  ];
</script>

<section class="handoff" aria-labelledby="public-handoff-title">
  <div class="intro">
    <p class="eyebrow">Public source example · pi-policy-os v1.0.5</p>
    <h4 id="public-handoff-title">Open the files. See what makes work transferable.</h4>
    <p>
      This is our published open-source package, not a client handoff. Inspect the real material
      behind each label.
    </p>
  </div>
  {#each files as file, i}
    <details name="handoff-files" open={i === 0}>
      <summary
        ><span class="index">0{i + 1}</span><span>{file.title}</span><span class="file"
          >{file.file}</span
        ><span aria-hidden="true">+</span></summary
      >
      <div class="file-content">
        <pre><code>{file.excerpt}</code></pre>
        <p>{file.detail}</p>
        <a href={root + file.path}>Read the actual {file.title.toLowerCase()} ↗</a>
      </div>
    </details>
  {/each}
  <div class="provenance">
    Source pinned to a published repository revision. <a
      href="https://github.com/createsomethingtoday/create-something-monorepo/blob/914cd4ef8ce7204c33113ce082264f7f837da5ea/config/public-distribution.v1.json"
      >Verify public distribution ↗</a
    >
  </div>
</section>

<style>
  .handoff {
    padding: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
    width: 100%;
    min-width: 0;
  }
  .intro {
    padding: 1.5rem;
  }
  h4 {
    font-size: clamp(1.4rem, 2.5vw, 2rem);
    line-height: 1.18;
    margin: 0.75rem 0;
  }
  .eyebrow {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  p {
    line-height: 1.6;
    font-size: 0.9rem;
  }
  details {
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }
  summary {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 1.25rem;
    min-height: 3.5rem;
    cursor: pointer;
    list-style: none;
    font-weight: 600;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .index,
  .file {
    font: 0.7rem monospace;
    color: var(--color-performance-muted, #5e6268);
  }
  .file {
    margin-left: auto;
    overflow-wrap: anywhere;
  }
  summary > span:last-child {
    margin-left: auto;
  }
  details[open] > summary > span:last-child {
    transform: rotate(45deg);
  }
  details[open] > summary {
    background: var(--color-performance-paper, #f3f3f0);
  }
  summary:focus-visible,
  a:focus-visible {
    outline: 3px solid var(--color-performance-signal, #0057b8);
    outline-offset: -3px;
  }
  .file-content {
    padding: 0 1.5rem 1.5rem;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 0.8rem;
    line-height: 1.7;
    padding: 1.25rem;
    background: var(--color-performance-paper, #f3f3f0);
    border-left: 2px solid var(--color-performance-signal, #0057b8);
  }
  a {
    text-underline-offset: 0.2em;
    font-size: 0.8rem;
  }
  .provenance {
    padding: 1.25rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    font-size: 0.7rem;
    line-height: 1.7;
  }
  @media (max-width: 560px) {
    .file {
      display: none;
    }
    .intro,
    .file-content {
      padding: 1.25rem;
    }
  }
</style>
