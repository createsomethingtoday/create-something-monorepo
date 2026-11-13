<script lang="ts">
  import { expressionCopy, type CanonExpression } from './expressions';
  interface Props { expression?: CanonExpression; size?: number; label?: string; }
  let { expression = 'welcome', size = 48, label }: Props = $props();
  const instanceId = $props.id();
  const titleId = `${instanceId}-face-title`;
  const pose = $derived(expressionCopy[expression]);
  const compact = $derived(size <= 32);
  // A stepped oval remains tall in every state. Small optical sizes use a clean oval.
  const eye = 'M-2-11H2V-9H4V-6H5V6H4V9H2V11H-2V9H-4V6H-5V-6H-4V-9H-2Z';
</script>

<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 96 96"
  role={label ? 'img' : undefined} aria-hidden={label ? undefined : 'true'}
  aria-labelledby={label ? titleId : undefined} focusable="false" data-canon-face={expression}>
  {#if label}<title id={titleId}>{label}</title>{/if}
  <path d="M45 18V10Q45 7 48 7Q51 7 51 10V18" fill="#585552" />
  <rect x="43" y="3" width="10" height="10" rx="5" fill="#eee1ca" />
  <path d="M25 18H71Q88 18 88 35V71Q88 88 71 88H25Q8 88 8 71V35Q8 18 25 18Z" fill="#57534f" />
  <path d="M25 21H71Q85 21 85 36V70Q85 85 71 85H25Q11 85 11 70V36Q11 21 25 21Z" fill="#45423f" />
  <rect x="17" y="29" width="62" height="49" rx="12" fill="#302f2d" />
  <path d="M28 31H68Q77 31 77 41" fill="none" stroke="#66615a" stroke-opacity=".35" stroke-width="1" />
  <g fill="#f2e5cd" transform={`translate(${pose.gaze} ${pose.lift})`}>
    {#each [35, 61] as x}
      {#if compact}<ellipse cx={x} cy="50" rx="5.5" ry="11" />
      {:else}<path d={eye} transform={`translate(${x} 50)`} />{/if}
      <ellipse cx={x + pose.gaze * .5} cy="51" rx="2" ry="4" fill="#302f2d" />
    {/each}
  </g>
  {#if compact}
    <path d="M42 66Q48 70 54 66" fill="none" stroke="#f2e5cd" stroke-width="2.5" stroke-linecap="round" />
  {:else}
    <path d={expression === 'focused' || expression === 'recovery' ? 'M43 67H53' : 'M40 64V66H43V68H53V66H56V64'} fill="none" stroke="#f2e5cd" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    {#if expression === 'needs-review'}<path d="M24 39H28M68 37H72" stroke="#c4b89f" stroke-width="2" />{/if}
    {#if expression === 'handback'}<path d="M25 66H28M68 66H71" stroke="#c4b89f" stroke-width="2" />{/if}
  {/if}
</svg>

<style>svg { display:inline-block; flex-shrink:0; vertical-align:middle; max-width:100%; }</style>
