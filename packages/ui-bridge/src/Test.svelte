<script>
  let count = 0;
</script>

<div class="container">
  <h1>Hello World</h1>
  <p>Count: {count}</p>
  <button on:click={() => count++}>
    Increment
  </button>
  <span class="badge">New!</span>
</div>
