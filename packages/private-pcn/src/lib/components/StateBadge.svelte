<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconName } from '@create-something/canon/icons';
  let {
    label,
    tone = 'neutral',
    icon = 'info'
  }: {
    label: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
    icon?: IconName | 'lock' | 'archive';
  } = $props();
</script>

<span class="state-badge" data-tone={tone}><Icon name={icon} />{label}</span>
