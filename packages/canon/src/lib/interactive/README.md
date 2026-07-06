# Canon Interactive Components

Interactive components should reveal state, flow, or sequence without becoming decorative motion.

## Examples

```svelte
<script lang="ts">
	import {
		HoverCard,
		IntegrationFlow,
		TimelineEditor
	} from '@create-something/canon/interactive';
</script>

<HoverCard title="Policy gate" description="Review the approval requirement before execution." />
<IntegrationFlow steps={[]} title="MCP handoff" />
<TimelineEditor events={[]} label="Release timeline" />
```

## Accessibility Evidence

- Hover content needs a keyboard path or persistent equivalent.
- Timelines and integration flows should include readable labels and ordered state.
