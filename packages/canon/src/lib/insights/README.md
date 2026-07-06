# Canon Insights Components

Insight components turn claims, findings, and statements into compact proof surfaces.

## Examples

```svelte
<script lang="ts">
	import { KeyInsight, KeyInsightCard, StatementText } from '@create-something/canon/insights';
</script>

<KeyInsight label="Finding" value="Policy gate passed" detail="Validation completed on the release SHA." />
<KeyInsightCard title="Delivery proof" description="The command, owner, and rollback path are attached." />
<StatementText eyebrow="Judgment" text="The system should stop when the write target is ambiguous." />
```

## Accessibility Evidence

- Insight text must remain readable without relying on color or icon treatment.
- Each finding should name the claim, supporting evidence, and operational consequence.
