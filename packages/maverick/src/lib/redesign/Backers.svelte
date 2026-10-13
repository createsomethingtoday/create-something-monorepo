<section class="design-section light-content backers" aria-labelledby="backers-title">
  <div>
    <p class="eyebrow">Preview · content pending</p>
    <h2 id="backers-title">Our investors</h2>
    <p>
      Investor names and logos will appear here once the list and usage permissions are approved.
    </p>
    <div class="logo-grid" aria-label="Investor logo layout for review">
      {#each [1, 2, 3, 4] as slot}<div class="logo-slot">
          Logo {slot}<span>Pending approval</span>
        </div>{/each}
    </div>
  </div>
</section>

<style>
  .backers {
    padding: 96px 48px;
    border-top: 1px solid #18222b26;
  }
  .backers > div {
    max-width: 1200px;
    margin: auto;
  }
  .eyebrow {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  h2 {
    font:
      500 44px/1.1 'Barlow Condensed',
      sans-serif;
    text-transform: uppercase;
    margin: 20px 0;
  }
  p {
    max-width: 640px;
    line-height: 1.6;
  }
  .logo-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 20px;
    margin-top: 36px;
  }
  .logo-slot {
    border: 1px dashed #18222b55;
    padding: 40px 16px;
    text-align: center;
    font-size: 20px;
  }
  span {
    display: block;
    margin-top: 12px;
    font-size: 12px;
    color: #52616b;
  }
  @media (max-width: 600px) {
    .logo-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
  }
</style>
