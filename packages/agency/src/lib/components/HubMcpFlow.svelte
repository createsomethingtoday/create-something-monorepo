<script lang="ts">
  import GovernedExecutionFlow from '$lib/components/GovernedExecutionFlow.svelte';
</script>

<GovernedExecutionFlow
  eyebrow="Pattern Library"
  title="Business workflows become visible workflow patterns"
  description="Each offer can be shown as a real pattern: the business objects, the systems involved, the actions an agent can take, and the receipts a client can inspect."
  caption="The control layer turns business cases into visible patterns: objects, actions, states, and receipts."
  hubKicker="Pattern"
  hubTitle="Customer Recovery"
  hubSubtitle="Case, order, shipment"
  controlKicker="Applies"
  controlTitle="Control Layer"
  controlSubtitle="Allowed, review, blocked"
  initiators={['Support Inbox', 'Customer Thread', 'Agent Draft']}
  destinations={['Zendesk', 'Shopify', 'Stripe']}
/>
