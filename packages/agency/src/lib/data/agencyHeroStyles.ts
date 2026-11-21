import { agencyEditorialAssetUrl } from './agencyEditorialPresentation';
import type { AgencyHero } from './agencyHeroCoverage';

/** Inputs are repo-owned records, never raw pathname/query/CMS values. */
export function agencyHeroStyles(hero: AgencyHero | undefined, styles: string, localDevelopment = false): string {
  if (!hero) return '';
  const selector = `#main-content#main-content :is(${hero.selector})`;
  return `<style data-agency-hero-background>${styles.replaceAll('__HERO__', selector)}\n#main-content { --agency-hero-image: url("${agencyEditorialAssetUrl(hero.src, localDevelopment)}"); --agency-hero-mobile-image: url("${agencyEditorialAssetUrl(hero.mobileSrc ?? hero.src, localDevelopment)}"); }</style>`;
}
