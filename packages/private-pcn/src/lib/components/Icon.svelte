<script lang="ts">
  import { ICON_PATHS, type IconName } from '@create-something/canon/icons';
  const objects = {
    archive: 'M3 3h18v5H3z M5 8v13h14V8 M10 12h4',
    mcp: 'M4 4h16v6H4z M4 14h16v6H4z M7 7h.01 M7 17h.01 M12 10v4',
    plugin: 'M8 3v5 M16 3v5 M6 8h12v4a6 6 0 0 1-12 0V8Z M12 18v3',
    skill: 'M5 3h14v18H5z M9 7h6 M9 11h6 M9 16l2 2 4-4',
    workflow: 'M3 3h6v6H3z M15 15h6v6h-6z M15 3h6v6h-6z M9 6h6 M18 9v6',
    network:
      'M9 9h6v6H9z M2 2h5v5H2z M17 2h5v5h-5z M2 17h5v5H2z M17 17h5v5h-5z M7 7l2 2 M15 9l2-2 M7 17l2-2 M15 15l2 2',
    package: 'M3 7l9-5 9 5v10l-9 5-9-5V7Z M3 7l9 5 9-5 M12 12v10 M7.5 4.5l9 5v5',
    terminal: 'M3 4h18v16H3z M7 9l3 3-3 3 M13 15h4',
    lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
    payment: 'M3 5h18v14H3z M3 9h18 M7 15h3'
  } as const;
  let { name, size = 16 }: { name: IconName | keyof typeof objects; size?: number } = $props();
  const path = $derived(
    name in objects ? objects[name as keyof typeof objects] : ICON_PATHS[name as IconName]
  );
</script>

<svg
  class="pcn-icon"
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"><path d={path} /></svg
>

<style>
  .pcn-icon {
    display: inline-block;
    vertical-align: -0.15em;
    flex-shrink: 0;
  }
</style>
