<script lang="ts">
 import RadioGroup from './RadioGroup.svelte';import Radio from './Radio.svelte';
 let value=$state('summary');
</script>
<RadioGroup legend="Delivery" name="delivery-harness" bind:value><Radio value="draft" label="Draft"/><Radio value="summary" label="Summary"/></RadioGroup>
<p data-selection>{value}</p>
