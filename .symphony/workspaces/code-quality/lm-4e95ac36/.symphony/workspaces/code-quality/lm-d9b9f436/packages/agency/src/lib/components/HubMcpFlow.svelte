<script lang="ts">
  import GovernedExecutionFlow from '$lib/components/GovernedExecutionFlow.svelte';
</script>

<GovernedExecutionFlow
  eyebrow="Governed Execution"
  title="Policy OS"
  description="Hub MCP routes the request, and Policy OS decides what can run automatically, what waits for approval, and what stops with a reason."
  caption="Safe actions run fast. Risky actions route to approval. Disallowed actions stop with a reason."
/>
