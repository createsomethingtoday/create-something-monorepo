<script lang="ts">
  import GovernedExecutionFlow from '$lib/components/GovernedExecutionFlow.svelte';
</script>

<GovernedExecutionFlow
  eyebrow="Governed Execution"
  title="Governed Workflow Console"
  description="The tool layer routes the request, and the console shows what can run automatically, what waits for approval, and what stops with a reason."
  caption="Safe actions run fast. Risky actions route to approval. Disallowed actions stop with a reason."
/>
