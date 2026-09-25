<script>
  import Layout from '../../../../../packages/private-pcn/src/routes/+layout.svelte';
  let {data,children} = $props();
</script>
<Layout {data}>{@render children()}</Layout>
