<script lang="ts">
  import PropertyArtifactGrid from './PropertyArtifactGrid.svelte';
  import type { Paper } from '@create-something/canon/types';
  import type { PropertyArtifactKind } from './property-artifacts.js';

  interface Props {
    papers: Paper[];
    title?: string;
    subtitle?: string;
    basePath?: string;
    kind?: PropertyArtifactKind;
    actionLabel?: string;
  }

  let {
    papers,
    title = 'Latest Articles',
    subtitle,
    basePath = '/experiments',
    kind = 'experiment',
    actionLabel = 'Open artifact'
  }: Props = $props();
</script>

<PropertyArtifactGrid artifacts={papers} {title} {subtitle} {basePath} {kind} {actionLabel} />
