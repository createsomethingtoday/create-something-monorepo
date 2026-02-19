<svelte:head>
  <title>Client Governance Portal</title>
  <meta name="description" content="Whitelabeled tenant governance for gateway control" />
</svelte:head>

<slot />

<style>
  :global(:root) {
    --bg: radial-gradient(circle at 10% 20%, #071124 0%, #050910 40%, #0f1a29 100%);
    --panel: rgba(8, 18, 33, 0.82);
    --panel-2: rgba(13, 28, 49, 0.9);
    --line: rgba(140, 208, 255, 0.22);
    --text: #eef7ff;
    --text-dim: #aac4d8;
    --accent: #34d2ff;
    --accent-2: #7de36b;
    --danger: #ff6a6a;
    --warning: #ffbf58;
  }

  :global(body) {
    margin: 0;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'Space Grotesk', 'Sora', 'Avenir Next', sans-serif;
    letter-spacing: 0.01em;
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>
