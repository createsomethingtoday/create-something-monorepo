<script lang="ts">
  export let score: number;
  export let color: string = '#3b82f6';

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
</script>

<div class="score-ring">
  <svg width="120" height="120" viewBox="0 0 120 120">
    <!-- Background circle -->
    <circle
      cx="60"
      cy="60"
      r={radius}
      fill="none"
      stroke="#e5e7eb"
      stroke-width="8"
    />

    <!-- Progress circle -->
    <circle
      cx="60"
      cy="60"
      r={radius}
      fill="none"
      stroke={color}
      stroke-width="8"
      stroke-linecap="round"
      stroke-dasharray={circumference}
      stroke-dashoffset={offset}
      transform="rotate(-90 60 60)"
      style="transition: stroke-dashoffset 0.5s ease;"
    />

    <!-- Score text -->
    <text
      x="60"
      y="60"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="32"
      font-weight="700"
      fill={color}
    >
      {score}
    </text>
  </svg>
</div>

<style>
  .score-ring {
    display: inline-block;
  }
</style>
