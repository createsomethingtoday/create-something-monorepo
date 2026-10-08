<script lang="ts">
  import { pathBase } from '$lib/learning';
  let { slug }: { slug?: string } = $props();
</script>

<details class="creator-guide">
  <summary>New to teaching here? Follow the publishing steps</summary>
  <ol>
    <li>
      <strong>Prepare a private draft.</strong>
      <a href="#upload-walkthrough">Upload a walkthrough</a> with a clear title and outcome. Keep this
      page open until the upload finishes.
    </li>
    <li>
      <strong>Check and review.</strong> At the <a href="#publishing-desk">publishing desk</a>,
      check processing, then open the lesson page to review playback and add prerequisites, a
      transcript or practice.
    </li>
    <li>
      <strong>Choose your audience.</strong> Publish only after review. Members need current network
      access; a public preview is visible publicly. Then
      <a href={pathBase(slug)}>arrange published lessons into a learning path</a>.
    </li>
  </ol>
  <p>
    Saving lesson material updates it immediately wherever the session is published. Video
    publication is a separate action.
  </p>
  <p>
    If an upload is interrupted, return to this workspace and check “Uploads to reconcile” before
    starting again. An uncertain upload may still reserve storage; leaving this page does not cancel
    it.
  </p>
  <details>
    <summary>Prepare lesson text with ChatGPT</summary>
    <p>
      Use this as a drafting brief in your own chat. Review the result before entering it on the
      lesson page; this guide does not connect ChatGPT to your account.
    </p>
    <blockquote>
      Help me draft a lesson from my own non-sensitive notes. Ask for the learner, intended outcome,
      prerequisites, tools and a practice task. Identify missing facts and do not invent recordings
      or results. Return editable text for my review. Do not publish content or change access.
    </blockquote>
  </details>
</details>

<style>
  .creator-guide {
    margin-block: var(--space-performance-md);
    padding-block: var(--space-performance-xs);
    border-block: 1px solid var(--line);
  }
  summary {
    cursor: pointer;
    min-height: var(--pcn-control-height);
    display: list-item;
    padding-block: var(--space-performance-sm);
    font-weight: 600;
  }
  ol {
    padding-left: var(--space-performance-lg);
  }
  li {
    padding-block: var(--space-performance-sm);
    max-width: 75ch;
  }
  p,
  blockquote {
    color: var(--muted);
    max-width: 75ch;
  }
  blockquote {
    margin-inline: 0;
    border-left: 2px solid var(--state-info);
    padding-left: var(--space-performance-md);
  }
  summary:focus-visible {
    outline: 2px solid var(--state-info);
    outline-offset: 4px;
  }
</style>
