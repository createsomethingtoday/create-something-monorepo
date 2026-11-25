// Run with the parent-owned Agency server on 5192:
// ego-browser nodejs < packages/agency/test/canon-adoption-hero.browser.mjs
const spaceName = 'Canon Agency interior adoption';
const existing = (await listTaskSpaces()).find((space) => space.name === spaceName);
const task = await taskSpace(existing?.id ?? spaceName);
const page = (await task.pages())[0] ?? task.page('p1');
const results = [];
for (const width of [320, 390, 768, 1024, 1025, 1440]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
  await page.goto('http://127.0.0.1:5192/services');
  const result = await page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box ? { top: box.top, bottom: box.bottom, left: box.left, right: box.right } : null;
    };
    const copy = rect('.agency-hero-frame .canon-scene-lead__copy');
    const art = rect('.agency-hero-frame .canon-scene-lead__art');
    const scene = rect('.agency-hero-frame .canon-scene-lead');
    const proof = rect('.agency-hero-frame .canon-scene-details');
    const links = [...document.querySelectorAll('.agency-hero-frame a')].map((link) => link.getAttribute('href'));
    const destinations = [...document.querySelectorAll('.agency-hero-plate__destinations a')].map((link) => ({ href: link.hash, exists: Boolean(document.getElementById(link.hash.slice(1))) }));
    const campaignPadding = parseFloat(getComputedStyle(document.querySelector('.performance-campaign-opening')).paddingTop);
    const buttonHeights = [...document.querySelectorAll('.performance-campaign-opening__actions .btn')].map((el) => el.getBoundingClientRect().height);
    return { campaignPadding, buttonHeights, width: innerWidth, scrollWidth: document.documentElement.scrollWidth, copy, art, scene, proof, links, destinations, inlineHeroImages: document.querySelectorAll('.agency-hero-frame img').length };
  });
  const errors = [];
  if (result.scrollWidth > width) errors.push('horizontal overflow');
  if (result.campaignPadding > 1) errors.push('legacy campaign spacing separates the ruler from the scene');
  if (width <= 600 && Math.max(...result.buttonHeights) - Math.min(...result.buttonHeights) > 1) errors.push('narrow action buttons wrap to different heights');
  if (!result.copy || !result.art || !result.scene || !result.proof) errors.push('missing scene or proof');
  if (width < 768 && result.art && result.copy && result.art.top < result.copy.bottom - 1) errors.push('mobile artwork overlaps essential copy/actions');
  if (result.proof && result.scene && result.proof.top < result.scene.bottom - 1) errors.push('dense proof overlaps the scene');
  if (result.inlineHeroImages) errors.push('hero still contains an inline image');
  if (!result.links.includes('/contact?source=membership&intent=membership&lane=workflow_infrastructure')) errors.push('membership destination changed');
  if (!result.links.includes('/book?source=services&intent=workflow-mapping&lane=workflow_infrastructure')) errors.push('mapping destination changed');
  if (!result.destinations.length || result.destinations.some((entry) => !entry.exists)) errors.push('missing chapter destination');
  results.push({ ...result, errors });
  if (errors.length) { console.log(JSON.stringify(results, null, 2)); throw new Error(`${width}px: ${errors.join(', ')}`); }
}
for (const [route, copySelector, detailSelector] of [
  ['/technical-review', '.opening-copy', '.review-visual'],
  ['/security', '.clear-page-section__copy', '.clear-page-section__aside']
]) {
  for (const width of [390, 1440]) {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
    await page.goto('http://127.0.0.1:5192' + route);
    const result = await page.evaluate(({ copySelector, detailSelector }) => {
      const rect = (selector) => { const box = document.querySelector(selector)?.getBoundingClientRect(); return box ? { top: box.top, bottom: box.bottom, width: box.width } : null; };
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, copy: rect(copySelector), art: rect('.agency-hero-scene__art'), detail: rect(detailSelector) };
    }, { copySelector, detailSelector });
    const errors = [];
    if (result.scrollWidth > width) errors.push('horizontal overflow');
    if (!result.copy || !result.art || !result.detail) errors.push('missing authored copy, artwork or detail');
    if (result.copy && result.art && result.copy.width < (width < 768 ? result.art.width * 0.8 : Math.min(360, result.art.width * 0.4))) errors.push('nested layout squeezes essential copy');
    if (width < 768 && result.art && result.copy && result.art.top < result.copy.bottom - 1) errors.push('mobile art overlaps copy');
    if (result.detail && result.art && result.detail.top < result.art.bottom - 1) errors.push('authored proof/figure overlaps hero art');
    results.push({ route, ...result, errors });
    if (errors.length) { console.log(JSON.stringify(results, null, 2)); throw new Error(`${route} ${width}px: ${errors.join(', ')}`); }
  }
}
console.log(JSON.stringify(results, null, 2));
