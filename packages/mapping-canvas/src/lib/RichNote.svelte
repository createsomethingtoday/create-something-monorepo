<script lang="ts">
  import type { NoteContent, NoteRun } from './note-content';
  let { content }: { content: NoteContent } = $props();
  const numberedStart = (index: number) => content.blocks.slice(0, index + 1).filter((block) => block.type === 'numbered').length;
</script>

{#snippet runs(items: NoteRun[])}
  {#each items as run}
    {#if run.link}<a href={run.link} target="_blank" rel="noopener noreferrer" class:bold={run.bold} class:italic={run.italic} class:underline={run.underline} class:code={run.code} onpointerdown={(event) => event.stopPropagation()}>{run.text}</a>
    {:else}<span class:bold={run.bold} class:italic={run.italic} class:underline={run.underline} class:code={run.code}>{run.text}</span>{/if}
  {/each}
{/snippet}

<div xmlns="http://www.w3.org/1999/xhtml" class="rich-note">
  {#each content.blocks as block, index}
    {#if block.type === 'heading1'}<h1>{@render runs(block.runs)}</h1>
    {:else if block.type === 'heading2'}<h2>{@render runs(block.runs)}</h2>
    {:else if block.type === 'heading3'}<h3>{@render runs(block.runs)}</h3>
    {:else if block.type === 'bullet'}<ul><li>{@render runs(block.runs)}</li></ul>
    {:else if block.type === 'numbered'}<ol start={numberedStart(index)}><li>{@render runs(block.runs)}</li></ol>
    {:else if block.type === 'quote'}<blockquote>{@render runs(block.runs)}</blockquote>
    {:else}<p>{@render runs(block.runs)}</p>{/if}
  {/each}
</div>

<style>
  .rich-note{height:100%;overflow:auto;color:#eee;font:400 16px/1.5 var(--font-performance-sans,Arial,sans-serif);overflow-wrap:anywhere;scrollbar-width:thin}.rich-note :global(*){margin:0}.rich-note :global(> * + *){margin-top:.65em}.rich-note span,.rich-note a{white-space:pre-wrap}.rich-note h1{font-size:1.5em;line-height:1.2;font-weight:700;letter-spacing:-.02em}.rich-note h2{font-size:1.25em;line-height:1.25;font-weight:700}.rich-note h3{font-size:1.08em;line-height:1.3;font-weight:700}.rich-note ul,.rich-note ol{padding-left:1.4em}.rich-note blockquote{border-left:2px solid #fcaa2d;padding-left:.75em;color:#bbb}.bold{font-weight:750}.italic{font-style:italic}.underline{text-decoration:underline}.code{font-family:monospace;font-size:.9em;background:#292929;border-radius:3px;padding:.08em .25em}.rich-note a{color:#8dc2ff;text-decoration:underline;text-underline-offset:2px}.rich-note a:focus-visible{outline:2px solid #fcaa2d}
</style>
