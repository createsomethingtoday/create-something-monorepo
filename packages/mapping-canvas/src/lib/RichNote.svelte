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
  .rich-note{height:100%;overflow:hidden;color:#fff;font:500 16px/1.35 Arial,sans-serif;overflow-wrap:anywhere}.rich-note :global(*){margin:0 0 .35em}.rich-note h1{font-size:1.45em}.rich-note h2{font-size:1.25em}.rich-note h3{font-size:1.1em}.rich-note ul,.rich-note ol{padding-left:1.25em}.rich-note blockquote{border-left:3px solid #fcaa2d;padding-left:.65em;color:#ddd}.bold{font-weight:800}.italic{font-style:italic}.underline{text-decoration:underline}.code{font-family:monospace;background:#292929;border-radius:3px;padding:.05em .2em}.rich-note a{color:#7bb7ff;text-decoration:underline}
</style>
