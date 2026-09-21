<script lang="ts">
  import Lesson from '../../../../lessons/[id]/+page.svelte';
  let { data } = $props();
</script>

<Lesson {data} />
