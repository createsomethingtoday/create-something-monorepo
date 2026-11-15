import type { AgencyHero } from './agencyHeroCoverage';

/** Inputs are repo-owned records, never raw pathname/query/CMS values. */
export function agencyHeroStyles(hero: AgencyHero | undefined, styles: string): string {
  if (!hero) return '';
  const selector = `#main-content#main-content :is(${hero.selector})`;
  return `<style data-agency-hero-background>${styles.replaceAll('__HERO__', selector)}\n#main-content { --agency-hero-image: url("${hero.src}"); --agency-hero-mobile-image: url("${hero.mobileSrc ?? hero.src}"); }</style>`;
}
