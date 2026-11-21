// Browser regression for any Agency preview (Vite default below).
// Set AGENCY_PREVIEW_URL in this script runtime to target another origin.
// ego-browser nodejs < packages/agency/scripts/check-hero-frame-layout.ego.mjs
const { default: assert } = await import('node:assert/strict');
const task = await taskSpace('Agency hero frame geometry regression');
const page = task.page('p1');
const previewOrigin = new URL(process.env.AGENCY_PREVIEW_URL || 'http://localhost:5173').origin;
try {
  for (const width of [1440, 390]) {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width, height:1000, deviceScaleFactor:1, mobile:false });
    for (const route of ['/map', '/support-brief']) {
      await page.goto(previewOrigin + route);
      const geometry = await page.evaluate(() => {
        const grid = document.querySelector('.editorial-frame-grid');
        const copy = grid?.querySelector('.editorial-frame-copy');
        if (!grid || !copy) throw new Error('Missing editorial hero frame');
        return { grid:grid.getBoundingClientRect().width, copy:copy.getBoundingClientRect().width, figures:grid.querySelectorAll(':scope > figure').length, columns:getComputedStyle(grid).gridTemplateColumns, overflow:document.documentElement.scrollWidth > innerWidth };
      });
      console.log({ route, width, ...geometry });
      assert.equal(geometry.overflow, false, `${route} must not overflow at ${width}`);
      if (route === '/map' || width < 768) {
        assert(Math.abs(geometry.grid - geometry.copy) < 1, `${route} copy must use the full frame at ${width}; got ${geometry.copy}/${geometry.grid}`);
      } else {
        assert.equal(geometry.figures, 1, 'Support brief retains its sibling visual');
        assert(geometry.copy < geometry.grid * .6, 'Desktop visual-bearing frames retain two columns');
      }
    }
  }
} finally {
  await task.finish({ keep:[] });
}
